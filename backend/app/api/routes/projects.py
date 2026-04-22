from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Any, Dict
from uuid import UUID
from datetime import datetime, timezone

from app.db.session import get_db
from app.schemas.project import (
    ProjectCreate, ProjectRead, ProjectUpdate,
    WorkerStat, RevenueSnapshot, WorkloadTaskItem,
    TaskWorkloadSnapshot, ProjectSnapshot,
    DashboardAlertItem, ManagerDashboardData,
)
from app.schemas.task import TaskRead
from app.schemas.user import UserRead
from app.services.project_service import project_service
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus, BriefStatus, PaymentStatus, PaymentType
from app.models.task import Task, TaskStatus, TaskSubmission
from app.models.notification import NotificationType
from app.services.notification_service import notification_service
from app.core.config import settings
from pydantic import BaseModel
from sqlalchemy import func
from datetime import timedelta
import logging
import requests
from app.services.delivery_service import delivery_service

logger = logging.getLogger(__name__)

router = APIRouter()


class BriefActionRequest(BaseModel):
    action: str  # "validate", "clarify", "reject"
    notes: Optional[str] = None


class ConvertProjectRequest(BaseModel):
    assigned_to: Optional[UUID] = None


class PartialDeliveryRequest(BaseModel):
    task_ids: List[UUID]


class ManagerOverview(BaseModel):
    briefs: List[ProjectRead]
    active_projects: List[ProjectRead]
    late_tasks: List[TaskRead]


def _require_manager_or_admin(current_user: User):
    if current_user.role not in [UserRole.manager, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Manager or Admin access required")


# ── STATIC ROUTES (must come before /{project_id} wildcard) ──────────────────

@router.get("/", response_model=List[ProjectRead])
def read_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return project_service.get_projects(db, current_user.id, current_user.role)


@router.get("/manager-overview", response_model=ManagerOverview)
def get_manager_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)

    briefs = db.query(Project).filter(
        Project.brief_status.in_([
            BriefStatus.submitted,
            BriefStatus.clarification_requested,
            BriefStatus.validated,
        ])
    ).all()

    active_projects = db.query(Project).filter(
        Project.status.notin_([ProjectStatus.briefing, ProjectStatus.archived])
    ).all()

    now = datetime.now(timezone.utc)
    late_tasks = db.query(Task).filter(
        Task.deadline < now,
        Task.status.notin_([TaskStatus.completed, TaskStatus.approved, TaskStatus.late]),
    ).all()

    return ManagerOverview(
        briefs=briefs,
        active_projects=active_projects,
        late_tasks=late_tasks,
    )


