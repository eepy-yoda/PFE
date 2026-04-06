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

        Raises RuntimeError if APP_BASE_URL is not configured — a relative
        URL is useless to n8n and would cause the callback to never arrive.
        """
        base = (getattr(settings, "APP_BASE_URL", None) or "").rstrip("/")
        if not base:
            logger.critical(
                "[ImageCallback] APP_BASE_URL is not set in settings. "
                "n8n will receive a relative callback URL and can never call back. "
                "Set APP_BASE_URL=https://your-api-domain.com in your .env file."
            )
            raise RuntimeError(
                "APP_BASE_URL must be configured before watermark callbacks can work. "
                "Set APP_BASE_URL=https://your-api-domain.com in your .env file."
            )
        url = f"{base}{settings.API_V1_STR}/webhooks/n8n/image-result/{token}"
        logger.debug("[ImageCallback] Built callback URL: %s", url)
        return url

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
        and is providing the storage path (key).

        HARDENED:
          - Early path validation before any DB access
          - Idempotency: already-completed callbacks return safely
          - Full cross-validation: submission → task → project relationships verified
          - Watermarked-preview aborts loudly if submission is missing
          - record.status = "completed" is set atomically INSIDE the commit try-block
          - post-write verification after db.refresh(submission)
          - explicit db.rollback() on commit failure before the error-marking commit
        """
        hint = _token_hint(token)

        # ── 0. Early path validation ──────────────────────────────────────────
        if not image_path or not isinstance(image_path, str):
            logger.error(
                "[ImageCallback] image_path is empty or not a string  hint=%s  raw=%r",
                hint, image_path,
            )
            raise HTTPException(status_code=422, detail="image_path must be a non-empty string.")

        image_path = image_path.strip()

        if image_path.lower().startswith(("http://", "https://")):
            logger.error(
                "[ImageCallback] image_path looks like a URL, expected a storage path  "
                "hint=%s  path=%r",
                hint, image_path,
            )
            raise HTTPException(
                status_code=422,
                detail="image_path must be a storage path (bucket/key), not an external URL.",
            )

        if "/" not in image_path:
            logger.error(
                "[ImageCallback] image_path has no '/' separator — cannot split bucket/key  "
                "hint=%s  path=%r",
                hint, image_path,
            )
            raise HTTPException(
                status_code=422,
                detail="image_path must contain at least one '/' (expected: bucket/object-key).",
            )

        # ── 1. Token lookup ───────────────────────────────────────────────────
        record = (
            db.query(WorkflowImageCallback)
            .filter(WorkflowImageCallback.callback_token == token)
            .first()
        )

        if not record:
            logger.warning("[ImageCallback] Unknown token  hint=%s", hint)
            raise HTTPException(status_code=404, detail="Callback token not found.")

        logger.info(
            "[ImageCallback] Token resolved  hint=%s  record_id=%s  status=%s  "
            "file_type=%s  submission_id=%s  task_id=%s  project_id=%s",
            hint, record.id, record.status, record.file_type,
            record.submission_id, record.task_id, record.project_id,
        )

        # ── 2. Idempotency: already completed ────────────────────────────────
        if record.status == "completed":
            logger.info(
                "[ImageCallback] Already completed — returning idempotent success  "
                "hint=%s  stored_path=%s  incoming_path=%s",
                hint, record.storage_path, image_path,
            )
            db.refresh(record)
            return record

        if record.status != "pending_image":
            logger.warning(
                "[ImageCallback] Token in non-processable state  hint=%s  status=%s",
                hint, record.status,
            )
            raise HTTPException(
                status_code=409,
                detail=f"Callback is not in a processable state (current: {record.status}).",
            )

        # ── 3. Expiry check ───────────────────────────────────────────────────
        now = datetime.now(timezone.utc)
        if record.expires_at and record.expires_at < now:
            record.status = "expired"
            db.commit()
            logger.warning("[ImageCallback] Token expired  hint=%s", hint)
            raise HTTPException(status_code=410, detail="Callback token has expired.")

        # ── 4. Verify business records + cross-validate relationships ─────────
        project = db.query(Project).filter(Project.id == record.project_id).first()
        if not project:
            logger.error(
                "[ImageCallback] Project not found  hint=%s  project_id=%s",
                hint, record.project_id,
            )
            raise HTTPException(status_code=404, detail="Associated project no longer exists.")

        task: Optional[Task] = None
        if record.task_id:
            task = db.query(Task).filter(Task.id == record.task_id).first()
            if not task:
                logger.error(
                    "[ImageCallback] Task not found  hint=%s  task_id=%s",
                    hint, record.task_id,
                )
                raise HTTPException(status_code=404, detail="Associated task no longer exists.")
            # Cross-validate: task must belong to the expected project
            if task.project_id != record.project_id:
                logger.error(
                    "[ImageCallback] CROSS-VALIDATION FAILED task.project_id=%s != "
                    "record.project_id=%s  hint=%s  task_id=%s",
                    task.project_id, record.project_id, hint, task.id,
                )
                raise HTTPException(
                    status_code=409,
                    detail="Task/project relationship is inconsistent on callback record.",
                )

        submission: Optional[TaskSubmission] = None
        if record.submission_id:
            submission = (
                db.query(TaskSubmission)
                .filter(TaskSubmission.id == record.submission_id)
                .first()
            )
            if submission is None:
                logger.error(
                    "[ImageCallback] submission_id=%s not found in task_submissions  hint=%s",
                    record.submission_id, hint,
                )
            else:
                # Cross-validate: submission must belong to the expected task
                if record.task_id and submission.task_id != record.task_id:
                    logger.error(
                        "[ImageCallback] CROSS-VALIDATION FAILED submission.task_id=%s != "
                        "record.task_id=%s  hint=%s  submission_id=%s",
                        submission.task_id, record.task_id, hint, submission.id,
                    )
                    raise HTTPException(
                        status_code=409,
                        detail="Submission/task relationship is inconsistent on callback record.",
                    )
                logger.info(
                    "[ImageCallback] Submission cross-validated OK  hint=%s  "
                    "submission_id=%s  submission.task_id=%s",
                    hint, submission.id, submission.task_id,
                )
        else:
            logger.error(
                "[ImageCallback] submission_id is NULL on callback record  "
                "hint=%s  file_type=%s",
                hint, record.file_type,
            )

        # For watermarked_preview, a missing submission is a hard failure:
        # we cannot write watermark_file_path → mark failed and abort.
        if record.file_type == "watermarked_preview" and submission is None:
            record.status = "failed"
            record.error_message = (
                f"Cannot write watermark_file_path: submission_id={record.submission_id!r} "
                f"resolved to None "
                f"({'null on record' if not record.submission_id else 'not found in DB'})"
            )
            db.commit()
            logger.error(
                "[ImageCallback] ABORTING: no submission for watermarked_preview  "
                "hint=%s  record_id=%s → marked failed",
                hint, record.id,
            )
            raise HTTPException(
                status_code=500,
                detail="Cannot persist watermark: linked submission not found. "
                       "Callback marked failed.",
            )

        # ── 5. Parse storage path ─────────────────────────────────────────────
        # image_path: "task-submissions/preview/1775060331076-file.png"
        #   → bucket="task-submissions", storage_path="preview/1775060331076-file.png"
        parts = image_path.split("/", 1)
        bucket = parts[0]
        storage_path = parts[1] if len(parts) > 1 else image_path

        public_url = (
            f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/"
            f"{bucket}/{storage_path}"
        )
        logger.info(
            "[ImageCallback] Path parsed  hint=%s  raw_path=%r  bucket=%r  "
            "storage_path=%r  public_url=%r",
            hint, image_path, bucket, storage_path, public_url,
        )

        # ── 6. Stage writes (record.status NOT set yet) ───────────────────────
        record.storage_bucket = bucket
        record.storage_path = storage_path
        record.processed_at = now

        if submission is not None:
            if record.file_type == "watermarked_preview":
                submission.watermarked_file_paths = json.dumps([public_url])
                submission.watermark_file_path = image_path  # exact raw path from n8n
                logger.info(
                    "[ImageCallback] Staging watermark write  hint=%s  "
                    "submission_id=%s  watermark_file_path=%r  watermarked_file_paths=%r",
                    hint, submission.id, image_path, submission.watermarked_file_paths,
                )
            elif record.file_type == "final_version":
                submission.file_paths = json.dumps([public_url])
                logger.info(
                    "[ImageCallback] Staging final_version write  hint=%s  submission_id=%s",
                    hint, submission.id,
                )
        else:
            # Non-watermarked_preview with no submission: log and continue
            logger.warning(
                "[ImageCallback] submission is None — skipping task_submissions write  "
                "hint=%s  file_type=%s",
                hint, record.file_type,
            )

        # ── 7. Atomic commit (record.status = "completed" only on success) ────
        try:
            record.status = "completed"  # set INSIDE try — rolled back if commit fails
            db.commit()
            if submission is not None:
                db.refresh(submission)
            db.refresh(record)
            logger.info(
                "[ImageCallback] DB commit OK  hint=%s  record_id=%s  record_status=%s  "
                "submission_id=%s",
                hint, record.id, record.status, record.submission_id,
            )
        except Exception as exc:
            logger.error(
                "[ImageCallback] DB commit FAILED — rolling back  hint=%s  error=%s",
                hint, exc,
            )
            db.rollback()
            try:
                record.status = "failed"
                record.error_message = f"DB commit failed: {exc}"
                db.commit()
                logger.info(
                    "[ImageCallback] Record marked failed after rollback  hint=%s", hint
                )
            except Exception as mark_exc:
                logger.critical(
                    "[ImageCallback] Could not mark record as failed after rollback  "
                    "hint=%s  error=%s",
                    hint, mark_exc,
                )
            raise HTTPException(status_code=500, detail=f"Database commit failed: {exc}")

        # ── 8. Post-write verification ────────────────────────────────────────
        if submission is not None and record.file_type == "watermarked_preview":
            actual = getattr(submission, "watermark_file_path", None)
            if actual != image_path:
                logger.error(
                    "[ImageCallback] POST-WRITE MISMATCH  hint=%s  submission_id=%s  "
                    "expected_path=%r  actual_path=%r  "
                    "(data may still be committed — monitor DB directly)",
                    hint, submission.id, image_path, actual,
                )
            else:
                logger.info(
                    "[ImageCallback] Post-write verification OK  hint=%s  "
                    "submission_id=%s  watermark_file_path=%r",
                    hint, submission.id, actual,
                )

        # ── 9. Update delivery state ──────────────────────────────────────────
        if task:
            try:
                self._update_delivery_state(db, record, task, project)
            except Exception as exc:
                logger.warning(
                    "[ImageCallback] Delivery state update failed (non-fatal — "
                    "storage and submission are consistent)  hint=%s  error=%s",
                    hint, exc,
                )

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
