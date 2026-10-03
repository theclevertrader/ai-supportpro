import json
import hashlib
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.document import Document, KnowledgeChunk, DocumentType, DocumentStatus
from app.schemas.knowledge import DocumentResponse, KnowledgeSearchRequest, KnowledgeSearchResult
from app.api.deps import get_current_tenant, require_roles
from app.services.llm.factory import get_llm_provider
from app.services.rag.chunker import split_text_into_chunks
from app.services.rag.parsers import parse_pdf_bytes, sanitize_untrusted_text, fetch_website_content, validate_file_magic_bytes, normalize_filename
from app.services.storage import get_storage_service
from app.services.rag.vector_engine import VectorEngine
from app.services.audit.logger import record_audit_log

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])


@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Lists all knowledge base documents belonging strictly to the current tenant."""
    stmt = select(Document).where(Document.tenant_id == tenant.id).order_by(Document.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/upload-text", response_model=DocumentResponse)
async def upload_text_document(
    title: str = Form(...),
    content: str = Form(...),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles([UserRole.TENANT_OWNER, UserRole.TENANT_ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """Ingests raw text / markdown / FAQ knowledge into the tenant RAG index."""
    cleaned_content = sanitize_untrusted_text(content)
    if not cleaned_content.strip():
        raise HTTPException(status_code=400, detail="Document content cannot be empty.")

    doc = Document(
        tenant_id=tenant.id,
        title=title,
        file_type=DocumentType.TXT,
        status=DocumentStatus.PROCESSING
    )
    db.add(doc)
    await db.flush()

    try:
        chunks = split_text_into_chunks(cleaned_content, chunk_size_words=100, overlap_words=20)
        llm = get_llm_provider()
        chunk_texts = [c["content"] for c in chunks]
        embeddings = await llm.generate_embeddings(chunk_texts)

        for c_data, emb in zip(chunks, embeddings):
            chunk = KnowledgeChunk(
                tenant_id=tenant.id,
                document_id=doc.id,
                content=c_data["content"],
                chunk_index=c_data["chunk_index"],
                token_count=c_data["token_count"],
                embedding_json=json.dumps(emb),
                metadata_json=json.dumps({"section": f"{title} - Part {c_data['chunk_index'] + 1}"})
            )
            db.add(chunk)

        doc.chunk_count = len(chunks)
        doc.status = DocumentStatus.PROCESSED
        await db.commit()
        await db.refresh(doc)
        return doc
    except Exception as e:
        doc.status = DocumentStatus.FAILED
        doc.error_message = str(e)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


@router.post("/upload-file", response_model=DocumentResponse)
async def upload_file_document(
    file: UploadFile = File(...),
    title: str = Form(None),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles([UserRole.TENANT_OWNER, UserRole.TENANT_ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """Uploads and indexes a PDF or TXT file with MIME-type, duplicate check, and size validation."""
    # 10MB limit
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum 10MB limit.")

    raw_filename = file.filename or "uploaded_document.txt"
    safe_filename = normalize_filename(raw_filename)
    doc_title = title or safe_filename
    file_lower = safe_filename.lower()

    # Magic byte validation
    is_valid, err_msg = validate_file_magic_bytes(contents, file_lower)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"File validation failure: {err_msg}")

    # Duplicate detection via SHA-256 content hashing
    file_hash = hashlib.sha256(contents).hexdigest()
    dup_stmt = select(Document).where(
        Document.tenant_id == tenant.id,
        Document.file_path.like(f"%{file_hash}%")
    )
    dup_res = await db.execute(dup_stmt)
    if dup_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate file detected: This document has already been uploaded to your knowledge base."
        )

    # Persist file via Storage Abstraction
    storage = get_storage_service()
    storage_key = f"{file_hash[:12]}_{safe_filename}"
    saved_storage_path = await storage.save_file(tenant.id, storage_key, contents)

    if file_lower.endswith(".pdf"):
        extracted_text = parse_pdf_bytes(contents)
        doc_type = DocumentType.PDF
    elif file_lower.endswith((".txt", ".md")):
        extracted_text = contents.decode("utf-8", errors="ignore")
        doc_type = DocumentType.TXT
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, TXT, or Markdown.")

    cleaned_text = sanitize_untrusted_text(extracted_text)
    if not cleaned_text.strip():
        raise HTTPException(status_code=400, detail="No readable text extracted from document.")

    doc = Document(
        tenant_id=tenant.id,
        title=doc_title,
        file_type=doc_type,
        file_path=f"sha256:{file_hash}|{saved_storage_path}",
        status=DocumentStatus.PROCESSING
    )
    db.add(doc)
    await db.flush()

    try:
        chunks = split_text_into_chunks(cleaned_text, chunk_size_words=120, overlap_words=25)
        llm = get_llm_provider()
        chunk_texts = [c["content"] for c in chunks]
        embeddings = await llm.generate_embeddings(chunk_texts)

        for c_data, emb in zip(chunks, embeddings):
            chunk = KnowledgeChunk(
                tenant_id=tenant.id,
                document_id=doc.id,
                content=c_data["content"],
                chunk_index=c_data["chunk_index"],
                token_count=c_data["token_count"],
                embedding_json=json.dumps(emb),
                metadata_json=json.dumps({"section": f"Page/Section {c_data['chunk_index'] + 1}"})
            )
            db.add(chunk)

        doc.chunk_count = len(chunks)
        doc.status = DocumentStatus.PROCESSED

        # Upload audit trail
        await record_audit_log(
            db=db,
            tenant_id=tenant.id,
            action="FILE_UPLOADED",
            resource_type="document",
            resource_id=doc.id,
            user_id=current_user.id,
            user_email=current_user.email,
            details={
                "filename": safe_filename,
                "size_bytes": len(contents),
                "sha256": file_hash,
                "document_id": doc.id,
                "chunks": len(chunks)
            }
        )

        await db.commit()
        await db.refresh(doc)
        return doc
    except Exception as e:
        doc.status = DocumentStatus.FAILED
        doc.error_message = str(e)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to index document: {str(e)}")


@router.post("/import-url", response_model=DocumentResponse)
async def import_website_url(
    url: str = Form(...),
    title: str = Form(...),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles([UserRole.TENANT_OWNER, UserRole.TENANT_ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """Scrapes and indexes a public website documentation URL with SSRF protection."""
    try:
        web_text = await fetch_website_content(url)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unable to fetch website content: {str(e)}")

    cleaned_text = sanitize_untrusted_text(web_text)
    doc = Document(
        tenant_id=tenant.id,
        title=title,
        file_type=DocumentType.WEBSITE,
        source_url=url,
        status=DocumentStatus.PROCESSING
    )
    db.add(doc)
    await db.flush()

    chunks = split_text_into_chunks(cleaned_text, chunk_size_words=120, overlap_words=20)
    llm = get_llm_provider()
    chunk_texts = [c["content"] for c in chunks]
    embeddings = await llm.generate_embeddings(chunk_texts)

    for c_data, emb in zip(chunks, embeddings):
        chunk = KnowledgeChunk(
            tenant_id=tenant.id,
            document_id=doc.id,
            content=c_data["content"],
            chunk_index=c_data["chunk_index"],
            token_count=c_data["token_count"],
            embedding_json=json.dumps(emb),
            metadata_json=json.dumps({"url": url, "section": f"Web Section {c_data['chunk_index'] + 1}"})
        )
        db.add(chunk)

    doc.chunk_count = len(chunks)
    doc.status = DocumentStatus.PROCESSED
    await db.commit()
    await db.refresh(doc)
    return doc


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles([UserRole.TENANT_OWNER, UserRole.TENANT_ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """Deletes a document and its knowledge chunks, strictly bounded by tenant_id."""
    stmt = select(Document).where(Document.id == document_id, Document.tenant_id == tenant.id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    await db.delete(doc)
    await db.commit()
    return {"message": "Document deleted successfully."}


@router.post("/search", response_model=List[KnowledgeSearchResult])
async def search_knowledge_base(
    data: KnowledgeSearchRequest,
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Direct testing endpoint for semantic vector retrieval with similarity scores and citations."""
    llm = get_llm_provider()
    results = await VectorEngine.search_relevant_chunks(
        db=db,
        tenant_id=tenant.id,
        query=data.query,
        llm_provider=llm,
        top_k=data.top_k or 4,
        similarity_threshold=data.similarity_threshold or settings.SIMILARITY_THRESHOLD
    )
    return results
