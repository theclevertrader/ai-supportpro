from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog
from app.api.deps import get_current_tenant, require_roles


class AuditLogResponse(BaseModel):
    id: str
    tenant_id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


router = APIRouter(tags=["Audit & Governance"])


@router.get("/audit-logs", response_model=List[AuditLogResponse])
@router.get("/audit", response_model=List[AuditLogResponse])
async def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action name"),
    limit: int = Query(50, ge=1, le=200),
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles([UserRole.TENANT_OWNER, UserRole.TENANT_ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns an immutable audit log trail for SOC2 / ISO compliance.
    Accessible only to tenant administrators and owners.
    """
    stmt = select(AuditLog).where(AuditLog.tenant_id == tenant.id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    stmt = stmt.order_by(AuditLog.created_at.desc()).limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()
