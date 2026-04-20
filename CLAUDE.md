# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AgencyFlow** — a full-stack project/task management platform for agencies. Clients submit briefs, managers assign tasks to workers, workers submit deliverables, and automated n8n workflows handle AI review and file processing.

## Development Commands

### Backend (FastAPI + Python 3.12)
```bash
cd backend
py -3.12 -m venv venv              # First-time setup
.\venv\Scripts\activate            # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload      # Dev server at http://localhost:8000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev        # Dev server at http://localhost:5173
npm run build      # Production build
npm run lint       # ESLint
```

No test suite is configured. There are no test files in the project.

## Architecture

### Layers
```
Frontend (React) → API Layer (Axios) → FastAPI Routes → Services → SQLAlchemy Models → PostgreSQL (Supabase)
```

**Backend**: `app/api/routes/` → `app/services/` → `app/models/` (SQLAlchemy) + `app/schemas/` (Pydantic)

**Frontend**: `src/views/pages/` (page components) + `src/views/components/` (reusable) → `src/api/` (axios clients) → backend

### Authentication
Supabase Auth handles all authentication. The backend validates JWTs via Supabase, not locally. The frontend uses `@supabase/supabase-js` directly for login/signup/password reset. Backend uses `app/api/deps.py` to extract and validate the current user from tokens.

### User Roles
Four roles: `client`, `admin`, `manager`, `employee` (worker). Each role has a separate dashboard component (`ClientDashboard`, `AdminDashboard`, `ManagerDashboard`, `WorkerDashboard`). The `App.tsx` routing reads the user's role to redirect to the correct dashboard.

### Project & Brief Workflow
1. Client creates a project and fills out a `GuidedBrief` (multi-step questionnaire)
2. Brief triggers an n8n webhook (`BRIEF_WEBHOOK_URL`) for AI generation
3. Manager reviews and approves the brief → tasks are created and assigned to workers
4. Workers submit work via `SubmitWorkModal` → another n8n webhook processes/watermarks images
5. Final delivery files are stored in Supabase Storage; watermarked previews vs. final files are handled by `delivery_service.py`

### n8n Webhook Integration
Configured via env vars: `BRIEF_WEBHOOK_URL`, `AI_REVIEW_WEBHOOK_URL`, `TASK_REVIEW_WEBHOOK_URL`, `IMAGE_PROCESSING_WEBHOOK_URL`. Callbacks from n8n come back to `/api/image-callbacks/`. Tracked in `workflow_image_callbacks` table.

### Database
- **Production**: PostgreSQL via Supabase (Transaction Mode, port 6543)
- **Dev**: SQLite supported as fallback
- Migrations via Alembic (`cd backend && alembic upgrade head`)
- `app/main.py` also runs inline DDL on startup for schema patches (check `@app.on_event("startup")`)
- UUIDs as primary keys throughout

### Background Tasks
A late-task checker runs every 30 minutes (started in `app/main.py` startup event) to flag overdue tasks.

## Key Configuration

### Backend `.env` (required variables)
```
DATABASE_URL=postgresql+psycopg://...
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_KEY=
SECRET_KEY=
BRIEF_WEBHOOK_URL=
IMAGE_PROCESSING_WEBHOOK_URL=
```

### Frontend `.env`
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://localhost:8000
```

## Notable Patterns

- **Protected routes**: `ProtectedRoute` component in `App.tsx` wraps authenticated pages; checks Supabase session.
- **ViewModels**: Custom hooks in `src/viewmodels/` encapsulate page logic (e.g., `useLoginViewModel`).
- **Supabase Storage**: File uploads go through `app/services/storage_service.py`; files are organized by project/task ID in buckets.
- **CORS**: Backend allows `http://localhost:5173` and `http://localhost:3000` only — update `app/main.py` for production.
- **Inline migrations**: Schema changes added directly to `main.py` startup (not just Alembic), so check both when debugging schema issues.

# AgencyFlow cleanup guardrails

## Non-negotiable
- Preserve existing business logic.
- Preserve role and permission behavior.
- Preserve API contracts and payload shapes.
- Preserve DB schema behavior.
- Preserve notification routing.
- Preserve webhook and storage flows.
- Preserve client/manager/employee visibility rules.
- Preserve watermark and delivery behavior.
- Preserve payment-related access behavior.

## Required workflow
- Inspect first, edit second.
- Prefer minimal diffs.
- Run tests, lint, typecheck, and build after each cleanup batch.
- Classify risky modules before editing.
- Never remove comments that contain product rules, security constraints, or integration notes.
- When uncertain, do not edit.

## Risky areas
- auth
- permissions
- middleware
- db queries and writes
- webhook handlers
- storage/upload logic
- task submission flow
- watermark flow
- notification system
- payment logic
- brief persistence/resume flow