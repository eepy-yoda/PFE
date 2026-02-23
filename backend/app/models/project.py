import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db.session import Base

class ProjectStatus(str, enum.Enum):
    briefing = "briefing"
    planning = "planning"
    active = "active"
    completed = "completed"
    on_hold = "on_hold"

class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.briefing, nullable=False)
    brief_content = Column(Text, nullable=True) # Final generated brief
    next_question = Column(Text, nullable=True) # Current question from n8n
    brief_history = Column(Text, nullable=True) # JSON string of the chat history
    
    # Relationships
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
