"""
submission_service.py
─────────────────────
Dedicated, modular service for the work submission pipeline.

Responsibilities:
  1. Save submission record (status=pending) with brief_snapshot
  2. Send multipart/form-data webhook to n8n (image binary + JSON metadata)
     Fallback → JSON + base64 if multipart fails
  3. Process inline n8n response (sync validation)
  4. Write webhook_response + update submission_status
  5. Trigger manager notification

Rules:
  - Does NOT modify Auth, Projects, Tasks, Notifications (only reads them)
  - Reads N8N_WORK_SUBMISSION_WEBHOOK from settings (never hard-coded)
  - Graceful degradation when webhook URL is not configured
  - Retry hook kept intentionally async-safe (no blocking sleep)
"""

from __future__ import annotations

import io
import json
import base64
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.task import Task, TaskStatus, TaskSubmission, SubmissionStatus, TaskFeedback
from app.models.project import Project
from app.models.user import User
from app.models.notification import NotificationType
from app.schemas.submission import SubmissionCreateRequest
from app.services.notification_service import notification_service
from app.services.activity_service import activity_service

logger = logging.getLogger(__name__)


def _build_brief_snapshot(project: Optional[Project]) -> Optional[str]:
    """
    Captures the exact brief content at submission time.
    Combines AI-generated brief text + structured Q&A answers.
    Stored immutably so the manager always sees what the employee worked against.
    """
    if not project:
        return None

    parts: list[str] = []

    if project.brief_content:
        parts.append(project.brief_content)

    if project.saved_answers:
        try:
            answers = json.loads(project.saved_answers)
            qa_lines = [
                f"Q: {v.get('question', k)}\nA: {v.get('answer', '')}"
                for k, v in answers.items()
            ]
            if qa_lines:
                parts.append("\n\n--- Client Q&A ---\n" + "\n\n".join(qa_lines))
        except Exception as exc:
            logger.warning("Could not parse saved_answers for brief_snapshot: %s", exc)

    return "\n".join(parts) if parts else None


def _send_submission_webhook(
    *,
    webhook_url: str,
    webhook_secret: str,
    task: Task,
    submission: TaskSubmission,
    submitted_by: UUID,
    employee_name: str,
    project_name: str,
    task_title: str,
    brief_snapshot: Optional[str],
    file_urls: list[str],
) -> Optional[dict]:
    """
    PRIMARY  → multipart/form-data
        • image fields: binary file per image (field name: "images")
        • data field: JSON string with all metadata

    FALLBACK → JSON + base64 images
        • Used automatically if multipart raises any exception

    Returns parsed n8n JSON response dict, or None if no parseable response.
    """
    import requests

    headers = {"X-Webhook-Secret": webhook_secret} if webhook_secret else {}
    meta = {
        "submission_id":  str(submission.id),
        "task_id":        str(task.id),
        "project_id":     str(task.project_id),
        "worker_id":      str(submitted_by),
        "manager_id":     str(task.created_by) if task.created_by else None,
        "image_url":      file_urls[0] if file_urls else None,
        "brief":          brief_snapshot,
        "task_title":     task_title,
        "project_name":   project_name,
        "submitted_at":   datetime.now(timezone.utc).isoformat(),
        "attempt_number": submission.attempt_number,
        # extra traceability
        "employee_name":  employee_name,
        "content":        submission.content,
        "all_image_urls": file_urls,
    }

    try:
        meta_without_brief = {k: v for k, v in meta.items() if k != "brief"}

        text_fields = {
            "data":  json.dumps(meta_without_brief),
            "brief": brief_snapshot or "",
        }

        binary_files: list = []
        for url in file_urls:
            try:
                img_resp = requests.get(url, timeout=15)
                img_resp.raise_for_status()
                mime = img_resp.headers.get("Content-Type", "image/png").split(";")[0].strip()
                fname = url.split("/")[-1].split("?")[0] or "image.png"
                binary_files.append(("images", (fname, io.BytesIO(img_resp.content), mime)))
                logger.debug("Fetched image for webhook: %s (%s, %d bytes)", fname, mime, len(img_resp.content))
            except Exception as img_err:
                logger.warning("Could not fetch image for webhook (%s): %s", url, img_err)

        resp = requests.post(webhook_url, data=text_fields, files=binary_files, headers=headers, timeout=30)
        logger.info("Webhook (multipart) → %s | status=%d", webhook_url, resp.status_code)

        if resp.status_code < 500:
            try:
                return resp.json()
            except Exception:
                return None
        return None

    except Exception as mp_err:
        logger.warning("Multipart webhook failed (%s). Falling back to JSON+base64.", mp_err)

    images_b64: list[dict] = []
    for url in file_urls:
        entry: dict = {
            "url": url,
            "filename": url.split("/")[-1].split("?")[0] or "image.png",
            "base64": None,
            "mime_type": None,
        }
        try:
            img_r = requests.get(url, timeout=15)
            img_r.raise_for_status()
            entry["mime_type"] = img_r.headers.get("Content-Type", "image/png").split(";")[0].strip()
            entry["base64"] = base64.b64encode(img_r.content).decode("utf-8")
        except Exception as b64_err:
            logger.warning("Could not fetch image for fallback (%s): %s", url, b64_err)
        images_b64.append(entry)

    fallback_payload = {**meta, "images": images_b64}
    try:
        resp = requests.post(webhook_url, json=fallback_payload, headers=headers, timeout=30)
        logger.info("Webhook (json+b64) → %s | status=%d", webhook_url, resp.status_code)
        if resp.status_code < 500:
            try:
                return resp.json()
            except Exception:
                return None
    except Exception as fb_err:
        logger.error("JSON+base64 fallback also failed: %s. Submission saved locally only.", fb_err)

    return None


