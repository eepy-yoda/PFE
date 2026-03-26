"""Execute migrations with extended timeout."""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()
conn_str = os.getenv("DATABASE_URL").replace("postgresql+psycopg://", "postgresql://")

QUERIES = [
    "ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'employee'",
    "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR",
    "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address VARCHAR",
    "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT",
    "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR",
    "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ",
    "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
    "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS brief_status briefstatus NOT NULL DEFAULT 'draft'",
    "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS payment_status paymentstatus NOT NULL DEFAULT 'pending'",
    "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS clarification_notes TEXT",
    "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ",
    "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ",
    "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ",
    "CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status)",
    "CREATE INDEX IF NOT EXISTS idx_projects_brief_status ON public.projects(brief_status)",
    "CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id)"
]

with psycopg.connect(conn_str, autocommit=True) as conn:
    print("Setting statement_timeout to 0...")
    conn.execute("SET statement_timeout = 0;")
    for sql in QUERIES:
        try:
            print(f"Executing: {sql[:50]}...")
            conn.execute(sql)
            print("  ✅ Success")
        except Exception as e:
            print(f"  ⚠️ Error: {e}")

print("Done.")
