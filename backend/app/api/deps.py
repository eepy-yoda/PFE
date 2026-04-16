from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

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
        print(f"[AUTH] Token valid — Supabase user_id={user_id} email={user_email}")
        return user_id, user_email
    except Exception as e:
        print(f"[AUTH] Token validation failed: {e}")
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
        print(f"[AUTH] UUID lookup miss for {user_id}, trying email fallback ({user_email})")
        user = db.query(User).filter(User.email == user_email).first()
        if user:
            print(f"[AUTH] Resolved user by email — local_id={user.id}, supabase_id={user_id}")
        else:
            print(f"[AUTH] Email fallback also missed for {user_email}")
    return user


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    user_id, user_email = _validate_supabase_token(token)
    user = _lookup_user(db, user_id, user_email)
    if not user:
        print(f"[AUTH] User not found — supabase_id={user_id} email={user_email}")
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
