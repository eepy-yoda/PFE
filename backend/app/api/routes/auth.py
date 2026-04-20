from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserRead, UserCreate
from app.schemas.auth import LoginRequest, Token, ForgotPasswordRequest
from app.services.user_service import user_service
from app.services.auth_service import auth_service
from app.core.config import settings

router = APIRouter()


@router.post("/signup", response_model=UserRead)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = user_service.get_user_by_email(db, user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system",
        )
    return user_service.create_user(db, user_in)


@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.authenticate(db, login_data)


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    from app.services.supabase_client import supabase
    try:
        supabase.auth.reset_password_for_email(
            request.email,
            options={"redirect_to": f"{settings.FRONTEND_URL}/reset-password"},
        )
    except Exception as e:
        # Never expose whether the email exists — log only
        print(f"[FORGOT PASSWORD] Supabase error: {e}")
    return {"message": "If your account exists, you will receive a password reset link shortly."}
