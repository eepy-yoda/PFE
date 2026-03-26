from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import enum

class UserRole(str, enum.Enum):
    client = "client"
    admin = "admin"
    manager = "manager"
    employee = "employee"

from app.schemas.rbac import RoleRead

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    username: Optional[str] = None
    agency_name: Optional[str] = None
    role: Optional[UserRole] = UserRole.client
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    agency_name: Optional[str] = None
    is_active: Optional[bool] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class AdminUserCreate(BaseModel):
    """Used by admin to create employee accounts"""
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.employee
    role_ids: Optional[List[UUID]] = []

class AdminUserUpdate(BaseModel):
    """Used by admin to change role or activate/deactivate"""
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    role_ids: Optional[List[UUID]] = None

class UserRead(UserBase):
    id: UUID
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    assigned_roles: List[RoleRead] = []

    model_config = ConfigDict(from_attributes=True)

