import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class DocumentStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"


class DocumentType(str, Enum):
    PDF = "PDF"
    DOCX = "DOCX"
    TXT = "TXT"
    MARKDOWN = "MARKDOWN"
    WEBSITE = "WEBSITE"
    FAQ = "FAQ"


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    file_type = Column(SQLEnum(DocumentType), nullable=False)
    file_path = Column(String(500), nullable=True)
    source_url = Column(String(500), nullable=True)
    status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.PENDING, nullable=False)
    chunk_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="documents")
    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    token_count = Column(Integer, default=0)
    embedding_json = Column(Text, nullable=False)  # Serialized vector embeddings float list
    metadata_json = Column(Text, nullable=True, default="{}")  # {"page": 1, "section": "..."}
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    document = relationship("Document", back_populates="chunks")
    citations = relationship("Citation", back_populates="chunk", cascade="all, delete-orphan")


class Citation(Base):
    __tablename__ = "citations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id = Column(String(36), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_id = Column(String(36), ForeignKey("knowledge_chunks.id", ondelete="CASCADE"), nullable=False, index=True)
    source_title = Column(String(200), nullable=False)
    page_or_section = Column(String(100), nullable=True)
    similarity_score = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    message = relationship("Message", back_populates="citations")
    chunk = relationship("KnowledgeChunk", back_populates="citations")
