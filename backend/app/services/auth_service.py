from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.services.user_service import user_service
from app.schemas.auth import LoginRequest, Token


class AuthService:
    @staticmethod
    def authenticate(db: Session, login_data: LoginRequest):
        from app.services.supabase_client import supabase
        print(f"\n[LOGIN] Attempt for: {login_data.email}")

        # 1. Authenticate via Supabase — single source of truth for passwords
        try:
            auth_response = supabase.auth.sign_in_with_password({
                "email": login_data.email,
                "password": login_data.password,
            })
        except Exception as e:
            print(f"[LOGIN] Supabase rejected credentials: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        session = auth_response.session
        print(f"[LOGIN] Supabase OK — user ID: {auth_response.user.id}")

        # 2. Get local profile for role, name, etc.
        user = user_service.get_user_by_email(db, login_data.email)
        if not user:
            raise HTTPException(status_code=404, detail="User profile not found")
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")

        # 3. Sync is_verified from Supabase when email gets confirmed
        if not user.is_verified and auth_response.user.email_confirmed_at:
            user.is_verified = True
            db.commit()

        print(f"[LOGIN] Token issued. Role: {user.role}")
        return Token(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type="bearer",
            role=str(user.role.value if hasattr(user.role, "value") else user.role),
            user=user,
        )


auth_service = AuthService()
