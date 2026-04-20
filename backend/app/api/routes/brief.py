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

# n8n signals brief completion with this status code
N8N_COMPLETE_CODE = 333


# ── Helpers ───────────────────────────────────────────────────────────────────

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


def _call_n8n(payload: dict, headers: dict) -> dict:
    """POST to the n8n webhook and return parsed response. Raises HTTPException on failure."""
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
            timeout=10
        )
        resp.raise_for_status()
        raw = resp.text.strip()
        print(f"[Brief] N8N raw response: {raw[:300]}")
        data = _parse_n8n_response(raw)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Automation engine returned an unexpected format."
            )
        # n8n signals a workflow error with {"type": "error", "content": "..."}
        if data.get("type") == "error":
            err = data.get("content", "Unknown workflow error")
            print(f"[Brief] N8N workflow error: {err}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Workflow engine error: {err}"
            )
        return data
    except requests.exceptions.RequestException as e:
        print(f"[Brief] N8N call failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Communication with automation engine failed. Please try again later."
        )


def _is_complete(n8n_data: dict) -> bool:
    return (
        n8n_data.get("mode") == "complete"
        or n8n_data.get("code") == N8N_COMPLETE_CODE
        or str(n8n_data.get("code", "")) == str(N8N_COMPLETE_CODE)
    )


# ── POST /brief/start ─────────────────────────────────────────────────────────

@router.post("/start", response_model=Dict[str, Any])
async def start_brief(
    request: BriefStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    manager_id = current_user.id
    if current_user.role == UserRole.client:
        manager = db.query(User).filter(User.role == UserRole.manager).first()
        if manager:
            manager_id = manager.id

    db_project = Project(
        name=request.seed.project_name,
        description=f"Objective: {request.seed.objective}",
        status=ProjectStatus.briefing,
        client_id=current_user.id,
        manager_id=manager_id,
        brief_history=json.dumps({"seed": request.seed.model_dump()})
    )
    try:
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        print(f"[Brief/Start] Project created: {db_project.id}")
    except Exception as db_err:
        db.rollback()
        print(f"[Brief/Start] DB error creating project: {db_err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database error: could not create brief session. Please try again."
        )

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

    n8n_data = _call_n8n(payload, headers)

    if _is_complete(n8n_data):
        db_project.status = ProjectStatus.planning
        db_project.brief_status = BriefStatus.submitted
        db_project.brief_content = n8n_data.get("brief_content", "Brief generated successfully.")
        db_project.next_question = None
    else:
        db_project.brief_status = BriefStatus.in_progress
        db_project.next_question = json.dumps(n8n_data)

    db.commit()

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


# ── POST /brief/autosave ──────────────────────────────────────────────────────

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

    # Merge into existing saved_answers
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


# ── POST /brief/interrupt ─────────────────────────────────────────────────────

@router.post("/interrupt")
async def interrupt_brief(
    request: BriefInterruptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Called when the client leaves before finishing.

    - Fills every unanswered field with UNANSWERED_PLACEHOLDER.
    - Saves the full mixed payload to saved_answers.
    - Marks brief_status = interrupted.
    - Calls the n8n webhook so the workflow can record the partial state.
    """
    db_project = db.query(Project).filter(Project.id == request.sessionId).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_project.client_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")

    # Build complete saved_answers: answered fields keep their values;
    # every other field gets the sentinel placeholder.
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
            print(f"[Brief/Interrupt] N8N call failed (non-blocking): {e}")

    return {"ok": True, "status": "interrupted"}


# ── GET /brief/status/{session_id} ───────────────────────────────────────────

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

    # Parse n8n schema (contains the full field list)
    n8n_schema = None
    if db_project.next_question:
        try:
            n8n_schema = json.loads(db_project.next_question)
        except Exception:
            pass

    # Parse per-field autosaved answers
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
    }


# ── POST /brief/submit ────────────────────────────────────────────────────────

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

    # Strip placeholder values so final submission is clean
    clean_data = {
        k: v for k, v in request.data.items()
        if not (isinstance(v, dict) and v.get("answer") == UNANSWERED_PLACEHOLDER)
    }

    # Update brief_history
    history = json.loads(db_project.brief_history or "{}")
    history.setdefault("steps", []).append(clean_data)
    db_project.brief_history = json.dumps(history)

    # Update saved_answers with final real answers (overwrites any placeholders)
    existing_saved = json.loads(db_project.saved_answers or "{}")
    existing_saved.update(clean_data)
    db_project.saved_answers = json.dumps(existing_saved)

    db.commit()

    headers = {"X-Webhook-Secret": settings.N8N_WEBHOOK_SECRET or ""}
    payload = {
        "sessionId": str(db_project.id),
        "timestamp": datetime.now().isoformat(),
        "data": clean_data,
        "context": {
            "source": "webapp_brief",
            "appVersion": settings.VERSION,
            "resumed": db_project.brief_status == BriefStatus.interrupted
        }
    }

    n8n_data = _call_n8n(payload, headers)

    if _is_complete(n8n_data):
        db_project.status = ProjectStatus.planning
        db_project.brief_status = BriefStatus.submitted
        db_project.brief_content = n8n_data.get("brief_content", "Brief generated and sent successfully.")
        db_project.next_question = None
    else:
        db_project.brief_status = BriefStatus.in_progress
        db_project.next_question = json.dumps(n8n_data)

    db.commit()

    if _is_complete(n8n_data):
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

    return n8n_data
