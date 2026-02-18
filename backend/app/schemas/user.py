from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime
import enum

class UserRole(str, enum.Enum):
    CLIENT = "client"
    ADMIN = "admin"
    MANAGER = "manager"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    username: Optional[str] = None
    agency_name: Optional[str] = None
    role: Optional[UserRole] = UserRole.CLIENT

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserRead(UserBase):
    id: UUID
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
