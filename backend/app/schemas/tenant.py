from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TenantBase(BaseModel):
    name: str
    slug: str
    plan: Optional[str] = "starter"


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    plan: Optional[str] = None
    is_active: Optional[bool] = None


class TenantResponse(TenantBase):
    id: str
    widget_key: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
