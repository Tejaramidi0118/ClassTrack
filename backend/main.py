from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base

from routers import auth, subjects, timetable, attendance, calendar, projection, notifications

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ClassTrack API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, set this to your Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(timetable.router)
app.include_router(attendance.router)
app.include_router(calendar.router)
app.include_router(projection.router)
app.include_router(notifications.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
