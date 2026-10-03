"""
AI SupportPro — Database Seeding Utility
Usage: python seed.py
Initializes the database schema and seeds official demo tenant, users, customers, and policies.
"""
import asyncio
import os
import sys

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import init_db, AsyncSessionLocal
from sqlalchemy import select
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.document import Document, DocumentType, DocumentStatus, KnowledgeChunk
from app.core.security import get_password_hash
from app.services.llm.factory import get_llm_provider
from app.services.rag.chunker import split_text_into_chunks
from app.core.config import settings
import json

async def run_seed():
    print("=" * 60)
    print("  Initializing AI SupportPro Database & Seeding Demo")
    print("=" * 60)
    await init_db()

    async with AsyncSessionLocal() as db:
        # Check if Acme Store exists
        res = await db.execute(select(Tenant).where(Tenant.slug == "acme-store"))
        tenant = res.scalar_one_or_none()
        if tenant:
            print(f"[OK] Demo Tenant already exists: {tenant.name} (Key: {tenant.widget_key})")
            print("-> Verifying and seeding any missing demo Knowledge Base policies...")
        else:
            print("-> Creating Acme Store Tenant...")
            tenant = Tenant(
                name="Acme Store",
                slug="acme-store",
                plan="professional"
            )
            db.add(tenant)
            await db.flush()

            print("-> Creating Demo Admin Account...")
            user = User(
                tenant_id=tenant.id,
                email="admin@acmestore.com",
                hashed_password=get_password_hash("Password123!"),
                full_name="Sarah Khan (Support Lead)",
                role=UserRole.TENANT_OWNER
            )
            db.add(user)

            print("-> Seeding Sample Customers...")
            c1 = Customer(tenant_id=tenant.id, name="Sarah (VIP Retail)", email="sarah@retailhub.com", phone="+1 555-0101")
            c2 = Customer(tenant_id=tenant.id, name="Ahmed Khan", email="ahmed@khanlogistics.pk", phone="+1 555-0102")
            c3 = Customer(tenant_id=tenant.id, name="Fatima Ali", email="fatima.ali@mail.com", phone="+1 555-0103")
            c4 = Customer(tenant_id=tenant.id, name="Usman Raza", email="usman.raza@acmecorp.com", phone="+1 555-0104")
            db.add_all([c1, c2, c3, c4])
            await db.flush()

        print("-> Ingesting & Embedding Official Knowledge Base Policies...")
        llm = get_llm_provider()
        demo_docs = [
            {
                "title": "Acme Refund & Return Policy",
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
                "content": (
                    "All Acme electronic hardware devices include a 1-year limited manufacturer warranty. "
                    "This warranty covers defects in materials and craftsmanship under normal consumer usage. "
                    "Accidental liquid damage, physical drops, and unauthorized third-party repairs void the warranty. "
                    "For warranty claims, customers should contact support with device serial numbers."
                )
            },
            {
                "title": "Order Tracking & Delivery Status FAQ",
                "content": (
                    "Customers can track their orders 24/7 by navigating to the Orders Tracking section. "
                    "Every dispatched order is assigned a unique tracking number sent via email within 24 hours of package departure. "
                    "Real-time courier tracking updates from FedEx and DHL are refreshed every 4 hours. "
                    "If you need help tracking an order, simply provide your order number to support for an instant status update."
                )
            }
        ]

        for doc_item in demo_docs:
            existing_doc = await db.execute(
                select(Document).where(
                    Document.tenant_id == tenant.id,
                    Document.title == doc_item["title"]
                )
            )
            if existing_doc.scalar_one_or_none():
                continue

            print(f"-> Ingesting missing policy: {doc_item['title']}...")
            doc = Document(
                tenant_id=tenant.id,
                title=doc_item["title"],
                file_type=DocumentType.FAQ,
                status=DocumentStatus.PROCESSED
            )
            db.add(doc)
            await db.flush()

            chunks = split_text_into_chunks(doc_item["content"], chunk_size_words=60, overlap_words=10)
            chunk_texts = [c["content"] for c in chunks]
            embeddings = await llm.generate_embeddings(chunk_texts)

            for idx, (c_data, emb) in enumerate(zip(chunks, embeddings)):
                kc = KnowledgeChunk(
                    tenant_id=tenant.id,
                    document_id=doc.id,
                    content=c_data["content"],
                    chunk_index=idx,
                    token_count=c_data.get("token_count", len(c_data["content"]) // 4),
                    embedding_json=json.dumps(emb)
                )
                db.add(kc)
            doc.chunk_count = len(chunks)

        await db.commit()
        print("\n[SUCCESS] Seeding complete!")
        print(f"  Login Email:    admin@acmestore.com")
        print(f"  Login Password: Password123!")
        print(f"  Widget Key:     {tenant.widget_key}")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_seed())
