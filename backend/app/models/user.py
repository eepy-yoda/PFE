import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.rbac import user_roles  # type: ignore


class UserRole(str, enum.Enum):
    client = "client"
    admin = "admin"
    manager = "manager"
    employee = "employee"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    # Password is owned by Supabase Auth — this column is kept nullable for
    # legacy rows and is no longer used for authentication.
    hashed_password = Column(String, nullable=True)
    role = Column(SQLEnum(UserRole, name="userrole", create_type=False), default=UserRole.client, nullable=False)
    avatar_url = Column(String, nullable=True)
    agency_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    # verification_token, reset_password_token, reset_token_expires removed —
    # Supabase Auth manages email verification and password resets.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    assigned_roles = relationship("Role", secondary=user_roles, back_populates="users")
