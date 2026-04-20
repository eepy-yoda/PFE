from sqlalchemy.orm import Session
from datetime import datetime, timezone
from uuid import UUID
from typing import List, Optional

from app.models.task import Task, TaskStatus, TaskSubmission, TaskFeedback
from app.models.project import Project
from app.models.notification import NotificationType
from app.schemas.task import TaskCreate, TaskUpdate, TaskSubmissionCreate, TaskFeedbackCreate
from app.schemas.submission import SubmissionCreateRequest
from app.services.notification_service import notification_service
from app.services.activity_service import activity_service


class TaskService:
    @staticmethod
    def create_task(db: Session, task_in: TaskCreate, created_by: UUID) -> Task:
        db_task = Task(
            **task_in.model_dump(exclude={"assigned_to", "assignee_ids"}),
            created_by=created_by,
            assigned_to=task_in.assigned_to,
        )
        db.add(db_task)
        db.flush()
        
        # Log activity
        activity_service.create_log(db, user_id=created_by, action="create_task", entity_type="task", entity_id=db_task.id, details={"title": db_task.title})
        db.commit()
        db.refresh(db_task)

        # Notify assigned employee
        if db_task.assigned_to:
            notification_service.create(
                db,
                user_id=db_task.assigned_to,
                title="New task assigned",
                notification_type=NotificationType.task_assigned,
                body=f"You have been assigned to: {db_task.title}",
                task_id=db_task.id,
                project_id=db_task.project_id,
            )

        return db_task

    @staticmethod
    def get_all_tasks(db: Session) -> List[Task]:
        return db.query(Task).order_by(Task.created_at.desc()).all()


    @staticmethod
    def get_tasks_for_project(db: Session, project_id: UUID) -> List[Task]:
        return db.query(Task).filter(Task.project_id == project_id).order_by(Task.order_index).all()

    @staticmethod
    def get_tasks_for_employee(db: Session, user_id: UUID) -> List[Task]:
        return db.query(Task).filter(Task.assigned_to == user_id).all()

    @staticmethod
    def get_task(db: Session, task_id: UUID) -> Optional[Task]:
        return db.query(Task).filter(Task.id == task_id).first()

    @staticmethod
    def update_task(db: Session, db_task: Task, task_in: TaskUpdate) -> Task:
        old_assigned = db_task.assigned_to
        update_data = task_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_task, field, value)
        
        # Log activity
        log_data = task_in.model_dump(exclude_unset=True, mode='json')
        activity_service.create_log(db, user_id=db_task.created_by, action="update_task", entity_type="task", entity_id=db_task.id, details=log_data)
        
        db.commit()
        db.refresh(db_task)

        # Notify if newly assigned
        if (
            task_in.assigned_to is not None
            and task_in.assigned_to != old_assigned
        ):
            notification_service.create(
                db,
                user_id=task_in.assigned_to,
                title="Task assigned to you",
                notification_type=NotificationType.task_assigned,
                body=f"You have been assigned to task: {db_task.title}",
                task_id=db_task.id,
                project_id=db_task.project_id,
            )

        return db_task

    @staticmethod
    def submit_work(db: Session, submission_in: TaskSubmissionCreate, submitted_by: UUID) -> TaskSubmission:
        """
        Delegates to submission_service.create_submission (single source of truth).
        Kept here for backward-compat with the old /tasks/{id}/submit route.
        """
        from app.services.submission_service import submission_service as _svc

        req = SubmissionCreateRequest(
            task_id=submission_in.task_id,
            content=submission_in.content,
            links=submission_in.links,
            file_paths=submission_in.file_paths,
        )
        return _svc.create_submission(db, req, submitted_by)

    @staticmethod
    def get_submissions_for_task(db: Session, task_id: UUID) -> List[TaskSubmission]:
        return (
            db.query(TaskSubmission)
            .filter(TaskSubmission.task_id == task_id)
            .order_by(TaskSubmission.created_at.desc())
            .all()
        )

    @staticmethod
    def apply_ai_review(
        db: Session,
        submission_id: UUID,
        score: float,
        feedback: str,
        manager_id: UUID,
    ) -> Optional[TaskSubmission]:
        submission = db.query(TaskSubmission).filter(TaskSubmission.id == submission_id).first()
        if not submission:
            return None

        submission.ai_score = score
        submission.ai_feedback = feedback

        task = db.query(Task).filter(Task.id == submission.task_id).first()
        if task:
            if score >= 70:
                task.status = TaskStatus.approved
                submission.is_approved = True
                # Notify the client that work on their project has been approved
                project = db.query(Project).filter(Project.id == task.project_id).first()
                if project and project.client_id:
                    notification_service.create(
                        db,
                        user_id=project.client_id,
                        title="Work completed on your project",
                        notification_type=NotificationType.content_ready,
                        body=f"Task '{task.title}' has been reviewed and approved.",
                        project_id=task.project_id,
                        task_id=task.id,
                    )
            else:
                task.status = TaskStatus.revision_requested
                # Notify manager
                notification_service.create(
                    db,
                    user_id=manager_id,
                    title=f"AI Score Below Threshold ({score:.0f}/100)",
                    notification_type=NotificationType.ai_score_low,
                    body=f"Task '{task.title}' scored {score:.0f}/100. Review required.",
                    task_id=task.id,
                    project_id=task.project_id,
                )

        db.commit()
        db.refresh(submission)
        return submission

    @staticmethod
    def send_feedback(db: Session, feedback_in: TaskFeedbackCreate, sent_by: UUID) -> TaskFeedback:
        db_feedback = TaskFeedback(
            task_id=feedback_in.task_id,
            submission_id=feedback_in.submission_id,
            sent_by=sent_by,
            sent_to=feedback_in.sent_to,
            message=feedback_in.message,
            is_revision_request=feedback_in.is_revision_request,
        )
        db.add(db_feedback)

        task = db.query(Task).filter(Task.id == feedback_in.task_id).first()
        if feedback_in.is_revision_request and task:
            task.status = TaskStatus.revision_requested

        db.commit()
        db.refresh(db_feedback)

        # Notify the employee
        notification_service.create(
            db,
            user_id=feedback_in.sent_to,
            title="Modification request from manager",
            notification_type=NotificationType.revision_requested,
            body=feedback_in.message[:200],
            task_id=feedback_in.task_id,
            project_id=task.project_id if task else None,
        )

        return db_feedback

    @staticmethod
    def get_late_tasks(db: Session) -> List[Task]:
        now = datetime.now(timezone.utc)
        return (
            db.query(Task)
            .filter(
                Task.deadline < now,
                Task.status.notin_([TaskStatus.completed, TaskStatus.approved])
            )
            .all()
        )


task_service = TaskService()
