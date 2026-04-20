import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False
)


def _validate_supabase_token(token: str):
    """Validate a Supabase JWT by calling Supabase's auth service.
    Returns (user_id: str, user_email: str) on success, raises HTTPException on failure."""
    from app.services.supabase_client import supabase
    try:
        response = supabase.auth.get_user(token)
        user_id = str(response.user.id)
        user_email = response.user.email or ""
        logger.info("[AUTH] Token valid — Supabase user_id=%s email=%s", user_id, user_email)
        return user_id, user_email
    except Exception as e:
        logger.warning("[AUTH] Token validation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _lookup_user(db: Session, user_id: str, user_email: str) -> Optional[User]:
    """Resolve a local User from a Supabase auth identity.

    Primary lookup is by UUID (fast, correct for all users created after the
    Supabase auth migration).  If that misses, fall back to email lookup so
    that pre-migration users — whose local `users.id` was generated independently
    and does not match their Supabase auth UUID — are still resolved correctly
    after a password reset or token refresh.
    """
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if user:
        return user

    if user_email:
        logger.info("[AUTH] UUID lookup miss for %s, trying email fallback (%s)", user_id, user_email)
        user = db.query(User).filter(User.email == user_email).first()
        if user:
            logger.info("[AUTH] Resolved user by email — local_id=%s, supabase_id=%s", user.id, user_id)
        else:
            logger.warning("[AUTH] Email fallback also missed for %s", user_email)
    return user


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    user_id, user_email = _validate_supabase_token(token)
    user = _lookup_user(db, user_id, user_email)
    if not user:
        logger.warning("[AUTH] User not found — supabase_id=%s email=%s", user_id, user_email)
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def get_current_user_optional(
    db: Session = Depends(get_db), token: Optional[str] = Depends(oauth2_scheme_optional)
) -> Optional[User]:
    if not token:
        return None
    try:
        user_id, user_email = _validate_supabase_token(token)
        user = _lookup_user(db, user_id, user_email)
        if user and user.is_active:
            return user
    except Exception:
        pass
    return None
