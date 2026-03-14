import hashlib
import secrets
import math
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import timedelta, date
from collections import defaultdict

from models import User, CalendarEvent, CalendarEventType, AttendanceStatus
from database import get_db

security = HTTPBearer(auto_error=False)

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.token == credentials.credentials).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

DAY_MAP = {0: "monday", 1: "tuesday", 2: "wednesday", 3: "thursday", 4: "friday", 5: "saturday", 6: "sunday"}

def get_holiday_dates(user_id: int, db: Session):
    events = db.query(CalendarEvent).filter(CalendarEvent.user_id == user_id, CalendarEvent.event_type == CalendarEventType.holiday).all()
    return {e.date for e in events}

def calculate_attendance_stats(subject, holiday_dates: set):
    total_conducted = subject.baseline_conducted or 0
    total_present = subject.baseline_present or 0
    for record in subject.attendance_records:
        if record.status == AttendanceStatus.cancelled:
            continue
        if record.status == AttendanceStatus.holiday:
            continue
        total_conducted += 1
        if record.status == AttendanceStatus.present:
            total_present += 1
    percentage = (total_present / total_conducted * 100) if total_conducted > 0 else 0
    return total_conducted, total_present, round(percentage, 2)

def project_attendance(subject, holiday_dates: set, end_date: date):
    today = date.today()
    conducted, present, current_pct = calculate_attendance_stats(subject, holiday_dates)
    threshold = subject.threshold

    # Count remaining classes from today to end_date
    slot_days = {slot.day_of_week.value for slot in subject.timetable_slots}
    classes_per_day = defaultdict(int)
    for slot in subject.timetable_slots:
        classes_per_day[slot.day_of_week.value] += 1

    remaining_classes = 0
    d = today
    while d <= end_date:
        if DAY_MAP[d.weekday()] in slot_days and d not in holiday_dates:
            remaining_classes += classes_per_day[DAY_MAP[d.weekday()]]
        d += timedelta(days=1)

    # How many can I skip?
    total_future = conducted + remaining_classes
    min_present_needed = (threshold / 100) * total_future
    can_skip = max(0, int(present + remaining_classes - min_present_needed))

    # How many must I attend to reach threshold?
    must_attend = 0
    if current_pct < threshold and conducted > 0:
        # present + x >= threshold/100 * (conducted + x)
        # x(1 - threshold/100) >= threshold/100 * conducted - present
        denom = 1 - threshold / 100
        if denom > 0:
            must_attend = max(0, math.ceil((threshold / 100 * conducted - present) / denom))

    # Simulate day-by-day to find the date attendance crosses threshold
    threshold_cross_date = None
    if current_pct < threshold and must_attend > 0:
        sim_conducted = conducted
        sim_present = present
        d = today
        while d <= end_date:
            day_name = DAY_MAP[d.weekday()]
            if day_name in slot_days and d not in holiday_dates:
                day_slots = classes_per_day[day_name]
                sim_conducted += day_slots
                sim_present += day_slots  # assume attending all
                sim_pct = (sim_present / sim_conducted * 100) if sim_conducted > 0 else 0
                if sim_pct >= threshold:
                    threshold_cross_date = d.isoformat()
                    break
            d += timedelta(days=1)

    return {
        "conducted": conducted,
        "present": present,
        "percentage": round((present / conducted * 100) if conducted > 0 else 0, 2),
        "remaining_classes": remaining_classes,
        "can_skip": can_skip,
        "must_attend_to_reach_threshold": must_attend,
        "threshold_cross_date": threshold_cross_date,
        "threshold": threshold,
        "safe": current_pct >= threshold
    }

