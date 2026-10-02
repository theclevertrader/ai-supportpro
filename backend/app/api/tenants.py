from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.schemas.tenant import TenantResponse, TenantUpdate
from app.api.deps import get_current_user, get_current_tenant, require_roles

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.get("/current", response_model=TenantResponse)
async def get_my_tenant(tenant: Tenant = Depends(get_current_tenant)):
    """Returns the authenticated tenant workspace information."""
    return tenant


@router.patch("/current", response_model=TenantResponse)
async def update_my_tenant(
    data: TenantUpdate,
    tenant: Tenant = Depends(get_current_tenant),
    current_user: User = Depends(require_roles([UserRole.TENANT_OWNER, UserRole.PLATFORM_ADMIN])),
    db: AsyncSession = Depends(get_db)
):
    """Updates tenant workspace settings (restricted to Tenant Owners)."""
    if data.name is not None:
        tenant.name = data.name
    if data.plan is not None:
        tenant.plan = data.plan
    if data.is_active is not None and current_user.role == UserRole.PLATFORM_ADMIN:
        tenant.is_active = data.is_active

    await db.commit()
    await db.refresh(tenant)
    return tenant
