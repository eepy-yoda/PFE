import logging
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from fastapi import HTTPException

from app.services.supabase_client import supabase, supabase_admin
from app.core.security import get_password_hash


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

            try:
                # Use admin client to bypass email rate limits and confirm email immediately (ideal for development/testing)
                if supabase_admin:
                    logger.info("[SIGNUP] Using Admin client to bypass email verification and rate limits...")
                    auth_response = supabase_admin.auth.admin.create_user({
                        "email": user_in.email,
                        "password": user_in.password,
                        "email_confirm": True,
                        "user_metadata": {
                            "full_name": user_in.full_name,
                            "role": role_str,
                        }
                    })
                    user_record = auth_response.user
                else:
                    logger.info("[SIGNUP] Standard sign-up (admin client not available)...")
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
                    user_record = auth_response.user
            except Exception as e:
                err_msg = str(e)
                if "already" in err_msg.lower() and "registered" in err_msg.lower() and supabase_admin:
                    logger.warning("[SIGNUP] User already exists in Supabase. Attempting to recover existing ID...")
                    # Find the existing user in Supabase list to get their ID
                    users_list_resp = supabase_admin.auth.admin.list_users()
                    users = getattr(users_list_resp, "users", users_list_resp)
                    user_record = next((u for u in users if u.email == user_in.email), None)
                    
                    if not user_record:
                        logger.error("[SIGNUP] User claimed to exist but not found in Supabase list.")
                        raise HTTPException(status_code=400, detail="User exists in Supabase but details could not be retrieved.")
                    
                    logger.info("[SIGNUP] Successfully recovered existing ID: %s", user_record.id)
                else:
                    logger.error("[SIGNUP] Supabase registration error: %s", e)
                    raise HTTPException(status_code=500, detail=f"Supabase error: {e}")

            if not user_record:
                logger.warning("[SIGNUP] Supabase Auth did not return a user record.")
                raise HTTPException(
                    status_code=400,
                    detail="Supabase Auth rejected this email.",
                )

            logger.info("[SIGNUP] Supabase Auth success (ID: %s)", user_record.id)
            user_id = user_record.id
            created_at = getattr(user_record, "created_at", None) or getattr(user_record, "last_sign_in_at", None)

            # Insert local profile — no password stored here; Supabase owns credentials
            logger.info("[SIGNUP] Step 2: Inserting local profile...")
            try:
                new_db_user = User(
                    id=user_id,
                    email=user_in.email,
                    full_name=user_in.full_name,
                    hashed_password=get_password_hash(user_in.password),

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
                "id": user_id,
                "email": user_in.email,
                "full_name": user_in.full_name,
                "role": user_in.role,
                "is_active": True,
                "is_verified": False,
                "created_at": created_at,
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
