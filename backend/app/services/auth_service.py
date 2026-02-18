from datetime import timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.services.user_service import user_service
from app.core.security import verify_password, create_access_token
from app.schemas.auth import LoginRequest, Token
from app.core.config import settings

class AuthService:
    @staticmethod
    def authenticate(db: Session, login_data: LoginRequest):
        user = user_service.get_user_by_email(db, login_data.email)
        if not user or not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not verified. Please check your inbox."
            )
        
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=user.id, expires_delta=access_token_expires
        )
        return Token(access_token=access_token, token_type="bearer")

auth_service = AuthService()
