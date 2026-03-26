from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

# Sentinel used system-wide; n8n and the UI both check for this exact string
UNANSWERED_PLACEHOLDER = "not answered by user code 456"


class BriefSeed(BaseModel):
    project_name: str
    objective: str
    platforms: List[str]
    tone: str
    language: str


class BriefStartRequest(BaseModel):
    seed: BriefSeed


class BriefSubmitRequest(BaseModel):
    sessionId: UUID
    data: Dict[str, Any]


class BriefAutosaveRequest(BaseModel):
    """Persist a single answered field immediately after the user responds."""
    sessionId: UUID
    fieldKey: str
    question: Dict[str, Any]   # full field definition from n8n schema
    answer: str


class BriefInterruptRequest(BaseModel):
    """Called when the session is interrupted (tab hidden / beforeunload).
    answeredFields already have real values; unanswered ones are filled with
    the placeholder by the backend before storing and forwarding to n8n."""
    sessionId: UUID
    answeredFields: Dict[str, Any]   # {fieldKey: {question, answer}}
    allFields: List[Dict[str, Any]]  # full ordered field list from n8n schema


class FormFieldOption(BaseModel):
    label: str
    value: str


class FormField(BaseModel):
    key: str
    type: str   # text, textarea, select, multiselect
    label: str
    required: bool = False
    options: Optional[List[str]] = None


class BriefResponse(BaseModel):
    mode: str   # schema, embed, complete
    formId: Optional[str] = None
    title: Optional[str] = None
    fields: Optional[List[Dict[str, Any]]] = None
    formUrl: Optional[str] = None
    expiresAt: Optional[str] = None
