from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserRead, UserCreate
from app.schemas.auth import LoginRequest, Token, ForgotPasswordRequest
from app.services.user_service import user_service
from app.services.auth_service import auth_service
from pydantic import BaseModel

router = APIRouter()

import secrets
from datetime import datetime, timezone, timedelta
from app.services.email_service import email_service
from app.core.security import get_password_hash

from app.core.config import settings


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/signup", response_model=UserRead)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists locally
    user = user_service.get_user_by_email(db, user_in.email)
    if user:
        print(f"[SIGNUP] ⚠️ REJECTED: Email {user_in.email} already exists in public.users.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system",
        )

    # Create user (this handles Supabase Auth and terminal logging)
    new_user = user_service.create_user(db, user_in)

    return new_user

@router.get("/verify/{token}")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = user_service.get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user.is_verified = True
    user.verification_token = None
    db.commit()
    return {"message": "Email verified successfully! You can now log in."}

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.authenticate(db, login_data)

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = user_service.get_user_by_email(db, request.email)
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_password_token = token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=2)
        db.commit()
        body = (
            f"Hello,\n\n"
            f"You requested a password reset for your AgencyFlow account.\n\n"
            f"Click the link below to reset your password (valid for 2 hours):\n"
            f"http://localhost:5173/reset-password?token={token}\n\n"
            f"If you did not request this, please ignore this email."
        )
        email_service._send(user.email, "Reset your AgencyFlow password", body)
    return {"message": "If your account exists, you will receive a password reset link shortly."}


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    from app.models.user import User
    user = db.query(User).filter(User.reset_password_token == request.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    now = datetime.now(timezone.utc)
    if user.reset_token_expires is None or user.reset_token_expires.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(status_code=400, detail="Token has expired")
    user.hashed_password = get_password_hash(request.new_password)
    user.reset_password_token = None
    user.reset_token_expires = None
    db.commit()
    return {"message": "Password reset successfully"}
