"""Retry failed migrations from phase A."""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()
conn_str = os.getenv("DATABASE_URL").replace("postgresql+psycopg://", "postgresql://")

RETRIES = [
    ("07a_add_brief_status_col", "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS brief_status briefstatus NOT NULL DEFAULT 'draft'"),
    ("07b_add_payment_status_col", "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS payment_status paymentstatus NOT NULL DEFAULT 'pending'"),
    ("07c_add_clarification_notes_col", "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS clarification_notes TEXT"),
    ("07d_add_deadline_col", "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ"),
    ("07e_add_delivered_at_col", "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ"),
    ("07f_add_paid_at_col", "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ"),
    ("02a_add_phone_col", "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR"),
    ("02b_add_address_col", "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address VARCHAR"),
    ("02c_add_bio_col", "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT"),
    ("02d_add_reset_token_col", "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR"),
    ("02e_add_reset_expires_col", "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ"),
    ("02f_add_updated_at_col", "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()"),
    ("16a_idx_tasks_project", "CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id)"),
    ("16b_idx_tasks_assigned", "CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to)"),
    ("16c_idx_notif_user", "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id)"),
    ("16d_idx_notif_status", "CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status)"),
    ("16e_idx_proj_brief_status", "CREATE INDEX IF NOT EXISTS idx_projects_brief_status ON public.projects(brief_status)"),
    ("16f_idx_proj_client", "CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id)"),
]

with psycopg.connect(conn_str, autocommit=True) as conn:
    for name, sql in RETRIES:
        try:
            conn.execute(sql)
            print(f"✅ {name}")
        except Exception as e:
            print(f"⚠️  {name}: {e}")

print("Done.")
