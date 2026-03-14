from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Subject
from schemas import SubjectCreate, SubjectUpdate
from helpers import get_current_user, get_holiday_dates, calculate_attendance_stats

router = APIRouter(prefix="/subjects", tags=["subjects"])

@router.get("")
def get_subjects(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    holidays = get_holiday_dates(user.id, db)
    result = []
    for s in user.subjects:
        conducted, present, pct = calculate_attendance_stats(s, holidays)
        result.append({
            "id": s.id, "name": s.name, "threshold": s.threshold,
            "conducted": conducted, "present": present, "percentage": pct,
            "baseline_conducted": s.baseline_conducted or 0,
            "baseline_present": s.baseline_present or 0,
            "timetable_slots": [{"id": sl.id, "day_of_week": sl.day_of_week, "slot_time": sl.slot_time} for sl in s.timetable_slots]
        })
    return result

@router.post("")
def create_subject(data: SubjectCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = Subject(user_id=user.id, name=data.name, threshold=data.threshold, baseline_conducted=data.baseline_conducted, baseline_present=data.baseline_present)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return {"id": subject.id, "name": subject.name, "threshold": subject.threshold, "conducted": subject.baseline_conducted, "present": subject.baseline_present, "percentage": 0, "timetable_slots": []}

@router.put("/{subject_id}")
def update_subject(subject_id: int, data: SubjectUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if data.name is not None: subject.name = data.name
    if data.threshold is not None: subject.threshold = data.threshold
    if data.baseline_conducted is not None: subject.baseline_conducted = data.baseline_conducted
    if data.baseline_present is not None: subject.baseline_present = data.baseline_present
    db.commit()
    return {"id": subject.id, "name": subject.name, "threshold": subject.threshold, "baseline_conducted": subject.baseline_conducted or 0, "baseline_present": subject.baseline_present or 0}

@router.delete("/{subject_id}")
def delete_subject(subject_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(subject)
    db.commit()
    return {"ok": True}
