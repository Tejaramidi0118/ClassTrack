from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from database import get_db
from models import User, Subject, AttendanceRecord, TimetableSlot, CalendarEvent
from schemas import AttendanceRecordCreate, AttendanceBackfillCreate
from helpers import get_current_user, get_holiday_dates, DAY_MAP
from datetime import timedelta

router = APIRouter(prefix="/attendance", tags=["attendance"])

@router.get("/today")
def get_today_classes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    today_day = DAY_MAP[today.weekday()]
    holidays = get_holiday_dates(user.id, db)
    is_holiday = today in holidays

    # Check for exam events on this day
    exam_events = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == user.id,
        CalendarEvent.date == today,
        CalendarEvent.event_type == 'exam'
    ).all()
    is_exam = len(exam_events) > 0
    exam_names = [e.name for e in exam_events]
    no_classes = is_holiday or is_exam

    result = []
    for subject in user.subjects:
        slots_today = [s for s in subject.timetable_slots if s.day_of_week.value == today_day]
        if not slots_today:
            continue
        for slot in slots_today:
            record = db.query(AttendanceRecord).filter(
                AttendanceRecord.subject_id == subject.id,
                AttendanceRecord.slot_id == slot.id,
                AttendanceRecord.date == today
            ).first()
            result.append({
                "subject_id": subject.id,
                "subject_name": subject.name,
                "slot_id": slot.id,
                "slot_time": slot.slot_time,
                "status": record.status if record else ("holiday" if no_classes else None),
                "record_id": record.id if record else None
            })
    return {"date": today.isoformat(), "is_holiday": is_holiday, "is_exam": is_exam, "exam_names": exam_names, "classes": result}

@router.get("/date/{date_str}")
def get_classes_for_date(date_str: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        target_date = date.fromisoformat(date_str)
    except:
        raise HTTPException(status_code=400, detail="Invalid date format")
    target_day = DAY_MAP[target_date.weekday()]
    holidays = get_holiday_dates(user.id, db)
    is_holiday = target_date in holidays

    # Check for exam events on this day
    exam_events = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == user.id,
        CalendarEvent.date == target_date,
        CalendarEvent.event_type == 'exam'
    ).all()
    is_exam = len(exam_events) > 0
    exam_names = [e.name for e in exam_events]
    no_classes = is_holiday or is_exam

    result = []
    for subject in user.subjects:
        slots = [s for s in subject.timetable_slots if s.day_of_week.value == target_day]
        if not slots:
            continue
        for slot in slots:
            record = db.query(AttendanceRecord).filter(
                AttendanceRecord.subject_id == subject.id,
                AttendanceRecord.slot_id == slot.id,
                AttendanceRecord.date == target_date
            ).first()
            result.append({
                "subject_id": subject.id,
                "subject_name": subject.name,
                "slot_id": slot.id,
                "slot_time": slot.slot_time,
                "status": record.status if record else ("holiday" if no_classes else None),
                "record_id": record.id if record else None
            })
    return {"date": target_date.isoformat(), "is_holiday": is_holiday, "is_exam": is_exam, "exam_names": exam_names, "classes": result}

@router.post("")
def mark_attendance(data: AttendanceRecordCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == data.subject_id, Subject.user_id == user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Query by subject_id + slot_id + date for per-slot tracking
    query = db.query(AttendanceRecord).filter(
        AttendanceRecord.subject_id == data.subject_id,
        AttendanceRecord.date == data.date
    )
    if data.slot_id:
        query = query.filter(AttendanceRecord.slot_id == data.slot_id)
    
    record = query.first()
    if record:
        record.status = data.status
    else:
        record = AttendanceRecord(
            subject_id=data.subject_id,
            slot_id=data.slot_id,
            date=data.date,
            status=data.status
        )
        db.add(record)
    db.commit()
    return {"ok": True, "status": data.status}

@router.delete("")
def unmark_attendance(data: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == data.get("subject_id"), Subject.user_id == user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    query = db.query(AttendanceRecord).filter(
        AttendanceRecord.subject_id == data["subject_id"],
        AttendanceRecord.date == data["date"]
    )
    if data.get("slot_id"):
        query = query.filter(AttendanceRecord.slot_id == data["slot_id"])
    
    record = query.first()
    if record:
        db.delete(record)
        db.commit()
    return {"ok": True}

@router.post("/backfill")
def backfill_attendance(data: AttendanceBackfillCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == data.subject_id, Subject.user_id == user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    slots = db.query(TimetableSlot).filter(TimetableSlot.subject_id == subject.id).all()
    if not slots:
        raise HTTPException(status_code=400, detail="Cannot backfill history without a saved timetable.")
        
    slots_by_day = {}
    for slot in slots:
        if slot.day_of_week.value not in slots_by_day:
            slots_by_day[slot.day_of_week.value] = []
        slots_by_day[slot.day_of_week.value].append(slot)
    
    holidays = db.query(CalendarEvent).filter(
        CalendarEvent.user_id == user.id,
        CalendarEvent.event_type == 'holiday',
        CalendarEvent.date >= data.start_date,
        CalendarEvent.date <= data.end_date
    ).all()
    holiday_dates = {holiday.date for holiday in holidays}

    new_records = []
    current_date = data.start_date
    while current_date <= data.end_date:
        weekday_name = current_date.strftime('%A').lower()
        if weekday_name in slots_by_day and current_date not in holiday_dates:
            for slot in slots_by_day[weekday_name]:
                new_records.append(AttendanceRecord(
                    subject_id=subject.id,
                    slot_id=slot.id,
                    date=current_date,
                    status=data.status
                ))
        current_date += timedelta(days=1)
    
    if not new_records:
        return {"message": "No valid classes found.", "count": 0}

    db.query(AttendanceRecord).filter(
        AttendanceRecord.subject_id == subject.id,
        AttendanceRecord.date >= data.start_date,
        AttendanceRecord.date <= data.end_date
    ).delete(synchronize_session=False)

    db.bulk_save_objects(new_records)
    db.commit()

    return {"message": f"Successfully backfilled {len(new_records)} classes.", "count": len(new_records)}
