"""
services/image_callback_service.py
────────────────────────────────────
Handles the token-based n8n image-result callback pipeline.

Two-phase design:

  Phase 1 — before n8n is triggered:
    create_pending_callback() generates a cryptographically strong token,
    persists full business context (project_id, task_id, submission_id,
    file_type) in workflow_image_callbacks, and returns the record so the
    caller can embed the token in the webhook URL sent to n8n.

  Phase 2 — when n8n POSTs the binary image:
    process_image_callback() validates the token, uploads the image to
    Supabase Storage, writes the path to the submission record, and updates
    the task delivery state — all without any extra metadata from n8n.
"""

from __future__ import annotations

import json
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.notification import NotificationType
from app.models.project import DeliveryState, Project
from app.models.task import Task, TaskSubmission
from app.models.workflow_image_callback import WorkflowImageCallback
from app.services.notification_service import notification_service
from app.services.storage_service import delete_deliverable, upload_deliverable

logger = logging.getLogger(__name__)

_TOKEN_EXPIRY_HOURS = 24
_VALID_FILE_TYPES = {"watermarked_preview", "final_version"}


def _token_hint(token: str) -> str:
    """First 8 chars of the token — safe to log, never exposes the full value."""
    return token[:8] + "..."


class ImageCallbackService:

    # ── Phase 1: create pending record ───────────────────────────────────────

    def create_pending_callback(
        self,
        db: Session,
        *,
        project_id: UUID,
        task_id: Optional[UUID],
        submission_id: Optional[UUID],
        file_type: str,
    ) -> WorkflowImageCallback:
        """
        Create a workflow_image_callbacks row before triggering n8n.

        The returned record's callback_token must be embedded in the callback
        URL included in the n8n webhook payload, e.g.:
            {APP_BASE_URL}/api/v1/webhooks/n8n/image-result/{token}

        Raises ValueError for an unsupported file_type.
        """
        if file_type not in _VALID_FILE_TYPES:
            raise ValueError(
                f"file_type must be one of {_VALID_FILE_TYPES!r}, got {file_type!r}"
            )

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=_TOKEN_EXPIRY_HOURS)

        record = WorkflowImageCallback(
            callback_token=token,
            project_id=project_id,
            task_id=task_id,
            submission_id=submission_id,
            file_type=file_type,
            status="pending_image",
            expires_at=expires_at,
            source="n8n",
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        logger.info(
            "[ImageCallback] Pending record created  hint=%s  file_type=%s  "
            "submission_id=%s  task_id=%s  project_id=%s",
            _token_hint(token), file_type, submission_id, task_id, project_id,
        )
        return record

    def build_callback_url(self, token: str) -> str:
        """
        Build the full callback URL to include in the n8n webhook payload.
        Requires APP_BASE_URL in settings (e.g. https://api.example.com).
        """
        base = (getattr(settings, "APP_BASE_URL", None) or "").rstrip("/")
        return f"{base}{settings.API_V1_STR}/webhooks/n8n/image-result/{token}"

    # ── Phase 2: process incoming binary from n8n ─────────────────────────────

    def process_path_callback(
        self,
        db: Session,
        *,
        token: str,
        image_path: str,
    ) -> WorkflowImageCallback:
        """
        Process a callback where n8n has already uploaded the image to Supabase
        and is just providing the storage path (key).

        The image_path should be in format: 'bucket/folder/filename.ext'
        """
        hint = _token_hint(token)

        # 1. Token validation
        record = (
            db.query(WorkflowImageCallback)
            .filter(WorkflowImageCallback.callback_token == token)
            .first()
        )

        if not record:
            logger.warning("[ImageCallback] Unknown token  hint=%s", hint)
            raise HTTPException(status_code=404, detail="Callback token not found")

        if record.status != "pending_image":
            logger.warning("[ImageCallback] Token reuse attempt  hint=%s  status=%s", hint, record.status)
            raise HTTPException(status_code=409, detail="Callback has already been processed")

        now = datetime.now(timezone.utc)
        if record.expires_at and record.expires_at < now:
            record.status = "expired"
            db.commit()
            raise HTTPException(status_code=410, detail="Callback token has expired")

        # 2. Verify business records
        project = db.query(Project).filter(Project.id == record.project_id).first()
        if not project:
             raise HTTPException(status_code=404, detail="Associated project no longer exists")

        task: Optional[Task] = None
        if record.task_id:
            task = db.query(Task).filter(Task.id == record.task_id).first()

        submission: Optional[TaskSubmission] = None
        logger.info(
            "[ImageCallback] Record lookup  hint=%s  file_type=%s  submission_id=%s  task_id=%s",
            hint, record.file_type, record.submission_id, record.task_id,
        )
        if record.submission_id:
            submission = db.query(TaskSubmission).filter(TaskSubmission.id == record.submission_id).first()
            if submission is None:
                logger.error(
                    "[ImageCallback] submission_id %s not found in task_submissions  hint=%s",
                    record.submission_id, hint,
                )
        else:
            logger.error(
                "[ImageCallback] submission_id is NULL on callback record — cannot write watermark_file_path  hint=%s",
                hint,
            )

        # 3. Construct Public URL
        # "task-submissions/preview/1775060331076-file.png" → bucket="task-submissions", path="preview/..."
        parts = image_path.split("/", 1)
        if len(parts) < 2:
            bucket = "task-submissions"
            storage_path = image_path
        else:
            bucket = parts[0]
            storage_path = parts[1]

        public_url = (
            f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/"
            f"{bucket}/{storage_path}"
        )
        logger.info(
            "[ImageCallback] Path parsed  hint=%s  bucket=%s  storage_path=%s  public_url=%s",
            hint, bucket, storage_path, public_url,
        )

        # 4. Persist
        record.status = "completed"
        record.storage_bucket = bucket
        record.storage_path = storage_path
        record.processed_at = now

        if submission is not None:
            if record.file_type == "watermarked_preview":
                submission.watermarked_file_paths = json.dumps([public_url])
                submission.watermark_file_path = image_path
                logger.info(
                    "[ImageCallback] Writing watermark_file_path=%r to submission %s  hint=%s",
                    image_path, submission.id, hint,
                )
            elif record.file_type == "final_version":
                submission.file_paths = json.dumps([public_url])
                logger.info(
                    "[ImageCallback] Writing file_paths to submission %s  hint=%s",
                    submission.id, hint,
                )
        else:
            logger.error(
                "[ImageCallback] submission is None — skipping task_submissions write  hint=%s  file_type=%s",
                hint, record.file_type,
            )

        try:
            db.commit()
            db.refresh(record)
            logger.info(
                "[ImageCallback] DB commit OK  hint=%s  record_status=%s  submission_id=%s",
                hint, record.status, record.submission_id,
            )
        except Exception as exc:
            logger.error("[ImageCallback] DB commit FAILED  hint=%s  error=%s", hint, exc)
            raise HTTPException(status_code=500, detail=f"Database commit failed: {exc}")

        # 5. Update delivery state
        if task:
            try:
                self._update_delivery_state(db, record, task, project)
            except Exception as exc:
                logger.warning("[ImageCallback] State update failed  hint=%s  error=%s", hint, exc)

        return record


    def process_image_callback(
        self,
        db: Session,
        *,
        token: str,
        image_file,
        content_type: str,
    ) -> WorkflowImageCallback:
        """
        Full receive-validate-upload-persist-notify pipeline.

        Steps:
          1. Look up and validate the token (existence, status, expiry)
          2. Validate the binary payload
          3. Assert linked business records still exist
          4. Upload image to Supabase Storage (deliverables bucket)
          5. Persist storage path in the callback record + submission
          6. Update task delivery state and notify the client
        """
        hint = _token_hint(token)

        # ── 1. Token validation ───────────────────────────────────────────────
        record = (
            db.query(WorkflowImageCallback)
            .filter(WorkflowImageCallback.callback_token == token)
            .first()
        )

        if not record:
            logger.warning("[ImageCallback] Unknown token  hint=%s", hint)
            raise HTTPException(status_code=404, detail="Callback token not found")

        logger.info(
            "[ImageCallback] Token resolved  hint=%s  status=%s  file_type=%s  "
            "submission_id=%s  task_id=%s  project_id=%s",
            hint, record.status, record.file_type,
            record.submission_id, record.task_id, record.project_id,
        )

        if record.status != "pending_image":
            logger.warning(
                "[ImageCallback] Token reuse attempt  hint=%s  status=%s", hint, record.status
            )
            raise HTTPException(
                status_code=409,
                detail="Callback token has already been processed or is in an invalid state",
            )

        now = datetime.now(timezone.utc)
        if record.expires_at and record.expires_at < now:
            record.status = "expired"
            db.commit()
            logger.warning("[ImageCallback] Token expired  hint=%s", hint)
            raise HTTPException(status_code=410, detail="Callback token has expired")

        # ── 2. Payload validation ─────────────────────────────────────────────
        # Probe file size without reading the entire stream into memory.
        try:
            image_file.seek(0, 2)
            _size = image_file.tell()
            image_file.seek(0)
            if _size == 0:
                raise HTTPException(
                    status_code=422, detail="Binary field 'image' is missing or empty"
                )
        except (AttributeError, OSError):
            pass  # non-seekable stream — let the upload fail with its own error

        if not content_type.startswith("image/"):
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported content type '{content_type}'; expected image/*",
            )

        # ── 3. Verify business records still exist ────────────────────────────
        project = db.query(Project).filter(Project.id == record.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Associated project no longer exists")

        task: Optional[Task] = None
        if record.task_id:
            task = db.query(Task).filter(Task.id == record.task_id).first()
            if not task:
                raise HTTPException(status_code=404, detail="Associated task no longer exists")

        submission: Optional[TaskSubmission] = None
        if record.submission_id:
            submission = (
                db.query(TaskSubmission)
                .filter(TaskSubmission.id == record.submission_id)
                .first()
            )
            if not submission:
                raise HTTPException(
                    status_code=404, detail="Associated submission no longer exists"
                )

        # ── 4. Upload to Supabase Storage ─────────────────────────────────────
        task_id_str       = str(record.task_id)       if record.task_id       else "no-task"
        submission_id_str = str(record.submission_id) if record.submission_id else "no-submission"

        try:
            storage_path, public_url = upload_deliverable(
                file_source=image_file,
                content_type=content_type,
                project_id=str(record.project_id),
                task_id=task_id_str,
                submission_id=submission_id_str,
                file_type=record.file_type,
            )
            logger.info(
                "[ImageCallback] Upload OK  hint=%s  path=%s", hint, storage_path
            )
        except Exception as exc:
            record.status = "failed"
            record.error_message = f"Upload failed: {exc}"
            db.commit()
            logger.error("[ImageCallback] Upload FAILED  hint=%s  error=%s", hint, exc)
            raise HTTPException(status_code=502, detail="Storage upload failed")

        # ── 5. Persist storage path ───────────────────────────────────────────
        record.status         = "completed"
        record.storage_bucket = "deliverables"
        record.storage_path   = storage_path
        record.processed_at   = now

        try:
            if submission is not None:
                if record.file_type == "watermarked_preview":
                    submission.watermarked_file_paths = json.dumps([public_url])
                    submission.watermark_file_path = f"deliverables/{storage_path}"
                    logger.info(
                        "[ImageCallback] watermark_file_path set  hint=%s  path=deliverables/%s",
                        hint, storage_path,
                    )
                elif record.file_type == "final_version":
                    submission.file_paths = json.dumps([public_url])

            db.commit()
            db.refresh(record)
            logger.info(
                "[ImageCallback] DB updated  hint=%s  file_type=%s", hint, record.file_type
            )
        except Exception as exc:
            logger.error(
                "[ImageCallback] DB update FAILED  hint=%s  error=%s — attempting rollback",
                hint, exc,
            )
            try:
                delete_deliverable(storage_path)
                record.status = "failed"
                record.error_message = f"DB update failed (upload rolled back): {exc}"
                db.commit()
                logger.info("[ImageCallback] Rollback OK  hint=%s", hint)
            except Exception as rollback_exc:
                record.status = "orphaned"
                record.error_message = (
                    f"DB update failed: {exc}. "
                    f"Rollback also failed: {rollback_exc}. "
                    f"Orphaned file: deliverables/{storage_path}"
                )
                try:
                    db.commit()
                except Exception:
                    pass
                logger.critical(
                    "[ImageCallback] ORPHANED FILE  hint=%s  path=deliverables/%s",
                    hint, storage_path,
                )
            raise HTTPException(
                status_code=500, detail="Failed to update database after upload"
            )

        # ── 6. Update delivery state ──────────────────────────────────────────
        if task is not None:
            try:
                self._update_delivery_state(db, record, task, project)
            except Exception as exc:
                # Non-fatal: storage and DB are consistent; state update failed.
                logger.warning(
                    "[ImageCallback] Delivery state update failed  hint=%s  error=%s",
                    hint, exc,
                )

        return record

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _update_delivery_state(
        self,
        db: Session,
        record: WorkflowImageCallback,
        task: Task,
        project: Project,
    ) -> None:
        now = datetime.now(timezone.utc)

        if record.file_type == "watermarked_preview":
            if task.delivery_state not in (
                DeliveryState.watermark_delivered,
                DeliveryState.final_delivered,
            ):
                task.delivery_state = DeliveryState.watermark_delivered
                task.watermarked_delivered_at = now
                db.commit()

                if project.client_id:
                    notification_service.create(
                        db,
                        user_id=project.client_id,
                        title="Work Preview Available",
                        notification_type=NotificationType.content_ready,
                        body=f"A watermarked preview for '{task.title}' is ready for your review.",
                        project_id=project.id,
                        task_id=task.id,
                    )
                logger.info(
                    "[ImageCallback] delivery_state → watermark_delivered  task_id=%s", task.id
                )

        elif record.file_type == "final_version":
            if task.delivery_state != DeliveryState.final_delivered:
                task.delivery_state = DeliveryState.final_delivered
                task.final_delivered_at = now
                db.commit()

                if project.client_id:
                    notification_service.create(
                        db,
                        user_id=project.client_id,
                        title="Final Work Unlocked!",
                        notification_type=NotificationType.content_ready,
                        body=f"Your final file for '{task.title}' is now available.",
                        project_id=project.id,
                        task_id=task.id,
                    )
                logger.info(
                    "[ImageCallback] delivery_state → final_delivered  task_id=%s", task.id
                )


image_callback_service = ImageCallbackService()
