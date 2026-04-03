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
        print(f"\n[LOGIN] Attempt for: {login_data.email}")

        # 1. Try Supabase Auth first (preferred path)
        supabase_ok = False
        try:
            if user_service.supabase is None:
                raise RuntimeError("Supabase client not initialised")
            auth_response = user_service.supabase.auth.sign_in_with_password({
                "email": login_data.email,
                "password": login_data.password
            })
            if auth_response.user:
                supabase_ok = True
                print(f"[LOGIN] ✅ Supabase Auth Success for ID: {auth_response.user.id}")
            else:
                print(f"[LOGIN] ❌ Supabase rejected credentials.")
        except Exception as e:
            err_str = str(e)
            print(f"[LOGIN] ⚠️ Supabase Check failed/skipped: {err_str}")
            # Supabase might reject the creds (401), be unreachable (paused), or IDs might mismatch.
            # We will now ALWAYS fall back to checking the local public.users table if Step 1 doesn't clear.
            print(f"[LOGIN] ↩️  Falling back to local bcrypt auth for robustness.")

        # 2. Get local user record
        user = user_service.get_user_by_email(db, login_data.email)
        if not user:
            print(f"[LOGIN] ❌ No local profile found for {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        # 3. If Supabase was unavailable, verify password locally
        if not supabase_ok:
            if not verify_password(login_data.password, user.hashed_password):
                print(f"[LOGIN] ❌ Local bcrypt check failed for {login_data.email}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password"
                )
            print(f"[LOGIN] ✅ Local auth fallback succeeded for {login_data.email}")

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )

        # 4. Create local access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            subject=str(user.id), expires_delta=access_token_expires
        )
        print(f"[LOGIN] ✅ Token issued. Role: {user.role}")
        return Token(
            access_token=access_token,
            token_type="bearer",
            role=str(user.role.value if hasattr(user.role, 'value') else user.role),
            user=user
        )

auth_service = AuthService()
