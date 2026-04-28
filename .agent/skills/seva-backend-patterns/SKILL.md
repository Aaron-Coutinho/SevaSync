---
name: seva-backend-patterns
description: Load this skill when building any FastAPI endpoint, backend service, Python business logic, Gemini AI integration, priority scoring, volunteer matching engine, or Firestore CRUD operations in SevaSync backend.
---

# SevaSync — Backend Patterns

## FastAPI App Structure
- FastAPI app must be initialized with `redirect_slashes=False` to prevent trailing slash redirects breaking routes
```
backend/
├── main.py           # FastAPI app, include all routers, CORS
├── firebase_admin.py # init firebase_admin with service account
├── dependencies.py   # get_current_user(), verify_admin()
├── routers/
│   ├── auth.py       # POST /auth/verify-token
│   ├── needs.py      # CRUD + analyze + match endpoints
│   ├── volunteers.py # CRUD volunteer profiles
│   └── tasks.py      # assignment create/update
├── services/
│   ├── gemini.py     # all Gemini API calls
│   ├── priority.py   # priority score computation
│   └── matching.py   # volunteer matching algorithm
├── models/           # Pydantic request/response models
└── Dockerfile
```

## Auth Pattern
- Frontend sends Firebase ID token in `Authorization: Bearer <token>` header
- Backend verifies with `firebase_admin.auth.verify_id_token(token)`
- `get_current_user()` dependency extracts uid + role from decoded token
- `verify_admin()` dependency raises 403 if role != admin
- `POST /auth/verify-token` must fetch the users Firestore document to resolve the latest role and organization, never trust JWT claims alone for role

## API Endpoints

### Needs
```
POST   /needs                  → create + trigger gemini analysis
GET    /needs                  → list all (filters: status, urgency, category)
GET    /needs/{id}             → single need with AI analysis
PATCH  /needs/{id}             → update status/fields
POST   /needs/{id}/analyze     → re-run Gemini analysis
GET    /needs/{id}/suggestions → get match_suggestions for need
POST   /needs/{id}/assign      → create assignment (body: volunteerId)
```

### Volunteers
```
POST   /volunteers             → create volunteer profile
GET    /volunteers             → list all (filters: skill, status, area)
GET    /volunteers/{uid}       → single volunteer profile
PUT    /volunteers/{uid}       → update profile
GET    /volunteers/{uid}/tasks → task history
```

### Tasks / Assignments
```
GET    /assignments            → list (filters: volunteerId, needId, status)
GET    /assignments/{id}       → single assignment
PATCH  /assignments/{id}       → update status (volunteer or admin)
```

### Analytics
```
GET    /analytics/summary      → counts: total needs, urgent, assigned, completed
GET    /analytics/volunteer-load → per-volunteer task count
GET    /analytics/category-breakdown → count by category
```

## Gemini Service Pattern

**Model:** `gemini-3-flash-preview`
**SDK:** `pip install google-genai`

### Need Analysis (primary use)
Input: raw free-text description from coordinator/volunteer
Output: structured JSON with category, urgency, skills, summary, vulnerableGroup flag

Gemini prompt strategy:
- System instruction sets the role as "structured data extraction assistant"
- Use `response_schema` (structured output) so response is always parseable JSON
- Never use raw text output for analysis — always structured output mode
- If Gemini fails or returns unexpected data → fall back to storing raw input and flagging for manual review

### Match Explanation (secondary use)
After scoring, send top 3 candidate profiles + need details to Gemini
Ask: "In one short sentence each, explain why this volunteer is a good match for this need."
Returns: plain text reasons per volunteer
Do NOT use Gemini for the actual scoring — scoring is deterministic (see below)

## Priority Score Algorithm
Computed deterministically (no AI). Higher score = more urgent.

```
priorityScore = (
  urgency_weight          # critical=100, high=75, medium=40, low=15
  + min(beneficiaryCount * 2, 30)  # cap at 30
  + (vulnerableGroup ? 20 : 0)
  + request_age_bonus     # +5 for every 6h unassigned, max 20
)
```
Store computed score in `needs.priorityScore`. Re-compute on status change.

## Matching Algorithm
Computed deterministically. Returns top 3 volunteers sorted by matchScore.

For each available volunteer (status=available, activeTaskCount < maxActiveTasks):
```
matchScore = 0
+ skill_overlap_count * 20     # each matching skill = 20pts, max 60
+ (area_match ? 15 : 0)
+ (time_available ? 10 : 0)    # estimated hours fit in their availability
+ (language_match ? 5 : 0)
+ workload_score               # (maxActiveTasks - activeTaskCount) * 3, max 9
+ (rating * 2)                 # max 10 pts
```

Return list sorted by matchScore descending. Store in `match_suggestions` collection.

## Firestore Access Pattern
- Use `firebase_admin.firestore.client()` initialized once at startup
- Always use batch writes for multi-doc updates (e.g., assigning volunteer: update need status + create assignment + update volunteer activeTaskCount + write activity log — all in one batch)
- Use `firestore.SERVER_TIMESTAMP` for all timestamp fields
- All Firestore `.where()` must use `filter=firestore.FieldFilter(field, op, value)` syntax, never positional arguments
- Never use `.order_by()` on fields that differ from the `.where()` field — sort results in Python using `list.sort()` instead to avoid composite index crashes

## Error Handling
- 401 → invalid/expired token
- 403 → role not authorized
- 404 → document not found in Firestore
- 422 → Pydantic validation error (auto-handled by FastAPI)
- 500 → Gemini API failure or Firestore write failure (log + return fallback)

## Dockerfile
```
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```
Cloud Run expects port 8080 by default.

## Seed Data Command
Create a `seed.py` script in backend root:
- Creates 1 admin user, 10 volunteers (varied skills/areas)
- Creates 12 needs (3 critical, 3 high, 4 medium, 2 low)
- Creates 3 completed assignments (for dashboard to look active)
- Run with: `python seed.py`
