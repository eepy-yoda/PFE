from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserRead, UserCreate
from app.schemas.auth import LoginRequest, Token, ForgotPasswordRequest
from app.services.user_service import user_service
from app.services.auth_service import auth_service

router = APIRouter()

import secrets
from app.services.email_service import email_service

@router.post("/signup", response_model=UserRead)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    user = user_service.get_user_by_email(db, user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system",
        )
    
    # Generate verification token
    token = secrets.token_urlsafe(32)
    new_user = user_service.create_user(db, user_in, verification_token=token)
    
    # Send email
    email_service.send_verification_email(new_user.email, token)
    
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
    # Mocking successful email check
    user = user_service.get_user_by_email(db, request.email)
    if not user:
         # Standard practice: don't reveal if email exists for security
         pass
    return {"message": "If your account exists, you will receive a password reset link shortly."}
