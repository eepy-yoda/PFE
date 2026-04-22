from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class TimeLogCreate(BaseModel):
    task_id: UUID
    description: Optional[str] = None


class TimeLogManualCreate(BaseModel):
    task_id: UUID
    start_time: datetime
    end_time: datetime
    description: Optional[str] = None


class TimeLogRead(BaseModel):
    id: UUID
    task_id: UUID
    user_id: UUID
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    description: Optional[str] = None
    is_manual: bool
    created_at: datetime
    task_title: Optional[str] = None
    project_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TimeSummaryRead(BaseModel):
    today_seconds: float
    week_seconds: float
    active_timer: Optional[TimeLogRead] = None
