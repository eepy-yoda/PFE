from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime
from app.models.task import TaskStatus


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[str] = "medium"
    order_index: Optional[int] = 0


class TaskCreate(TaskBase):
    project_id: UUID
    assignee_ids: Optional[List[UUID]] = [] # New: multiple assignees
    assigned_to: Optional[UUID] = None # Legacy single assignee


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    assignee_ids: Optional[List[UUID]] = None # New
    assigned_to: Optional[UUID] = None # Legacy
    deadline: Optional[datetime] = None
    priority: Optional[str] = None
    order_index: Optional[int] = None


class TaskRead(TaskBase):
    id: UUID
    project_id: UUID
    status: TaskStatus
    assigned_to: Optional[UUID] = None
    assignee_ids: List[UUID] = [] # List of assignee UUIDs
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    project_name: Optional[str] = None  # populated via Task.project_name property

    model_config = ConfigDict(from_attributes=True)


# --- Submission Schemas ---

class TaskSubmissionCreate(BaseModel):
    task_id: UUID
    content: Optional[str] = None
    links: Optional[List[str]] = None
    file_paths: Optional[List[str]] = None


class TaskSubmissionRead(BaseModel):
    id: UUID
    task_id: UUID
    submitted_by: UUID
    content: Optional[str] = None
    links: Optional[str] = None
    file_paths: Optional[str] = None
    ai_score: Optional[float] = None
    ai_feedback: Optional[str] = None
    is_approved: bool
    reviewed_by: Optional[UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Feedback Schemas ---

class TaskFeedbackCreate(BaseModel):
    task_id: UUID
    submission_id: Optional[UUID] = None
    sent_to: UUID
    message: str
    is_revision_request: bool = False


class TaskFeedbackRead(BaseModel):
    id: UUID
    task_id: UUID
    submission_id: Optional[UUID] = None
    sent_by: UUID
    sent_to: UUID
    message: str
    is_revision_request: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Dependency Schemas ---

class TaskDependencyCreate(BaseModel):
    task_id: UUID
    depends_on_task_id: UUID


class AIReviewResult(BaseModel):
    """Webhook payload from AI review service"""
    task_id: UUID
    submission_id: UUID
    score: float  # 0-100
    feedback: str
