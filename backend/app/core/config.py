from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AgencyFlow API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: Optional[str] = None  # service_role key — bypasses RLS for storage uploads
    
    N8N_BRIEF_WEBHOOK_URL: Optional[str] = None
    N8N_AI_RESUME_WEBHOOK_URL: Optional[str] = None
    N8N_TASK_REVIEW_WEBHOOK_URL: Optional[str] = None
    N8N_WORK_SUBMISSION_WEBHOOK: Optional[str] = None
    WATERMARK_WEBHOOK_URL: Optional[str] = None
    # Preferred alias — takes precedence over N8N_WORK_SUBMISSION_WEBHOOK if both set
    SUBMISSION_REVIEW_WEBHOOK_URL: Optional[str] = None
    N8N_WEBHOOK_SECRET: Optional[str] = None

    # Public base URL of this API (e.g. https://api.example.com).
    # Required for building n8n image-result callback URLs.
    APP_BASE_URL: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env", 
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
