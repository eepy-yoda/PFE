from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.services.project_service import project_service
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=ProjectRead)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return project_service.create_project(db, project_in, current_user.id)

@router.get("/", response_model=List[ProjectRead])
def read_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return project_service.get_projects(db, current_user.id, current_user.role)

@router.get("/{project_id}", response_model=ProjectRead)
def read_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Access control
    if current_user.role != "admin" and \
       project.manager_id != current_user.id and \
       project.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    return project
