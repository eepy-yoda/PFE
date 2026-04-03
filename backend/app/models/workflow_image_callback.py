import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base


class WorkflowImageCallback(Base):
    """
    Stores the business context for a pending n8n image-result callback.

    Created before the app triggers an n8n image workflow.  The callback_token
    is embedded in the webhook URL sent to n8n.  When n8n POSTs only binary
    field 'image' to that URL, the backend recovers full context from this row.

    Status lifecycle:
      pending_image → completed
                    → failed       (upload or DB error, recoverable)
                    → orphaned     (upload succeeded, DB update AND rollback both failed)
                    → expired      (token TTL elapsed before n8n called back)
    """
    __tablename__ = "workflow_image_callbacks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # ── Security token ────────────────────────────────────────────────────────
    # 32-byte cryptographically random URL-safe value; embedded in callback URL.
    # Unique + indexed for fast lookup on every incoming webhook request.
    callback_token = Column(String, unique=True, nullable=False, index=True)

    # ── Business context (resolved before n8n is triggered) ───────────────────
    project_id    = Column(UUID(as_uuid=True), ForeignKey("projects.id"),         nullable=False)
    task_id       = Column(UUID(as_uuid=True), ForeignKey("tasks.id"),            nullable=True)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("task_submissions.id"), nullable=True)

    # "watermarked_preview" | "final_version"
    file_type = Column(String, nullable=False)

    # ── Lifecycle state ───────────────────────────────────────────────────────
    status        = Column(String, nullable=False, default="pending_image")
    source        = Column(String, default="n8n")
    error_message = Column(Text, nullable=True)

    # ── Storage result (populated after successful upload) ────────────────────
    storage_bucket = Column(String, nullable=True)
    storage_path   = Column(String, nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    expires_at   = Column(DateTime(timezone=True), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
