from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID
from app.db.session import get_db
from app.api.deps import get_current_user, get_current_user_optional
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.task import Task, TaskStatus, TaskFeedback as TaskFeedbackModel
from app.models.project import Project
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskRead, TaskShortRead,
    TaskSubmissionCreate, TaskSubmissionRead,
    TaskFeedbackCreate, TaskFeedbackRead,
    AIReviewResult, SubmissionWebhookResult,
)
from app.models.task import SubmissionStatus, TaskSubmission as TaskSubmissionModel
from app.services.task_service import task_service
from app.services.delivery_service import delivery_service
from app.models.project import PaymentStatus, PaymentType, DeliveryState
from datetime import datetime, timezone

router = APIRouter()


def _require_manager_or_admin(current_user: User):
    if current_user.role not in [UserRole.manager, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Manager or Admin access required")


def _require_employee_or_above(current_user: User):
    if current_user.role not in [UserRole.employee, UserRole.manager, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Employee access required")


def _employee_has_project_access(db: Session, user_id, project_id) -> bool:
    """True if employee has any assigned task in the project, or is the project-level assignee."""
    if db.query(Task).filter(Task.project_id == project_id, Task.assigned_to == user_id).first():
        return True
    proj = db.query(Project).filter(Project.id == project_id).first()
    return proj is not None and proj.assigned_to == user_id


@router.post("/", response_model=TaskRead)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    return task_service.create_task(db, task_in, current_user.id)


@router.get("/project/{project_id}", response_model=List[TaskShortRead])
def list_tasks_for_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role == UserRole.client and project.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return task_service.get_tasks_for_project(db, project_id)


@router.get("/my", response_model=List[TaskShortRead])
def list_my_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return task_service.get_tasks_for_employee(db, current_user.id)


@router.get("/worker-summary")
def get_worker_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Aggregated dashboard stats for the current worker."""
    _require_employee_or_above(current_user)
    from app.models.activity import ActivityLog

    tasks = task_service.get_tasks_for_employee(db, current_user.id)
    now = datetime.now(timezone.utc)

    def _is_overdue(t: Task) -> bool:
        return t.deadline is not None and t.deadline.replace(tzinfo=timezone.utc) < now and t.status not in ("completed", "approved")

    def _is_due_today(t: Task) -> bool:
        if not t.deadline:
            return False
        dl = t.deadline.replace(tzinfo=timezone.utc)
        return dl.date() == now.date() and t.status not in ("completed", "approved")

    overdue = [t for t in tasks if _is_overdue(t)]
    due_today = [t for t in tasks if _is_due_today(t) and not _is_overdue(t)]
    in_revision = [t for t in tasks if t.status == "revision_requested"]
    submitted = [t for t in tasks if t.status in ("submitted", "under_ai_review")]
    completed = [t for t in tasks if t.status in ("completed", "approved")]
    active = [t for t in tasks if t.status in ("todo", "in_progress")]

    # Priority tasks: overdue first, then due today, then in_revision, then due within 7 days
    from datetime import timedelta
    week_out = now + timedelta(days=7)
    due_soon = [
        t for t in tasks
        if t.deadline
        and now < t.deadline.replace(tzinfo=timezone.utc) <= week_out
        and t.status not in ("completed", "approved", "submitted", "under_ai_review")
        and not _is_due_today(t)
    ]
    priority_task_ids = {t.id for t in overdue + due_today + in_revision + due_soon}
    priority_tasks = (
        overdue + due_today + in_revision +
        [t for t in due_soon if t.id not in {x.id for x in overdue + due_today + in_revision}]
    )

    # Recent feedback for current worker
    recent_feedback = (
        db.query(TaskFeedbackModel)
        .filter(TaskFeedbackModel.sent_to == current_user.id)
        .order_by(TaskFeedbackModel.created_at.desc())
        .limit(5)
        .all()
    )

    # Upcoming deadlines (next 14 days, not completed)
    two_weeks = now + timedelta(days=14)
    upcoming = [
        t for t in tasks
        if t.deadline
        and now <= t.deadline.replace(tzinfo=timezone.utc) <= two_weeks
        and t.status not in ("completed", "approved")
    ]
    upcoming.sort(key=lambda t: t.deadline)

    def _task_to_dict(t: Task) -> dict:
        return {
            "id": str(t.id),
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "deadline": t.deadline.isoformat() if t.deadline else None,
            "project_name": t.project_name,
            "project_id": str(t.project_id),
        }

    def _feedback_to_dict(fb: TaskFeedbackModel) -> dict:
        return {
            "id": str(fb.id),
            "task_id": str(fb.task_id),
            "message": fb.message,
            "is_revision_request": fb.is_revision_request,
            "created_at": fb.created_at.isoformat(),
        }

    return {
        "stats": {
            "total": len(tasks),
            "active": len(active),
            "due_today": len(due_today),
            "overdue": len(overdue),
            "in_revision": len(in_revision),
            "submitted": len(submitted),
            "completed": len(completed),
        },
        "priority_tasks": [_task_to_dict(t) for t in priority_tasks[:10]],
        "recent_feedback": [_feedback_to_dict(fb) for fb in recent_feedback],
        "upcoming_deadlines": [_task_to_dict(t) for t in upcoming[:5]],
    }


@router.get("/my-feedback", response_model=List[TaskFeedbackRead])
def get_my_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """All feedback sent to the current worker across all tasks."""
    _require_employee_or_above(current_user)
    return (
        db.query(TaskFeedbackModel)
        .filter(TaskFeedbackModel.sent_to == current_user.id)
        .order_by(TaskFeedbackModel.created_at.desc())
        .limit(200)
        .all()
    )


@router.get("/{task_id}/activity")
def get_task_activity(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Activity timeline for a task. Combines activity_logs + submission events + feedback events."""
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == UserRole.employee and not _employee_has_project_access(db, current_user.id, task.project_id):
        raise HTTPException(status_code=403, detail="Access denied")

    from app.models.activity import ActivityLog

    events: List[Dict[str, Any]] = []

    # Activity logs for this task entity
    logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.entity_type == "task", ActivityLog.entity_id == task_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(50)
        .all()
    )
    for log in logs:
        events.append({
            "id": str(log.id),
            "type": "activity",
            "action": log.action,
            "details": log.details,
            "created_at": log.created_at.isoformat(),
        })

    # Submission events
    submissions = (
        db.query(TaskSubmissionModel)
        .filter(TaskSubmissionModel.task_id == task_id)
        .order_by(TaskSubmissionModel.created_at.desc())
        .all()
    )
    for sub in submissions:
        events.append({
            "id": str(sub.id),
            "type": "submission",
            "action": f"Work submitted (attempt #{sub.attempt_number})",
            "details": {
                "status": sub.submission_status,
                "ai_score": sub.ai_score,
                "attempt_number": sub.attempt_number,
            },
            "created_at": sub.created_at.isoformat(),
        })

    # Feedback events
    feedbacks = (
        db.query(TaskFeedbackModel)
        .filter(TaskFeedbackModel.task_id == task_id)
        .order_by(TaskFeedbackModel.created_at.desc())
        .all()
    )
    for fb in feedbacks:
        events.append({
            "id": str(fb.id),
            "type": "feedback",
            "action": "Revision requested" if fb.is_revision_request else "Feedback received",
            "details": {"message": fb.message[:200]},
            "created_at": fb.created_at.isoformat(),
        })

    # Task creation event
    events.append({
        "id": str(task.id) + "_created",
        "type": "created",
        "action": "Task assigned",
        "details": {"title": task.title},
        "created_at": task.created_at.isoformat(),
    })

    events.sort(key=lambda e: e["created_at"], reverse=True)
    return events


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == UserRole.employee and not _employee_has_project_access(db, current_user.id, task.project_id):
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
    old_payment_status = task.payment_status

    if current_user.role == UserRole.employee:
        if task.assigned_to != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        allowed = TaskUpdate(status=task_in.status)
        updated_task = task_service.update_task(db, task, allowed)
    else:
        _require_manager_or_admin(current_user)
        updated_task = task_service.update_task(db, task, task_in)

    if task_in.payment_status is not None and task_in.payment_status != old_payment_status:
        updated_task.last_payment_update_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(updated_task)
        
        project = db.query(Project).filter(Project.id == updated_task.project_id).first()
        if project and project.payment_type == PaymentType.task:
            delivery_service.process_task_payment_update(db, updated_task, project)

    return updated_task


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
    if current_user.role == UserRole.employee and not _employee_has_project_access(db, current_user.id, task.project_id):
        raise HTTPException(status_code=403, detail="Access denied")
    submissions = task_service.get_submissions_for_task(db, task_id)

    if current_user.role == UserRole.client:
        is_final = getattr(task, 'delivery_state', None) == DeliveryState.final_delivered
        for sub in submissions:
            if not is_final:
                sub.file_paths = None
                sub.links = None
            # Always strip internal AI/review data from client-facing responses
            sub.ai_score = None
            sub.ai_feedback = None
            sub.webhook_response = None

    return submissions


@router.post("/submission-webhook-result", response_model=TaskSubmissionRead)
def receive_submission_webhook_result(
    result: SubmissionWebhookResult,
    db: Session = Depends(get_db),
    x_webhook_secret: Optional[str] = Header(None),
):
    """
    Called by n8n after validating a work submission (async callback pattern).

    Expected payload:
        { "task_id": "...", "submission_id": "...", "status": "valid"|"invalid",
          "score": 85, "feedback": "..." }

    Requires X-Webhook-Secret header matching N8N_WEBHOOK_SECRET.
    """
    import json as _json
    from app.models.task import TaskSubmission as TaskSubmissionModel, TaskFeedback as TaskFeedbackModel
    from app.models.notification import NotificationType
    from app.services.notification_service import notification_service
    from datetime import datetime, timezone

    if not settings.N8N_WEBHOOK_SECRET or x_webhook_secret != settings.N8N_WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Invalid or missing webhook secret")

    submission = db.query(TaskSubmissionModel).filter(
        TaskSubmissionModel.id == result.submission_id
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    task = db.query(Task).filter(Task.id == result.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    submission.webhook_response = _json.dumps({
        "status": result.status,
        "score": result.score,
        "feedback": result.feedback,
    })
    if result.score is not None:
        submission.ai_score = result.score
    if result.feedback:
        submission.ai_feedback = result.feedback

    from app.models.user import User as UserModel
    from app.models.project import Project as ProjectModel
    employee = db.query(UserModel).filter(UserModel.id == submission.submitted_by).first()
    project = db.query(ProjectModel).filter(ProjectModel.id == task.project_id).first()
    employee_name = employee.full_name if employee else "Employee"
    project_name = project.name if project else "Unknown Project"

    is_valid = result.status.lower() == "valid"

    if is_valid:
        submission.submission_status = SubmissionStatus.validated
        submission.is_approved = True
        task.status = TaskStatus.approved

        if task.created_by:
            score_label = f" (score: {result.score}/100)" if result.score is not None else ""
            notification_service.create(
                db,
                user_id=task.created_by,
                title=f"Submission validated — {task.title}",
                notification_type=NotificationType.work_submitted,
                body=(
                    f"{employee_name}'s submission for '{task.title}' in '{project_name}' "
                    f"validated{score_label} at "
                    f"{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}."
                ),
                task_id=task.id,
                project_id=task.project_id,
            )
    else:
        submission.submission_status = SubmissionStatus.rejected
        task.status = TaskStatus.revision_requested

        if result.feedback and task.assigned_to:
            fb = TaskFeedbackModel(
                task_id=task.id,
                submission_id=submission.id,
                sent_by=task.created_by,
                sent_to=task.assigned_to,
                message=result.feedback,
                is_revision_request=True,
            )
            db.add(fb)
            notification_service.create(
                db,
                user_id=task.assigned_to,
                title=f"Revision requested — {task.title}",
                notification_type=NotificationType.revision_requested,
                body=result.feedback[:200],
                task_id=task.id,
                project_id=task.project_id,
            )

    db.commit()
    db.refresh(submission)
    return submission


@router.post("/ai-review", response_model=TaskSubmissionRead)
def receive_ai_review(
    result: AIReviewResult,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    x_webhook_secret: Optional[str] = Header(None)
):
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


@router.get("/alerts/late", response_model=List[TaskRead])
def get_late_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    return task_service.get_late_tasks(db)


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    from app.models.task import TaskFeedback as TaskFeedbackModel, TaskSubmission as TaskSubmissionModel, task_assignments
    from app.models.workflow_image_callback import WorkflowImageCallback
    sub_ids = [s.id for s in db.query(TaskSubmissionModel).filter(TaskSubmissionModel.task_id == task_id).all()]
    if sub_ids:
        db.query(WorkflowImageCallback).filter(WorkflowImageCallback.submission_id.in_(sub_ids)).delete(synchronize_session=False)
    db.query(TaskFeedbackModel).filter(TaskFeedbackModel.task_id == task_id).delete(synchronize_session=False)
    db.query(TaskSubmissionModel).filter(TaskSubmissionModel.task_id == task_id).delete(synchronize_session=False)
    db.execute(task_assignments.delete().where(task_assignments.c.task_id == task_id))
    db.delete(task)
    db.commit()


@router.get("/{task_id}/feedbacks", response_model=List[TaskFeedbackRead])
def get_task_feedbacks(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.task import TaskFeedback as TaskFeedbackModel
    task = task_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role == UserRole.client:
        raise HTTPException(status_code=403, detail="Access denied")
    if current_user.role == UserRole.employee and not _employee_has_project_access(db, current_user.id, task.project_id):
        raise HTTPException(status_code=403, detail="Access denied")
    feedbacks = db.query(TaskFeedbackModel).filter(
        TaskFeedbackModel.task_id == task_id
    ).order_by(TaskFeedbackModel.created_at.desc()).all()
    return feedbacks
