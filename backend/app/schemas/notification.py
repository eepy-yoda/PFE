from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models.notification import NotificationType, NotificationStatus


class NotificationRead(BaseModel):
    id: UUID
    user_id: UUID
    type: NotificationType
    status: NotificationStatus
    title: str
    body: Optional[str] = None
    project_id: Optional[UUID] = None
    task_id: Optional[UUID] = None
    brief_id: Optional[UUID] = None
    created_at: datetime
    read_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