@router.get("/manager-dashboard", response_model=ManagerDashboardData)
def get_manager_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)

    try:
        now = datetime.now(timezone.utc)
        three_days = now + timedelta(days=3)

        total_by_emp = dict(
            db.query(Task.assigned_to, func.count(Task.id))
            .filter(Task.assigned_to.isnot(None))
            .group_by(Task.assigned_to).all()
        )
        completed_by_emp = dict(
            db.query(Task.assigned_to, func.count(Task.id))
            .filter(Task.assigned_to.isnot(None),
                    Task.status.in_([TaskStatus.completed, TaskStatus.approved]))
            .group_by(Task.assigned_to).all()
        )
        on_time_by_emp = dict(
            db.query(Task.assigned_to, func.count(Task.id))
            .filter(Task.assigned_to.isnot(None),
                    Task.status.in_([TaskStatus.completed, TaskStatus.approved]),
                    Task.deadline.isnot(None),
                    Task.updated_at <= Task.deadline)
            .group_by(Task.assigned_to).all()
        )
        ai_by_emp = dict(
            db.query(TaskSubmission.submitted_by, func.avg(TaskSubmission.ai_score))
            .filter(TaskSubmission.ai_score.isnot(None))
            .group_by(TaskSubmission.submitted_by).all()
        )

        employees = db.query(User).filter(User.role == UserRole.employee).all()
        workers = []
        for emp in employees:
            eid = emp.id
            total     = int(total_by_emp.get(eid, 0))
            completed = int(completed_by_emp.get(eid, 0))
            on_time   = int(on_time_by_emp.get(eid, 0))
            avg_ai    = float(ai_by_emp[eid]) if eid in ai_by_emp else None

            completion_rate = completed / total if total > 0 else 0.0
            deadline_rate   = on_time / completed if completed > 0 else 0.0
            ai_factor       = (avg_ai if avg_ai is not None else 50.0) / 100.0
            perf = round((completion_rate * 0.4 + deadline_rate * 0.3 + ai_factor * 0.3) * 100, 1)

            workers.append(WorkerStat(
                user_id=eid,
                full_name=emp.full_name,
                email=emp.email,
                completed_tasks=completed,
                total_tasks=total,
                on_time_tasks=on_time,
                avg_ai_score=round(avg_ai, 1) if avg_ai is not None else None,
                performance_score=perf,
            ))
        workers.sort(key=lambda w: w.performance_score, reverse=True)

        # OPTIMIZATION: Limit paid projects to recent ones only
        paid_projects = db.query(Project)\
            .filter(Project.payment_status == PaymentStatus.fully_paid)\
            .order_by(Project.paid_at.desc())\
            .limit(10).all()
            
        paid_count = db.query(func.count(Project.id)).filter(Project.payment_status == PaymentStatus.fully_paid).scalar() or 0
        pending_count = db.query(func.count(Project.id)).filter(Project.payment_status == PaymentStatus.unpaid).scalar() or 0
        overdue_count = db.query(func.count(Project.id)).filter(Project.payment_status == PaymentStatus.overdue).scalar() or 0

        # OPTIMIZATION: Fetch counts and specific lists instead of ALL active tasks
        total_active_count = db.query(func.count(Task.id)).filter(
            Task.status.notin_([TaskStatus.completed, TaskStatus.approved])
        ).scalar() or 0
        
        todo_count = db.query(func.count(Task.id)).filter(Task.status == TaskStatus.todo).scalar() or 0
        in_progress_count = db.query(func.count(Task.id)).filter(Task.status == TaskStatus.in_progress).scalar() or 0
        
        urgent_tasks = db.query(Task).filter(
            Task.status.notin_([TaskStatus.completed, TaskStatus.approved]),
            Task.deadline.isnot(None),
            Task.deadline < now
        ).order_by(Task.deadline.asc()).limit(8).all()
        
        near_tasks = db.query(Task).filter(
            Task.status.notin_([TaskStatus.completed, TaskStatus.approved]),
            Task.deadline.isnot(None),
            Task.deadline >= now,
            Task.deadline <= three_days
        ).order_by(Task.deadline.asc()).limit(8).all()

        def to_workload(t: Task) -> WorkloadTaskItem:
            return WorkloadTaskItem(
                id=t.id, title=t.title,
                status=t.status.value if hasattr(t.status, 'value') else str(t.status),
                priority=t.priority or 'medium', deadline=t.deadline,
                project_name=t.project_name, assigned_to=t.assigned_to,
            )

        total_projects = db.query(func.count(Project.id)).scalar() or 0
        status_counts = dict(db.query(Project.status, func.count(Project.id)).group_by(Project.status).all())
        
        proj_active_count = status_counts.get(ProjectStatus.active, 0)
        proj_done_count = status_counts.get(ProjectStatus.completed, 0)
        proj_delivered_count = status_counts.get(ProjectStatus.delivered, 0)
        proj_hold_count = status_counts.get(ProjectStatus.on_hold, 0)
        
        proj_delayed_count = db.query(func.count(Project.id)).filter(
            Project.deadline.isnot(None), 
            Project.deadline < now,
            Project.status.notin_([ProjectStatus.completed, ProjectStatus.delivered, ProjectStatus.archived])
        ).scalar() or 0

        active_projects_list = db.query(Project)\
            .filter(Project.status == ProjectStatus.active)\
            .order_by(Project.updated_at.desc())\
            .limit(10).all()

        alerts = []
        for t in urgent_tasks:
            alerts.append(DashboardAlertItem(
                type='late_task', priority='critical',
                title=f'Overdue: {t.title}',
                detail=f'Deadline was {t.deadline.strftime("%b %d") if t.deadline else "N/A"}',
                entity_id=str(t.project_id),
            ))
        
        low_subs = (
            db.query(TaskSubmission)
            .filter(TaskSubmission.ai_score < 70, TaskSubmission.ai_score.isnot(None),
                    TaskSubmission.is_approved == False)
            .order_by(TaskSubmission.created_at.desc()).limit(5).all()
        )
        for sub in low_subs:
            t_obj = db.query(Task).filter(Task.id == sub.task_id).first()
            if t_obj:
                alerts.append(DashboardAlertItem(
                    type='low_ai_score', priority='warning',
                    title=f'Low AI Score: {t_obj.title}',
                    detail=f'Score {sub.ai_score:.0f}/100 — review required',
                    entity_id=str(t_obj.project_id),
                ))
                
        pending_briefs = db.query(Project).filter(Project.brief_status == BriefStatus.submitted).limit(5).all()
        for p in pending_briefs:
            alerts.append(DashboardAlertItem(
                type='pending_brief', priority='info',
                title=f'Brief awaiting review: {p.name}',
                detail=f'Submitted {p.created_at.strftime("%b %d")}',
                entity_id=str(p.id),
            ))
            
        unassigned = db.query(Task).filter(Task.assigned_to.is_(None), Task.status == TaskStatus.todo).limit(5).all()
        for t in unassigned:
            alerts.append(DashboardAlertItem(
                type='unassigned', priority='warning',
                title=f'Unassigned: {t.title}',
                detail='No employee assigned yet',
                entity_id=str(t.project_id),
            ))
            
        alerts.sort(key=lambda a: {'critical': 0, 'warning': 1, 'info': 2}[a.priority])

        total_tasks_global = db.query(func.count(Task.id)).scalar() or 0
        completed_total = db.query(func.count(Task.id)).filter(Task.status.in_([TaskStatus.completed, TaskStatus.approved])).scalar() or 0
        completion_rate = round(completed_total / total_tasks_global * 100, 1) if total_tasks_global > 0 else 0.0
        avg_ai_global   = db.query(func.avg(TaskSubmission.ai_score)).filter(TaskSubmission.ai_score.isnot(None)).scalar()

        briefs_list = db.query(Project).filter(
            Project.brief_status.in_([BriefStatus.submitted, BriefStatus.clarification_requested, BriefStatus.validated])
        ).limit(20).all()

        return ManagerDashboardData(
            kpi_total_tasks=int(total_tasks_global),
            kpi_completion_rate=completion_rate,
            kpi_avg_ai_score=round(float(avg_ai_global), 1) if avg_ai_global is not None else None,
            kpi_active_workers=sum(1 for w in workers if w.total_tasks > 0),
            workers=workers,
            revenue=RevenueSnapshot(
                paid_count=paid_count,
                pending_count=int(pending_count),
                overdue_count=int(overdue_count),
                recently_paid=paid_projects[:5],
            ),
            workload=TaskWorkloadSnapshot(
                total=total_active_count,
                todo=todo_count,
                in_progress=in_progress_count,
                near_deadline=[to_workload(t) for t in near_tasks],
                urgent=[to_workload(t) for t in urgent_tasks],
            ),
            projects=ProjectSnapshot(
                total=total_projects,
                active=proj_active_count,
                completed=proj_done_count,
                delivered=proj_delivered_count,
                on_hold=proj_hold_count,
                delayed=proj_delayed_count,
            ),
            alerts=alerts[:15],
            briefs=briefs_list,
            active_projects=active_projects_list,
        )
    except Exception as e:
        logger.exception("Manager dashboard error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/briefs/received", response_model=List[ProjectRead])
