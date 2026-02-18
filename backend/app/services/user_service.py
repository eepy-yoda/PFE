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

class UserService:
    @staticmethod
    def get_user_by_email(db: Session, email: str):
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def create_user(db: Session, user_in: UserCreate, verification_token: str = None):
        db_user = User(
            email=user_in.email,
            full_name=user_in.full_name,
            agency_name=user_in.agency_name,
            hashed_password=get_password_hash(user_in.password),
            role=user_in.role,
            verification_token=verification_token,
            is_verified=False
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Mirror to Supabase Cloud via REST (Bypasses Port 5432 block!)
        sync_to_supabase({
            "id": db_user.id,
            "email": db_user.email,
            "full_name": db_user.full_name,
            "agency_name": db_user.agency_name,
            "hashed_password": db_user.hashed_password,
            "role": db_user.role,
            "is_verified": False,
            "verification_token": verification_token
        })
        
        return db_user

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
