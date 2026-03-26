from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_user_optional
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.task import Task
from app.models.project import Project
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskRead,
    TaskSubmissionCreate, TaskSubmissionRead,
    TaskFeedbackCreate, TaskFeedbackRead,
    TaskDependencyCreate, AIReviewResult,
)
from app.services.task_service import task_service

router = APIRouter()


def _require_manager_or_admin(current_user: User):
    if current_user.role not in [UserRole.manager, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Manager or Admin access required")


def _require_employee_or_above(current_user: User):
    if current_user.role not in [UserRole.employee, UserRole.manager, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Employee access required")


# ── TASK CRUD ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=TaskRead)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    return task_service.create_task(db, task_in, current_user.id)


@router.get("/project/{project_id}", response_model=List[TaskRead])
def list_tasks_for_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Access check: manager must own project, employee must be assigned to it
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role == UserRole.client and project.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return task_service.get_tasks_for_project(db, project_id)


@router.get("/my", response_model=List[TaskRead])
def list_my_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Employee: get all tasks assigned to me"""
    return task_service.get_tasks_for_employee(db, current_user.id)


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Access check: employee can only see their own tasks
    if current_user.role == UserRole.employee and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return task


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: UUID,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Employees can only update status of their own tasks
    if current_user.role == UserRole.employee:
        if task.assigned_to != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        allowed = TaskUpdate(status=task_in.status)
        return task_service.update_task(db, task, allowed)
    _require_manager_or_admin(current_user)
    return task_service.update_task(db, task, task_in)


# ── SUBMISSIONS ───────────────────────────────────────────────────────────────

@router.post("/{task_id}/submit", response_model=TaskSubmissionRead)
def submit_work(
    task_id: UUID,
    submission_in: TaskSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_employee_or_above(current_user)
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == UserRole.employee and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="You are not assigned to this task")
    submission_in.task_id = task_id
    return task_service.submit_work(db, submission_in, current_user.id)


@router.get("/{task_id}/submissions", response_model=List[TaskSubmissionRead])
def get_submissions(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == UserRole.employee and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return task_service.get_submissions_for_task(db, task_id)


# ── AI REVIEW CALLBACK ────────────────────────────────────────────────────────

@router.post("/ai-review", response_model=TaskSubmissionRead)
def receive_ai_review(
    result: AIReviewResult,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    x_webhook_secret: Optional[str] = Header(None)
):
    """Receives AI review result and applies it (manager or automated call)"""
    
    # 1. Validation: Either a manager/admin user or a valid webhook secret
    is_authorized = False
    actor_id = None
    
    if current_user:
        if current_user.role in [UserRole.manager, UserRole.admin]:
            is_authorized = True
            actor_id = current_user.id
    
    if not is_authorized and x_webhook_secret and settings.N8N_WEBHOOK_SECRET:
        if x_webhook_secret == settings.N8N_WEBHOOK_SECRET:
            is_authorized = True
            # For automated calls, we attribute it to the original task creator (the manager)
            # or a specific system user if we had one.
            task = db.query(Task).filter(Task.id == result.task_id).first()
            actor_id = task.created_by if task else None

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to submit AI reviews")

    if not actor_id:
        raise HTTPException(status_code=400, detail="Could not determine authorized manager for this review")

    sub = task_service.apply_ai_review(
        db,
        submission_id=result.submission_id,
        score=result.score,
        feedback=result.feedback,
        manager_id=actor_id,
    )
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return sub


# ── FEEDBACK / REVISION REQUESTS ─────────────────────────────────────────────

@router.post("/{task_id}/feedback", response_model=TaskFeedbackRead)
def send_feedback(
    task_id: UUID,
    feedback_in: TaskFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    feedback_in.task_id = task_id
    return task_service.send_feedback(db, feedback_in, current_user.id)


# ── DEPENDENCIES ──────────────────────────────────────────────────────────────

@router.post("/dependencies", status_code=201)
def add_dependency(
    dep_in: TaskDependencyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    return task_service.add_dependency(db, dep_in)


# ── LATE TASKS ────────────────────────────────────────────────────────────────

@router.get("/alerts/late", response_model=List[TaskRead])
def get_late_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    return task_service.get_late_tasks(db)


# ── FEEDBACKS ─────────────────────────────────────────────────────────────────

@router.get("/{task_id}/feedbacks", response_model=List[TaskFeedbackRead])
def get_task_feedbacks(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all feedback messages for a task (employee sees their own task feedbacks)"""
    from app.models.task import TaskFeedback as TaskFeedbackModel
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == UserRole.employee and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    feedbacks = db.query(TaskFeedbackModel).filter(
        TaskFeedbackModel.task_id == task_id
    ).order_by(TaskFeedbackModel.created_at.desc()).all()
    return feedbacks
