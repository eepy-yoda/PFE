from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserRead, UserUpdate
from app.api.deps import get_current_user
from app.models.user import User
from app.services.user_service import user_service

router = APIRouter()

@router.get("/me", response_model=UserRead)
def read_user_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserRead)
def update_user_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.update_user(db, current_user, user_in)
