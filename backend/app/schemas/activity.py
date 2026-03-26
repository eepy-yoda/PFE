from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from uuid import UUID
from datetime import datetime

class ActivityLogBase(BaseModel):
    action: str
    entity_type: str
    entity_id: Optional[UUID] = None
    details: Optional[Dict[str, Any]] = None

class ActivityLogCreate(ActivityLogBase):
    user_id: UUID

class ActivityLogRead(ActivityLogBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