def _parse_ai_webhook_response(raw_response) -> Optional[dict]:
    """
    Parses the n8n/Gemini AI webhook response into a normalized internal structure.

    Handles two formats:

    FORMAT 1 — Gemini/Vertex AI list (new):
        [{"content": {"parts": [{"text": "```json\\n{...}\\n```"}]}, ...}]

    FORMAT 2 — Legacy direct dict:
        {"status": "valid" | "invalid", "score": 0-100, "feedback": "..."}

    Returns normalized dict:
        {
            "status": "aligns" | "does_not_align" | "needs_revision" | "error",
            "summary": str,
            "score": int (0-100),
            "checks": {
                "subject_concept": str, "brand_message": str, "target_audience": str,
                "style_mood": str, "colors": str, "composition": str, "required_elements": str
            },
            "feedback": list[str]
        }
    Or None if the response cannot be parsed at all.
    """
    import re

    if not raw_response:
        return None

    if isinstance(raw_response, list):
        try:
            text = raw_response[0]["content"]["parts"][0]["text"]
        except (IndexError, KeyError, TypeError) as exc:
            logger.warning("Webhook list response: could not extract text — %s", exc)
            return {
                "status": "error",
                "summary": "AI response structure was unrecognized.",
                "score": 0,
                "checks": _empty_checks(),
                "feedback": [],
            }

        # Strip markdown code fences (```json ... ``` or ``` ... ```)
        text = text.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"^```\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip()

        if not text:
            logger.warning("Webhook list response: extracted text was empty after stripping")
            return {
                "status": "error",
                "summary": "AI analysis returned an empty response.",
                "score": 0,
                "checks": _empty_checks(),
                "feedback": [],
            }

        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as exc:
            logger.warning(
                "Webhook list response: JSON parse failed — %s | text_preview=%s",
                exc, text[:300],
            )
            return {
                "status": "error",
                "summary": "AI analysis JSON could not be parsed.",
                "score": 0,
                "checks": _empty_checks(),
                "feedback": [],
            }

        return _normalize_ai_result(parsed)

    if isinstance(raw_response, dict):
        raw_status = str(raw_response.get("status", "")).lower()
        if raw_status in ("aligns", "does_not_align", "needs_revision", "error"):
            return _normalize_ai_result(raw_response)
        # Legacy format: {"status": "valid"/"invalid", ...}
        return _normalize_legacy_response(raw_response)

    logger.warning("Webhook response is neither list nor dict: %s", type(raw_response))
    return None


def _empty_checks() -> dict:
    return {
        "subject_concept": "unknown",
        "brand_message": "unknown",
        "target_audience": "unknown",
        "style_mood": "unknown",
        "colors": "unknown",
        "composition": "unknown",
        "required_elements": "unknown",
    }


def _normalize_ai_result(parsed: dict) -> dict:
    status = str(parsed.get("status", "error")).lower()
    if status not in ("aligns", "does_not_align", "needs_revision", "error"):
        status = "error"

    score = parsed.get("score", 0)
    try:
        score = max(0, min(100, int(float(score))))
    except (TypeError, ValueError):
        score = 0

    feedback = parsed.get("feedback", [])
    if isinstance(feedback, str):
        feedback = [feedback] if feedback.strip() else []
    elif not isinstance(feedback, list):
        feedback = []
    feedback = [str(f) for f in feedback if f]

    checks = parsed.get("checks", {})
    if not isinstance(checks, dict):
        checks = {}
    for key in _empty_checks():
        if key not in checks:
            checks[key] = "unknown"

    return {
        "status": status,
        "summary": str(parsed.get("summary", "")).strip(),
        "score": score,
        "checks": checks,
        "feedback": feedback,
    }


