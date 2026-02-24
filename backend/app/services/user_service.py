from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from fastapi import HTTPException, status
from uuid import UUID
import secrets
import requests
import os # Added for os.getenv
from app.services.email_service import email_service
from app.core.config import settings

def sync_to_supabase(user_data):
    """Fallback sync using REST API (Port 443) which isn't blocked by ISP"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        return
    
    url = f"{supabase_url}/rest/v1/users"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    try:
        # Convert UUID to string for JSON serialization
        data = {k: str(v) if k == 'id' else v for k, v in user_data.items()}
        requests.post(url, headers=headers, json=data, timeout=5)
        print("SYNC: Successfully mirrored user to Supabase Cloud!")
    except Exception as e:
        print(f"SYNC WARNING: Could not mirror to cloud: {e}")

from supabase import create_client, Client
from app.core.config import settings

# Initialize Supabase Client for Auth
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

class UserService:
    supabase = supabase
    
    @staticmethod
    def get_user_by_email(db: Session, email: str):
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def create_user(db: Session, user_in: UserCreate):
        print(f"\n[SIGNUP] New registration request for: {user_in.email}")
        
        try:
            # 1. Register with Supabase Auth
            # Note: Supabase sends the verification email automatically
            print(f"[SIGNUP] Step 1: Registering with Supabase Auth...")
            
            role_str = user_in.role.value if hasattr(user_in.role, 'value') else str(user_in.role)
            
            metadata = {
                "full_name": user_in.full_name,
                "agency_name": user_in.agency_name,
                "role": role_str
            }
            print(f"[SIGNUP] Metadata reaching Supabase: {metadata}")

            auth_response = supabase.auth.sign_up({
                "email": user_in.email,
                "password": user_in.password,
                "options": {
                    "data": metadata
                }
            })
            
            if not auth_response.user:
                print(f"[SIGNUP] ❌ ERROR: Supabase Auth did not return a user record.")
                raise HTTPException(status_code=400, detail="Supabase Auth rejected this email (it might already exist in Supabase Auth).")

            print(f"[SIGNUP] ✅ Supabase Auth Success (ID: {auth_response.user.id})")

            # 2. Insert into local DB manually
            print(f"[SIGNUP] Step 2: Manually inserting into public.users...")
            try:
                new_db_user = User(
                    id=auth_response.user.id,
                    email=user_in.email,
                    full_name=user_in.full_name,
                    agency_name=user_in.agency_name,
                    hashed_password=get_password_hash(user_in.password), # Storing it as requested
                    role=user_in.role,
                    is_active=True,
                    is_verified=False
                )
                db.add(new_db_user)
                db.commit()
                db.refresh(new_db_user)
                print(f"[SIGNUP] ✅ Manual DB Insert Success! User saved in public.users.")
            except Exception as db_err:
                print(f"[SIGNUP] ❌ Manual DB Insert FAILED: {str(db_err)}")
                if "duplicate key" in str(db_err).lower():
                    print("[SIGNUP] TIP: This ID or Email already exists in public.users. Use clean_db.py to reset.")
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Database Sync Error: {str(db_err)}")
            
            return {
                "id": auth_response.user.id,
                "email": user_in.email,
                "full_name": user_in.full_name,
                "role": user_in.role,
                "is_active": True,
                "is_verified": False,
                "created_at": auth_response.user.created_at
            }

        except Exception as e:
            print(f"[SIGNUP] ❌ CRITICAL ERROR: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    def get_user_by_token(db: Session, token: str):
        return db.query(User).filter(User.verification_token == token).first()

    @staticmethod
    def update_user(db: Session, db_user: User, user_in: UserUpdate):
        update_data = user_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_user, field, value)
        db.commit()
        db.refresh(db_user)
        return db_user

user_service = UserService()
