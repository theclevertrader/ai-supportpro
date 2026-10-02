import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class TicketStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_FOR_CUSTOMER = "WAITING_FOR_CUSTOMER"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class TicketPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class TicketCategory(str, Enum):
    GENERAL = "GENERAL"
    BILLING = "BILLING"
    REFUND = "REFUND"
    TECHNICAL = "TECHNICAL"
    COMPLAINT = "COMPLAINT"


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_agent_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.OPEN, nullable=False, index=True)
    priority = Column(SQLEnum(TicketPriority), default=TicketPriority.MEDIUM, nullable=False)
    category = Column(SQLEnum(TicketCategory), default=TicketCategory.GENERAL, nullable=False)
    escalation_reason = Column(String(255), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="tickets")
    customer = relationship("Customer", back_populates="tickets")
    conversation = relationship("Conversation", back_populates="ticket")
    assigned_agent = relationship("User", back_populates="assigned_tickets")
    notes = relationship("TicketNote", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketNote.created_at")


class TicketNote(Base):
    __tablename__ = "ticket_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = Column(String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    author_name = Column(String(100), nullable=False)
    note = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    ticket = relationship("Ticket", back_populates="notes")
