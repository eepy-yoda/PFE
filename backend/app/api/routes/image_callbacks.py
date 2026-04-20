"""
routes/image_callbacks.py
──────────────────────────
Webhook endpoint for n8n image-result callbacks.

n8n uploads the processed image to Supabase Storage and then sends a JSON
callback to this endpoint with the storage key.

Expected n8n JSON payload (array):
  [{"Key": "task-submissions/preview/1775060331076-file.png", "Id": "<uuid>"}]

Also supports a legacy object format:
  {"image_path": "task-submissions/preview/..."}

All business context (project, task, submission, file_type) is recovered
server-side from the URL token — no extra metadata is required from n8n.

Endpoint:
  POST /api/v1/webhooks/n8n/image-result/{token}

Security:
  The token is a 32-byte cryptographically random URL-safe value generated
  by this backend before n8n is triggered.  It is single-use and expires
  after 24 hours.  No additional secret header is required because the token
  itself provides equivalent security (256 bits of entropy).
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.image_callback import ImageCallbackRead
from app.services.image_callback_service import image_callback_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/n8n", tags=["webhooks"])


@router.post("/image-result/{token}", response_model=ImageCallbackRead)
async def receive_image_result(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Receive a processed image result from n8n.

    Supports two modes:
      1. Binary upload  — multipart/form-data with an 'image' field
      2. Path callback  — JSON body in one of two shapes:
           n8n format  : [{"Key": "bucket/path/file.png", "Id": "..."}]
           legacy format: {"image_path": "bucket/path/file.png"}

    The {token} path parameter identifies the pending callback record.
    """
    content_type = request.headers.get("content-type", "")
    hint = token[:8] + "..."

    if "multipart/form-data" in content_type:
        form = await request.form()
        image = form.get("image")
        if image is None:
            logger.warning("[ImageCallback] Multipart request missing 'image' field  hint=%s", hint)
            raise HTTPException(status_code=422, detail="Multipart form missing 'image' field.")
        ct = getattr(image, "content_type", None) or "image/jpeg"
        logger.info("[ImageCallback] Binary upload received  hint=%s  filename=%s", hint, getattr(image, "filename", "?"))
        return image_callback_service.process_image_callback(
            db,
            token=token,
            image_file=image.file,
            content_type=ct,
        )

    try:
        body = await request.json()
    except Exception:
        logger.warning("[ImageCallback] Failed to parse request body as JSON  hint=%s", hint)
        raise HTTPException(
            status_code=422,
            detail="Request body must be JSON or multipart/form-data.",
        )

    logger.info("[ImageCallback] JSON body received  hint=%s  body=%r", hint, body)

    image_path: Optional[str] = None

    # n8n format: [{"Key": "bucket/path/file.png", "Id": "..."}]
    if isinstance(body, list):
        if not body:
            raise HTTPException(status_code=422, detail="n8n payload array is empty.")
        first = body[0]
        if not isinstance(first, dict):
            raise HTTPException(
                status_code=422,
                detail=f"n8n payload first element is not an object. Received: {first!r}",
            )
        # Case-insensitive lookup: n8n may send "Key", "key", or "KEY"
        image_path = first.get("Key") or first.get("key") or first.get("KEY")
        if not image_path:
            raise HTTPException(
                status_code=422,
                detail=(
                    "n8n payload missing 'Key' field in first element. "
                    f"Received keys: {list(first.keys())!r}"
                ),
            )
        if not isinstance(image_path, str) or not image_path.strip():
            raise HTTPException(
                status_code=422,
                detail="n8n 'Key' field is empty or not a string.",
            )
        image_path = image_path.strip()
        logger.info(
            "[ImageCallback] Extracted path from n8n Key field  hint=%s  path=%r",
            hint, image_path,
        )

    # Legacy format: {"image_path": "bucket/path/file.png"}
    elif isinstance(body, dict):
        image_path = body.get("image_path")
        if image_path and isinstance(image_path, str):
            image_path = image_path.strip()
        if image_path:
            logger.info(
                "[ImageCallback] Extracted path from legacy image_path field  hint=%s  path=%r",
                hint, image_path,
            )

    if not image_path:
        raise HTTPException(
            status_code=422,
            detail=(
                "Could not extract image path from request body. "
                'Expected n8n format: [{"Key": "bucket/path"}] '
                'or legacy format: {"image_path": "bucket/path"}.'
            ),
        )

    return image_callback_service.process_path_callback(
        db,
        token=token,
        image_path=image_path,
    )
