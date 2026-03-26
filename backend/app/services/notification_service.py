from sqlalchemy.orm import Session
from datetime import datetime, timezone
from uuid import UUID
from typing import Optional
from app.models.notification import Notification, NotificationType, NotificationStatus


from app.models.user import User
from app.services.email_service import email_service

class NotificationService:
    @staticmethod
    def create(
        db: Session,
        user_id: UUID,
        title: str,
        notification_type: NotificationType = NotificationType.general,
        body: Optional[str] = None,
        project_id: Optional[UUID] = None,
        task_id: Optional[UUID] = None,
        brief_id: Optional[UUID] = None,
    ) -> Notification:
        # 1. Save to database
        notif = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            body=body,
            project_id=project_id,
            task_id=task_id,
            brief_id=brief_id,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        
        # 2. Send email notification
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.email:
                email_service.send_notification_email(
                    to_email=user.email,
                    subject=title,
                    body=body or title
                )
        except Exception as e:
            print(f"Failed to send email notification: {e}")
            
        return notif

    @staticmethod
    def get_for_user(db: Session, user_id: UUID, limit: int = 50):
        return (
            db.query(Notification)
            .filter(Notification.user_id == user_id)
            .filter(Notification.status != NotificationStatus.archived)
            .order_by(Notification.created_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def mark_read(db: Session, notification_id: UUID, user_id: UUID) -> Optional[Notification]:
        notif = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        if notif:
            notif.status = NotificationStatus.read
            notif.read_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(notif)
        return notif

    @staticmethod
    def mark_all_read(db: Session, user_id: UUID):
        db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.status == NotificationStatus.unread
        ).update({
            "status": NotificationStatus.read,
            "read_at": datetime.now(timezone.utc)
        })
        db.commit()

    @staticmethod
    def get_unread_count(db: Session, user_id: UUID) -> int:
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.status == NotificationStatus.unread
        ).count()


notification_service = NotificationService()
