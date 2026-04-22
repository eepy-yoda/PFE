from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone, timedelta
from app.models.time_tracking import TimeLog


class TimeTrackingService:
    def get_active_timer(self, db: Session, user_id: UUID) -> Optional[TimeLog]:
        return (
            db.query(TimeLog)
            .filter(
                TimeLog.user_id == user_id,
                TimeLog.end_time == None,
                TimeLog.is_manual == False,
            )
            .first()
        )

    def start_timer(
        self,
        db: Session,
        task_id: UUID,
        user_id: UUID,
        description: Optional[str] = None,
    ) -> TimeLog:
        active = self.get_active_timer(db, user_id)
        if active:
            self._close_log(db, active)

        log = TimeLog(
            task_id=task_id,
            user_id=user_id,
            start_time=datetime.now(timezone.utc),
            description=description,
            is_manual=False,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    def stop_timer(self, db: Session, log_id: UUID, user_id: UUID) -> Optional[TimeLog]:
        log = (
            db.query(TimeLog)
            .filter(
                TimeLog.id == log_id,
                TimeLog.user_id == user_id,
                TimeLog.end_time == None,
            )
            .first()
        )
        if not log:
            return None
        return self._close_log(db, log)

    def stop_active_timer(self, db: Session, user_id: UUID) -> Optional[TimeLog]:
        active = self.get_active_timer(db, user_id)
        if not active:
            return None
        return self._close_log(db, active)

    def _close_log(self, db: Session, log: TimeLog) -> TimeLog:
        now = datetime.now(timezone.utc)
        log.end_time = now
        start = log.start_time
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        log.duration_seconds = (now - start).total_seconds()
        db.commit()
        db.refresh(log)
        return log

    def create_manual_entry(
        self,
        db: Session,
        task_id: UUID,
        user_id: UUID,
        start_time: datetime,
        end_time: datetime,
        description: Optional[str] = None,
    ) -> TimeLog:
        if end_time <= start_time:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="end_time must be after start_time")
        duration = (end_time - start_time).total_seconds()
        log = TimeLog(
            task_id=task_id,
            user_id=user_id,
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration,
            description=description,
            is_manual=True,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    def get_logs_for_user(
        self,
        db: Session,
        user_id: UUID,
        task_id: Optional[UUID] = None,
        limit: int = 100,
    ) -> List[TimeLog]:
        q = db.query(TimeLog).filter(TimeLog.user_id == user_id)
        if task_id:
            q = q.filter(TimeLog.task_id == task_id)
        return q.order_by(TimeLog.start_time.desc()).limit(limit).all()

    def delete_log(self, db: Session, log_id: UUID, user_id: UUID) -> bool:
        log = (
            db.query(TimeLog)
            .filter(TimeLog.id == log_id, TimeLog.user_id == user_id)
            .first()
        )
        if not log:
            return False
        db.delete(log)
        db.commit()
        return True

    def get_summary(self, db: Session, user_id: UUID) -> dict:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())

        today_logs = (
            db.query(TimeLog)
            .filter(
                TimeLog.user_id == user_id,
                TimeLog.start_time >= today_start,
                TimeLog.duration_seconds != None,
            )
            .all()
        )
        week_logs = (
            db.query(TimeLog)
            .filter(
                TimeLog.user_id == user_id,
                TimeLog.start_time >= week_start,
                TimeLog.duration_seconds != None,
            )
            .all()
        )

        return {
            "today_seconds": sum(l.duration_seconds or 0 for l in today_logs),
            "week_seconds": sum(l.duration_seconds or 0 for l in week_logs),
            "active_timer": self.get_active_timer(db, user_id),
        }


time_tracking_service = TimeTrackingService()
