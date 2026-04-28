import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import requests
import uuid
import json
from datetime import datetime
from typing import Any, Dict

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.models.project import Project, ProjectStatus, BriefStatus
from app.models.task import Task, TaskSubmission
from app.schemas.brief import (
    BriefStartRequest,
    BriefSubmitRequest,
    BriefAutosaveRequest,
    BriefInterruptRequest,
    BriefResponse,
    UNANSWERED_PLACEHOLDER,
)
from app.core.config import settings
from app.services.notification_service import notification_service
from app.models.notification import NotificationType
from app.services.email_service import email_service

router = APIRouter()

logger = logging.getLogger(__name__)

# n8n signals brief completion with this status code
N8N_COMPLETE_CODE = 333


def _parse_n8n_response(raw_text: str) -> dict:
    """Parse n8n response — handles plain JSON, NDJSON, and markdown-wrapped JSON."""
    try:
        return json.loads(raw_text)
    except ValueError:
        pass

    # Try NDJSON: scan lines in reverse for the payload we care about
    for line in reversed(raw_text.split('\n')):
        line = line.strip()
        if not line:
            continue
        try:
            parsed = json.loads(line)
            if not isinstance(parsed, dict):
                continue
            if "mode" in parsed:
                return parsed
            if parsed.get("type") == "item" and "content" in parsed:
                content = parsed["content"].strip()
                if content.startswith("```"):
                    lines_c = content.split('\n')
                    content = "\n".join(lines_c[1:-1]).strip()
                inner = json.loads(content)
                if isinstance(inner, dict) and "mode" in inner:
                    return inner
        except Exception:
            continue

    return {}


def _call_n8n(
    payload: dict,
    headers: dict,
    timeout: int = 10,
    strict_response: bool = True,
) -> dict:
    """POST to the n8n webhook and return parsed response.

    strict_response=True  (default, used by /brief/start):
        Requires parseable JSON with a "mode" field. Raises 502 if absent.
        The caller needs schema/complete structure to drive the next UI step.

    strict_response=False  (used by /brief/submit):
        Any HTTP 2xx = delivery confirmed. Returns parsed JSON when available;
        falls back to {"mode": "complete"} for empty/non-structured bodies.
        This separates "did n8n receive the request?" from "did n8n finish processing?".
        n8n may be set to "Respond Immediately" and continue async — that is fine.

    Raises:
        requests.exceptions.Timeout  — response timed out; delivery is UNKNOWN.
            Callers decide whether to surface this as send_unknown or hard failure.
        HTTPException                — definite failure (connection error, non-2xx, etc.).
    """
    if not settings.N8N_BRIEF_WEBHOOK_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="N8N Webhook URL not configured"
        )
    try:
        resp = requests.post(
            settings.N8N_BRIEF_WEBHOOK_URL,
            json=payload,
            headers=headers,
            timeout=timeout
        )

        briefing_id = payload.get("briefing_id", "n/a")
        logger.info(
            "[Brief/N8N] status=%s briefing_id=%s response_headers=%s body_preview=%.500s",
            resp.status_code, briefing_id, dict(resp.headers), resp.text
        )

        # Non-2xx → definite failure regardless of strict_response
        resp.raise_for_status()

        raw = resp.text.strip()

        if not strict_response:
            # Delivery-only mode: 2xx = n8n accepted the request.
            # Return any structured response that carries actionable data;
            # fall back to async sentinel only for empty/noise bodies.
            _ACTIONABLE_KEYS = frozenset({"mode", "status", "code", "brief_content", "fields", "type"})
            if raw:
                parsed = _parse_n8n_response(raw)
                if parsed and any(k in parsed for k in _ACTIONABLE_KEYS):
                    logger.info(
                        "[Brief/N8N] Structured response: mode=%s status=%s code=%s has_brief_content=%s",
                        parsed.get("mode"), parsed.get("status"), parsed.get("code"),
                        "brief_content" in parsed
                    )
                    return parsed
                # Non-empty body but no actionable keys (e.g. {"ok":true}, {"noWebhookResponse":true})
                logger.info("[Brief/N8N] Non-structured 2xx body — treating as async delivery confirmed")
            else:
                logger.info("[Brief/N8N] Empty 2xx body — treating as async delivery confirmed")

            # Async delivery sentinel: n8n received the request, processing continues in background
            return {"status": "submitted"}

        # Strict mode: require parseable JSON with usable content
        data = _parse_n8n_response(raw)
        if not data:
            logger.error(
                "[Brief/N8N] Unparseable response body (strict mode) briefing_id=%s body=%.500s",
                briefing_id, raw
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Automation engine returned an unexpected format."
            )
        # n8n signals a workflow error with {"type": "error", "content": "..."}
        if data.get("type") == "error":
            err = data.get("content", "Unknown workflow error")
            logger.warning("[Brief/N8N] Workflow error briefing_id=%s error=%s", briefing_id, err)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Workflow engine error: {err}"
            )
        return data

    except requests.exceptions.Timeout:
        logger.warning("[Brief/N8N] Timeout briefing_id=%s timeout=%ss", payload.get("briefing_id", "n/a"), timeout)
        raise  # re-raise so callers can distinguish timeout (unknown delivery) from connection failure
    except requests.exceptions.RequestException as e:
        logger.error("[Brief/N8N] Request failed briefing_id=%s error=%s", payload.get("briefing_id", "n/a"), e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Communication with automation engine failed. Please try again later."
        )


