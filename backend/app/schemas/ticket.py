from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.ticket import TicketStatus, TicketPriority, TicketCategory


class TicketNoteCreate(BaseModel):
    note: str
    is_internal: bool = True


class TicketNoteResponse(BaseModel):
    id: str
    ticket_id: str
    author_id: Optional[str] = None
    author_name: str
    note: str
    is_internal: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TicketBase(BaseModel):
    subject: str
    description: str
    priority: Optional[TicketPriority] = TicketPriority.MEDIUM
    category: Optional[TicketCategory] = TicketCategory.GENERAL


class TicketCreate(TicketBase):
    customer_id: str
    conversation_id: Optional[str] = None
    escalation_reason: Optional[str] = None


class TicketUpdate(BaseModel):
    subject: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    category: Optional[TicketCategory] = None
    assigned_agent_id: Optional[str] = None


class TicketResponse(TicketBase):
    id: str
    tenant_id: str
    customer_id: str
    conversation_id: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    status: TicketStatus
    escalation_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    notes: List[TicketNoteResponse] = []

    model_config = ConfigDict(from_attributes=True)
