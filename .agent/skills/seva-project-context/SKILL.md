---
name: seva-project-context
description: Load this skill when starting any new task, setting up the project, creating folder structure, configuring environment variables, planning deployment, or whenever you need the overall architecture of SevaSync - the volunteer coordination platform for the Google Solution Challenge 2026.
---

# SevaSync — Project Context

## Product
NGO volunteer coordination platform. Converts incoming community needs into structured requests, prioritizes them, and matches best-fit volunteers using AI. Built for "Smart Resource Allocation: Data-Driven Volunteer Coordination for Social Impact" (Problem 5).

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| Backend | Python 3.11, FastAPI, Uvicorn |
| Database | Google Cloud Firestore (NoSQL) |
| AI | Gemini API — model: `gemini-3-flash-preview`, SDK: `google-genai` |
| Auth | Firebase Auth (email/password) |
| Frontend Deploy | Firebase Hosting or Vercel |
| Backend Deploy | Google Cloud Run (Dockerized) |

## User Roles
- `admin` — coordinator: full access, creates needs, assigns volunteers, views all data
- `volunteer` — views assigned tasks, updates task status
- `field_volunteer` — submit needs only (optional role)

## Folder Structure
```
sevasync/
├── frontend/                  # Next.js app
│   ├── app/                   # App Router pages
│   │   ├── (auth)/            # login, register
│   │   ├── dashboard/         # admin dashboard
│   │   ├── needs/             # needs board + detail
│   │   ├── volunteers/        # volunteer directory
│   │   └── my-tasks/          # volunteer task view
│   ├── components/
│   │   ├── layout/            # Navbar, Sidebar
│   │   ├── dashboard/         # StatsCard, ActivityFeed
│   │   ├── needs/             # NeedCard, NeedForm, MatchList
│   │   ├── volunteers/        # VolunteerCard, SkillBadge
│   │   └── tasks/             # TaskCard, StatusBadge
│   └── lib/
│       ├── firebase.ts        # Firebase client init
│       └── api.ts             # Axios instance to backend
│
├── backend/                   # FastAPI app
│   ├── main.py                # App entrypoint
│   ├── routers/               # needs.py, volunteers.py, tasks.py, auth.py
│   ├── services/              # gemini.py, matching.py, priority.py
│   ├── models/                # Pydantic models
│   ├── firebase_admin.py      # Firestore + Auth admin init
│   ├── requirements.txt
│   └── Dockerfile
│
├── .agent/
│   └── skills/                # all custom skills live here
│
└── IMPLEMENTATION_PLAN.md
```

## Environment Variables

### Backend (Cloud Run secrets / .env)
```
GEMINI_API_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_JSON=   # stringified JSON
```

### Frontend (.env.local)
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_BACKEND_URL=         # Cloud Run URL
```

## Deployment Steps
1. Firebase project → enable Firestore + Auth
2. Backend: `docker build` → push to Artifact Registry → deploy to Cloud Run
3. Frontend: `vercel deploy` or `firebase deploy --only hosting`

## Constraints
- No localStorage/sessionStorage (use in-memory state for auth tokens)
- All Firestore access via backend only (Admin SDK) — never expose service account to frontend
- Gemini output is always shown as suggestion, never auto-applied without coordinator confirmation
