from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.sanitizer import sanitize_text_input
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketNote, TicketStatus, TicketPriority, TicketCategory
from app.models.customer import Customer
from app.schemas.ticket import (
    TicketCreate,
    TicketUpdate,
    TicketResponse,
    TicketNoteCreate,
    TicketNoteResponse
)
from app.api.deps import get_current_tenant, get_current_user
from app.services.audit.logger import record_audit_log

router = APIRouter(prefix="/tickets", tags=["Ticketing System"])


@router.get("", response_model=List[TicketResponse])
async def list_tickets(
    status_filter: Optional[TicketStatus] = None,
    priority_filter: Optional[TicketPriority] = None,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Lists all support tickets belonging strictly to the current tenant."""
    stmt = (
        select(Ticket)
        .where(Ticket.tenant_id == tenant.id)
        .options(selectinload(Ticket.notes))
        .order_by(Ticket.created_at.desc())
    )
    if status_filter:
        stmt = stmt.where(Ticket.status == status_filter)
    if priority_filter:
        stmt = stmt.where(Ticket.priority == priority_filter)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/public/lookup/{ticket_id}")
async def public_ticket_lookup(
    ticket_id: str,
    widget_key: str = Query(..., description="Tenant public widget key"),
    customer_email: str = Query(..., description="Customer email for identity verification"),
    db: AsyncSession = Depends(get_db)
):
    """
    Public customer ticket lookup.
    Requires widget_key and customer email to prevent unauthorized data exposure.
    Only returns the customer's own ticket and non-internal notes.
    """
    tenant_res = await db.execute(select(Tenant).where(Tenant.widget_key == widget_key, Tenant.is_active == True))
    tenant = tenant_res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Invalid widget key.")

    stmt = (
        select(Ticket)
        .join(Customer, Ticket.customer_id == Customer.id)
        .where(
            Ticket.id == ticket_id,
            Ticket.tenant_id == tenant.id,
            Customer.email == customer_email.lower().strip()
        )
        .options(selectinload(Ticket.notes))
    )
    result = await db.execute(stmt)
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found or customer verification failed.")

    # Filter out internal notes - only expose customer-visible notes
    public_notes = [n for n in ticket.notes if not n.is_internal]

    return {
        "id": ticket.id,
        "subject": ticket.subject,
        "description": ticket.description,
        "status": ticket.status.value,
        "priority": ticket.priority.value,
        "category": ticket.category.value,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "notes": [
            {
                "id": n.id,
                "author_name": n.author_name,
                "note": n.note,
                "created_at": n.created_at
            }
            for n in public_notes
        ]
    }


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    data: TicketCreate,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Creates a new support ticket within the tenant workspace."""
    ticket = Ticket(
        tenant_id=tenant.id,
        customer_id=data.customer_id,
        conversation_id=data.conversation_id,
        subject=sanitize_text_input(data.subject, 200),
        description=sanitize_text_input(data.description, 4000),
        priority=data.priority or TicketPriority.MEDIUM,
        category=data.category or TicketCategory.GENERAL,
        escalation_reason=sanitize_text_input(data.escalation_reason or "", 500),
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: str,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves detailed ticket information and notes."""
    stmt = (
        select(Ticket)
        .where(Ticket.id == ticket_id, Ticket.tenant_id == tenant.id)
        .options(selectinload(Ticket.notes))
    )
    result = await db.execute(stmt)
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: str,
    data: TicketUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates ticket status, priority, or assigned agent."""
    stmt = (
        select(Ticket)
        .where(Ticket.id == ticket_id, Ticket.tenant_id == tenant.id)
        .options(selectinload(Ticket.notes))
    )
    result = await db.execute(stmt)
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    if data.subject is not None:
        ticket.subject = sanitize_text_input(data.subject, 200)
    if data.description is not None:
        ticket.description = sanitize_text_input(data.description, 4000)
    if data.priority is not None:
        ticket.priority = data.priority
    if data.category is not None:
        ticket.category = data.category
    if data.assigned_agent_id is not None:
        ticket.assigned_agent_id = data.assigned_agent_id
    if data.status is not None:
        ticket.status = data.status
        if data.status in (TicketStatus.RESOLVED, TicketStatus.CLOSED):
            ticket.resolved_at = datetime.now(timezone.utc)

    await record_audit_log(
        db=db,
        tenant_id=tenant.id,
        action="TICKET_UPDATED",
        resource_type="ticket",
        resource_id=ticket.id,
        user_id=current_user.id,
        user_email=current_user.email,
        details={"status": str(ticket.status.value), "priority": str(ticket.priority.value)}
    )

    await db.commit()
    return ticket


@router.post("/{ticket_id}/notes", response_model=TicketNoteResponse)
async def add_ticket_note(
    ticket_id: str,
    data: TicketNoteCreate,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Adds an internal collaboration note to a ticket."""
    stmt = select(Ticket).where(Ticket.id == ticket_id, Ticket.tenant_id == tenant.id)
    result = await db.execute(stmt)
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")

    safe_note = sanitize_text_input(data.note, 5000)

    note = TicketNote(
        ticket_id=ticket.id,
        author_id=current_user.id,
        author_name=current_user.full_name,
        note=safe_note,
        is_internal=data.is_internal
    )
    db.add(note)

    await record_audit_log(
        db=db,
        tenant_id=tenant.id,
        action="TICKET_NOTE_ADDED",
        resource_type="ticket",
        resource_id=ticket.id,
        user_id=current_user.id,
        user_email=current_user.email,
        details={"is_internal": data.is_internal}
    )

    await db.commit()
    await db.refresh(note)
    return note
