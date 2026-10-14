# Smart Classroom & Timetable Scheduler — Architecture

This document describes the browser UI, Express API, MongoDB persistence, and the API contract.

## System overview

```
Browser (HTML/CSS/vanilla JS)
        │  fetch + in-memory access token
        │  refresh cookie (HttpOnly, set by API)
        ▼
Express (Node)  ── serves /public  +  REST /api/*
        │
        ├── Authentication — bcrypt password hashes, JWT access tokens, refresh cookies
        ├── MongoDB — users, institution catalog, timetable, leave, audit and notification data
        └── Scheduler — greedy hard-constraint placement and leave substitution
```

- Access token: **memory only** (`API.accessToken`). Never `localStorage`.
- Refresh token: **httpOnly cookie** (backend). Frontend retries on 401 via `js/api.js`.
- `server.js` serves `/public`, protects role-specific HTML routes using the refresh cookie, and mounts `/api`.
- API handlers enforce JWT authentication and roles; hiding links in the UI is not authorization.
- Admin creates and manages divisions as batches. Student onboarding displays the divisions that exist in this catalog.

## Run locally

1. Install Node.js 20 or newer and start MongoDB.
2. Copy `.env.example` to `.env`; set `MONGODB_URI` and different random access/refresh secrets.
3. Run `npm install`, then `npm start` (or `npm run dev` while developing).
4. Open `http://localhost:5000`.

Development mode seeds the demo catalog and these accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@smart.edu` | `Admin@123` |
| Faculty | `faculty@smart.edu` | `Faculty@123` |
| Student | `student@smart.edu` | `Student@123` |
| First-login student | `newstudent@smart.edu` | `Student@123` |

These credentials are only seeded outside production. An empty production database requires `ADMIN_EMAIL` and `ADMIN_PASSWORD`; public registration cannot create administrators. Do not use the demo credentials in a deployed environment.

## Role access

| Role    | `/admin/*` | `/faculty/*` | `/student/*` | APIs |
|---------|------------|--------------|--------------|------|
| Admin   | yes        | yes          | yes          | all matching role |
| Faculty | 403        | yes          | yes          | faculty + student self |
| Student | 403        | 403          | yes          | student self only |

Student first login: `isProfileComplete === false` → `/student/onboarding.html`.  
Returning student: straight to `/student/dashboard.html`.

## Project structure

```
mini Project/
  .env.example
  package.json
  server.js                     ← Express entry point and protected static routes
  server/                       ← MongoDB models, seed data, and API routes
  docs/architecture.md
  assets/                       ← source illustrations
  public/                       ← Express static root
    index.html                  landing
    login.html, signup.html, 403.html
    css/                        base, layout, components, landing, login, signup,
                                onboarding, workspace, app-pages, shared
    js/                         api, auth, guard, ui, shared, demo-store,
                                login, signup, admin, faculty, student,
                                onboarding-flow, shell
    admin/                      dashboard, institution, teachers, subjects,
                                rooms, timetable, leaves
    faculty/dashboard.html
    student/onboarding.html, dashboard.html
    assets/images/
```

The frontend keeps its access token in memory and uses an HttpOnly refresh cookie. The browser demo store remains an offline fallback only; API authorization or validation errors are shown and do not silently fall back to demo actions.

MongoDB stores users in `User` and catalog/schedule records in `AppData`, keyed by collection and record id. Application passwords are bcrypt-hashed. Logout revokes the user's token version and clears the refresh cookie.

## ER (logical)

```
User 1──1 FacultyProfile
User 1──1 StudentProfile  (isProfileComplete, rollNumber unique per institution, batchId)
Role *──* User
Institution 1──* Department 1──* Program 1──* Batch
Department 1──* Subject *──* Faculty  *──* Availability
Batch *──* Subject
Room (classroom | laboratory | lecture_hall)
TimeSlot (working days, lunch, short break)
TimetableEntry (day, start, end, subject, faculty, room, batch, published)
LeaveRequest 1──* Substitution
Notification, AuditLog
```

Student fields (spec §9): userId, name, email, passwordHash, rollNumber, department, year/class, division, practicalBatch, academicYear, semester, batchId, isProfileComplete (default false), createdAt, lastLoginAt.

## API

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`

### Student
- `POST /api/student/onboarding` — blocked if profile already complete
- `GET /api/student/profile`
- `PUT /api/student/profile` — user id from JWT only
- `GET /api/student/timetable` — **403** if `isProfileComplete` is false
- `GET /api/student/dashboard/stats`
- `GET /api/student/options` — departments, programs, batches, periods and institution settings for onboarding

### Faculty
- `GET /api/faculty/dashboard/stats`
- `GET /api/faculty/timetable`
- `POST /api/faculty/leaves`
- `GET /api/faculty/leaves`

### Admin catalog
- CRUD `/api/admin/departments|programs|batches|faculty|subjects|rooms|time-slots`
- `GET /api/admin/bootstrap` — admin workspace data
- `GET|PUT /api/admin/institution` — institution period settings
- `GET /api/admin/dashboard/stats`
- `POST /api/admin/timetable/generate`
- `GET /api/admin/timetable/preview`
- `PUT /api/admin/timetable/preview/:id` — conflict-checked preview drag-and-drop
- `POST /api/admin/timetable/publish`
- CRUD `/api/admin/timetable`
- `GET /api/admin/leaves`; `POST /api/admin/leaves/:id/approve|reject`
- `POST /api/admin/faculty/:id/approve`
- `GET /api/admin/audit-logs`

### Shared
- `GET /api/notifications`
- `PUT /api/notifications/:id/read`
- `GET /api/health`

JSON shape (login success): `{ accessToken, user: { id, name, email, role, isProfileComplete, isApproved, batchId } }`.

The admin UI loads and persists catalog, institution, leave, and timetable changes through the API. Saving period settings rebuilds backend time slots; timetable generation creates a draft preview, which must be explicitly published. Generation reports sessions it could not place. Student and faculty views load their published timetable from the API.
