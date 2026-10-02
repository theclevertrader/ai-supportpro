import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class ChannelType(str, Enum):
    WEB_CHAT = "WEB_CHAT"
    EMAIL = "EMAIL"
    WHATSAPP = "WHATSAPP"


class ConversationStatus(str, Enum):
    OPEN = "OPEN"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class ConversationMode(str, Enum):
    AI = "AI"
    HUMAN = "HUMAN"
    MIXED = "MIXED"


class SenderType(str, Enum):
    CUSTOMER = "CUSTOMER"
    AI = "AI"
    AGENT = "AGENT"
    SYSTEM = "SYSTEM"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(SQLEnum(ChannelType), default=ChannelType.WEB_CHAT, nullable=False)
    status = Column(SQLEnum(ConversationStatus), default=ConversationStatus.OPEN, nullable=False)
    mode = Column(SQLEnum(ConversationMode), default=ConversationMode.AI, nullable=False)
    subject = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="conversations")
    customer = relationship("Customer", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")
    ticket = relationship("Ticket", back_populates="conversation", uselist=False)


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_type = Column(SQLEnum(SenderType), nullable=False)
    sender_id = Column(String(100), nullable=True)  # user_id or customer_id
    content = Column(Text, nullable=False)
    token_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    citations = relationship("Citation", back_populates="message", cascade="all, delete-orphan")
