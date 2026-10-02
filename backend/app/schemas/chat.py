from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.conversation import ChannelType, ConversationStatus, ConversationMode, SenderType


class CitationResponse(BaseModel):
    id: Optional[str] = None
    source_title: str
    page_or_section: Optional[str] = None
    similarity_score: float

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_type: SenderType
    sender_id: Optional[str] = None
    content: str
    token_count: int
    created_at: datetime
    citations: List[CitationResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: str
    tenant_id: str
    customer_id: str
    channel: ChannelType
    status: ConversationStatus
    mode: ConversationMode
    subject: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ChatMessageRequest(BaseModel):
    widget_key: str
    customer_name: str
    customer_email: str
    message: str
    conversation_id: Optional[str] = None
    channel: Optional[ChannelType] = ChannelType.WEB_CHAT


class ChatMessageResponse(BaseModel):
    conversation_id: str
    message_id: str
    content: str
    sender_type: SenderType
    citations: List[CitationResponse] = []
    is_escalated: bool = False
    escalation_reason: Optional[str] = None
    ticket_id: Optional[str] = None
    created_at: datetime


class EscalateRequest(BaseModel):
    reason: Optional[str] = "Customer requested human agent assistance"
