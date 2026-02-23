from sqlalchemy.orm import Session
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate
from uuid import UUID
import requests
from app.core.config import settings
from app.schemas.project import BriefRequest

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
    def request_brief(db: Session, brief_in: BriefRequest, client_id: UUID):
        from app.models.user import User, UserRole
        manager = db.query(User).filter(User.role == UserRole.manager).first()
        
        db_project = Project(
            name=brief_in.name,
            description=f"Initial Goals: {brief_in.goals}",
            status="briefing",
            client_id=client_id,
            manager_id=manager.id if manager else client_id,
            brief_history="[]" # Initialize empty history
        )
        db.add(db_project)
        db.commit()
        db.refresh(db_project)

        if settings.N8N_BRIEF_WEBHOOK_URL:
            try:
                payload = {
                    "action": "start",
                    "project_id": str(db_project.id),
                    "project_name": brief_in.name,
                    "goals": brief_in.goals,
                    "target_audience": brief_in.target_audience,
                    "additional_details": brief_in.additional_details
                }
                print(f"[N8N] Initializing brief for project {db_project.id}...")
                response = requests.post(settings.N8N_BRIEF_WEBHOOK_URL, json=payload, timeout=15)
                
                if response.status_code == 200:
                    data = response.json()
                    db_project.next_question = data.get("next_question")
                    db.commit()
            except Exception as e:
                print(f"[N8N] ❌ Initial webhook failed: {str(e)}")
                db_project.next_question = "Explain your vision for this project in more detail." # Fallback
                db.commit()

        return db_project

    @staticmethod
    def submit_answer(db: Session, project_id: UUID, answer: str):
        db_project = db.query(Project).filter(Project.id == project_id).first()
        if not db_project:
            return None

        # 1. Update history
        import json
        history = json.loads(db_project.brief_history or "[]")
        history.append({"role": "assistant", "content": db_project.next_question})
        history.append({"role": "user", "content": answer})
        db_project.brief_history = json.dumps(history)

        # 2. Call n8n for NEXT question
        if settings.N8N_BRIEF_WEBHOOK_URL:
            try:
                payload = {
                    "action": "answer",
                    "project_id": str(db_project.id),
                    "answer": answer,
                    "history": history
                }
                print(f"[N8N] Sending answer for project {db_project.id}...")
                response = requests.post(settings.N8N_BRIEF_WEBHOOK_URL, json=payload, timeout=15)
                
                if response.status_code == 200:
                    data = response.json()
                    status = data.get("status", "continue")
                    
                    if status == "complete":
                        db_project.status = "planning"
                        db_project.brief_content = data.get("brief_content")
                        db_project.next_question = None
                    else:
                        db_project.next_question = data.get("next_question")
                    
                    db.commit()
            except Exception as e:
                print(f"[N8N] ❌ Answer webhook failed: {str(e)}")
        
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
