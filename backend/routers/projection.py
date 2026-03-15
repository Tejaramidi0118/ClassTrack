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
def holiday_plan(start: str, end: str, semester_end: str = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
        sem_end_date = date.fromisoformat(semester_end) if semester_end else user.semester_end_date
        if not sem_end_date:
            sem_end_date = date.today() + timedelta(days=90)
    except:
        raise HTTPException(status_code=400, detail="Invalid dates")

    holidays = get_holiday_dates(user.id, db)
    result = []

    from collections import defaultdict

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

        recovery_date = None
        if new_pct_if_skip_all < threshold and classes_in_range > 0:
            sim_d = end_date + timedelta(days=1)
            sim_c = new_conducted
            sim_p = present
            
            classes_per_day = defaultdict(int)
            for slot in subject.timetable_slots:
                classes_per_day[slot.day_of_week.value] += 1
                
            while sim_d <= sem_end_date:
                day_name = DAY_MAP[sim_d.weekday()]
                if day_name in classes_per_day and sim_d not in holidays:
                    day_slots = classes_per_day[day_name]
                    sim_c += day_slots
                    sim_p += day_slots
                    sim_pct = (sim_p / sim_c * 100) if sim_c > 0 else 0
                    if sim_pct >= threshold:
                        recovery_date = sim_d.isoformat()
                        break
                sim_d += timedelta(days=1)

        result.append({
            "subject_id": subject.id,
            "subject_name": subject.name,
            "current_percentage": round(current_pct, 2),
            "classes_in_range": classes_in_range,
            "max_can_skip": max_skip,
            "must_attend": classes_in_range - max_skip,
            "safe_to_take_full_leave": max_skip >= classes_in_range,
            "percentage_if_skip_all": round(new_pct_if_skip_all, 2),
            "recovery_date": recovery_date,
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
