from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from models import User, Notification, CalendarEvent
from helpers import calculate_attendance_stats, project_attendance, get_holiday_dates
import math

def generate_notifications(user: User, db: Session):
    today = date.today()
    holidays = get_holiday_dates(user.id, db)
    sem_end = user.semester_end_date or (today + timedelta(days=90))

    # Clear old auto-generated notifications older than 24hrs to avoid clutter
    yesterday = datetime.utcnow() - timedelta(days=1)

    # 1. Upcoming calendar events (next 3 days)
    upcoming_events = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == user.id,
        CalendarEvent.date >= today,
        CalendarEvent.date <= today + timedelta(days=3)
    ).all()

    for event in upcoming_events:
        days_away = (event.date - today).days
        if days_away == 1:
            _upsert(db, user.id,
                f"Reminder: {event.name} Tomorrow",
                f"{event.name} ({event.event_type}) is scheduled for tomorrow.",
                "reminder")
        elif days_away == 0:
            _upsert(db, user.id,
                f"Today: {event.name}",
                f"{event.name} is scheduled for today.",
                "info")

    # 2. Per-subject smart alerts
    for subject in user.subjects:
        conducted, present, current_pct = calculate_attendance_stats(subject, holidays)
        if conducted == 0:
            continue

        threshold = subject.threshold
        projection = project_attendance(subject, holidays, sem_end)
        must_attend = projection["must_attend_to_reach_threshold"]
        can_skip = projection["current_can_skip"]
        cross_date = projection["threshold_cross_date"]

        if current_pct < threshold:
            # Critical — below threshold
            if must_attend > 0:
                extra = f" Attend the next {must_attend} classes to recover."
                if cross_date:
                    extra += f" You'll recover by {cross_date}."
            else:
                extra = " No upcoming classes found to recover."
            _upsert(db, user.id,
                f"Critical: {subject.name} at {current_pct:.1f}%",
                f"{subject.name} is below the {threshold:.0f}% requirement.{extra}",
                "warning")

        elif current_pct < threshold + 5:
            # Warning — dangerously close
            _upsert(db, user.id,
                f"Warning: {subject.name} at {current_pct:.1f}%",
                f"{subject.name} is only {(current_pct - threshold):.1f}% above the minimum. Don't skip any classes.",
                "warning")

        elif can_skip > 0:
            # Safe — tell them how many they can skip
            _upsert(db, user.id,
                f"{subject.name}: You can skip {can_skip} more {'class' if can_skip == 1 else 'classes'}",
                f"Your attendance is {current_pct:.1f}%. You have {can_skip} skip{'s' if can_skip > 1 else ''} left before hitting {threshold:.0f}%.",
                "info")

def _upsert(db: Session, user_id: int, title: str, message: str, type: str):
    """Replace existing notification with same title, or create new one."""
    existing = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.title == title
    ).first()

    if existing:
        # Update message in case numbers changed, reset read status
        existing.message = message
        existing.is_read = False
        existing.created_at = datetime.utcnow()
    else:
        n = Notification(user_id=user_id, title=title, message=message, type=type)
        db.add(n)

    db.commit()