from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Header, Form, File, UploadFile, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.task import Task
from app.models.project import Project
from app.schemas.submission import SubmissionCreateRequest, SubmissionRead, WebhookCallbackPayload, WatermarkCallbackPayload
from app.services.submission_service import submission_service

router = APIRouter(prefix="/submissions", tags=["submissions"])


def _require_employee_or_above(user: User) -> None:
    if user.role not in [UserRole.employee, UserRole.manager, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Employee access required")


def _require_manager_or_above(user: User) -> None:
    if user.role not in [UserRole.manager, UserRole.admin]:
        raise HTTPException(status_code=403, detail="Manager or Admin required")


@router.post("/{task_id}/submit", response_model=SubmissionRead, status_code=201)
def submit_work(
    task_id: UUID,
    body: SubmissionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_employee_or_above(current_user)

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if (
        current_user.role == UserRole.employee
        and task.assigned_to != current_user.id
    ):
        raise HTTPException(status_code=403, detail="You are not assigned to this task")

    body.task_id = task_id

    if not any([body.content, body.links, body.file_paths]):
        raise HTTPException(
            status_code=422,
            detail="Submission must include at least one of: content, links, or images.",
        )

    return submission_service.create_submission(db, body, current_user.id)


@router.get("/{task_id}/", response_model=List[SubmissionRead])
def list_submissions(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns all submissions for a task, sorted newest-first.
    Managers/admins see all; employees see only their own task's submissions.
    Clients can only access submissions for their own projects, with all internal
    AI/review fields stripped and files gated behind final_delivered status.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == UserRole.employee:
        has_task = db.query(Task).filter(
            Task.project_id == task.project_id,
            Task.assigned_to == current_user.id,
        ).first()
        proj = db.query(Project).filter(Project.id == task.project_id).first()
        if not has_task and (not proj or proj.assigned_to != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")

    if current_user.role == UserRole.client:
        from app.models.project import DeliveryState
        project = db.query(Project).filter(Project.id == task.project_id).first()
        if not project or project.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    submissions = submission_service.get_submissions_for_task(db, task_id)

    # Strip all internal AI/review data from client-facing responses
    if current_user.role == UserRole.client:
        from app.models.project import DeliveryState
        delivery_state = getattr(task, 'delivery_state', None)
        is_final = delivery_state == DeliveryState.final_delivered
        is_watermark = delivery_state == DeliveryState.watermark_delivered
        for sub in submissions:
            sub.ai_score = None
            sub.ai_feedback = None
            sub.webhook_response = None
            sub.ai_analysis_result = None
            sub.brief_snapshot = None
            sub.is_approved = False
            sub.reviewed_by = None
            if not is_final:
                sub.file_paths = None
                sub.links = None
            if not is_watermark and not is_final:
                sub.watermarked_file_paths = None
                sub.watermark_file_path = None  # gate both preview fields together

    return submissions


@router.post("/webhook-callback", response_model=SubmissionRead)
def receive_webhook_callback(
    payload: WebhookCallbackPayload,
    db: Session = Depends(get_db),
    x_webhook_secret: Optional[str] = Header(None),
):
    """
    Async callback from n8n after it finishes validating a work submission.

    Security: requires X-Webhook-Secret header matching N8N_WEBHOOK_SECRET.

    Expected n8n payload:
        {
          "task_id": "...",
          "submission_id": "...",
          "status": "valid" | "invalid",
          "score": 85,
          "feedback": "Good work"
        }

    On "valid"  → submission_status=validated, task=approved, notify manager
    On "invalid" → submission_status=rejected, task=revision_requested, notify employee
    """
    expected = settings.N8N_WEBHOOK_SECRET
    if not expected or x_webhook_secret != expected:
        raise HTTPException(status_code=403, detail="Invalid or missing webhook secret")

    result = submission_service.apply_webhook_callback(
        db=db,
        submission_id=payload.submission_id,
        task_id=payload.task_id,
        status=payload.status,
        score=payload.score,
        feedback=payload.feedback,
    )

    if result is None:
        raise HTTPException(status_code=404, detail="Submission or task not found")

    return result


@router.post("/watermark-callback", response_model=SubmissionRead)
def receive_watermark_callback(
    payload: WatermarkCallbackPayload,
    db: Session = Depends(get_db),
    x_webhook_secret: Optional[str] = Header(None),
):
    """
    Async callback from n8n after it finishes watermarking the preview files.

    Security: requires X-Webhook-Secret header matching N8N_WEBHOOK_SECRET.

    n8n MUST POST:
        {
          "task_id": "...",
          "submission_id": "...",
          "files": [
            { "filename": "preview.jpg", "content_base64": "...", "content_type": "image/jpeg" }
          ]
        }

    The backend:
      1. Decodes each base64 file
      2. Uploads it to Supabase Storage: task-submissions/preview/{client_id}/{project_id}/{task_id}/
      3. Saves the public URLs in submission.watermarked_file_paths (JSON array)
    The original file_paths are NOT exposed to the client until final_delivered.
    """
    import base64
    import json
    from app.models.task import Task, TaskSubmission
    from app.models.project import Project
    from app.services.storage_service import upload_watermark_preview

    expected = settings.N8N_WEBHOOK_SECRET
    if not expected or x_webhook_secret != expected:
        raise HTTPException(status_code=403, detail="Invalid or missing webhook secret")

    submission = db.query(TaskSubmission).filter(
        TaskSubmission.id == payload.submission_id,
        TaskSubmission.task_id == payload.task_id,
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    task = db.query(Task).filter(Task.id == payload.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.image_path:
        image_path = payload.image_path
        parts = image_path.split("/", 1)
        bucket = parts[0] if len(parts) > 1 else "task-submissions"
        storage_path = parts[1] if len(parts) > 1 else image_path

        public_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{bucket.strip('/')}/{storage_path.strip('/')}"
        
        submission.watermarked_file_paths = json.dumps([public_url])
        submission.watermark_file_path = image_path
    elif payload.files:
        public_urls: list[str] = []
        for f in payload.files:
            try:
                file_bytes = base64.b64decode(f.content_base64)
            except Exception:
                raise HTTPException(status_code=422, detail=f"Invalid base64 for file '{f.filename}'")

            try:
                url = upload_watermark_preview(
                    file_bytes=file_bytes,
                    filename=f.filename,
                    content_type=f.content_type,
                    client_id=str(project.client_id) if project.client_id else "unknown",
                    project_id=str(project.id),
                    task_id=str(task.id),
                )
                public_urls.append(url)
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"Storage upload failed: {e}")

        submission.watermarked_file_paths = json.dumps(public_urls)
    else:
        raise HTTPException(status_code=400, detail="Missing files or image_path in payload")

    db.commit()
    db.refresh(submission)
    return submission


@router.post("/watermark-callback-binary", response_model=SubmissionRead)
async def receive_watermark_callback_binary(
    task_id: UUID = Form(...),
    submission_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    x_webhook_secret: Optional[str] = Header(None),
):
    """
    Binary watermark callback — multipart/form-data variant.

    n8n HTTP Request node config:
      Body = Form-Data
      Fields: task_id (text), submission_id (text), file (binary image)
      Header: X-Webhook-Secret

    The backend reads the raw bytes, uploads to Supabase Storage under
    task-submissions/preview/{client_id}/{project_id}/{task_id}/,
    and saves the public URL in submission.watermarked_file_paths.
    """
    import json
    from app.models.task import Task, TaskSubmission
    from app.models.project import Project
    from app.services.storage_service import upload_watermark_preview

    expected = settings.N8N_WEBHOOK_SECRET
    if not expected or x_webhook_secret != expected:
        raise HTTPException(status_code=403, detail="Invalid or missing webhook secret")

    submission = db.query(TaskSubmission).filter(
        TaskSubmission.id == submission_id,
        TaskSubmission.task_id == task_id,
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_bytes = await file.read()
    content_type = file.content_type or "image/jpeg"
    filename = file.filename or "preview"

    try:
        url = upload_watermark_preview(
            file_bytes=file_bytes,
            filename=filename,
            content_type=content_type,
            client_id=str(project.client_id) if project.client_id else "unknown",
            project_id=str(project.id),
            task_id=str(task.id),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Storage upload failed: {e}")

    submission.watermarked_file_paths = json.dumps([url])
    db.commit()
    db.refresh(submission)
    return submission


@router.post("/watermark-callback-raw", response_model=SubmissionRead)
async def receive_watermark_callback_raw(
    task_id: UUID,
    submission_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    x_webhook_secret: Optional[str] = Header(None),
):
    """
    Binary watermark callback — raw binary body variant.

    n8n HTTP Request node config:
      Body = Binary (attach the watermarked image)
      Query params: task_id, submission_id
      Headers: Content-Type: image/jpeg, X-Webhook-Secret

    The backend reads the raw body bytes, uploads to Supabase Storage under
    task-submissions/preview/{client_id}/{project_id}/{task_id}/,
    and saves the public URL in submission.watermarked_file_paths.
    """
    import json
    from app.models.task import Task, TaskSubmission
    from app.models.project import Project
    from app.services.storage_service import upload_watermark_preview

    expected = settings.N8N_WEBHOOK_SECRET
    if not expected or x_webhook_secret != expected:
        raise HTTPException(status_code=403, detail="Invalid or missing webhook secret")

    submission = db.query(TaskSubmission).filter(
        TaskSubmission.id == submission_id,
        TaskSubmission.task_id == task_id,
    ).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    file_bytes = await request.body()
    if not file_bytes:
        raise HTTPException(status_code=422, detail="Request body is empty")

    content_type = request.headers.get("content-type", "image/jpeg")
    filename = "preview"

    try:
        url = upload_watermark_preview(
            file_bytes=file_bytes,
            filename=filename,
            content_type=content_type,
            client_id=str(project.client_id) if project.client_id else "unknown",
            project_id=str(project.id),
            task_id=str(task.id),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Storage upload failed: {e}")

    submission.watermarked_file_paths = json.dumps([url])
    db.commit()
    db.refresh(submission)
    return submission
