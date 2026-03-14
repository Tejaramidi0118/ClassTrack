from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
from database import get_db
from models import User
from helpers import get_current_user, get_holiday_dates, project_attendance, calculate_attendance_stats, DAY_MAP

router = APIRouter(prefix="/projection", tags=["projection"])

@router.get("")
def get_projection(end_date: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        ed = date.fromisoformat(end_date)
    except:
        raise HTTPException(status_code=400, detail="Invalid date format")
    holidays = get_holiday_dates(user.id, db)
    result = []
    for subject in user.subjects:
        stats = project_attendance(subject, holidays, ed)
        stats["subject_id"] = subject.id
        stats["subject_name"] = subject.name
        result.append(stats)
    return result

@router.get("/holiday-plan")
def holiday_plan(start: str, end: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
    except:
        raise HTTPException(status_code=400, detail="Invalid dates")

    holidays = get_holiday_dates(user.id, db)
    result = []

    for subject in user.subjects:
        slot_days = {slot.day_of_week.value for slot in subject.timetable_slots}
        classes_in_range = 0
        d = start_date
        while d <= end_date:
            if DAY_MAP[d.weekday()] in slot_days and d not in holidays:
                classes_in_range += 1
            d += timedelta(days=1)

        conducted, present, current_pct = calculate_attendance_stats(subject, holidays)
        threshold = subject.threshold

        # If you skip all classes in range
        new_conducted = conducted + classes_in_range
        new_pct_if_skip_all = (present / new_conducted * 100) if new_conducted > 0 else 0

        # Max classes you can skip
        total = conducted + classes_in_range
        min_present = (threshold / 100) * total
        max_skip = max(0, int(present - min_present + classes_in_range))
        max_skip = min(max_skip, classes_in_range)

        result.append({
            "subject_id": subject.id,
            "subject_name": subject.name,
            "current_percentage": round(current_pct, 2),
            "classes_in_range": classes_in_range,
            "max_can_skip": max_skip,
            "must_attend": classes_in_range - max_skip,
            "safe_to_take_full_leave": max_skip >= classes_in_range,
            "percentage_if_skip_all": round(new_pct_if_skip_all, 2),
            "threshold": threshold
        })

    overall_safe = all(r["safe_to_take_full_leave"] for r in result)
    blocking_subjects = [r["subject_name"] for r in result if not r["safe_to_take_full_leave"]]

    return {
        "start": start,
        "end": end,
        "overall_safe_to_leave": overall_safe,
        "blocking_subjects": blocking_subjects,
        "subjects": result
    }
