from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings

router = APIRouter(tags=["Health & Diagnostics"])


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Healthcheck endpoint verifying DB connectivity and service readiness."""
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "database": db_status,
        "llm_provider": settings.DEFAULT_LLM_PROVIDER,
        "environment": settings.APP_ENV
    }
