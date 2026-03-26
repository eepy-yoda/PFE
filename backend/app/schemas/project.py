from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.project import ProjectStatus, BriefStatus, PaymentStatus

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.planning
    client_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    deadline: Optional[datetime] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    client_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    deadline: Optional[datetime] = None

class ProjectRead(ProjectBase):
    id: UUID
    manager_id: UUID
    brief_status: BriefStatus
    payment_status: PaymentStatus
    clarification_notes: Optional[str] = None
    brief_content: Optional[str] = None
    paid_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Manager Dashboard Schemas ─────────────────────────────────────────────────

class WorkerStat(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    completed_tasks: int
    total_tasks: int
    on_time_tasks: int
    avg_ai_score: Optional[float] = None
    performance_score: float  # 0–100, derived from completion + deadline + AI

class RevenueSnapshot(BaseModel):
    paid_count: int
    pending_count: int
    overdue_count: int
    recently_paid: List[ProjectRead] = []

class WorkloadTaskItem(BaseModel):
    id: UUID
    title: str
    status: str
    priority: str
    deadline: Optional[datetime] = None
    project_name: Optional[str] = None
    assigned_to: Optional[UUID] = None

class TaskWorkloadSnapshot(BaseModel):
    total: int
    todo: int
    in_progress: int
    near_deadline: List[WorkloadTaskItem] = []
    urgent: List[WorkloadTaskItem] = []

class ProjectSnapshot(BaseModel):
    total: int
    active: int
    completed: int
    delivered: int
    on_hold: int
    delayed: int

class DashboardAlertItem(BaseModel):
    type: str   # 'late_task' | 'low_ai_score' | 'pending_brief' | 'unassigned'
    title: str
    detail: str
    priority: str  # 'critical' | 'warning' | 'info'
    entity_id: Optional[str] = None

class ManagerDashboardData(BaseModel):
    kpi_total_tasks: int
    kpi_completion_rate: float
    kpi_avg_ai_score: Optional[float] = None
    kpi_active_workers: int
    workers: List[WorkerStat] = []
    revenue: RevenueSnapshot
    workload: TaskWorkloadSnapshot
    projects: ProjectSnapshot
    alerts: List[DashboardAlertItem] = []
    briefs: List[ProjectRead] = []
    active_projects: List[ProjectRead] = []
