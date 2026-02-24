from sqlalchemy.orm import Session
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate
from uuid import UUID

class ProjectService:
    @staticmethod
    def create_project(db: Session, project_in: ProjectCreate, manager_id: UUID):
        db_project = Project(
            **project_in.model_dump(),
            manager_id=manager_id
        )
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        return db_project

    @staticmethod
    def get_projects(db: Session, user_id: UUID, role: str):
        if role == "admin":
            return db.query(Project).all()
        if role == "manager":
            return db.query(Project).filter(Project.manager_id == user_id).all()
        return db.query(Project).filter(Project.client_id == user_id).all()

    @staticmethod
    def get_project(db: Session, project_id: UUID):
        return db.query(Project).filter(Project.id == project_id).first()

    @staticmethod
    def update_project(db: Session, db_project: Project, project_in: ProjectUpdate):
        update_data = project_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_project, field, value)
        db.commit()
        db.refresh(db_project)
        return db_project

project_service = ProjectService()
