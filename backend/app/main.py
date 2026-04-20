from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.api.routes import auth, users, projects, brief, tasks, notifications, management, submissions, image_callbacks
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.models import user, project, task, notification, rbac, activity, workflow_image_callback # Ensure models are imported for Base.metadata
from app.models.task import Task, TaskStatus
from app.models.notification import NotificationType
from app.services.notification_service import notification_service
from app.services.task_service import task_service

def _run_startup_db_tasks():
    from sqlalchemy import text

    try:
        Base.metadata.create_all(bind=engine)
        print("[Startup] Tables ensured via create_all.")
    except Exception as e:
        print(f"[Startup] Warning: create_all failed (DB may be paused): {e}")

    migrations = [
        ("projects.saved_answers",
         "ALTER TABLE projects ADD COLUMN IF NOT EXISTS saved_answers TEXT",
         False),
        ("briefstatus enum: interrupted",
         "ALTER TYPE briefstatus ADD VALUE IF NOT EXISTS 'interrupted'",
         True),
        ("task_submissions.submissionstatus type",
         "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submissionstatus') THEN CREATE TYPE submissionstatus AS ENUM ('pending', 'validated', 'rejected'); END IF; END $$",
         True),
        ("task_submissions.submission_status",
         "ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS submission_status submissionstatus DEFAULT 'pending'",
         False),
        ("task_submissions.brief_snapshot",
         "ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS brief_snapshot TEXT",
         False),
        ("task_submissions.webhook_response",
         "ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS webhook_response TEXT",
         False),
        ("task_submissions.attempt_number",
         "ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1",
         False),
        ("tasks: reset under_review to submitted",
         "UPDATE tasks SET status = 'submitted' WHERE status = 'under_review'",
         False),
        ("task_submissions.ai_analysis_result",
         "ALTER TABLE task_submissions ADD COLUMN IF NOT EXISTS ai_analysis_result TEXT",
         False),
        ("workflow_image_callbacks table",
         """CREATE TABLE IF NOT EXISTS workflow_image_callbacks (
             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
             callback_token TEXT UNIQUE NOT NULL,
             project_id UUID NOT NULL REFERENCES projects(id),
             task_id UUID REFERENCES tasks(id),
             submission_id UUID REFERENCES task_submissions(id),
             file_type TEXT NOT NULL,
             status TEXT NOT NULL DEFAULT 'pending_image',
             source TEXT DEFAULT 'n8n',
             error_message TEXT,
             storage_bucket TEXT,
             storage_path TEXT,
             expires_at TIMESTAMPTZ,
             processed_at TIMESTAMPTZ,
             created_at TIMESTAMPTZ DEFAULT now(),
             updated_at TIMESTAMPTZ DEFAULT now()
         )""",
         False),
        ("workflow_image_callbacks.callback_token index",
         "CREATE UNIQUE INDEX IF NOT EXISTS ix_workflow_image_callbacks_token ON workflow_image_callbacks (callback_token)",
         False),
    ]
    for label, sql, pg_only in migrations:
        try:
            if pg_only and engine.dialect.name != "postgresql":
                continue
            with engine.connect() as conn:
                if engine.dialect.name == "postgresql":
                    conn.execute(text("SET statement_timeout = 0"))
                conn.execute(text(sql))
                conn.commit()
                print(f"[Startup] Migration OK: {label}")
        except Exception as e:
            print(f"[Startup] Migration warning ({label}): {e}")


async def late_task_checker():
    while True:
        await asyncio.sleep(1800)  # 30 minutes
        db = SessionLocal()
        try:
            late_tasks = task_service.get_late_tasks(db)
            for late_task in late_tasks:
                if late_task.status != TaskStatus.late:
                    late_task.status = TaskStatus.late
                    if late_task.created_by:
                        notification_service.create(
                            db,
                            user_id=late_task.created_by,
                            title="Task overdue",
                            notification_type=NotificationType.task_late,
                            body=f"Task '{late_task.title}' has passed its deadline.",
                            task_id=late_task.id,
                            project_id=late_task.project_id,
                        )
            db.commit()
        except Exception as e:
            print(f"[LateTaskChecker] Error: {e}")
        finally:
            db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run DB startup tasks in a thread so they never block the event loop
    # loop.run_in_executor(None, _run_startup_db_tasks)

    checker_task = asyncio.create_task(late_task_checker())
    yield
    checker_task.cancel()
    try:
        await checker_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["projects"])
app.include_router(brief.router, prefix=f"{settings.API_V1_STR}/brief", tags=["brief"])
app.include_router(tasks.router, prefix=f"{settings.API_V1_STR}/tasks", tags=["tasks"])
app.include_router(submissions.router, prefix=f"{settings.API_V1_STR}", tags=["submissions"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(management.router, prefix=f"{settings.API_V1_STR}/management", tags=["management"])
app.include_router(image_callbacks.router, prefix=f"{settings.API_V1_STR}", tags=["webhooks"])

@app.get("/")
def root():
    return {"message": "AgencyFlow API is running"}
