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
        
        try:
            # 1. Authenticate with Supabase Auth
            auth_response = user_service.supabase.auth.sign_in_with_password({
                "email": login_data.email,
                "password": login_data.password
            })
            
            if not auth_response.user:
                print(f"[LOGIN] ❌ Supabase rejected credentials.")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password"
                )

            print(f"[LOGIN] ✅ Supabase Auth Success for ID: {auth_response.user.id}")

            # 2. Get local user info (for roles and status)
            user = user_service.get_user_by_email(db, login_data.email)
            if not user:
                print(f"[LOGIN] ❌ User authenticated in Supabase but missing in public.users!")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User profile not found in system."
                )

            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Inactive user"
                )
            
            # Note: During development, we check if email is confirmed, 
            # but we can allow login if it's not confirmed yet to bypass SMTP limits
            if not auth_response.user.email_confirmed_at:
                print(f"[LOGIN] ⚠️ Warning: User {login_data.email} logged in without email confirmation.")
                # Optional: Uncomment if you want to strictly enforce verification
                # raise HTTPException(status_code=400, detail="Email not verified.")
            
            # 3. Create local access token for current session
            access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                subject=str(user.id), expires_delta=access_token_expires
            )
            print(f"[LOGIN] Success! Role identified as: {user.role}")
            return Token(
                access_token=access_token, 
                token_type="bearer",
                role=str(user.role.value if hasattr(user.role, 'value') else user.role)
            )

        except Exception as e:
            print(f"[LOGIN] ❌ Unexpected Error: {str(e)}")
            if "Invalid login credentials" in str(e):
                 raise HTTPException(status_code=401, detail="Incorrect email or password")
            raise HTTPException(status_code=500, detail=str(e))

auth_service = AuthService()
