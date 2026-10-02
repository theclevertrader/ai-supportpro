from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str
    tenant_name: str
    tenant_slug: str
    role: Optional[UserRole] = UserRole.TENANT_OWNER


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class TokenPayload(BaseModel):
    sub: str
    tenant_id: str
    role: str
    exp: int


class UserResponse(UserBase):
    id: str
    tenant_id: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