def get_received_briefs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    return db.query(Project).filter(
        Project.brief_status.in_([
            BriefStatus.submitted,
            BriefStatus.clarification_requested,
            BriefStatus.validated,
        ])
    ).all()


@router.get("/my-briefs/history", response_model=List[ProjectRead])
def get_my_brief_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Project).filter(
        Project.client_id == current_user.id
    ).order_by(Project.created_at.desc()).all()


# ── PARAMETERIZED ROUTES (after all static routes) ───────────────────────────

@router.get("/{project_id}", response_model=ProjectRead)
def read_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user.role in [UserRole.admin, UserRole.manager]:
        return project
    if project.client_id == current_user.id:
        return project
    if current_user.role == UserRole.employee:
        has_task = db.query(Task).filter(
            Task.project_id == project.id,
            Task.assigned_to == current_user.id,
        ).first()
        if project.assigned_to == current_user.id or has_task:
            return project
    raise HTTPException(status_code=403, detail="Not enough permissions")


@router.post("/", response_model=ProjectRead)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    return project_service.create_project(db, project_in, current_user.id)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    project = project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    old_payment_status = project.payment_status
    updated_project = project_service.update_project(db, project, project_in)

    if project_in.payment_status is not None and old_payment_status != updated_project.payment_status:
        updated_project.payment_updated_at = datetime.now(timezone.utc)
        if updated_project.payment_status == PaymentStatus.fully_paid:
            updated_project.paid_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(updated_project)
        delivery_service.process_project_payment_update(db, updated_project)

    return updated_project


