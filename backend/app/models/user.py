import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserRole(str, Enum):
    PLATFORM_ADMIN = "PLATFORM_ADMIN"
    TENANT_OWNER = "TENANT_OWNER"
    TENANT_ADMIN = "TENANT_ADMIN"
    SUPPORT_AGENT = "SUPPORT_AGENT"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.SUPPORT_AGENT, nullable=False)
    is_active = Column(Boolean, default=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    assigned_tickets = relationship("Ticket", back_populates="assigned_agent")
