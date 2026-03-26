"""
Migration script: Apply Phase A schema changes to Supabase.
Run from the backend directory: python migrate_phase_a.py
"""
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
# Convert SQLAlchemy URL to psycopg3 format
conn_str = DATABASE_URL.replace("postgresql+psycopg://", "postgresql://")

MIGRATIONS = [
    ("01_add_employee_role", "ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'employee'"),
    ("02_add_user_columns", """
        ALTER TABLE public.users
          ADD COLUMN IF NOT EXISTS phone VARCHAR,
          ADD COLUMN IF NOT EXISTS address VARCHAR,
          ADD COLUMN IF NOT EXISTS bio TEXT,
          ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR,
          ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    """),
    ("03_create_briefstatus_enum", """
        DO $$ BEGIN
          CREATE TYPE briefstatus AS ENUM (
            'draft', 'in_progress', 'submitted', 'clarification_requested',
            'validated', 'rejected', 'converted'
          );
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """),
    ("04_create_paymentstatus_enum", """
        DO $$ BEGIN
          CREATE TYPE paymentstatus AS ENUM ('pending', 'paid', 'overdue');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """),
    ("05_add_project_enum_values", """
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum WHERE enumlabel = 'delivered'
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'projectstatus')
          ) THEN
            ALTER TYPE projectstatus ADD VALUE 'delivered';
          END IF;
        END $$
    """),
    ("06_add_project_archived_value", """
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum WHERE enumlabel = 'archived'
              AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'projectstatus')
          ) THEN
            ALTER TYPE projectstatus ADD VALUE 'archived';
          END IF;
        END $$
    """),
    ("07_add_project_columns", """
        ALTER TABLE public.projects
          ADD COLUMN IF NOT EXISTS brief_status briefstatus NOT NULL DEFAULT 'draft',
          ADD COLUMN IF NOT EXISTS payment_status paymentstatus NOT NULL DEFAULT 'pending',
          ADD COLUMN IF NOT EXISTS clarification_notes TEXT,
          ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ
    """),
    ("08_create_taskstatus_enum", """
        DO $$ BEGIN
          CREATE TYPE taskstatus AS ENUM (
            'todo', 'in_progress', 'submitted', 'under_ai_review',
            'revision_requested', 'approved', 'completed', 'late'
          );
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """),
    ("09_create_tasks_table", """
        CREATE TABLE IF NOT EXISTS public.tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
          title VARCHAR NOT NULL,
          description TEXT,
          status taskstatus NOT NULL DEFAULT 'todo',
          assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
          created_by UUID NOT NULL REFERENCES public.users(id),
          deadline TIMESTAMPTZ,
          order_index INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """),
    ("10_create_task_dependencies_table", """
        CREATE TABLE IF NOT EXISTS public.task_dependencies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
          depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE
        )
    """),
    ("11_create_task_submissions_table", """
        CREATE TABLE IF NOT EXISTS public.task_submissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
          submitted_by UUID NOT NULL REFERENCES public.users(id),
          content TEXT,
          links TEXT,
          file_paths TEXT,
          ai_score FLOAT,
          ai_feedback TEXT,
          is_approved BOOLEAN DEFAULT FALSE,
          reviewed_by UUID REFERENCES public.users(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """),
    ("12_create_task_feedback_table", """
        CREATE TABLE IF NOT EXISTS public.task_feedback (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
          submission_id UUID REFERENCES public.task_submissions(id) ON DELETE SET NULL,
          sent_by UUID NOT NULL REFERENCES public.users(id),
          sent_to UUID NOT NULL REFERENCES public.users(id),
          message TEXT NOT NULL,
          is_revision_request BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """),
    ("13_create_notification_enums", """
        DO $$ BEGIN
          CREATE TYPE notificationtype AS ENUM (
            'brief_submitted', 'clarification_requested', 'project_created',
            'task_assigned', 'work_submitted', 'task_late', 'ai_score_low',
            'revision_requested', 'content_ready', 'project_paid', 'general'
          );
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """),
    ("14_create_notificationstatus_enum", """
        DO $$ BEGIN
          CREATE TYPE notificationstatus AS ENUM ('unread', 'read', 'archived');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$
    """),
    ("15_create_notifications_table", """
        CREATE TABLE IF NOT EXISTS public.notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          type notificationtype DEFAULT 'general',
          status notificationstatus DEFAULT 'unread',
          title VARCHAR NOT NULL,
          body TEXT,
          project_id UUID,
          task_id UUID,
          brief_id UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          read_at TIMESTAMPTZ
        )
    """),
    ("16_create_indexes", """
        CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
        CREATE INDEX IF NOT EXISTS idx_projects_brief_status ON public.projects(brief_status);
        CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id)
    """),
]

def run_migrations():
    print(f"Connecting to database...")
    with psycopg.connect(conn_str, autocommit=True) as conn:
        for name, sql in MIGRATIONS:
            try:
                print(f"  Running migration: {name}...")
                conn.execute(sql)
                print(f"  ✅ {name} done")
            except Exception as e:
                print(f"  ⚠️  {name} skipped or errored: {e}")
    print("\n✅ Migration complete!")

if __name__ == "__main__":
    run_migrations()
