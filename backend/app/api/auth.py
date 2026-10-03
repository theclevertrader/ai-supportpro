import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.token_blacklist import revoke_token
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.document import Document, DocumentType, DocumentStatus, KnowledgeChunk
from app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketCategory
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.core.config import settings
from app.api.deps import get_current_user, security_scheme
from app.services.llm.factory import get_llm_provider
from app.services.rag.chunker import split_text_into_chunks
from app.services.audit.logger import record_audit_log

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_tenant_and_owner(data: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    """Registers a new business tenant and creates its owner account."""
    # Check if tenant slug already taken
    existing_tenant = await db.execute(select(Tenant).where(Tenant.slug == data.tenant_slug))
    if existing_tenant.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A workspace with this slug already exists."
        )

    # Check if email is already in use
    existing_user = await db.execute(select(User).where(User.email == data.email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Create Tenant
    tenant = Tenant(
        name=data.tenant_name,
        slug=data.tenant_slug,
        plan="starter"
    )
    db.add(tenant)
    await db.flush()

    # Create Owner User
    user = User(
        tenant_id=tenant.id,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        role=UserRole.TENANT_OWNER
    )
    db.add(user)
    await db.flush()

    # Audit log
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    await record_audit_log(
        db=db,
        tenant_id=tenant.id,
        action="USER_REGISTER_SUCCESS",
        resource_type="auth",
        resource_id=user.id,
        user_id=user.id,
        user_email=user.email,
        ip_address=client_ip,
        user_agent=user_agent,
        details={"tenant_name": tenant.name, "slug": tenant.slug}
    )
    await db.commit()
    await db.refresh(user)

    token = create_access_token(
        subject=user.id,
        tenant_id=tenant.id,
        role=user.role.value
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=Token)
async def login(data: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Authenticates user credentials, enforces account lockout policy,
    and returns JWT bearer token.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    stmt = select(User).where(User.email == data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    now_utc = datetime.now(timezone.utc)

    # Check Account Lockout Policy
    if user and user.locked_until:
        # SQLite stores naive or tz-aware datetimes
        locked_time = user.locked_until
        if locked_time.tzinfo is None:
            locked_time = locked_time.replace(tzinfo=timezone.utc)

        if locked_time > now_utc:
            remaining = int((locked_time - now_utc).total_seconds() // 60) + 1
            await record_audit_log(
                db=db,
                tenant_id=user.tenant_id,
                action="USER_LOGIN_BLOCKED_LOCKED",
                resource_type="auth",
                resource_id=user.id,
                user_id=user.id,
                user_email=user.email,
                ip_address=client_ip,
                user_agent=user_agent,
                details={"reason": "Account locked due to 5 consecutive failed attempts"}
            )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account is temporarily locked due to multiple failed login attempts. Try again in {remaining} minute(s)."
            )
        else:
            # Lock has expired, reset
            user.locked_until = None
            user.failed_login_attempts = 0

    if not user or not user.is_active or not verify_password(data.password, user.hashed_password):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = now_utc + timedelta(minutes=15)
                await record_audit_log(
                    db=db,
                    tenant_id=user.tenant_id,
                    action="USER_ACCOUNT_LOCKED",
                    resource_type="auth",
                    resource_id=user.id,
                    user_id=user.id,
                    user_email=user.email,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    details={"failed_attempts": user.failed_login_attempts, "locked_for_minutes": 15}
                )
            else:
                await record_audit_log(
                    db=db,
                    tenant_id=user.tenant_id,
                    action="USER_LOGIN_FAILED",
                    resource_type="auth",
                    resource_id=user.id,
                    user_id=user.id,
                    user_email=user.email,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    details={"failed_attempts": user.failed_login_attempts}
                )
            await db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    # Success: reset lockout counters
    user.failed_login_attempts = 0
    user.locked_until = None

    await record_audit_log(
        db=db,
        tenant_id=user.tenant_id,
        action="USER_LOGIN_SUCCESS",
        resource_type="auth",
        resource_id=user.id,
        user_id=user.id,
        user_email=user.email,
        ip_address=client_ip,
        user_agent=user_agent
    )
    await db.commit()

    token = create_access_token(
        subject=user.id,
        tenant_id=user.tenant_id,
        role=user.role.value
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/logout")
async def logout(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Revokes the current JWT access token, immediately invalidating the session.
    """
    if credentials:
        revoke_token(credentials.credentials)
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        await record_audit_log(
            db=db,
            tenant_id=current_user.tenant_id,
            action="USER_LOGOUT",
            resource_type="auth",
            resource_id=current_user.id,
            user_id=current_user.id,
            user_email=current_user.email,
            ip_address=client_ip,
            user_agent=user_agent,
            details={"message": "Session invalidated via token revocation"}
        )
        await db.commit()

    return {"message": "Successfully logged out. Token has been revoked."}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns current authenticated user details."""
    return current_user


@router.post("/seed-demo")
async def seed_demo_tenant(db: AsyncSession = Depends(get_db)):
    """
    Provisions a comprehensive 'Acme Store' demonstration tenant complete with
    knowledge documents (Shipping, Refund, FAQ, Warranty), sample tickets, and an active owner.
    Disabled in production environments to protect tenant isolation and credentials.
    """
    if settings.APP_ENV.lower() == "production" or not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo provisioning endpoint is disabled in production environments."
        )

    demo_slug = "acme-store"
    existing_tenant_res = await db.execute(select(Tenant).where(Tenant.slug == demo_slug))
    existing_tenant = existing_tenant_res.scalar_one_or_none()

    if existing_tenant:
        # Return existing demo credentials
        stmt_user = select(User).where(User.tenant_id == existing_tenant.id)
        user_res = await db.execute(stmt_user)
        demo_user = user_res.scalars().first()
        token = create_access_token(subject=demo_user.id, tenant_id=existing_tenant.id, role=demo_user.role.value)
        return {
            "message": "Demo tenant already provisioned.",
            "tenant_id": existing_tenant.id,
            "widget_key": existing_tenant.widget_key,
            "demo_email": demo_user.email,
            "demo_password": "Password123!",
            "access_token": token
        }

    # 1. Create Acme Tenant
    acme_tenant = Tenant(
        name="Acme Store",
        slug=demo_slug,
        plan="professional"
    )
    db.add(acme_tenant)
    await db.flush()

    # 2. Create Owner User
    demo_user = User(
        tenant_id=acme_tenant.id,
        email="admin@acmestore.com",
        hashed_password=get_password_hash("Password123!"),
        full_name="Sarah Khan (Support Lead)",
        role=UserRole.TENANT_OWNER
    )
    db.add(demo_user)
    await db.flush()

    # 3. Create Sample Customers
    customer_1 = Customer(
        tenant_id=acme_tenant.id,
        name="Alex Morgan",
        email="alex@customer.com",
        phone="+1 555-0199"
    )
    customer_2 = Customer(
        tenant_id=acme_tenant.id,
        name="Elena Rostova",
        email="elena@example.com",
        phone="+1 555-0144"
    )
    db.add_all([customer_1, customer_2])
    await db.flush()

    # 4. Ingest Official Knowledge Documents
    llm = get_llm_provider()
    demo_docs = [
        {
            "title": "Acme Refund & Return Policy",
            "type": DocumentType.FAQ,
            "content": (
                "Acme Store offers a 30-day money-back guarantee on all eligible products. "
                "To qualify for a refund, items must be unused, in their original packaging, and accompanied by proof of purchase. "
                "Damaged or defective products are eligible for an immediate replacement or full refund upon inspection. "
                "Refunds are processed back to the original payment method within 5 to 7 business days. "
                "Perishable goods, digital gift cards, and clearance items are non-refundable."
            )
        },
        {
            "title": "Shipping & Delivery Policy",
            "type": DocumentType.FAQ,
            "content": (
                "Standard domestic shipping takes 3 to 5 business days and costs a flat rate of $4.99. "
                "Orders exceeding $50 automatically qualify for free standard shipping. "
                "Express expedited 2-day delivery is available for $14.99. "
                "International delivery takes between 7 to 14 business days depending on customs clearance. "
                "Tracking numbers are dispatched via email within 24 hours of package departure."
            )
        },
        {
            "title": "Hardware Warranty & Technical Support",
            "type": DocumentType.FAQ,
            "content": (
                "All Acme electronic hardware devices include a 1-year limited manufacturer warranty. "
                "This warranty covers defects in materials and craftsmanship under normal consumer usage. "
                "Accidental liquid damage, physical drops, and unauthorized third-party repairs void the warranty. "
                "For warranty claims, customers should contact support with device serial numbers."
            )
        },
        {
            "title": "Order Tracking & Delivery Status FAQ",
            "type": DocumentType.FAQ,
            "content": (
                "Customers can track their orders 24/7 by navigating to the Orders Tracking section. "
                "Every dispatched order is assigned a unique tracking number sent via email within 24 hours of package departure. "
                "Real-time courier tracking updates from FedEx and DHL are refreshed every 4 hours. "
                "If you need help tracking an order, simply provide your order number to support for an instant status update."
            )
        }
    ]

    for doc_item in demo_docs:
        doc = Document(
            tenant_id=acme_tenant.id,
            title=doc_item["title"],
            file_type=doc_item["type"],
            status=DocumentStatus.PROCESSED
        )
        db.add(doc)
        await db.flush()

        chunks = split_text_into_chunks(doc_item["content"], chunk_size_words=60, overlap_words=10)
        chunk_texts = [c["content"] for c in chunks]
        embeddings = await llm.generate_embeddings(chunk_texts)

        for c_data, emb in zip(chunks, embeddings):
            chunk = KnowledgeChunk(
                tenant_id=acme_tenant.id,
                document_id=doc.id,
                content=c_data["content"],
                chunk_index=c_data["chunk_index"],
                token_count=c_data["token_count"],
                embedding_json=json.dumps(emb),
                metadata_json=json.dumps({"section": f"{doc_item['title']} - Sec {c_data['chunk_index'] + 1}"})
            )
            db.add(chunk)
        doc.chunk_count = len(chunks)

    # 5. Create Sample Tickets
    sample_ticket_1 = Ticket(
        tenant_id=acme_tenant.id,
        customer_id=customer_1.id,
        subject="Damaged Package on Delivery (Order #4928)",
        description="Customer reported that the outer package arrived torn and product casing was cracked.",
        status=TicketStatus.OPEN,
        priority=TicketPriority.HIGH,
        category=TicketCategory.REFUND,
        escalation_reason="Damaged product delivery reported by customer"
    )
    sample_ticket_2 = Ticket(
        tenant_id=acme_tenant.id,
        customer_id=customer_2.id,
        subject="Shipping Address Update Request",
        description="Customer requested address modification before parcel departure.",
        status=TicketStatus.RESOLVED,
        priority=TicketPriority.MEDIUM,
        category=TicketCategory.GENERAL,
        assigned_agent_id=demo_user.id
    )
    db.add_all([sample_ticket_1, sample_ticket_2])

    await db.commit()

    token = create_access_token(subject=demo_user.id, tenant_id=acme_tenant.id, role=demo_user.role.value)
    return {
        "message": "Demo tenant 'Acme Store' provisioned successfully.",
        "tenant_id": acme_tenant.id,
        "widget_key": acme_tenant.widget_key,
        "demo_email": demo_user.email,
        "demo_password": "Password123!",
        "access_token": token
    }
