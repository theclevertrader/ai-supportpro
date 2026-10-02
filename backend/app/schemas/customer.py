from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class CustomerBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    external_id: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
