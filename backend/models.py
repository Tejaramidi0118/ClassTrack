import enum
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Enum as SAEnum, Boolean, DateTime
from sqlalchemy.orm import relationship, declarative_base
from datetime import date, datetime
from database import Base

class DayOfWeek(str, enum.Enum):
    monday = "monday"
    tuesday = "tuesday"
    wednesday = "wednesday"
    thursday = "thursday"
    friday = "friday"
    saturday = "saturday"
    sunday = "sunday"

class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    cancelled = "cancelled"
    holiday = "holiday"

class CalendarEventType(str, enum.Enum):
    holiday = "holiday"
    exam = "exam"
    event = "event"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    password_hash = Column(String)
    token = Column(String, unique=True, index=True, nullable=True)
    semester_end_date = Column(Date, nullable=True)
    subjects = relationship("Subject", back_populates="user", cascade="all, delete-orphan")
    calendar_events = relationship("CalendarEvent", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    message = Column(String)
    type = Column(String) # 'warning', 'reminder', 'info'
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="notifications")

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    threshold = Column(Float, default=75.0)
    baseline_conducted = Column(Integer, default=0)
    baseline_present = Column(Integer, default=0)
    user = relationship("User", back_populates="subjects")
    timetable_slots = relationship("TimetableSlot", back_populates="subject", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="subject", cascade="all, delete-orphan")

class TimetableSlot(Base):
    __tablename__ = "timetable_slots"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    day_of_week = Column(SAEnum(DayOfWeek))
    slot_time = Column(String, nullable=True)
    duration_minutes = Column(Integer, default=50)
    subject = relationship("Subject", back_populates="timetable_slots")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    slot_id = Column(Integer, ForeignKey("timetable_slots.id"), nullable=True)
    date = Column(Date)
    status = Column(SAEnum(AttendanceStatus))
    subject = relationship("Subject", back_populates="attendance_records")

class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date)
    name = Column(String)
    event_type = Column(SAEnum(CalendarEventType))
    user = relationship("User", back_populates="calendar_events")
