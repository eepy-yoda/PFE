import enum
import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, Text, Integer, Float, Boolean, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    submitted = "submitted"
    under_ai_review = "under_ai_review"
    revision_requested = "revision_requested"
    approved = "approved"
    completed = "completed"
    late = "late"


# Junction table for multiple assignees per task
task_assignments = Table(
    "task_assignments",
    Base.metadata,
    Column("task_id", UUID(as_uuid=True), ForeignKey("tasks.id"), primary_key=True),
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True),
    Column("assigned_at", DateTime(timezone=True), server_default=func.now()),
)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(TaskStatus, name="taskstatus", create_type=True), default=TaskStatus.todo, nullable=False)

    # Note: Keeping assigned_to for backward compatibility if needed,
    # but moving to multiple assignees via 'assignees' relationship.
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    priority = Column(String, default="medium") # added priority
    deadline = Column(DateTime(timezone=True), nullable=True)
    order_index = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships — selectin avoids N+1 when loading task lists
    assignees = relationship("User", secondary=task_assignments, lazy="selectin")
    project   = relationship("Project", back_populates="tasks", lazy="selectin")

    @property
    def project_name(self) -> str | None:
        return self.project.name if self.project else None


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    depends_on_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)


class TaskSubmission(Base):
    __tablename__ = "task_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    content = Column(Text, nullable=True)          # Text description of work done
    links = Column(Text, nullable=True)            # JSON list of URLs
    file_paths = Column(Text, nullable=True)       # JSON list of file paths/keys

    ai_score = Column(Float, nullable=True)        # 0-100
    ai_feedback = Column(Text, nullable=True)

    is_approved = Column(Boolean, default=False)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TaskFeedback(Base):
    __tablename__ = "task_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("task_submissions.id"), nullable=True)
    sent_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    sent_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    message = Column(Text, nullable=False)
    is_revision_request = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
