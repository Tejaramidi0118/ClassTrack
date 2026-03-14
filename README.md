# Attendr — Smart Attendance Tracker

> Track smart. Skip less.

A full-stack attendance tracking web app built for college students. Per-subject tracking with timetable integration, daily attendance marking, forward projection, and a holiday planner that tells you exactly how many classes you can safely skip.

---

## Features

- **Per-subject tracking** — separate thresholds per course
- **Timetable setup** — map each subject to days/times; attendance auto-populates
- **Daily marking** — mark Present / Absent / Cancelled per class per day, any date
- **Projection engine** — given a semester end date, tells you how many more you can skip (or must attend)
- **Holiday planner** — pick a date range, get a verdict: safe to leave or not, per subject
- **Academic calendar** — add holidays (auto-excluded from conducted count), exams, events
- **Auth** — email/password, token-based, multi-user

---

## Tech Stack

| Layer     | Tech                            |
|-----------|---------------------------------|
| Frontend  | React 18, React Router, Recharts, Lucide, date-fns |
| Backend   | FastAPI, SQLAlchemy, Pydantic   |
| Database  | SQLite (dev) / PostgreSQL (prod)|
| Deploy    | Docker Compose                  |

---

## Quick Start

### Option 1 — Docker Compose (Recommended)

```bash
git clone <repo>
cd attendance-tracker
docker compose up
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2 — Manual

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8000 npm start
```

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get token |
| GET/POST | `/subjects` | List / create subjects |
| POST | `/subjects/:id/timetable` | Add timetable slot |
| GET | `/attendance/today` | Today's scheduled classes |
| GET | `/attendance/date/:date` | Classes for any date |
| POST | `/attendance` | Mark attendance |
| GET/POST | `/calendar` | Calendar events (holidays etc.) |
| GET | `/projection?end_date=` | Forward attendance projection |
| GET | `/projection/holiday-plan?start=&end=` | Safe-to-leave checker |

Full interactive docs at `/docs` when backend is running.

---

## Projection Logic

**Can I skip X classes?**
```
present + remaining_classes - threshold/100 * (conducted + remaining_classes) = max_skippable
```

**How many must I attend?**
```
x = ceil((threshold/100 * conducted - present) / (1 - threshold/100))
```

**Holiday plan verdict:**
For each subject, calculates attendance % if all classes in the leave period are missed. If any subject drops below threshold, the leave is flagged as unsafe with per-subject details.

---

## Folder Structure

```
attendance-tracker/
├── backend/
│   ├── main.py          # All routes, models, logic
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/  # SubjectCard, TodayPanel, TimetableModal, etc.
│   │   ├── pages/       # Dashboard, ProjectionPage, CalendarPage, AuthPage
│   │   ├── context/     # AuthContext
│   │   ├── utils/       # axios api.js
│   │   └── App.js / App.css
│   └── Dockerfile
└── docker-compose.yml
```

---

## Production Notes

- Replace SQLite with PostgreSQL (update `DATABASE_URL` env var)
- Move auth tokens to JWT with expiry for real use
- Add HTTPS via nginx reverse proxy
- Set `REACT_APP_API_URL` env to your deployed backend URL
