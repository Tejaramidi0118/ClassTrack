from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Subject, TimetableSlot
from schemas import TimetableSlotCreate, TimetableBulkSave
from helpers import get_current_user

router = APIRouter(prefix="/timetable", tags=["timetable"])

@router.post("/subjects/{subject_id}/timetable")
def add_timetable_slot(subject_id: int, data: TimetableSlotCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.user_id == user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Not found")
    slot = TimetableSlot(subject_id=subject_id, day_of_week=data.day_of_week, slot_time=data.slot_time)
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return {"id": slot.id, "day_of_week": slot.day_of_week, "slot_time": slot.slot_time}

@router.post("/bulk-save")
def bulk_save_timetable(data: TimetableBulkSave, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_subjects = {s.name.lower().strip(): s for s in user.subjects}
    created_count = 0
    slot_count = 0
    
    for item in data.slots:
        sub_key = item.subject_name.lower().strip()
        if sub_key not in user_subjects:
            new_sub = Subject(user_id=user.id, name=item.subject_name, threshold=75.0)
            db.add(new_sub)
            db.commit()
            db.refresh(new_sub)
            user_subjects[sub_key] = new_sub
            created_count += 1
            
        subject = user_subjects[sub_key]
        
        existing = db.query(TimetableSlot).filter(
            TimetableSlot.subject_id == subject.id,
            TimetableSlot.day_of_week == item.day_of_week,
            TimetableSlot.slot_time == item.slot_time
        ).first()
        
        if not existing:
            slot = TimetableSlot(subject_id=subject.id, day_of_week=item.day_of_week, slot_time=item.slot_time)
            db.add(slot)
            slot_count += 1
            
    db.commit()
    return {"message": f"Created {created_count} new subjects and {slot_count} timetable slots."}

@router.delete("/{slot_id}")
def delete_timetable_slot(slot_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    slot = db.query(TimetableSlot).join(Subject).filter(TimetableSlot.id == slot_id, Subject.user_id == user.id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(slot)
    db.commit()
    return {"ok": True}
