from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.project import ProjectStatus

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.briefing
    client_id: Optional[UUID] = None
    brief_content: Optional[str] = None
    next_question: Optional[str] = None
    brief_history: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class BriefRequest(BaseModel):
    name: str
    goals: str
    target_audience: str
    additional_details: Optional[str] = None

class AnswerRequest(BaseModel):
    project_id: UUID
    answer: str

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    client_id: Optional[UUID] = None

class ProjectRead(ProjectBase):
    id: UUID
    manager_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
