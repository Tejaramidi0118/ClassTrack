from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Notification
from schemas import NotificationResponse
from helpers import get_current_user
from alert_engine import generate_notifications
from typing import List

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Auto-generate alerts before returning
    generate_notifications(user, db)
    
    notifications = db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(20).all()
    return notifications

@router.put("/{notification_id}/read")
def mark_read(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notification = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user.id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    db.commit()
    return {"ok": True}

@router.put("/read-all")
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"ok": True}
