import logging

import requests
import requests.exceptions
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.models.project import Project, PaymentType, PaymentStatus, DeliveryState
from app.models.task import Task, TaskSubmission
from app.services.notification_service import notification_service
from app.models.notification import NotificationType
from app.core.config import settings

logger = logging.getLogger(__name__)

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

        # ── Guard 1: payment must be partially_paid ───────────────────────────
        # For task-mode: the task itself must be partially paid.
        # For project-mode: the project must be partially paid.
        if project.payment_type == PaymentType.task:
            if task.payment_status != PaymentStatus.partially_paid:
                logger.info(
                    "[DeliveryService] Watermark skipped — task not partially paid  "
                    "task_id=%s  payment_status=%s",
                    task.id, task.payment_status,
                )
                return
        else:
            if project.payment_status != PaymentStatus.partially_paid:
                logger.info(
                    "[DeliveryService] Watermark skipped — project not partially paid  "
                    "task_id=%s  project_payment_status=%s",
                    task.id, project.payment_status,
                )
                return

        # ── Guard 2: prevent re-delivery ─────────────────────────────────────
        if task.delivery_state in [DeliveryState.watermark_delivered, DeliveryState.final_delivered]:
            logger.info(
                "[DeliveryService] Watermark skipped — already delivered  "
                "task_id=%s  delivery_state=%s",
                task.id, task.delivery_state,
            )
            return

        # ── Guard 3: approved submission with files must exist ────────────────
        submission = db.query(TaskSubmission).filter(
            TaskSubmission.task_id == task.id,
            TaskSubmission.is_approved == True,
        ).order_by(TaskSubmission.created_at.desc()).first()

        if not submission:
            logger.info(
                "[DeliveryService] Watermark skipped — no approved submission  task_id=%s",
                task.id,
            )
            return

        if not submission.file_paths:
            logger.info(
                "[DeliveryService] Watermark skipped — approved submission has no files  "
                "task_id=%s  submission_id=%s",
                task.id, submission.id,
            )
            return

        # Create a pending callback record so the token is ready whether n8n
        # returns the path inline (sync) or calls back separately (async).
        from app.services.image_callback_service import image_callback_service
        callback_record = None
        callback_url = None
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
            logger.error(
                "[DeliveryService] Failed to create image callback record  "
                "task_id=%s  submission_id=%s  error=%s",
                task.id, submission.id, e,
            )

        task.delivery_state = DeliveryState.watermark_delivered
        task.watermarked_delivered_at = datetime.now(timezone.utc)

        # Trigger webhook
        webhook_url = getattr(settings, 'WATERMARK_WEBHOOK_URL', None)
        if not webhook_url:
            webhook_url = (
                getattr(settings, 'SUBMISSION_REVIEW_WEBHOOK_URL', None)
                or getattr(settings, 'N8N_WORK_SUBMISSION_WEBHOOK', None)
            )

        n8n_response = None  # will hold the requests.Response if the call succeeds

        if webhook_url:
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
            logger.info(
                "[DeliveryService] Firing watermark webhook  task_id=%s  "
                "submission_id=%s  callback_url=%s",
                task.id, submission.id, callback_url,
            )
            try:
                n8n_response = requests.post(
                    webhook_url,
                    json=payload,
                    timeout=(10, 60),
                )
                logger.info(
                    "[DeliveryService] Webhook acknowledged  task_id=%s  "
                    "http_status=%s",
                    task.id, n8n_response.status_code,
                )
            except requests.exceptions.ReadTimeout:
                # TCP connection succeeded and the request was sent.
                # n8n was just slow to send back the HTTP response.
                # The workflow is likely running — callback should still arrive.
                logger.warning(
                    "[DeliveryService] Webhook read timeout (request was sent, "
                    "n8n may still be processing)  task_id=%s  url=%s",
                    task.id, webhook_url,
                )
            except requests.exceptions.ConnectionError as e:
                logger.error(
                    "[DeliveryService] Webhook connection failed — n8n did NOT "
                    "receive trigger  task_id=%s  url=%s  error=%s",
                    task.id, webhook_url, e,
                )
            except Exception as e:
                logger.error(
                    "[DeliveryService] Webhook call failed  task_id=%s  "
                    "url=%s  error=%s",
                    task.id, webhook_url, e,
                )
        else:
            logger.warning(
                "[DeliveryService] No watermark webhook URL configured — "
                "n8n was not triggered  task_id=%s",
                task.id,
            )

        # ── Parse n8n inline response ─────────────────────────────────────────
        # n8n may return the uploaded path directly in the HTTP response body
        # instead of (or in addition to) calling back to callback_url.
        # Shape: [{"Key": "task-submissions/preview/...", "Id": "<uuid>"}]
        # When present, process it immediately so storage_path is persisted
        # without waiting for a separate async callback.
        if n8n_response is not None and callback_record is not None:
            try:
                body = n8n_response.json()
                image_path = None

                if isinstance(body, list) and body:
                    first = body[0]
                    if isinstance(first, dict):
                        image_path = (
                            first.get("Key") or first.get("key") or first.get("KEY")
                        )
                elif isinstance(body, dict):
                    image_path = body.get("image_path") or body.get("Key") or body.get("key")

                if image_path and isinstance(image_path, str) and image_path.strip():
                    image_path = image_path.strip()
                    logger.info(
                        "[DeliveryService] n8n returned inline path — processing immediately  "
                        "task_id=%s  path=%r  token_hint=%s",
                        task.id, image_path, callback_record.callback_token[:8] + "...",
                    )
                    try:
                        image_callback_service.process_path_callback(
                            db,
                            token=callback_record.callback_token,
                            image_path=image_path,
                        )
                        logger.info(
                            "[DeliveryService] Inline path processed — watermark_file_path "
                            "persisted  task_id=%s  submission_id=%s",
                            task.id, submission.id,
                        )
                    except Exception as proc_exc:
                        logger.error(
                            "[DeliveryService] Failed to process inline n8n path  "
                            "task_id=%s  path=%r  error=%s",
                            task.id, image_path, proc_exc,
                        )
                else:
                    logger.info(
                        "[DeliveryService] n8n response contained no path — "
                        "will wait for async callback  task_id=%s  body=%r",
                        task.id, body,
                    )
            except Exception as parse_exc:
                logger.warning(
                    "[DeliveryService] Could not parse n8n response body  "
                    "task_id=%s  error=%s",
                    task.id, parse_exc,
                )

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