def _normalize_legacy_response(data: dict) -> dict:
    """Convert legacy {'status': 'valid'/'invalid', 'score': ..., 'feedback': ...} to normalized."""
    wh_status = str(data.get("status", "")).lower()
    score = data.get("score", 0)
    try:
        score = max(0, min(100, int(float(score))))
    except (TypeError, ValueError):
        score = 0

    feedback_text = str(data.get("feedback", "")).strip()
    feedback = [feedback_text] if feedback_text else []

    if wh_status == "valid":
        status = "aligns"
        summary = feedback_text or "Work aligns with the brief requirements."
    elif wh_status == "invalid":
        status = "does_not_align"
        summary = feedback_text or "Work does not meet the brief requirements."
    else:
        status = "error"
        summary = "Validation status could not be determined."

    return {
        "status": status,
        "summary": summary,
        "score": score,
        "checks": _empty_checks(),
        "feedback": feedback,
    }


def _apply_webhook_response(
    db: Session,
    submission: TaskSubmission,
    task: Task,
    raw_webhook_data,
    employee_name: str,
    project_name: str,
) -> None:
    """
    Parses the raw n8n webhook response (list or dict format), normalizes it,
    stores both raw and parsed data, then updates submission + task state.

    Supported response formats:
      1. Gemini/Vertex AI list: [{content: {parts: [{text: "```json...```"}]}}]
      2. Legacy dict: {status: "valid"/"invalid", score: 0-100, feedback: "..."}
    """
    try:
        submission.webhook_response = json.dumps(raw_webhook_data)
    except (TypeError, ValueError):
        submission.webhook_response = str(raw_webhook_data)

    normalized = _parse_ai_webhook_response(raw_webhook_data)

    if normalized is None:
        logger.warning(
            "Could not parse webhook response for submission=%s — leaving as pending.",
            submission.id,
        )
        return

    try:
        submission.ai_analysis_result = json.dumps(normalized)
    except (TypeError, ValueError) as exc:
        logger.warning("Could not serialize normalized AI result: %s", exc)

    submission.ai_score = float(normalized["score"])

    feedback_lines = normalized.get("feedback", [])
    feedback_text = "\n".join(feedback_lines) if feedback_lines else normalized.get("summary", "")
    if feedback_text:
        submission.ai_feedback = feedback_text

    analysis_status = normalized["status"]
    score = normalized["score"]

    if analysis_status == "aligns":
        submission.submission_status = SubmissionStatus.validated
        submission.is_approved = True
        task.status = TaskStatus.submitted

        score_label = f" (score: {score}/100)"
        if task.created_by:
            notification_service.create(
                db,
                user_id=task.created_by,
                title=f"Submission ready for review — {task.title}",
                notification_type=NotificationType.work_submitted,
                body=(
                    f"{employee_name}'s submission for '{task.title}' "
                    f"in '{project_name}' passed AI validation{score_label} "
                    f"and is awaiting your final review."
                ),
                task_id=task.id,
                project_id=task.project_id,
            )

    elif analysis_status in ("does_not_align", "needs_revision"):
        submission.submission_status = SubmissionStatus.rejected
        task.status = TaskStatus.revision_requested

        revision_msg = feedback_text or normalized.get("summary", "Please revise your work.")
        if task.assigned_to:
            fb = TaskFeedback(
                task_id=task.id,
                submission_id=submission.id,
                sent_by=task.created_by,
                sent_to=task.assigned_to,
                message=revision_msg,
                is_revision_request=True,
            )
            db.add(fb)

            notification_service.create(
                db,
                user_id=task.assigned_to,
                title=f"Revision requested — {task.title}",
                notification_type=NotificationType.revision_requested,
                body=revision_msg[:200],
                task_id=task.id,
                project_id=task.project_id,
            )

    else:
        # "error" status — keep pending, do not penalize the employee
        logger.warning(
            "AI analysis returned error status for submission=%s — status unchanged.",
            submission.id,
        )

    logger.info(
        "Webhook response applied: submission=%s analysis_status=%s score=%s",
        submission.id, analysis_status, score,
    )


