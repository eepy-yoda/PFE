import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, Text, Boolean, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.db.session import Base


class ProjectStatus(str, enum.Enum):
    briefing = "briefing"
    planning = "planning"
    active = "active"
    completed = "completed"
    on_hold = "on_hold"
    delivered = "delivered"
    archived = "archived"


class BriefStatus(str, enum.Enum):
    draft = "draft"
    in_progress = "in_progress"
    interrupted = "interrupted"   # session was lost before completion
    submitted = "submitted"
    clarification_requested = "clarification_requested"
    validated = "validated"
    rejected = "rejected"
    converted = "converted"


class PaymentType(str, enum.Enum):
    project = "project"
    task = "task"

class PaymentStatus(str, enum.Enum):
    unpaid = "unpaid"
    partially_paid = "partially_paid"
    fully_paid = "fully_paid"
    pending = "pending"  # legacy
    paid = "paid"  # legacy
    overdue = "overdue"  # legacy

class DeliveryState(str, enum.Enum):
    not_delivered = "not_delivered"
    watermark_delivered = "watermark_delivered"
    final_delivered = "final_delivered"

class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(ProjectStatus, name="projectstatus", create_type=False), default=ProjectStatus.planning, nullable=False)

    # Brief lifecycle
    brief_status = Column(SQLEnum(BriefStatus, name="briefstatus", create_type=True), default=BriefStatus.draft, nullable=False)
    brief_history = Column(Text, nullable=True)
    next_question = Column(Text, nullable=True)   # stores n8n schema (full field list)
    saved_answers = Column(Text, nullable=True)   # per-field autosave: {fieldKey: {question, answer}}
    brief_content = Column(Text, nullable=True)
    clarification_notes = Column(Text, nullable=True)

    # Payment
    payment_type = Column(SQLEnum(PaymentType, name="paymenttype", create_type=True), default=PaymentType.project)
    payment_status = Column(SQLEnum(PaymentStatus, name="paymentstatus", create_type=True), default=PaymentStatus.unpaid)
    total_project_price = Column(Float, nullable=True, default=0.0)
    amount_paid = Column(Float, nullable=True, default=0.0)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    payment_updated_at = Column(DateTime(timezone=True), nullable=True)

    # Timing
    deadline = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tasks = relationship("Task", back_populates="project", lazy="dynamic")

