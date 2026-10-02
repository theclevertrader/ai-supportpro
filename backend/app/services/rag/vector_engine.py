import json
import math
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.document import KnowledgeChunk, Document, DocumentStatus
from app.services.llm.base import BaseLLMProvider


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Computes cosine similarity between two float vectors."""
    if len(v1) != len(v2) or not v1:
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot_product / (norm_a * norm_b)


class VectorEngine:
    """
    Multi-tenant vector search and retrieval engine.
    Ensures that Tenant A can NEVER retrieve chunks belonging to Tenant B.
    """

    @staticmethod
    async def search_relevant_chunks(
        db: AsyncSession,
        tenant_id: str,
        query: str,
        llm_provider: BaseLLMProvider,
        top_k: int = 4,
        similarity_threshold: float = 0.50
    ) -> List[Dict[str, Any]]:
        """
        Embeds the customer query and retrieves the top-K most semantically similar
        knowledge chunks strictly within the authenticated tenant scope.
        """
        # Generate query embedding
        query_embeddings = await llm_provider.generate_embeddings([query])
        if not query_embeddings:
            return []
        q_vec = query_embeddings[0]

        # Retrieve all chunks strictly matching tenant_id and processed documents
        stmt = (
            select(KnowledgeChunk, Document.title)
            .join(Document, KnowledgeChunk.document_id == Document.id)
            .where(
                KnowledgeChunk.tenant_id == tenant_id,
                Document.status == DocumentStatus.PROCESSED
            )
        )
        result = await db.execute(stmt)
        rows = result.all()

        scored_results = []
        for chunk, doc_title in rows:
            try:
                chunk_vec = json.loads(chunk.embedding_json)
                score = cosine_similarity(q_vec, chunk_vec)
                if score >= similarity_threshold:
                    meta = json.loads(chunk.metadata_json or "{}")
                    scored_results.append({
                        "chunk_id": chunk.id,
                        "document_id": chunk.document_id,
                        "source_title": doc_title,
                        "content": chunk.content,
                        "similarity_score": round(score, 4),
                        "page_or_section": meta.get("section") or meta.get("page") or f"Section {chunk.chunk_index + 1}"
                    })
            except Exception:
                continue

        # Sort by similarity descending
        scored_results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored_results[:top_k]
