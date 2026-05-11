from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Header, Form, File, UploadFile, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.task import Task, TaskStatus, TaskSubmission, TaskFeedback
from app.models.project import Project, DeliveryState, PaymentStatus
from app.models.notification import NotificationType
from app.schemas.submission import (
    SubmissionCreateRequest, SubmissionRead, WebhookCallbackPayload, WatermarkCallbackPayload,
    ClientRejectRequest, ManagerReviewRejectionRequest, ClientRejectionSummary,
)
from app.services.submission_service import submission_service
from app.services.notification_service import notification_service

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
        project = db.query(Project).filter(Project.id == task.project_id).first()
        if not project or project.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    submissions = submission_service.get_submissions_for_task(db, task_id)

    # Strip all internal AI/review data from client-facing responses
    if current_user.role == UserRole.client:
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
            # manager_note visible to client only when clarification was requested
            if getattr(sub, 'client_review_status', 'pending') != 'clarification_requested':
                sub.manager_note = None
            if not is_final:
                sub.file_paths = None
                sub.links = None
            if not is_watermark and not is_final:
                sub.watermarked_file_paths = None
                sub.watermark_file_path = None  # gate both preview fields together

    return submissions


@router.get("/single/{submission_id}", response_model=SubmissionRead)
def get_submission(
    submission_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve a single submission by ID.
    Access control:
    - Admin/Manager: all
    - Worker: only if they submitted it OR are currently assigned to the task
    - Client: only if it belongs to their project (stripped fields)
    """
    submission = submission_service.get_submission(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    task = db.query(Task).filter(Task.id == submission.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Access control
    if current_user.role == UserRole.employee:
        if submission.submitted_by != current_user.id and task.assigned_to != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

    if current_user.role == UserRole.client:
        project = db.query(Project).filter(Project.id == task.project_id).first()
        if not project or project.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Strip internal fields for client
        submission.ai_score = None
        submission.ai_feedback = None
        submission.webhook_response = None
        submission.ai_analysis_result = None
        submission.brief_snapshot = None
        submission.is_approved = False
        submission.reviewed_by = None
        # manager_note only visible when clarification was requested (it's the clarification message)
        if getattr(submission, 'client_review_status', 'pending') != 'clarification_requested':
            submission.manager_note = None

        # Gate files based on delivery state
        delivery_state = getattr(task, 'delivery_state', None)
        if delivery_state != DeliveryState.final_delivered:
            submission.file_paths = None
            submission.links = None
        if delivery_state not in [DeliveryState.watermark_delivered, DeliveryState.final_delivered]:
            submission.watermarked_file_paths = None
            submission.watermark_file_path = None

    return submission


@router.get("/client-rejections", response_model=List[ClientRejectionSummary])
def list_client_rejections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manager: list all client rejections that await a decision."""
    _require_manager_or_above(current_user)

    import json
    from app.models.user import User as UserModel

    submissions = (
        db.query(TaskSubmission)
        .filter(TaskSubmission.client_review_status == "rejected",
                TaskSubmission.manager_decision == "pending")
        .order_by(TaskSubmission.client_feedback_at.desc().nullslast())
        .all()
    )

    result: List[ClientRejectionSummary] = []
    for sub in submissions:
        task = db.query(Task).filter(Task.id == sub.task_id).first()
        if not task:
            continue
        project = db.query(Project).filter(Project.id == task.project_id).first()
        if not project:
            continue
        client = db.query(UserModel).filter(UserModel.id == project.client_id).first()
        worker = db.query(UserModel).filter(UserModel.id == task.assigned_to).first() if task.assigned_to else None

        preview_url: Optional[str] = None
        if sub.watermarked_file_paths:
            try:
                urls = json.loads(sub.watermarked_file_paths)
                if urls:
                    preview_url = urls[0]
            except Exception:
                pass

        result.append(ClientRejectionSummary(
            submission_id=sub.id,
            task_id=task.id,
            task_title=task.title,
            project_id=project.id,
            project_name=project.name,
            client_id=project.client_id,
            client_name=client.full_name if client else "Unknown",
            worker_id=task.assigned_to,
            worker_name=worker.full_name if worker else None,
            watermark_preview_url=preview_url,
            client_feedback=sub.client_feedback or "",
            rejected_at=sub.client_feedback_at,
            manager_decision=sub.manager_decision,
            client_review_status=sub.client_review_status,
        ))
    return result


@router.post("/{submission_id}/client-reject", response_model=SubmissionRead)
def client_reject_submission(
    submission_id: UUID,
    body: ClientRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Client rejects a watermarked preview and provides feedback."""
    if current_user.role != UserRole.client:
        raise HTTPException(status_code=403, detail="Client access required")

    submission = db.query(TaskSubmission).filter(TaskSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    task = db.query(Task).filter(Task.id == submission.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project or project.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if task.delivery_state != DeliveryState.watermark_delivered:
        raise HTTPException(status_code=400, detail="Can only reject watermarked preview deliveries")

    if project.payment_status == PaymentStatus.fully_paid:
        raise HTTPException(status_code=400, detail="Final content already delivered")

    if submission.client_review_status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Preview already reviewed (status: {submission.client_review_status})"
        )

    from datetime import datetime, timezone
    submission.client_review_status = "rejected"
    submission.client_feedback = body.feedback
    submission.client_feedback_at = datetime.now(timezone.utc)
    task.status = TaskStatus.client_rejected
    db.commit()
    db.refresh(submission)

    if project.manager_id:
        notification_service.create(
            db,
            user_id=project.manager_id,
            title="Client rejected preview",
            notification_type=NotificationType.client_work_rejected,
            body=f"Client submitted feedback for \"{task.title}\".",
            project_id=project.id,
            task_id=task.id,
        )

    # Strip internal fields before returning to client
    submission.ai_score = None
    submission.ai_feedback = None
    submission.webhook_response = None
    submission.ai_analysis_result = None
    submission.brief_snapshot = None
    submission.is_approved = False
    submission.reviewed_by = None
    submission.manager_note = None
    return submission


@router.post("/{submission_id}/client-approve", response_model=SubmissionRead)
def client_approve_submission(
    submission_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Client approves a watermarked preview."""
    if current_user.role != UserRole.client:
        raise HTTPException(status_code=403, detail="Client access required")

    submission = db.query(TaskSubmission).filter(TaskSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    task = db.query(Task).filter(Task.id == submission.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project or project.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if task.delivery_state != DeliveryState.watermark_delivered:
        raise HTTPException(status_code=400, detail="Can only approve watermarked preview deliveries")

    if submission.client_review_status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Preview already reviewed (status: {submission.client_review_status})"
        )

    submission.client_review_status = "accepted"
    db.commit()
    db.refresh(submission)

    if project.manager_id:
        notification_service.create(
            db,
            user_id=project.manager_id,
            title="Client approved preview",
            notification_type=NotificationType.general,
            body=f"Client approved the preview for \"{task.title}\". Awaiting final payment.",
            project_id=project.id,
            task_id=task.id,
        )

    submission.ai_score = None
    submission.ai_feedback = None
    submission.webhook_response = None
    submission.ai_analysis_result = None
    submission.brief_snapshot = None
    submission.is_approved = False
    submission.reviewed_by = None
    submission.manager_note = None
    return submission


@router.post("/{submission_id}/manager-review-rejection", response_model=SubmissionRead)
def manager_review_client_rejection(
    submission_id: UUID,
    body: ManagerReviewRejectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manager acts on a client rejection: forward to worker or ask client for clarification."""
    _require_manager_or_above(current_user)

    submission = db.query(TaskSubmission).filter(TaskSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    if submission.client_review_status != "rejected":
        raise HTTPException(status_code=400, detail="No pending client rejection for this submission")

    if submission.manager_decision != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Already processed (decision: {submission.manager_decision})"
        )

    task = db.query(Task).filter(Task.id == submission.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if body.action == "send_to_worker":
        manager_note_text = (body.manager_note or "").strip()
        submission.manager_decision = "sent_to_worker"
        if manager_note_text:
            submission.manager_note = manager_note_text
        task.status = TaskStatus.revision_requested

        worker_message = submission.client_feedback or ""
        if manager_note_text:
            worker_message = f"{worker_message}\n\nManager note: {manager_note_text}"

        worker_id = task.assigned_to
        if worker_id:
            feedback_entry = TaskFeedback(
                task_id=task.id,
                submission_id=submission.id,
                sent_by=current_user.id,
                sent_to=worker_id,
                message=worker_message.strip(),
                is_revision_request=True,
            )
            db.add(feedback_entry)
            notification_service.create(
                db,
                user_id=worker_id,
                title="Modification requested",
                notification_type=NotificationType.revision_requested,
                body=f"Manager forwarded client feedback for \"{task.title}\".",
                project_id=project.id,
                task_id=task.id,
            )

    elif body.action == "ask_client_clarification":
        note = (body.manager_note or "").strip()
        if len(note) < 10:
            raise HTTPException(
                status_code=422,
                detail="Manager note required (min 10 characters) for clarification"
            )
        submission.manager_decision = "clarification_requested"
        submission.manager_note = note
        submission.client_review_status = "clarification_requested"
        task.status = TaskStatus.waiting_client_clarification

        if project.client_id:
            notification_service.create(
                db,
                user_id=project.client_id,
                title="Clarification requested",
                notification_type=NotificationType.clarification_requested,
                body=f"Manager needs more details about your feedback on \"{task.title}\".",
                project_id=project.id,
                task_id=task.id,
            )

    db.commit()
    db.refresh(submission)
    return submission


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
