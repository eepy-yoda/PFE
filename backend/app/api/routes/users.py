from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas.user import UserRead, UserUpdate, PasswordChange, AdminUserCreate, AdminUserUpdate
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.services.user_service import user_service

router = APIRouter()


@router.get("/me", response_model=UserRead)
def read_user_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserRead)
def update_user_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return user_service.update_user(db, current_user, user_in)


@router.patch("/me", response_model=UserRead)
def patch_user_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return user_service.update_user(db, current_user, user_in)


@router.patch("/me/password")
def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
):
    from app.services.supabase_client import supabase, supabase_admin

    try:
        result = supabase.auth.sign_in_with_password({
            "email": current_user.email,
            "password": payload.current_password,
        })
        if not result.user:
            raise Exception("invalid credentials")
    except Exception:
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if supabase_admin is None:
        raise HTTPException(status_code=503, detail="Admin client not configured (missing SUPABASE_SERVICE_KEY)")
    try:
        supabase_admin.auth.admin.update_user_by_id(
            str(current_user.id),
            {"password": payload.new_password},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update password: {e}")

    return {"message": "Password updated successfully"}


def _require_admin(current_user: User):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/", response_model=List[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    return db.query(User).all()


@router.post("/employee", response_model=UserRead, status_code=201)
def create_employee(
    user_in: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    existing = user_service.get_user_by_email(db, user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    from app.schemas.user import UserCreate
    return user_service.create_user(db, UserCreate(
        email=user_in.email,
        full_name=user_in.full_name,
        password=user_in.password,
        role=user_in.role,
    ))


@router.patch("/{user_id}", response_model=UserRead)
def admin_update_user(
    user_id: str,
    user_in: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}/deactivate")
def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": f"User {user.email} deactivated"}
