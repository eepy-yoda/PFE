import enum
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base


class NotificationType(str, enum.Enum):
    brief_submitted = "brief_submitted"
    clarification_requested = "clarification_requested"
    project_created = "project_created"
    task_assigned = "task_assigned"
    work_submitted = "work_submitted"
    task_late = "task_late"
    ai_score_low = "ai_score_low"
    revision_requested = "revision_requested"
    content_ready = "content_ready"
    project_paid = "project_paid"
    general = "general"


class NotificationStatus(str, enum.Enum):
    unread = "unread"
    read = "read"
    archived = "archived"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    type = Column(SQLEnum(NotificationType, name="notificationtype", create_type=True), default=NotificationType.general)
    status = Column(SQLEnum(NotificationStatus, name="notificationstatus", create_type=True), default=NotificationStatus.unread)

    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)

    # Optional links to related entities
    project_id = Column(UUID(as_uuid=True), nullable=True)
    task_id = Column(UUID(as_uuid=True), nullable=True)
    brief_id = Column(UUID(as_uuid=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
