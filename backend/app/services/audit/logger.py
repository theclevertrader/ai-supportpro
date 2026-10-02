import json
from typing import Optional, Union, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog


async def record_audit_log(
    db: AsyncSession,
    tenant_id: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[Union[Dict[str, Any], str]] = None,
) -> AuditLog:
    """
    Persists an immutable audit log entry for enterprise governance and SOC2 compliance.
    """
    details_str = None
    if details:
        if isinstance(details, dict):
            details_str = json.dumps(details)
        else:
            details_str = str(details)

    log_entry = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        user_email=user_email,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details_str
    )
    db.add(log_entry)
    await db.flush()
    return log_entry
