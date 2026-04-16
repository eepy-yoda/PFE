-- Migration: drop_task_dependencies
-- Direction: forward (apply)
-- Reversible: yes (rollback below)
-- Safe: table has no foreign keys pointing INTO it from other tables.
-- Run on Supabase SQL editor or psql.

-- ── FORWARD ────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.task_dependencies;

-- ── ROLLBACK (run only to restore if needed) ───────────────────────────────
-- CREATE TABLE IF NOT EXISTS public.task_dependencies (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
--   depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE
-- );
