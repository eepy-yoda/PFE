from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.models.task import Task
from app.models.task import task_assignments
from app.schemas.time_tracking import TimeLogCreate, TimeLogManualCreate, TimeLogRead, TimeSummaryRead
from app.services.time_tracking_service import time_tracking_service

router = APIRouter()


def _require_employee_or_above(current_user: User):
    if current_user.role not in [UserRole.employee, UserRole.manager, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Employee access required")


def _employee_owns_task(db: Session, user_id, task_id) -> bool:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return False
    if task.assigned_to == user_id:
        return True
    row = db.execute(
        task_assignments.select().where(
            (task_assignments.c.task_id == task_id) &
            (task_assignments.c.user_id == user_id)
        )
    ).first()
    return row is not None


def _enrich_log(log, db: Session) -> TimeLogRead:
    task = db.query(Task).filter(Task.id == log.task_id).first()
    data = TimeLogRead.model_validate(log)
    if task:
        data.task_title = task.title
        if task.project:
            data.project_name = task.project.name
    return data


@router.get("/summary", response_model=TimeSummaryRead)
def get_time_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_employee_or_above(current_user)
    summary = time_tracking_service.get_summary(db, current_user.id)
    active = summary["active_timer"]
    active_read = _enrich_log(active, db) if active else None
    return TimeSummaryRead(
        today_seconds=summary["today_seconds"],
        week_seconds=summary["week_seconds"],
        active_timer=active_read,
    )


@router.get("/active", response_model=Optional[TimeLogRead])
def get_active_timer(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_employee_or_above(current_user)
    log = time_tracking_service.get_active_timer(db, current_user.id)
    if not log:
        return None
    return _enrich_log(log, db)


@router.get("/", response_model=List[TimeLogRead])
def list_time_logs(
    task_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_employee_or_above(current_user)
    logs = time_tracking_service.get_logs_for_user(db, current_user.id, task_id=task_id)
    return [_enrich_log(l, db) for l in logs]


@router.post("/start", response_model=TimeLogRead)
def start_timer(
    body: TimeLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_employee_or_above(current_user)
    if not _employee_owns_task(db, current_user.id, body.task_id):
        raise HTTPException(status_code=403, detail="Not assigned to this task")
    log = time_tracking_service.start_timer(db, body.task_id, current_user.id, body.description)
    return _enrich_log(log, db)


@router.post("/stop", response_model=TimeLogRead)
def stop_active(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_employee_or_above(current_user)
    log = time_tracking_service.stop_active_timer(db, current_user.id)
    if not log:
        raise HTTPException(status_code=404, detail="No active timer")
    return _enrich_log(log, db)


@router.post("/manual", response_model=TimeLogRead)
def create_manual_entry(
    body: TimeLogManualCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_employee_or_above(current_user)
    if not _employee_owns_task(db, current_user.id, body.task_id):
        raise HTTPException(status_code=403, detail="Not assigned to this task")
    log = time_tracking_service.create_manual_entry(
        db,
        task_id=body.task_id,
        user_id=current_user.id,
        start_time=body.start_time,
        end_time=body.end_time,
        description=body.description,
    )
    return _enrich_log(log, db)


@router.delete("/{log_id}")
def delete_log(
    log_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_employee_or_above(current_user)
    deleted = time_tracking_service.delete_log(db, log_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Time log not found")
    return {"message": "Deleted"}
