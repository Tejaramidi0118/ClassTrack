from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import secrets
from datetime import date
from database import get_db
from models import User
from schemas import UserRegister, UserLogin
from helpers import hash_password, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register")
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    token = secrets.token_urlsafe(32)
    user = User(email=data.email, name=data.name, password_hash=hash_password(data.password), token=token)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": token, "name": user.name, "email": user.email, "semester_end_date": None}

@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or user.password_hash != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.token:
        user.token = secrets.token_urlsafe(32)
        db.commit()
    return {"token": user.token, "name": user.name, "email": user.email, "semester_end_date": user.semester_end_date.isoformat() if user.semester_end_date else None}

@router.get("/settings")
def get_settings(user: User = Depends(get_current_user)):
    return {"semester_end_date": user.semester_end_date.isoformat() if user.semester_end_date else None}

@router.put("/settings")
def update_settings(data: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if "semester_end_date" in data and data["semester_end_date"]:
        user.semester_end_date = date.fromisoformat(data["semester_end_date"])
    db.commit()
    return {"semester_end_date": user.semester_end_date.isoformat() if user.semester_end_date else None}
