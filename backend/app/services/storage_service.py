"""
services/storage_service.py
────────────────────────────
Thin wrapper around Supabase Storage for server-side file uploads.

Uses the service_role key (bypasses RLS) so the backend can upload on behalf
of any user without requiring a user JWT.  Falls back to anon key if
SUPABASE_SERVICE_KEY is not configured (dev convenience only).
"""

from __future__ import annotations

import base64
import mimetypes
import uuid
from typing import Optional

from supabase import create_client, Client

from app.core.config import settings

# ── Bucket used for all task-related files ────────────────────────────────────
TASK_SUBMISSIONS_BUCKET = "task-submissions"


def _get_client() -> Client:
    key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_ANON_KEY
    return create_client(settings.SUPABASE_URL, key)


def upload_watermark_preview(
    *,
    file_bytes: bytes,
    filename: str,
    content_type: str,
    client_id: str,
    project_id: str,
    task_id: str,
) -> str:
    """
    Upload a watermarked preview file to Supabase Storage.

    Storage path:
        task-submissions/preview/{client_id}/{project_id}/{task_id}/{unique_filename}

    Returns the public URL of the uploaded file.
    Raises RuntimeError on upload failure.
    """
    ext = _extension_from_content_type(content_type, filename)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    storage_path = f"preview/{client_id}/{project_id}/{task_id}/{unique_name}"

    supabase: Client = _get_client()

    response = supabase.storage.from_(TASK_SUBMISSIONS_BUCKET).upload(
        path=storage_path,
        file=file_bytes,
        file_options={
            "content-type": content_type,
            "upsert": "false",
        },
    )

    # supabase-py v2 raises an exception on failure; check for StorageException
    # The path returned in response is the stored path.
    public_url = supabase.storage.from_(TASK_SUBMISSIONS_BUCKET).get_public_url(storage_path)
    return public_url


def _extension_from_content_type(content_type: str, filename: str) -> str:
    """Return file extension including dot, e.g. '.jpg'."""
    # Prefer extension already in filename
    if "." in filename:
        return "." + filename.rsplit(".", 1)[-1].lower()
    # Derive from MIME type
    ext = mimetypes.guess_extension(content_type.split(";")[0].strip())
    return ext or ""


# ── Deliverables bucket ───────────────────────────────────────────────────────

DELIVERABLES_BUCKET = "deliverables"

_MIME_EXT: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/jpg":  ".jpg",
    "image/png":  ".png",
    "image/webp": ".webp",
    "image/gif":  ".gif",
    "image/tiff": ".tiff",
}


def _ext_from_mime(content_type: str) -> str:
    mime = content_type.split(";")[0].strip()
    if mime in _MIME_EXT:
        return _MIME_EXT[mime]
    return mimetypes.guess_extension(mime) or ".bin"


def upload_deliverable(
    *,
    file_source,
    content_type: str,
    project_id: str,
    task_id: str,
    submission_id: str,
    file_type: str,
) -> tuple[str, str]:
    """
    Stream an image directly to Supabase Storage via its REST API.

    file_source accepts either raw bytes or a file-like object (e.g. the
    SpooledTemporaryFile backing a FastAPI UploadFile).  When a file-like
    object is passed, requests reads from it in chunks and sends them
    straight to Supabase — no full in-memory copy is made.

    Storage path:
        deliverables/{project_id}/{task_id}/{submission_id}/{file_type}-{timestamp}.{ext}

    Returns (storage_path, public_url).
    Raises RuntimeError on upload failure.
    """
    import requests as _http
    from datetime import datetime, timezone

    ext = _ext_from_mime(content_type)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    storage_path = f"{project_id}/{task_id}/{submission_id}/{file_type}-{timestamp}{ext}"

    key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_ANON_KEY
    url = f"{settings.SUPABASE_URL}/storage/v1/object/{DELIVERABLES_BUCKET}/{storage_path}"

    resp = _http.post(
        url,
        data=file_source,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": content_type,
        },
        timeout=120,
    )

    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Supabase Storage upload failed: HTTP {resp.status_code} — {resp.text[:300]}"
        )

    public_url = (
        f"{settings.SUPABASE_URL}/storage/v1/object/public"
        f"/{DELIVERABLES_BUCKET}/{storage_path}"
    )
    return storage_path, public_url


def delete_deliverable(storage_path: str) -> None:
    """
    Delete a deliverable from Supabase Storage.
    Used for rollback when a DB write fails after a successful upload.
    """
    supabase: Client = _get_client()
    supabase.storage.from_(DELIVERABLES_BUCKET).remove([storage_path])
