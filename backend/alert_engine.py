from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from models import User, Notification, CalendarEvent, Subject
from helpers import project_attendance

def generate_notifications(user: User, db: Session):
    today = date.today()
    
    # 1. Check for upcoming calendar events (exams, holidays)
    upcoming_events = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == user.id,
        CalendarEvent.date >= today,
        CalendarEvent.date <= today + timedelta(days=3)
    ).all()
    
    for event in upcoming_events:
        days_away = (event.date - today).days
        if days_away == 1:
            title = f"Reminder: {event.name} Tomorrow"
            message = f"You have {event.name} tomorrow ({event.event_type})."
            _create_notification_if_unique(db, user.id, title, message, "reminder")
        elif days_away == 0:
            title = f"Today: {event.name}"
            message = f"{event.name} is scheduled for today."
            _create_notification_if_unique(db, user.id, title, message, "info")

    # 2. Check for low attendance (warning threshold)
    for subject in user.subjects:
        holidays = set() # Ideally passed from caller, but empty is safe for basic warning threshold logic
        from helpers import calculate_attendance_stats
        conducted, present, current_pct = calculate_attendance_stats(subject, holidays)
        
        if conducted == 0:
            continue
        
        if current_pct < subject.threshold:
            title = f"Critical Attendance: {subject.name}"
            message = f"Your attendance in {subject.name} is {current_pct:.1f}%, which is below the {subject.threshold}% requirement."
            _create_notification_if_unique(db, user.id, title, message, "warning")
        elif current_pct < subject.threshold + 5:
            # Within 5% of threshold
            title = f"Attendance Warning: {subject.name}"
            message = f"Your attendance in {subject.name} is {current_pct:.1f}%. You are very close to the minimum threshold."
            _create_notification_if_unique(db, user.id, title, message, "warning")

def _create_notification_if_unique(db: Session, user_id: int, title: str, message: str, type: str):
    # Check if a similar notification exists in the last 24 hours
    yesterday = datetime.utcnow() - timedelta(days=1)
    existing = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.title == title,
        Notification.created_at >= yesterday
    ).first()
    
    if not existing:
        n = Notification(user_id=user_id, title=title, message=message, type=type)
        db.add(n)
        db.commit()
