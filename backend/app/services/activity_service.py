from sqlalchemy.orm import Session
from app.models.activity import ActivityLog
from app.schemas.activity import ActivityLogCreate
from uuid import UUID

class ActivityService:
    def get_logs(self, db: Session, skip: int = 0, limit: int = 20):
        return db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()

    def create_log(self, db: Session, user_id: UUID, action: str, entity_type: str, entity_id: UUID = None, details: dict = None):
        db_log = ActivityLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        return db_log

activity_service = ActivityService()
