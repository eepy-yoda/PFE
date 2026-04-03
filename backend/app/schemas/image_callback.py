from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ImageCallbackPathResult(BaseModel):
    """
    Requested body for the n8n image-result webhook when it sends the
    storage path instead of the binary image.
    """
    image_path: str


class ImageCallbackRead(BaseModel):
    """
    Response schema for the n8n image-result webhook endpoint.

    The callback_token is intentionally excluded from the response;
    n8n only needs a 200 OK confirmation.
    """
    model_config = ConfigDict(from_attributes=True)

    id:            UUID
    file_type:     str
    status:        str
    storage_bucket: Optional[str]    = None
    storage_path:   Optional[str]    = None
    processed_at:   Optional[datetime] = None
    project_id:     UUID
    task_id:        Optional[UUID]   = None
    submission_id:  Optional[UUID]   = None
