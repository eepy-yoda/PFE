from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

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

class FormFieldOption(BaseModel):
    label: str
    value: str

class FormField(BaseModel):
    key: str
    type: str # text, textarea, select, multiselect
    label: str
    required: bool = False
    options: Optional[List[str]] = None # Simplified for now

class BriefResponse(BaseModel):
    mode: str # schema, embed, complete
    formId: Optional[str] = None
    title: Optional[str] = None
    fields: Optional[List[Dict[str, Any]]] = None
    formUrl: Optional[str] = None
    expiresAt: Optional[str] = None
