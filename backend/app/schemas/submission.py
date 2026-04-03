"""
schemas/submission.py
─────────────────────
Pydantic schemas for the rebuilt work submission system.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.task import SubmissionStatus


# ── Request schemas ────────────────────────────────────────────────────────────

class SubmissionCreateRequest(BaseModel):
    """
    Payload sent by the employee frontend when submitting work.
    task_id is injected by the route handler (path param), not the body.
    """
    task_id: Optional[UUID] = None  # injected from path param after body parsing
    content: Optional[str] = None          # Free-text work description
    links: Optional[List[str]] = None      # Reference URLs
    file_paths: Optional[List[str]] = None # Supabase Storage public URLs (pre-uploaded)

    @field_validator("file_paths", mode="before")
    @classmethod
    def reject_empty_urls(cls, v):
        if v is None:
            return v
        return [url for url in v if isinstance(url, str) and url.strip()]


# ── Response schemas ───────────────────────────────────────────────────────────

class SubmissionRead(BaseModel):
    id: UUID
    task_id: UUID
    submitted_by: UUID
    content: Optional[str] = None
    links: Optional[str] = None             # stored as JSON string in DB
    file_paths: Optional[str] = None              # stored as JSON string in DB
    watermarked_file_paths: Optional[str] = None  # JSON list of watermarked preview URLs (set by n8n callback)
    watermark_file_path: Optional[str] = None     # Raw storage path string
    submission_status: SubmissionStatus = SubmissionStatus.pending
    brief_snapshot: Optional[str] = None
    webhook_response: Optional[str] = None
    ai_analysis_result: Optional[str] = None   # Normalized JSON: {status, summary, score, checks, feedback}
    ai_score: Optional[float] = None
    ai_feedback: Optional[str] = None
    attempt_number: int = 1
    is_approved: bool = False
    reviewed_by: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Async webhook callback schema ──────────────────────────────────────────────

class WebhookCallbackPayload(BaseModel):
    """
    Payload posted by n8n to /submissions/webhook-callback after async validation.

    n8n MUST include:
        - task_id
        - submission_id
        - status: "valid" | "invalid"
    Optional:
        - score: 0–100
        - feedback: text message
    """
    task_id: UUID
    submission_id: UUID
    status: str           # "valid" or "invalid"
    score: Optional[float] = None
    feedback: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v.lower() not in {"valid", "invalid"}:
            raise ValueError("status must be 'valid' or 'invalid'")
        return v.lower()


# ── Watermark callback schema ──────────────────────────────────────────────────

class WatermarkedFile(BaseModel):
    """A single watermarked file sent back by n8n as base64."""
    filename: str                       # e.g. "preview.jpg"
    content_base64: str                 # standard base64-encoded file bytes
    content_type: str = "image/jpeg"    # MIME type, e.g. "image/png"


class WatermarkCallbackPayload(BaseModel):
    """
    Payload posted by n8n to /submissions/watermark-callback after watermarking.

    n8n MUST POST:
        {
          "task_id": "...",
          "submission_id": "...",
          "files": [
            {
              "filename": "preview.jpg",
              "content_base64": "<base64 string>",
              "content_type": "image/jpeg"
            }
          ]
        }

    The backend decodes each file, uploads it to Supabase Storage under
    task-submissions/preview/{client_id}/{project_id}/{task_id}/,
    and saves the resulting public URLs in submission.watermarked_file_paths.
    """
    task_id: UUID
    submission_id: UUID
    files: Optional[List[WatermarkedFile]] = None
    image_path: Optional[str] = None