def _is_complete(n8n_data: dict) -> bool:
    return (
        n8n_data.get("mode") == "complete"
        or n8n_data.get("status") == "created"
        or n8n_data.get("code") == N8N_COMPLETE_CODE
        or str(n8n_data.get("code", "")) == str(N8N_COMPLETE_CODE)
    )


# Unfinished statuses with a valid schema — safe to resume
_RESUMABLE_STATUSES = (BriefStatus.in_progress, BriefStatus.interrupted)

# Statuses that must not be overwritten by /interrupt
_INTERRUPT_BLOCKED_BRIEF_STATUSES = frozenset({
    BriefStatus.submitted,
    BriefStatus.validated,
    BriefStatus.rejected,
    BriefStatus.converted,
    BriefStatus.failed_start,
    BriefStatus.draft,          # draft = project committed, webhook not yet confirmed
})
_INTERRUPT_BLOCKED_PROJECT_STATUSES = frozenset({
    ProjectStatus.planning,
    ProjectStatus.active,
    ProjectStatus.completed,
    ProjectStatus.delivered,
    ProjectStatus.archived,
})


@router.post("/start", response_model=Dict[str, Any])
async def start_brief(
    request: BriefStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Idempotency: reuse valid unfinished brief with same name (schema already exists).
    # failed_start and draft-without-schema are intentionally excluded — always retry fresh.
    existing = (
        db.query(Project)
        .filter(
            Project.client_id == current_user.id,
            Project.name == request.seed.project_name,
            Project.brief_status.in_(_RESUMABLE_STATUSES),
            Project.next_question.isnot(None),
        )
        .order_by(Project.created_at.desc())
        .first()
    )
    if existing:
        try:
            schema = json.loads(existing.next_question)
            if schema.get("fields"):
                logger.info("[Brief/Start] Reusing valid unfinished brief %s for client %s", existing.id, current_user.id)
                return {"sessionId": str(existing.id), "n8n_response": schema}
        except Exception:
            pass  # schema corrupt — fall through to create new brief

    manager_id = current_user.id
    if current_user.role == UserRole.client:
        manager = db.query(User).filter(User.role == UserRole.manager).first()
        if manager:
            manager_id = manager.id

    db_project = Project(
        name=request.seed.project_name,
        description=f"Objective: {request.seed.objective}",
        status=ProjectStatus.briefing,
        brief_status=BriefStatus.draft,
        client_id=current_user.id,
        manager_id=manager_id,
        brief_history=json.dumps({"seed": request.seed.model_dump()})
    )
    try:
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        logger.info("[Brief/Start] Project committed (draft): %s", db_project.id)
    except Exception as db_err:
        db.rollback()
        logger.error("[Brief/Start] DB error creating project: %s", db_err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database error: could not create brief session. Please try again."
        )

    # Project is now visible in Supabase — n8n can fetch it by sessionId.
    headers = {"X-Webhook-Secret": settings.N8N_WEBHOOK_SECRET or ""}
    payload = {
        "sessionId": str(db_project.id),
        "timestamp": datetime.now().isoformat(),
        "seed": request.seed.model_dump(),
        "context": {
            "source": "webapp_brief",
            "appVersion": settings.VERSION,
            "user_id": str(current_user.id)
        }
    }

    n8n_error: str | None = None
    n8n_data: dict = {}
    try:
        n8n_data = _call_n8n(payload, headers)
    except requests.exceptions.Timeout:
        n8n_error = "Briefing engine timed out."
        logger.warning("[Brief/Start] N8N timeout for session %s", db_project.id)
    except HTTPException as exc:
        n8n_error = exc.detail
        logger.warning("[Brief/Start] N8N error for session %s: %s", db_project.id, exc.detail)

    if n8n_error:
        # Mark failed_start so the project is not shown as resumable.
        db_project.brief_status = BriefStatus.failed_start
        db_project.clarification_notes = n8n_error
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=n8n_error if "timed out" not in n8n_error
                   else "The briefing engine took too long to respond. Please try again."
        )

    if _is_complete(n8n_data):
        db_project.status = ProjectStatus.planning
        db_project.brief_status = BriefStatus.submitted
        db_project.brief_content = n8n_data.get("brief_content", "Brief generated successfully.")
        db_project.next_question = None
    else:
        db_project.brief_status = BriefStatus.in_progress
        db_project.next_question = json.dumps(n8n_data)

    try:
        db.commit()
        db.refresh(db_project)
        logger.info("[Brief/Start] Project updated with schema: %s brief_status=%s", db_project.id, db_project.brief_status)
    except Exception as db_err:
        db.rollback()
        logger.error("[Brief/Start] DB error saving schema: %s", db_err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database error: could not save brief session. Please try again."
        )

    if manager_id and manager_id != current_user.id:
        notification_service.create(
            db,
            user_id=manager_id,
            title="New brief started",
            notification_type=NotificationType.general,
            body=f"Client {current_user.full_name or current_user.email} started a new brief for '{request.seed.project_name}'",
            project_id=db_project.id
        )

    if _is_complete(n8n_data) and db_project.client_id:
        client = db.query(User).filter(User.id == db_project.client_id).first()
        if client and client.email:
            email_service.send_notification_email(
                to_email=client.email,
                subject="Brief submitted — AgencyFlow",
                body=f"Your brief for '{db_project.name}' has been submitted successfully."
            )

    return {"sessionId": str(db_project.id), "n8n_response": n8n_data}


