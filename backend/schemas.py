from pydantic import BaseModel
from typing import List, Optional
from datetime import date
from models import DayOfWeek, AttendanceStatus, CalendarEventType
from datetime import datetime

class UserRegister(BaseModel):
    email: str
    name: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class SubjectCreate(BaseModel):
    name: str
    threshold: float = 75.0
    baseline_conducted: int = 0
    baseline_present: int = 0

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    threshold: Optional[float] = None
    baseline_conducted: Optional[int] = None
    baseline_present: Optional[int] = None

class TimetableSlotCreate(BaseModel):
    day_of_week: DayOfWeek
    slot_time: Optional[str] = None
    duration_minutes: int = 60

class TimetableBulkSlot(BaseModel):
    subject_name: str
    day_of_week: DayOfWeek
    slot_time: str
    duration_minutes: int = 60

class TimetableBulkSave(BaseModel):
    slots: List[TimetableBulkSlot]

class AttendanceRecordCreate(BaseModel):
    subject_id: int
    slot_id: Optional[int] = None
    date: date
    status: AttendanceStatus


class AttendanceBackfillCreate(BaseModel):
    subject_id: int
    start_date: date
    end_date: date
    status: AttendanceStatus

class CalendarEventCreate(BaseModel):
    date: date
    name: str
    event_type: CalendarEventType

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str # 'warning', 'reminder', 'info'
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
