import logging
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from fastapi import HTTPException

from app.services.supabase_client import supabase, supabase_admin

logger = logging.getLogger(__name__)


class UserService:
    # Expose the shared clients so other modules can import via user_service
    supabase = supabase
    supabase_admin = supabase_admin

    @staticmethod
    def get_user_by_email(db: Session, email: str):
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def create_user(db: Session, user_in: UserCreate):
        logger.info("[SIGNUP] New registration request for: %s", user_in.email)

        try:
            logger.info("[SIGNUP] Step 1: Registering with Supabase Auth...")
            role_str = user_in.role.value if hasattr(user_in.role, "value") else str(user_in.role)

            auth_response = supabase.auth.sign_up({
                "email": user_in.email,
                "password": user_in.password,
                "options": {
                    "data": {
                        "full_name": user_in.full_name,
                        "role": role_str,
                    }
                },
            })

            if not auth_response.user:
                logger.warning("[SIGNUP] Supabase Auth did not return a user record.")
                raise HTTPException(
                    status_code=400,
                    detail="Supabase Auth rejected this email (it may already exist).",
                )

            logger.info("[SIGNUP] Supabase Auth success (ID: %s)", auth_response.user.id)

            # Insert local profile — no password stored here; Supabase owns credentials
            logger.info("[SIGNUP] Step 2: Inserting local profile...")
            try:
                new_db_user = User(
                    id=auth_response.user.id,
                    email=user_in.email,
                    full_name=user_in.full_name,
                    hashed_password=None,   # Supabase owns the password
                    role=user_in.role,
                    is_active=True,
                    is_verified=False,
                )
                db.add(new_db_user)
                db.commit()
                db.refresh(new_db_user)
                logger.info("[SIGNUP] Local profile saved.")
            except Exception as db_err:
                logger.error("[SIGNUP] DB insert failed: %s", db_err)
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Database error: {db_err}")

            return {
                "id": auth_response.user.id,
                "email": user_in.email,
                "full_name": user_in.full_name,
                "role": user_in.role,
                "is_active": True,
                "is_verified": False,
                "created_at": auth_response.user.created_at,
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error("[SIGNUP] Critical error: %s", e)
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    def update_user(db: Session, db_user: User, user_in: UserUpdate):
        update_data = user_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_user, field, value)
        db.commit()
        db.refresh(db_user)
        return db_user


user_service = UserService()
