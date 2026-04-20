from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.db.session import get_db
from app.schemas.user import UserRead, AdminUserCreate, AdminUserUpdate
from app.schemas.rbac import RoleRead, RoleCreate, RoleUpdate, PermissionRead
from app.schemas.task import TaskRead, TaskCreate, TaskUpdate
from app.schemas.activity import ActivityLogRead
from app.services.user_service import user_service
from app.services.rbac_service import rbac_service
from app.services.task_service import task_service
from app.services.activity_service import activity_service
from app.models.user import User, UserRole
from app.models.rbac import Role, Permission
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/workers", response_model=List[UserRead])
def list_workers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.admin, UserRole.manager]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(User).filter(User.role.in_([UserRole.employee, UserRole.manager])).all()

@router.post("/workers", response_model=UserRead)
def create_worker(
    worker_in: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.admin, UserRole.manager]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if user_service.get_user_by_email(db, worker_in.email):
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user (this uses Supabase Auth)
    from app.schemas.user import UserCreate
    user_data = UserCreate(
        email=worker_in.email,
        full_name=worker_in.full_name,
        password=worker_in.password,
        role=worker_in.role
    )
    new_user_info = user_service.create_user(db, user_data)
    new_user = db.query(User).filter(User.id == new_user_info["id"]).first()
    
    if worker_in.role_ids:
        roles = db.query(Role).filter(Role.id.in_(worker_in.role_ids)).all()
        new_user.assigned_roles = roles
        db.commit()
    
    activity_service.create_log(
        db, current_user.id, "create_worker", "user", new_user.id, {"email": new_user.email}
    )
    
    return new_user

@router.patch("/workers/{worker_id}", response_model=UserRead)
def update_worker(
    worker_id: UUID,
    worker_in: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.admin, UserRole.manager]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db_user = db.query(User).filter(User.id == worker_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Worker not found")
        
    if worker_in.role:
        db_user.role = worker_in.role
    if worker_in.is_active is not None:
        db_user.is_active = worker_in.is_active
    if worker_in.role_ids is not None:
        roles = db.query(Role).filter(Role.id.in_(worker_in.role_ids)).all()
        db_user.assigned_roles = roles
        
    db.commit()
    db.refresh(db_user)
    
    activity_service.create_log(
        db, current_user.id, "update_worker", "user", db_user.id, {"is_active": db_user.is_active}
    )
    
    return db_user


@router.get("/roles", response_model=List[RoleRead])
def list_roles(db: Session = Depends(get_db)):
    return rbac_service.get_roles(db)

@router.post("/roles", response_model=RoleRead)
def create_role(
    role_in: RoleCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.admin, UserRole.manager]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return rbac_service.create_role(db, role_in)

@router.get("/permissions", response_model=List[PermissionRead])
def list_permissions(db: Session = Depends(get_db)):
    return rbac_service.get_permissions(db)


@router.get("/logs", response_model=List[ActivityLogRead])
def list_logs(
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.admin, UserRole.manager]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return activity_service.get_logs(db, skip, limit)


@router.get("/tasks", response_model=List[TaskRead])
def list_all_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.admin, UserRole.manager]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return task_service.get_all_tasks(db)