@router.post("/autosave")
async def autosave_brief_answer(
    request: BriefAutosaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Persist a single answered field so progress survives a lost session."""
    db_project = db.query(Project).filter(Project.id == request.sessionId).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_project.client_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")

    saved = json.loads(db_project.saved_answers or "{}")
    saved[request.fieldKey] = {
        "question": request.question,
        "answer": request.answer
    }
    db_project.saved_answers = json.dumps(saved)

    # Keep brief_status consistent — also unset 'interrupted' when the user resumes
    if db_project.brief_status in (BriefStatus.draft, BriefStatus.interrupted):
        db_project.brief_status = BriefStatus.in_progress

    db.commit()
    return {"ok": True}


@router.post("/interrupt")
async def interrupt_brief(
    request: BriefInterruptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_project = db.query(Project).filter(Project.id == request.sessionId).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_project.client_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")

    # Never regress a terminal/advanced status to interrupted
    if (
        db_project.brief_status in _INTERRUPT_BLOCKED_BRIEF_STATUSES
        or db_project.status in _INTERRUPT_BLOCKED_PROJECT_STATUSES
    ):
        logger.info(
            "[Brief/Interrupt] Skipped — terminal status brief=%s project=%s session=%s",
            db_project.brief_status, db_project.status, db_project.id
        )
        return {"ok": True, "status": "ignored"}

    saved = json.loads(db_project.saved_answers or "{}")

    for field in request.allFields:
        key = field.get("key") or field.get("fieldKey")
        if not key:
            continue
        if key in request.answeredFields:
            saved[key] = request.answeredFields[key]
        elif key not in saved or saved[key].get("answer") == UNANSWERED_PLACEHOLDER:
            saved[key] = {"question": field, "answer": UNANSWERED_PLACEHOLDER}

    db_project.saved_answers = json.dumps(saved)
    db_project.brief_status = BriefStatus.interrupted
    db.commit()

    # Notify n8n — best effort (don't fail the response if n8n is unreachable)
    if settings.N8N_BRIEF_WEBHOOK_URL:
        interrupt_payload = {
            "sessionId": str(db_project.id),
            "timestamp": datetime.now().isoformat(),
            "interrupted": True,
            "data": saved,
            "context": {"source": "webapp_brief_interrupt"}
        }
        headers = {"X-Webhook-Secret": settings.N8N_WEBHOOK_SECRET or ""}
        try:
            requests.post(
                settings.N8N_BRIEF_WEBHOOK_URL,
                json=interrupt_payload,
                headers=headers,
                timeout=5
            )
        except Exception as e:
            logger.warning("[Brief/Interrupt] N8N call failed (non-blocking): %s", e)

    return {"ok": True, "status": "interrupted"}


@router.get("/status/{session_id}", response_model=Dict[str, Any])
async def get_brief_status(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_project = db.query(Project).filter(Project.id == session_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_project.client_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")

    n8n_schema = None
    if db_project.next_question:
        try:
            n8n_schema = json.loads(db_project.next_question)
        except Exception:
            pass

    saved_answers = {}
    if db_project.saved_answers:
        try:
            saved_answers = json.loads(db_project.saved_answers)
        except Exception:
            pass

    return {
        "sessionId": str(db_project.id),
        "status": db_project.brief_status,
        "n8n_response": n8n_schema,
        "saved_answers": saved_answers,
        "brief_content": db_project.brief_content,
        "error": db_project.clarification_notes if db_project.brief_status == BriefStatus.failed_start else None,
    }


@router.post("/submit", response_model=Dict[str, Any])
async def submit_brief_step(
    request: BriefSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_project = db.query(Project).filter(Project.id == request.sessionId).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_project.client_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")

    # Idempotency guard: webhook already sent — return cached result, never call n8n again
    if db_project.brief_status == BriefStatus.submitted:
        logger.info("[Brief/Submit] Already submitted (idempotency guard) — returning cached result for session %s", db_project.id)
        return {
            "mode": "complete",
            "code": N8N_COMPLETE_CODE,
            "brief_content": db_project.brief_content,
        }

    clean_data = {
        k: v for k, v in request.data.items()
        if not (isinstance(v, dict) and v.get("answer") == UNANSWERED_PLACEHOLDER)
    }

    history = json.loads(db_project.brief_history or "{}")
    history.setdefault("steps", []).append(clean_data)
    db_project.brief_history = json.dumps(history)

    existing_saved = json.loads(db_project.saved_answers or "{}")
    existing_saved.update(clean_data)
    db_project.saved_answers = json.dumps(existing_saved)

    db.commit()

    idempotency_key = str(db_project.id)  # stable across retries — never regenerated
    headers = {
        "X-Webhook-Secret": settings.N8N_WEBHOOK_SECRET or "",
        "X-Idempotency-Key": idempotency_key,
    }
    payload = {
        "briefing_id": idempotency_key,   # n8n first node should check this to deduplicate
        "submission_id": idempotency_key,
        "sessionId": idempotency_key,
        "timestamp": datetime.now().isoformat(),
        "source_json": json.loads(db_project.brief_history or "{}").get("seed", {}),
        "data": clean_data,
        "context": {
            "source": "webapp_brief",
            "appVersion": settings.VERSION,
            "resumed": db_project.brief_status == BriefStatus.interrupted
        }
    }

    try:
        # strict_response=False: any HTTP 2xx is delivery confirmed.
        # n8n may respond immediately (async) with empty body, or synchronously with
        # a structured result (created / clarification schema).
        # timeout=60: brief generation takes time; timeout means delivery is UNKNOWN.
        n8n_data = _call_n8n(payload, headers, timeout=60, strict_response=False)
    except requests.exceptions.Timeout:
        # Timeout ≠ failure. n8n may have received and started processing.
        # brief_status stays in_progress; n8n must deduplicate via X-Idempotency-Key.
        logger.warning(
            "[Brief/Submit] N8N timeout (delivery unknown) session=%s briefing_id=%s",
            db_project.id, idempotency_key
        )
        return {"status": "submit_unknown", "briefing_id": idempotency_key}

    # ── Interpret n8n response ───────────────────────────────────────────────────
    is_created      = _is_complete(n8n_data)              # brief confirmed created by workflow
    is_clarification = n8n_data.get("mode") == "schema"   # workflow needs more answers
    is_submitted     = n8n_data.get("status") == "submitted"  # async delivery, processing continues

    logger.info(
        "[Brief/Submit] N8N result: is_created=%s is_clarification=%s is_submitted=%s session=%s",
        is_created, is_clarification, is_submitted, db_project.id
    )

    if is_clarification:
        # Workflow needs more information — save new question schema, do NOT mark as submitted
        db_project.brief_status = BriefStatus.clarification_requested
        db_project.next_question = json.dumps(n8n_data)
        db.commit()
        return {"status": "clarification", "fields": n8n_data.get("fields", [])}

    # Created or submitted (async) — both mark the session as done from the client side
    brief_content = n8n_data.get("brief_content") if is_created else None
    db_project.status = ProjectStatus.planning
    db_project.brief_status = BriefStatus.submitted
    db_project.brief_content = brief_content
    db_project.next_question = None
    db.commit()

    logger.info(
        "[Brief/Submit] Session finalised: status=submitted has_brief_content=%s session=%s",
        brief_content is not None, db_project.id
    )

    if db_project.manager_id:
        notification_service.create(
            db,
            user_id=db_project.manager_id,
            title="Brief submitted",
            notification_type=NotificationType.brief_submitted,
            body=f"A new brief for '{db_project.name}' has been submitted and is ready for review.",
            project_id=db_project.id
        )
    if db_project.client_id:
        client = db.query(User).filter(User.id == db_project.client_id).first()
        if client and client.email:
            email_service.send_notification_email(
                to_email=client.email,
                subject="Brief submitted — AgencyFlow",
                body=f"Your brief for '{db_project.name}' has been submitted successfully."
            )

    if is_created:
        # Workflow confirmed brief was created — return content if available
        return {"status": "created", "brief_content": brief_content}
    else:
        # Async delivery confirmed — brief is being processed in the background
        return {"status": "submitted"}


_DELETABLE_PROJECT_STATUSES = frozenset({ProjectStatus.briefing, ProjectStatus.planning})


@router.delete("/{session_id}", response_model=Dict[str, Any])
async def delete_brief(
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_project = db.query(Project).filter(Project.id == session_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_project.client_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")
    if db_project.status not in _DELETABLE_PROJECT_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Only projects in Briefing or Planning status can be deleted."
        )

    # Delete child records to avoid FK violations
    task_ids = [row[0] for row in db.query(Task.id).filter(Task.project_id == session_id).all()]
    if task_ids:
        db.query(TaskSubmission).filter(TaskSubmission.task_id.in_(task_ids)).delete(synchronize_session=False)
        db.query(Task).filter(Task.project_id == session_id).delete(synchronize_session=False)

    db.delete(db_project)
    db.commit()
    logger.info("[Brief/Delete] Project %s deleted by user %s", session_id, current_user.id)
    return {"ok": True, "deleted": str(session_id)}
