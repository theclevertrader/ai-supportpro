from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.document import DocumentType, DocumentStatus


class DocumentCreate(BaseModel):
    title: str
    file_type: DocumentType
    content: Optional[str] = None
    source_url: Optional[str] = None


class KnowledgeChunkResponse(BaseModel):
    id: str
    chunk_index: int
    content: str
    token_count: int
    metadata_json: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentResponse(BaseModel):
    id: str
    tenant_id: str
    title: str
    file_type: DocumentType
    source_url: Optional[str] = None
    status: DocumentStatus
    chunk_count: int
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class KnowledgeSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 4
    similarity_threshold: Optional[float] = None


class KnowledgeSearchResult(BaseModel):
    chunk_id: str
    document_id: str
    source_title: str
    content: str
    similarity_score: float
    page_or_section: Optional[str] = None