class SubmissionService:

    @staticmethod
    def create_submission(
        db: Session,
        submission_in: SubmissionCreateRequest,
        submitted_by: UUID,
    ) -> TaskSubmission:
        task = db.query(Task).filter(Task.id == submission_in.task_id).first()
        project = (
            db.query(Project).filter(Project.id == task.project_id).first()
            if task else None
        )
        employee = db.query(User).filter(User.id == submitted_by).first()

        employee_name = employee.full_name if employee else str(submitted_by)
        project_name = project.name if project else "Unknown Project"
        task_title = task.title if task else "Unknown Task"

        brief_snapshot = _build_brief_snapshot(project)

        file_urls: list[str] = submission_in.file_paths or []

        prior_count = (
            db.query(TaskSubmission)
            .filter(
                TaskSubmission.task_id == submission_in.task_id,
                TaskSubmission.submitted_by == submitted_by,
            )
            .count()
        )
        attempt_number = prior_count + 1

        db_submission = TaskSubmission(
            task_id=submission_in.task_id,
            submitted_by=submitted_by,
            content=submission_in.content,
            links=json.dumps(submission_in.links) if submission_in.links else None,
            file_paths=json.dumps(file_urls) if file_urls else None,
            submission_status=SubmissionStatus.pending,
            brief_snapshot=brief_snapshot,
            attempt_number=attempt_number,
        )
        db.add(db_submission)

        if task:
            task.status = TaskStatus.submitted

        activity_service.create_log(
            db,
            user_id=submitted_by,
            action="submit_work",
            entity_type="task",
            entity_id=submission_in.task_id,
        )

        db.commit()
        db.refresh(db_submission)

        # SUBMISSION_REVIEW_WEBHOOK_URL takes precedence; falls back to legacy N8N_WORK_SUBMISSION_WEBHOOK
        _webhook_url = settings.SUBMISSION_REVIEW_WEBHOOK_URL or settings.N8N_WORK_SUBMISSION_WEBHOOK
        if _webhook_url:
            try:
                webhook_resp = _send_submission_webhook(
                    webhook_url=_webhook_url,
                    webhook_secret=settings.N8N_WEBHOOK_SECRET or "",
                    task=task,
                    submission=db_submission,
                    submitted_by=submitted_by,
                    employee_name=employee_name,
                    project_name=project_name,
                    task_title=task_title,
                    brief_snapshot=brief_snapshot,
                    file_urls=file_urls,
                )

                if webhook_resp is not None:
                    _apply_webhook_response(
                        db=db,
                        submission=db_submission,
                        task=task,
                        raw_webhook_data=webhook_resp,
                        employee_name=employee_name,
                        project_name=project_name,
                    )
                    db.commit()
                    db.refresh(db_submission)

            except Exception as wh_err:
                # Webhook failure must never block the submission
                logger.error("Webhook dispatch error (submission saved): %s", wh_err)
        else:
            logger.warning(
                "SUBMISSION_REVIEW_WEBHOOK_URL / N8N_WORK_SUBMISSION_WEBHOOK not configured — "
                "submission %s saved locally (status=pending).",
                db_submission.id,
            )

        if task and task.created_by and db_submission.submission_status == SubmissionStatus.pending:
            notification_service.create(
                db,
                user_id=task.created_by,
                title=f"Work submitted — {task_title}",
                notification_type=NotificationType.work_submitted,
                body=(
                    f"{employee_name} submitted work on task '{task_title}' "
                    f"in project '{project_name}'. Awaiting validation."
                ),
                task_id=task.id,
                project_id=task.project_id,
            )

        return db_submission

    @staticmethod
    def get_submissions_for_task(db: Session, task_id: UUID) -> list[TaskSubmission]:
        return (
            db.query(TaskSubmission)
            .filter(TaskSubmission.task_id == task_id)
            .order_by(TaskSubmission.created_at.desc())
            .all()
        )

    @staticmethod
    def apply_webhook_callback(
        db: Session,
        submission_id: UUID,
        task_id: UUID,
        status: str,
        score: Optional[float],
        feedback: Optional[str],
    ) -> Optional[TaskSubmission]:
        submission = db.query(TaskSubmission).filter(TaskSubmission.id == submission_id).first()
        task = db.query(Task).filter(Task.id == task_id).first()

        if not submission or not task:
            return None

        project = db.query(Project).filter(Project.id == task.project_id).first()
        employee = db.query(User).filter(User.id == submission.submitted_by).first()

        employee_name = employee.full_name if employee else "Employee"
        project_name = project.name if project else "Unknown Project"

        webhook_data = {"status": status}
        if score is not None:
            webhook_data["score"] = score
        if feedback:
            webhook_data["feedback"] = feedback

        _apply_webhook_response(
            db=db,
            submission=submission,
            task=task,
            raw_webhook_data=webhook_data,
            employee_name=employee_name,
            project_name=project_name,
        )
        db.commit()
        db.refresh(submission)
        return submission

    @staticmethod
    def get_submission(db: Session, submission_id: UUID) -> Optional[TaskSubmission]:
        return db.query(TaskSubmission).filter(TaskSubmission.id == submission_id).first()


submission_service = SubmissionService()
