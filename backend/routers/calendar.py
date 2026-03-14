from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, CalendarEvent
from schemas import CalendarEventCreate
from helpers import get_current_user

router = APIRouter(prefix="/calendar", tags=["calendar"])

@router.get("")
def get_calendar(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    events = db.query(CalendarEvent).filter(CalendarEvent.user_id == user.id).all()
    return [{"id": e.id, "date": e.date.isoformat(), "name": e.name, "event_type": e.event_type} for e in events]

@router.post("")
def add_calendar_event(data: CalendarEventCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = CalendarEvent(user_id=user.id, date=data.date, name=data.name, event_type=data.event_type)
    db.add(event)
    db.commit()
    db.refresh(event)
    return {"id": event.id, "date": event.date.isoformat(), "name": event.name, "event_type": event.event_type}

@router.delete("/{event_id}")
def delete_calendar_event(event_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id, CalendarEvent.user_id == user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(event)
    db.commit()
    return {"ok": True}