@router.post("/{project_id}/brief-action", response_model=ProjectRead)
def brief_action(
    project_id: str,
    action_req: BriefActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    project = project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    action = action_req.action
    if action == "validate":
        project.brief_status = BriefStatus.validated
        if project.client_id:
            notification_service.create(
                db,
                user_id=project.client_id,
                title="Your brief has been validated",
                notification_type=NotificationType.project_created,
                body="Your project brief was reviewed and validated. A project will be created soon.",
                project_id=project.id,
                brief_id=project.id,
            )
    elif action == "clarify":
        project.brief_status = BriefStatus.clarification_requested
        project.clarification_notes = action_req.notes
        if project.client_id:
            notification_service.create(
                db,
                user_id=project.client_id,
                title="Clarification requested on your brief",
                notification_type=NotificationType.clarification_requested,
                body=action_req.notes or "The manager needs more information on your brief.",
                project_id=project.id,
                brief_id=project.id,
            )
    elif action == "reject":
        project.brief_status = BriefStatus.rejected
        project.clarification_notes = action_req.notes
        if project.client_id:
            notification_service.create(
                db,
                user_id=project.client_id,
                title="Your brief was not accepted",
                notification_type=NotificationType.general,
                body=action_req.notes or "Your brief was rejected.",
                project_id=project.id,
                brief_id=project.id,
            )
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'validate', 'clarify', or 'reject'")

    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/convert-to-project", response_model=ProjectRead)
def convert_brief_to_project(
    project_id: str,
    convert_req: ConvertProjectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    project = project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.manager_id = current_user.id
    project.brief_status = BriefStatus.converted
    project.status = ProjectStatus.active
    project.assigned_to = convert_req.assigned_to

    if project.client_id:
        notification_service.create(
            db,
            user_id=project.client_id,
            title="Your project has been created",
            notification_type=NotificationType.project_created,
            body=f"Project '{project.name}' is now active. Work will begin shortly.",
            project_id=project.id,
        )

    if project.assigned_to:
        notification_service.create(
            db,
            user_id=project.assigned_to,
            title="New project assigned",
            notification_type=NotificationType.general,
            body=f"You have been assigned to project '{project.name}'.",
            project_id=project.id,
        )

    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/ai-resume")
def generate_ai_resume(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    project = project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not settings.N8N_AI_RESUME_WEBHOOK_URL:
        raise HTTPException(status_code=500, detail="AI Resume Webhook URL not configured in .env")

    payload = {
        "project_name": project.name,
        "brief_content": project.brief_content
    }

    try:
        response = requests.post(settings.N8N_AI_RESUME_WEBHOOK_URL, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error("AI Resume Webhook failed: %s", e)
        raise HTTPException(status_code=502, detail="Failed to reach the AI service.")


@router.post("/{project_id}/mark-paid", response_model=ProjectRead)
def mark_project_paid(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    project = project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.payment_status = PaymentStatus.fully_paid
    project.paid_at = datetime.now(timezone.utc)
    project.payment_updated_at = datetime.now(timezone.utc)

    delivery_service.process_project_payment_update(db, project)
    project.paid_at = datetime.now(timezone.utc)

    if project.client_id:
        notification_service.create(
            db,
            user_id=project.client_id,
            title="Payment confirmed for your project",
            notification_type=NotificationType.project_paid,
            body=f"Payment has been recorded for project '{project.name}'.",
            project_id=project.id,
        )

    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/partial-delivery")
def deliver_partial_project(
    project_id: str,
    req: PartialDeliveryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_manager_or_admin(current_user)
    project = project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.payment_type != PaymentType.project or project.payment_status != PaymentStatus.partially_paid:
        raise HTTPException(status_code=400, detail="Project is not in partially paid project mode.")

    tasks = db.query(Task).filter(Task.project_id == project.id, Task.id.in_(req.task_ids)).all()
    for t in tasks:
        delivery_service.deliver_task_watermark(db, t, project)
    
    db.commit()
    return {"status": "success", "delivered_tasks": len(tasks)}
