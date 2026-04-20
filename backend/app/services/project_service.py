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
        from sqlalchemy import or_
        from app.models.task import Task
        if str(role) in ["UserRole.admin", "UserRole.manager", "admin", "manager"]:
            return db.query(Project).all()
        if str(role) == "employee" or str(role) == "UserRole.employee":
            # Include projects where employee is the project-level assignee
            # AND projects where they have at least one assigned task
            project_ids_via_tasks = [
                pid for (pid,) in db.query(Task.project_id)
                .filter(Task.assigned_to == user_id)
                .distinct().all()
            ]
            return db.query(Project).filter(
                or_(Project.assigned_to == user_id, Project.id.in_(project_ids_via_tasks))
            ).all()
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
