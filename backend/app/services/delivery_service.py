import requests
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.models.project import Project, PaymentType, PaymentStatus, DeliveryState
from app.models.task import Task, TaskSubmission
from app.services.notification_service import notification_service
from app.models.notification import NotificationType
from app.core.config import settings

class DeliveryService:
    def process_project_payment_update(self, db: Session, project: Project):
        """Called when project payment state changes"""
        if project.payment_type != PaymentType.project:
            return

        now = datetime.now(timezone.utc)
        tasks = db.query(Task).filter(Task.project_id == project.id).all()

        if project.payment_status == PaymentStatus.fully_paid:
            # Upgrade all applicable tasks to final_delivered
            for task in tasks:
                # only deliver approved submissions
                submission = db.query(TaskSubmission).filter(
                    TaskSubmission.task_id == task.id,
                    TaskSubmission.is_approved == True
                ).order_by(TaskSubmission.created_at.desc()).first()
                if not submission:
                    continue

                if task.delivery_state != DeliveryState.final_delivered:
                    task.delivery_state = DeliveryState.final_delivered
                    task.final_delivered_at = now
                    
                    if project.client_id:
                        notification_service.create(
                            db,
                            user_id=project.client_id,
                            title="Final Work Unlocked!",
                            notification_type=NotificationType.content_ready,
                            body=f"Your final files for '{task.title}' are now available.",
                            project_id=project.id,
                            task_id=task.id
                        )

            # Notify manager
            notification_service.create(
                db,
                user_id=project.manager_id,
                title="Project Final Delivery Completed",
                notification_type=NotificationType.general,
                body=f"All eligible final deliverables for project '{project.name}' have been unlocked.",
                project_id=project.id,
            )

        elif project.payment_status == PaymentStatus.partially_paid:
            # Handled by manual task selection. Nothing automatic here.
            pass


    def deliver_task_watermark(self, db: Session, task: Task, project: Project):
        """Trigger watermark delivery via Webhook"""
        if task.delivery_state in [DeliveryState.watermark_delivered, DeliveryState.final_delivered]:
            return # Prevent duplicates

        submission = db.query(TaskSubmission).filter(
            TaskSubmission.task_id == task.id,
            TaskSubmission.is_approved == True
        ).order_by(TaskSubmission.created_at.desc()).first()

        if not submission or not submission.file_paths:
            return

        # Create a pending image-callback record so n8n can POST back
        # only the binary image — all context is recovered server-side via token.
        from app.services.image_callback_service import image_callback_service
        try:
            callback_record = image_callback_service.create_pending_callback(
                db,
                project_id=project.id,
                task_id=task.id,
                submission_id=submission.id,
                file_type="watermarked_preview",
            )
            callback_url = image_callback_service.build_callback_url(
                callback_record.callback_token
            )
        except Exception as e:
            print(f"[DeliveryService] Failed to create image callback record: {e}")
            callback_url = None

        task.delivery_state = DeliveryState.watermark_delivered
        task.watermarked_delivered_at = datetime.now(timezone.utc)

        # Trigger webhook
        webhook_url = getattr(settings, 'WATERMARK_WEBHOOK_URL', None)
        if not webhook_url:
            webhook_url = getattr(settings, 'SUBMISSION_REVIEW_WEBHOOK_URL', None) or getattr(settings, 'N8N_WORK_SUBMISSION_WEBHOOK', None)

        if webhook_url:
            try:
                payload = {
                    "task_id": str(task.id),
                    "project_id": str(project.id),
                    "submission_id": str(submission.id),
                    "file_paths": submission.file_paths,
                    "payment_type": project.payment_type.value,
                    "payment_status": project.payment_status.value,
                    "client_id": str(project.client_id) if project.client_id else None,
                    "manager_id": str(project.manager_id),
                    "callback_url": callback_url,
                }
                requests.post(webhook_url, json=payload, timeout=30)
            except Exception as e:
                print(f"Delivery Webhook Failed: {e}")

        if project.client_id:
            notification_service.create(
                db,
                user_id=project.client_id,
                title="Work Preview Available",
                notification_type=NotificationType.content_ready,
                body=f"A watermarked preview for '{task.title}' is ready for your review.",
                project_id=project.id,
                task_id=task.id
            )

        db.commit()


    def process_task_payment_update(self, db: Session, task: Task, project: Project):
        """Called when task payment state changes (Task mode)"""
        if project.payment_type != PaymentType.task:
            return

        now = datetime.now(timezone.utc)
        
        submission = db.query(TaskSubmission).filter(
            TaskSubmission.task_id == task.id,
            TaskSubmission.is_approved == True
        ).order_by(TaskSubmission.created_at.desc()).first()
        
        if not submission:
            return

        if task.payment_status == PaymentStatus.fully_paid:
            if task.delivery_state != DeliveryState.final_delivered:
                task.delivery_state = DeliveryState.final_delivered
                task.final_delivered_at = now
                if project.client_id:
                    notification_service.create(
                        db,
                        user_id=project.client_id,
                        title="Final File Unlocked",
                        notification_type=NotificationType.content_ready,
                        body=f"Your final file for '{task.title}' is now unlocked.",
                        project_id=project.id,
                        task_id=task.id
                    )

        elif task.payment_status == PaymentStatus.partially_paid:
            self.deliver_task_watermark(db, task, project)


delivery_service = DeliveryService()
