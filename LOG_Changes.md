# SevaSync — Change Log

---
## [Phase 1 — Foundation] | 25 Apr 2026, 22:04 IST

**Prompt Summary:** Set up the complete SevaSync project skeleton for frontend and backend including all required files and placeholders.

**Files Created:**
- `.env.local`
- `.env`
- `frontend/app/layout.tsx`
- `frontend/app/page.tsx`
- `frontend/app/(auth)/login/page.tsx`
- `frontend/app/(auth)/register/page.tsx`
- `frontend/app/dashboard/page.tsx`
- `frontend/app/needs/page.tsx`
- `frontend/app/needs/[id]/page.tsx`
- `frontend/app/volunteers/page.tsx`
- `frontend/app/volunteers/[id]/page.tsx`
- `frontend/app/my-tasks/page.tsx`
- `frontend/tailwind.config.ts`
- `frontend/app/globals.css`
- `frontend/lib/firebase.ts`
- `frontend/lib/api.ts`
- `frontend/components/layout/index.ts`
- `frontend/components/dashboard/index.ts`
- `frontend/components/needs/index.ts`
- `frontend/components/volunteers/index.ts`
- `frontend/components/tasks/index.ts`
- `backend/main.py`
- `backend/routers/__init__.py`
- `backend/routers/needs.py`
- `backend/routers/volunteers.py`
- `backend/routers/tasks.py`
- `backend/routers/auth.py`
- `backend/services/__init__.py`
- `backend/services/gemini.py`
- `backend/services/priority.py`
- `backend/services/matching.py`
- `backend/firebase_admin.py`
- `backend/dependencies.py`
- `backend/models/__init__.py`
- `backend/requirements.txt`
- `backend/Dockerfile`
- `create_skeleton.py` (Script used to build structure)

**Files Modified:**
- `LOG_Changes.md`

**Files Deleted:** 
- None

**Status:** ✅ Complete
---

---
## [Phase 1 — Pydantic Models + Auth Infrastructure] | 25 Apr 2026, 22:09 IST

**Prompt Summary:** Build all Pydantic models in backend/models/, fully implement firebase_admin.py and dependencies.py.

**Files Created:**
- `backend/models/user.py` — UserRole enum, UserCreate, UserUpdate, UserResponse
- `backend/models/volunteer.py` — SkillTag, VolunteerStatus, PreferredTime enums; VolunteerLocation, VolunteerAvailability nested models; VolunteerCreate, VolunteerUpdate, VolunteerResponse
- `backend/models/need.py` — NeedCategory, NeedUrgency, NeedStatus enums; NeedLocation nested; NeedCreate, NeedUpdate, NeedResponse
- `backend/models/assignment.py` — AssignmentStatus enum; AssignmentCreate, AssignmentUpdate, AssignmentResponse; VolunteerSuggestion, MatchSuggestionResponse sub-models
- `backend/models/activity_log.py` — ActivityEntityType enum; ActivityLogCreate, ActivityLogResponse (immutable, no update schema)
- `backend/models/analytics.py` — AnalyticsSummaryResponse, VolunteerLoadItem/Response, CategoryBreakdownItem/Response for all 3 analytics endpoints

**Files Modified:**
- `backend/models/__init__.py` — updated to barrel-export all models and enums
- `backend/firebase_admin.py` — implemented full Firebase Admin SDK init from FIREBASE_SERVICE_ACCOUNT_JSON env var; exposes `db` (Firestore client) and `auth` (firebase_auth module) as module-level singletons
- `backend/dependencies.py` — implemented get_current_user() (Bearer token verification via firebase_auth.verify_id_token(), returns uid + role + email dict); verify_admin() (raises HTTP 403 if role != admin)
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Phase 1 — Service Layer Implementation] | 25 Apr 2026, 22:16 IST

**Prompt Summary:** Implement all 3 service files fully: priority scoring, volunteer matching engine, and Gemini AI integration.

**Files Created:** None

**Files Modified:**
- `backend/services/priority.py` — implemented compute_priority_score(need) with exact weights (critical=100, high=75, medium=40, low=15), beneficiary bonus min(count*2, 30), vulnerable group +20, age bonus +5/6h unassigned capped at 20; Firestore Timestamp + datetime handling
- `backend/services/matching.py` — implemented compute_match_score(need, volunteer) with all 6 weighted factors (skill overlap max 60, area +15, time +10, language +5, workload max 9, rating max 10); implemented get_top_matches(need, volunteers) with eligibility filter (status==available AND activeTaskCount<maxActiveTasks), returns top 3 sorted by score with human-readable reasons
- `backend/services/gemini.py` — implemented analyze_need(raw_description) using google-genai SDK + structured output mode (response_json_schema via Pydantic NeedAnalysisSchema) returning all required fields with enum-constrained category/urgency/skills; implemented explain_matches(need, top_matches) returning 3 sentence explanations as JSON array; lazy client singleton; try/except on both functions returning None on failure with logged error
- `backend/services/__init__.py` — barrel-export for all 5 public service functions
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Phase 1 — Core Routers: main.py, auth, volunteers] | 25 Apr 2026, 23:29 IST

**Prompt Summary:** Fully implement main.py, routers/auth.py, and routers/volunteers.py with all Firestore writes, activity logging, and batch writes.

**Files Created:**
- `backend/routers/analytics.py` — stub router with correct response models and admin guard for all 3 analytics endpoints; ready for full implementation

**Files Modified:**
- `backend/main.py` — FastAPI app with CORS (all origins, prototype mode), all 5 routers included (auth /auth, needs /needs, volunteers /volunteers, tasks /assignments, analytics /analytics), GET / health check returning {"status":"ok","app":"SevaSync"}
- `backend/routers/auth.py` — POST /auth/register (creates Firestore user doc, sets Firebase custom role claim, activity log); POST /auth/verify-token (returns current user dict from token); POST /auth/volunteer-profile (creates Firestore volunteer doc with backend-enforced defaults: activeTaskCount=0, totalCompleted=0, status=available, verified=False, uses SERVER_TIMESTAMP for joinedAt, writes activity log)
- `backend/routers/volunteers.py` — GET /volunteers (admin only, Firestore stream with skill/status array_contains + area Python filter); GET /volunteers/{uid} (admin or own uid check, 404 on not found); PUT /volunteers/{uid} (own uid only, partial update via batch write: volunteer doc update + activity log on status change committed atomically); GET /volunteers/{uid}/tasks (admin or own, query assignments collection by volunteerId ordered by assignedAt desc)
- `backend/routers/__init__.py` — updated to import and export all 5 router modules including analytics
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Remaining Routers: needs, tasks, analytics] | 25 Apr 2026, 23:41 IST

**Prompt Summary:** Fully implement routers/needs.py (7 endpoints), routers/tasks.py (3 endpoints), and replace analytics.py stub with full implementation (3 endpoints).

**Files Created:** None

**Files Modified:**
- `backend/routers/needs.py` — 7 endpoints: POST / (create need + synchronous Gemini analysis + priority scoring + activity log), GET / (list with status/urgency/category filters, sorted by priorityScore desc), GET /{id} (single need, 404), PATCH /{id} (partial update, auto-recompute priorityScore if urgency/beneficiaryCount/vulnerableGroup changed, batch write + activity log on status change), POST /{id}/analyze (re-run Gemini on rawDescription, update AI fields + priority), GET /{id}/suggestions (fetch all volunteers, deterministic get_top_matches, Gemini explain_matches, persist to match_suggestions collection, return MatchSuggestionResponse), POST /{id}/assign (batch write: create assignment doc + update need status to assigned + increment volunteer activeTaskCount + set busy if at max + activity log)
- `backend/routers/tasks.py` — 3 endpoints: GET / (admin only, filter by volunteerId/needId/status), GET /{id} (admin or own volunteer), PATCH /{id} (enforced state machine: assigned→accepted|declined, accepted→started, started→completed; declined decrements activeTaskCount + re-opens need to pending_assignment; completed decrements activeTaskCount + increments totalCompleted + sets volunteer available if free + updates need to completed; all transitions use batch writes + activity log)
- `backend/routers/analytics.py` — replaced stub with full Firestore aggregation: GET /summary (totalNeeds, urgentNeeds as critical+high unassigned, assignedNeeds, completedNeeds, unassignedNeeds, activeVolunteers, avgAssignmentTimeHours), GET /volunteer-load (streams volunteers + users collections for name lookup, returns per-volunteer activeTaskCount/completedTaskCount/status), GET /category-breakdown (groups needs by category with total + completed counts, sorted desc)
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Frontend Foundation: Auth, Layout, Shared Components, API] | 25 Apr 2026, 23:52 IST

**Prompt Summary:** Build all frontend foundation — Firebase/Axios setup, AuthContext, layout shell components, shared UI badges, login/register pages.

**Files Created:**
- `frontend/contexts/AuthContext.tsx` — AuthProvider with onAuthStateChanged listener, POST /auth/verify-token role fetch, user/role/token/loading/isAdmin state, login()/logout() helpers
- `frontend/components/layout/AppShell.tsx` — combined Sidebar + Navbar + BottomTabBar wrapper for all protected pages
- `frontend/components/layout/BottomTabBar.tsx` — mobile-only fixed bottom nav with role-based tabs and active highlighting
- `frontend/components/dashboard/StatsCard.tsx` — KPI card with icon, large number, label, sublabel, and configurable icon color
- `frontend/components/needs/UrgencyBadge.tsx` — colored badge with exact critical/high/medium/low colors from skill
- `frontend/components/tasks/StatusBadge.tsx` — badge covering all need and assignment statuses with exact color mapping
- `frontend/components/volunteers/SkillBadge.tsx` — teal pill badge for volunteer skill tags
- `frontend/lib/utils.ts` — cn() utility using clsx + tailwind-merge
- `frontend/package.json` — Next.js 14, Firebase 10, Axios, Lucide, clsx, tailwind-merge
- `frontend/tsconfig.json` — TypeScript config with @/* path alias

**Files Modified:**
- `frontend/lib/firebase.ts` — Firebase app init from env vars; exports auth, signInWithEmail, createUserWithEmailAndPassword, signOut, onAuthStateChanged, getCurrentUserToken
- `frontend/lib/api.ts` — Axios instance with baseURL from NEXT_PUBLIC_BACKEND_URL, request interceptor (Bearer token), response interceptor (401 → signOut + redirect /login), typed get/post/patch/put/del helpers
- `frontend/app/layout.tsx` — root layout wrapping app in AuthProvider, Inter font, SEO metadata
- `frontend/app/globals.css` — Tailwind directives, Inter font variable, 16px input font-size (iOS zoom fix)
- `frontend/tailwind.config.ts` — content paths for app/components/contexts/lib, Inter font family, full teal color palette
- `frontend/components/layout/Sidebar.tsx` — desktop-only (hidden lg:flex), role-based nav links, active state via usePathname, teal brand color
- `frontend/components/layout/Navbar.tsx` — user avatar with initials, role label, logout button, mobile hamburger drawer with Sidebar content
- `frontend/components/layout/ProtectedRoute.tsx` — full-page spinner on loading, redirect /login if unauthenticated, redirect to role default if wrong role
- `frontend/app/(auth)/login/page.tsx` — email/password form, useAuth().login(), error display, loading spinner, register link
- `frontend/app/(auth)/register/page.tsx` — 2-step form: Step 1 (name/email/password/role/org), Step 2 volunteer only (phone/area/city/skills multi-select/languages/availability toggles/hours/preferred-time); calls createUserWithEmailAndPassword + POST /auth/register + POST /auth/volunteer-profile
- `frontend/components/layout/index.ts`, `frontend/components/dashboard/index.ts`, `frontend/components/needs/index.ts`, `frontend/components/tasks/index.ts`, `frontend/components/volunteers/index.ts` — barrel exports updated
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Dashboard Page + Needs Board + New Need Form] | 26 Apr 2026, 00:06 IST

**Prompt Summary:** Build admin dashboard page with KPI cards, urgent queue, category chart, activity feed and the needs board + new need intake form.

**Files Created:**
- `frontend/components/dashboard/UrgentQueue.tsx` — top 5 urgent needs list with UrgencyBadge, location/beneficiary icons, time-ago, View link; empty state "No urgent needs right now 🎉"
- `frontend/components/dashboard/CategoryChart.tsx` — pure CSS/Tailwind horizontal bar chart, teal gradient fill, CSS width transition animation on mount, no chart library
- `frontend/components/dashboard/ActivityFeed.tsx` — recent assignments list with volunteer avatar initials, "assigned to" text, StatusBadge, time-ago; divider rows
- `frontend/components/needs/NeedCard.tsx` — shadcn-style card with UrgencyBadge, category label, line-clamp-2 title, location+beneficiary icons, AI summary (italic, line-clamp-2), StatusBadge footer, hover:shadow-md + hover:-translate-y-0.5 transition; full card clickable
- `frontend/app/needs/new/page.tsx` — 2-tab intake form: Tab 1 Quick Form (title, category, urgency, area, city, beneficiary count, language multi-select, vulnerable checkbox, optional description; inline field validation); Tab 2 Free Text (large textarea + Analyze with AI button with Gemini loading state); both redirect to /needs/[id] on success

**Files Modified:**
- `frontend/app/dashboard/page.tsx` — full implementation: ProtectedRoute admin, fetches /analytics/summary (5 KPI StatsCards), /needs?urgency=critical + high (UrgentQueue), /analytics/category-breakdown (CategoryChart), /assignments?status=assigned (ActivityFeed); shimmer skeleton loading for all sections; 30s auto-refresh via setInterval; manual Refresh button
- `frontend/app/needs/page.tsx` — full implementation: ProtectedRoute admin, GET /needs, sticky filter bar (search input + urgency/category/status dropdowns + clear X), grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 NeedCard grid; 6 skeleton cards on load; empty state with clear filters button
- `frontend/components/dashboard/index.ts` — added UrgentQueue, CategoryChart, ActivityFeed exports
- `frontend/components/needs/index.ts` — added NeedCard export
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Need Detail Page + AIAnalysisPanel + MatchRecommendations] | 26 Apr 2026, 00:38 IST

**Prompt Summary:** Build /needs/[id] detail page with AI analysis panel, volunteer match recommendations, activity timeline; add GET /needs/{id}/activity backend endpoint.

**Files Created:**
- `frontend/components/needs/AIAnalysisPanel.tsx` — empty state with "Analyze with AI" button (POST /needs/{id}/analyze, inline "Analyzing with Gemini…" loading); filled state: teal-bordered card with Gemini header strip, category/urgency/vulnerableGroup badges, highlighted aiSummary box, SkillBadge row, languages + hours meta, aiTags chips, confidence/priority score, re-analyze text button
- `frontend/components/needs/MatchRecommendations.tsx` — empty state with "Find Best Volunteers" button (GET /needs/{id}/suggestions); results: 3-col grid (grid-cols-1 md:grid-cols-3) of VolunteerCards each with avatar initials, area, SkillBadge row, score bar (green ≥75 / yellow ≥50 / red <50), checkmark reasons list, Assign button; assign calls POST /needs/{id}/assign, shows toast "Volunteer assigned successfully", redirects to /needs after 1.5s
- `frontend/app/needs/[id]/page.tsx` — full detail page: shimmer skeleton, back button, title + StatusBadge + UrgencyBadge + priority score chip in header; Section A (overview: location/beneficiaries/submitted time, collapsible raw description); Section B (AIAnalysisPanel); Section C (MatchRecommendations); Activity log timeline with vertical connector line, dot markers, action labels, timeAgo + formatDate

**Files Modified:**
- `backend/routers/needs.py` — added GET /{need_id}/activity endpoint: queries activity_logs collection where entityId == needId, ordered by timestamp desc, converts Firestore Timestamps to ISO strings for JSON serialisation
- `frontend/components/needs/index.ts` — added AIAnalysisPanel and MatchRecommendations exports
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Rename firebase_admin.py → firebase_config.py] | 26 Apr 2026, 01:26 IST

**Prompt Summary:** Rename backend/firebase_admin.py to backend/firebase_config.py and update all local import references to fix circular import (file name was shadowing the firebase-admin pip package, causing uvicorn startup crash).

**Files Created:**
- `backend/firebase_config.py` — identical content to former firebase_admin.py; docstring updated to document the rename reason

**Files Modified:**
- `backend/dependencies.py` — replaced `import firebase_admin as _firebase_admin_module` with `import firebase_config as _firebase_config_module`
- `backend/routers/auth.py` — replaced `import firebase_admin as _fa` with `import firebase_config as _fa`
- `backend/routers/needs.py` — same replacement
- `backend/routers/volunteers.py` — same replacement
- `backend/routers/tasks.py` — same replacement
- `backend/routers/analytics.py` — same replacement
- `LOG_Changes.md`

**Files Deleted:**
- `backend/firebase_admin.py` — removed; all references now point to firebase_config.py

**Status:** ✅ Complete
---

---
## [Fix Uvicorn Startup Errors] | 26 Apr 2026, 16:57 IST

**Prompt Summary:** Fix three sequential uvicorn startup crashes: missing env var (FIREBASE_SERVICE_ACCOUNT_JSON not loaded), missing email-validator package, and update requirements to reflect new dependencies.

**Files Created:** None

**Files Modified:**
- `backend/main.py` — added `load_dotenv()` call at top of file (before router imports) so `.env` is loaded before `firebase_config.py` runs `_init_app()` at module level; imports `dotenv.load_dotenv` and `pathlib.Path`; resolves path as `../../.env` relative to `backend/`
- `backend/requirements.txt` — added `python-dotenv`; changed `pydantic` → `pydantic[email]` to include `email-validator` dependency required by `EmailStr` fields in `models/user.py`
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Frontend Firebase API Key Crash] | 26 Apr 2026, 17:15 IST

**Prompt Summary:** Fix Next.js startup crash `FirebaseError: Firebase: Error (auth/invalid-api-key)`. The frontend was missing its `.env.local` file containing the `NEXT_PUBLIC_FIREBASE_*` environment variables.

**Files Created:**
- `frontend/.env.local` — extracted the Firebase config block from `sevasync-0-firebase-adminsdk-fbsvc-1cabf61410.txt` and formatted them as `NEXT_PUBLIC_FIREBASE_API_KEY`, etc. Also included `NEXT_PUBLIC_BACKEND_URL="http://127.0.0.1:8000"`.

**Files Modified:**
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Implement Landing Page] | 26 Apr 2026, 23:15 IST

**Prompt Summary:** Replace placeholder text in frontend/app/page.tsx with a full landing page. Show full-screen spinner while loading auth state, auto-redirect authenticated users to /dashboard, and render a clean landing page for unauthenticated users featuring a hero section and three feature highlights.

**Files Created:** None

**Files Modified:**
- `frontend/app/page.tsx` — implemented client component with `useAuth()` and `useRouter()`. Added auto-redirect `useEffect` logic. Added loading state with full-screen navy background, teal `Loader2` spinner, and "SevaSync" logo. Added unauthenticated landing view with dark navy background (`bg-slate-900`), hero section ("SevaSync: Smart Volunteer Coordination for Social Impact"), "Login" and "Get Started" buttons side-by-side, and a 3-column feature row with Lucide icons (Sparkles, Zap, BarChart3) and short descriptions. Matches existing Tailwind teal palette.
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Implement Volunteer Directory Page] | 26 Apr 2026, 23:18 IST

**Prompt Summary:** Fully implement frontend/app/volunteers/page.tsx as the admin-only volunteer directory page with fetch integration, filtering, grid layout, loading skeletons, and empty/error states.

**Files Created:** None

**Files Modified:**
- `frontend/app/volunteers/page.tsx` — implemented client component wrapped in `<ProtectedRoute role="admin">` and `<AppShell>`. Fetches `GET /volunteers` with optional `skill` and `status` query params. Includes client-side name search and server-side skill/status filters in a responsive filter bar. Displays a grid of `VolunteerCard` components (avatar initials, name, area, `SkillBadge` row, status dot, active task/completed task counters). Implemented 8-item animated skeleton loading state, empty state with "Clear Filters" button, and inline error banner with retry.
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Implement Volunteer My Tasks Page] | 26 Apr 2026, 23:22 IST

**Prompt Summary:** Fully implement frontend/app/my-tasks/page.tsx as the volunteer-facing assignment management page. It should fetch assignments, enrich them with need details, display in Active/Completed tabs, and provide buttons to progress the assignment status.

**Files Created:** None

**Files Modified:**
- `frontend/app/my-tasks/page.tsx` — implemented client component wrapped in `<ProtectedRoute role="volunteer">` and `<AppShell>`. Fetches `GET /volunteers/{uid}/tasks` and resolves need details via `GET /needs/{needId}` using `Promise.all`. Displays two tabs (Active/Completed) with count badges. Each task card displays need title, urgency, category, location, and assigned date. Implemented state machine buttons calling `PATCH /assignments/{id}`: Accept Task (green), Mark as Started (blue), Mark as Completed (teal), and Decline (red outline). Includes toast notifications for success, error handling, skeleton loaders, and empty states.
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Create Database Seed Script] | 27 Apr 2026, 00:03 IST

**Prompt Summary:** Create `backend/seed_data.py` to populate the Firestore database with realistic demo data, avoiding duplicates on re-run.

**Files Created:**
- `backend/seed_data.py` — Python script that initializes the Firebase Admin SDK using the local `.env` file and writes directly to Firestore. Implemented an idempotent `seed_doc` function to skip existing documents. Seeded 2 admin users, 10 fully detailed volunteers (to both `users` and `volunteers` collections), 12 community needs with pre-filled AI structured data (`aiSummary`, `requiredSkills`, etc.), 4 assignments, and 6 activity logs.

**Files Modified:**
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Create Deployment Configuration Files] | 27 Apr 2026, 00:18 IST

**Prompt Summary:** Create all necessary configuration files for deploying the backend to Google Cloud Run and the frontend to Vercel, along with a comprehensive deployment guide.

**Files Created:**
- `backend/.gcloudignore` — excludes `__pycache__`, `.env`, `seed_data.py`, and virtual environments from the Google Cloud build context.
- `backend/cloudbuild.yaml` — defines the Google Cloud Build pipeline to build the Docker image, push it to Artifact Registry, and deploy to Cloud Run with required environment variables.
- `frontend/.vercelignore` — excludes `node_modules`, `.next`, and `.env.local` from Vercel deployments.
- `frontend/vercel.json` — configures Next.js framework, sets the Mumbai (`bom1`) region, and defines the `NEXT_PUBLIC_BACKEND_URL` environment placeholder.
- `DEPLOYMENT.md` — comprehensive markdown guide providing step-by-step commands and instructions for deploying both the backend and frontend.

**Files Modified:**
- `backend/Dockerfile` — updated to correctly expose port 8080.
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Tailwind CSS Compilation & Landing Page Styling] | 27 Apr 2026, 19:20 IST

**Prompt Summary:** Diagnose and fix the issue where the entire frontend was rendering unstyled. Verify 6 specific Next.js/Tailwind configuration files and fix landing page visual layout.

**Diagnostic Results & Fixes:**
1. `globals.css`: Correct (contained the 3 `@tailwind` directives at the top).
2. `layout.tsx`: Correct (imported `globals.css` properly).
3. **`postcss.config.mjs`**: **Missing!** Created this file to register `tailwindcss` and `autoprefixer` plugins, which was the root cause preventing Next.js from compiling Tailwind.
4. `tailwind.config.ts`: Correct (content array included all required paths).
5. `package.json`: Correct (`tailwindcss`, `postcss`, and `autoprefixer` were present in devDependencies).
6. **`page.tsx`**: Updated the outer wrapper `div` to include `text-white` to ensure proper dark mode contrast as requested. (The flex gap and icon centering were already correctly implemented).

**Files Created:**
- `frontend/postcss.config.mjs`

**Files Modified:**
- `frontend/app/page.tsx`
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Add Navigation Back Buttons & Enhance Mobile Auth Layouts] | 27 Apr 2026, 19:30 IST

**Prompt Summary:** Add global "back" navigation buttons utilizing Next.js `useRouter().back()` and the `ChevronLeft` icon across specific application views to improve mobile usability. Additionally, optimize the Login and Register page layouts for mobile screens by standardizing paddings, widths, and logo centering.

**Features Implemented:**
- **Auth Views (`/login`, `/register`)**: Improved mobile responsiveness by standardizing container widths to `max-w-md w-full mx-auto` and adding padding so forms no longer touch screen edges. Properly centered the "S" logo using `mx-auto mb-4`.
- **Navigation Enhancements**: Injected a top-left positioned, teal-colored "← Back" button with hover transitions immediately above the main headings on the following pages:
  - `frontend/app/(auth)/login/page.tsx`
  - `frontend/app/(auth)/register/page.tsx` (Back button correctly resets state to `step = 1` if currently on step 2).
  - `frontend/app/needs/[id]/page.tsx`
  - `frontend/app/needs/new/page.tsx`
  - `frontend/app/volunteers/[id]/page.tsx` (Replaced placeholder content with structural layout).

**Files Modified:**
- `frontend/app/(auth)/login/page.tsx`
- `frontend/app/(auth)/register/page.tsx`
- `frontend/app/needs/[id]/page.tsx`
- `frontend/app/needs/new/page.tsx`
- `frontend/app/volunteers/[id]/page.tsx`
- `LOG_Changes.md`

**Status:** ✅ Complete
---

---
## [Fix TypeScript 'unknown' ReactNode Error in Needs Panel] | 27 Apr 2026, 19:34 IST

**Prompt Summary:** Fix a TypeScript error: `Type 'unknown' is not assignable to type 'ReactNode'` in `frontend/app/needs/[id]/page.tsx` occurring at line 338.

**Diagnostic Results & Fixes:**
The error was caused by the logical `&&` chaining rendering engine evaluating `entry.metadata?.from` which had type `unknown`. If falsy, JavaScript short-circuits and attempts to return the `unknown` type into the React JSX tree, failing strict type checking.
Fixed by casting the `unknown` objects explicitly to booleans using the double-bang (`!!`) operator. This ensures the JSX evaluates to a strict boolean `false` rather than passing an unrenderable `unknown` object when falsy.

**Files Created:** None

**Files Modified:**
- `frontend/app/needs/[id]/page.tsx`
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Firestore Composite Index Errors] | 27 Apr 2026, 21:39 IST

**Prompt Summary:** Analyze and fix the uvicorn crash `google.api_core.exceptions.FailedPrecondition: 400 The query requires an index`.

**Diagnostic Results & Fixes:**
The crash was caused by queries combining `.where()` and `.order_by()` on different fields (e.g., `volunteerId` and `assignedAt`), which requires a Firestore composite index. To avoid requiring manual index creation in the Firebase Console for the demo environment, the queries were modified to remove `.order_by()` and instead perform the sorting in-memory using Python's `list.sort()`. This was applied to three endpoints: get volunteer tasks, get need activity logs, and get match suggestions.

**Files Created:** None

**Files Modified:**
- `backend/routers/volunteers.py`
- `backend/routers/needs.py`
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Firestore positional arguments warnings & broken profile links] | 27 Apr 2026, 21:45 IST

**Prompt Summary:** Fix multiple uvicorn UserWarnings about Firestore positional arguments and resolve 404 errors for the `/my-profile` route.

**Diagnostic Results & Fixes:**
- **Firestore Warnings:** Google Cloud Firestore's latest API version deprecates positional arguments for `.where()`. Replaced all occurrences of `.where(field, "==", value)` with the new syntax `.where(filter=firestore.FieldFilter(field, "==", value))` across `volunteers.py`, `tasks.py`, and `needs.py`. This resolves the massive amount of warning logs spamming the uvicorn terminal.
- **Missing Profile Route:** The frontend navigation bar attempted to route users to `/my-profile`, which returned a 404. Updated `Sidebar.tsx` and `BottomTabBar.tsx` to dynamically use the `AuthContext` to route "My Profile" directly to `/volunteers/${user.uid}`.

**Files Created:** None

**Files Modified:**
- `backend/routers/tasks.py`
- `backend/routers/volunteers.py`
- `backend/routers/needs.py`
- `frontend/components/layout/Sidebar.tsx`
- `frontend/components/layout/BottomTabBar.tsx`
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Registration Flow & Dashboard Indicator] | 27 Apr 2026, 22:36 IST

**Prompt Summary:** Fix the registration flow so that step 1 correctly persists the chosen role (Coordinator vs Volunteer) into Firestore at account creation, and add a visual indicator on the dashboard showing the user's role and organization.

**Diagnostic Results & Fixes:**
- **Registration Flow:** Step 1 already correctly presented the choice between "Coordinator" and "Volunteer". The underlying issue was a race condition in state synchronization: `AuthContext` was resolving the user's role too early via the token before the backend had finished setting custom claims or writing to Firestore.
- **Backend Updates:** Updated `POST /auth/verify-token` to explicitly fetch the `users` document from Firestore to merge the latest `role` and `organization` into the session immediately.
- **Frontend Redirect:** Changed `router.push()` to `window.location.href` upon completing registration to force a full context reload, ensuring `AuthContext` picks up the correct role and passes the `ProtectedRoute` guards.
- **Dashboard UI:** Added a pill-style badge showing "Coordinator" and a subheader displaying the user's organization in `DashboardPage.tsx`.

**Files Created:** None

**Files Modified:**
- `backend/routers/auth.py`
- `frontend/contexts/AuthContext.tsx`
- `frontend/app/(auth)/register/page.tsx`
- `frontend/app/dashboard/page.tsx`
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Update Agent Skills] | 27 Apr 2026, 22:49 IST

**Prompt Summary:** Refresh memory on the updated `seva-frontend-patterns` skill, and apply 4 specific new guidelines to the `seva-backend-patterns` skill file regarding FastAPI initialization, Firestore filtering syntax, in-memory sorting, and POST /auth/verify-token behavior.

**Diagnostic Results & Fixes:**
- **Frontend Skills:** I've fully reviewed the new section added to `seva-frontend-patterns` detailing the structure and data sources for the Volunteer Detail Page (`/volunteers/[uid]`).
- **Backend Skills:** Modified `seva-backend-patterns/SKILL.md` to append the new rules for `redirect_slashes=False`, using `filter=firestore.FieldFilter(...)` instead of positional arguments, avoiding Firestore `.order_by()` combined with `.where()`, and ensuring `POST /auth/verify-token` fetches user metadata directly from Firestore instead of relying solely on JWT claims.

**Files Created:** None

**Files Modified:**
- `.agent/skills/seva-backend-patterns/SKILL.md`
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Build Volunteer Detail Page] | 27 Apr 2026, 22:52 IST

**Prompt Summary:** Build the complete Volunteer Detail Page at `frontend/app/volunteers/[uid]/page.tsx` displaying the volunteer's profile header, info grid, stats row, admin-only assignment flow, and a tabbed task history. Follow mobile responsive guidelines from `seva-frontend-patterns`.

**Diagnostic Results & Fixes:**
- **UI Structure:** Fully implemented the layout inside `<AppShell>` and `<ProtectedRoute>`, including a responsive 2-column to 1-column layout for the info grid. Stats cards automatically stack on mobile screens.
- **Data Fetching:** Implemented parallel API calls for `GET /volunteers/{uid}` and `GET /volunteers/{uid}/tasks`, backed by a loading skeleton. If a profile doesn't exist, a styled 404 state handles the failure securely.
- **Admin Assignment Flow:** When the "Assign to Need" floating button is pressed by an Admin, a custom modal requests `GET /needs?status=pending_assignment`. The admin selects a need and clicks confirm, triggering a `POST` to assign the volunteer, followed by a local cache refresh and a toast success message.
- **Tasks Section:** Developed the `TaskCard` component inline and configured the "Active" vs "Completed" tab filters locally to slice the task list efficiently.

**Files Created:** None

**Files Modified:**
- `frontend/app/volunteers/[id]/page.tsx`
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix 401 Unauthorized Error on Auth Endpoints] | 27 Apr 2026, 23:46 IST

**Prompt Summary:** Investigate and fix persistent 401 errors on `/auth/verify-token` and `/auth/register`. Confirm `load_dotenv()` order, add safe Firebase initialization guards, improve error logging, and note a user-made configuration change (`redirect_slashes=False`) in `main.py`.

**Diagnostic Results & Fixes:**
- **Firebase Initialization Race Condition:** Modified `backend/firebase_config.py` to explicitly call `load_dotenv()` at the top of the file before `os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")` is invoked. Previously, routers importing this file before `main.py` finished its own `load_dotenv()` execution were silently failing due to missing credentials, throwing `InvalidIdTokenError` or similar which was incorrectly mapped to a 401.
- **Improved Logging:** Updated `backend/dependencies.py` to log the exact exception type and message (`logger.error("Token verification failed: %s: %s", type(e).__name__, e)`) instead of silently swallowing verification failures and returning a generic 401.
- **Verification:** Successfully restarted the local `uvicorn` server and verified via `curl.exe` that `POST /auth/verify-token` now returns a 200 OK with the properly decoded user dictionary.
- **Manual Change Logged:** As requested, noting that the user manually updated `backend/main.py` to include `redirect_slashes=False` in the `FastAPI()` instantiation to prevent 307 trailing slash redirects.

**Files Created:** None

**Files Modified:**
- `backend/firebase_config.py`
- `backend/dependencies.py`
- `backend/main.py` *(by user)*
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Resolve 401 Auth Clock Skew] | 27 Apr 2026, 23:57 IST

**Prompt Summary:** User still reported `401 Unauthorized` on `/auth/verify-token` without backend stack traces.

**Diagnostic Results & Fixes:**
- **Clock Skew:** Realized that `firebase_admin.auth.verify_id_token` was silently throwing `InvalidIdTokenError: Token used too early` because local machine clocks and Google's auth servers often desync by a few milliseconds.
- **Backend Fix:** Updated `backend/dependencies.py` to include `clock_skew_seconds=10` during token verification.
- **Frontend Transparency:** Restructured `dependencies.py` to forward the explicit exception strings (e.g. `Token used too early`) directly into the `401` response payload instead of generic text. This will make any future authentication failures instantly obvious in the browser's Network tab.

**Files Created:** None

**Files Modified:**
- `backend/dependencies.py`
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Create .gitignore & README.md] | 28 Apr 2026, 09:01 IST

**Prompt Summary:** Create an extensive `.gitignore` file and a descriptive `README.md` file for the upcoming GitHub repository `https://github.com/Aaron-Coutinho/SevaSync.git`.

**Diagnostic Results & Fixes:**
- **`.gitignore`:** Built a robust `.gitignore` located at the root of the project. It explicitly ignores Next.js builds (`.next/`), Python caches and virtual environments (`__pycache__/`, `venv/`), IDE artifacts (`.vscode/`), and most importantly, environment variable files and Firebase credential JSONs to ensure strict repository security.
- **`README.md`:** Compiled a comprehensive, structured README derived from the project context. It highlights the MVP features, tech stack, and step-by-step instructions for installing and running both the Next.js frontend and the FastAPI backend locally.

**Files Created:**
- `.gitignore`
- `README.md`

**Files Modified:**
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Missing Import in Dashboard] | 28 Apr 2026, 00:12 IST

**Prompt Summary:** Next.js threw an unhandled runtime `ReferenceError: useAuth is not defined` when loading the Dashboard.

**Diagnostic Results & Fixes:**
- **Missing Import:** The `useAuth` hook was being invoked to render the role and organization on the Dashboard header, but the import statement was missing.
- **Fix:** Added `import { useAuth } from "@/contexts/AuthContext";` to `frontend/app/dashboard/page.tsx`.

**Files Created:** None

**Files Modified:**
- `frontend/app/dashboard/page.tsx`
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Missing Analytics Router & Remove Debug Token Logging] | 28 Apr 2026, 10:41 IST

**Prompt Summary:** Uncomment the analytics router registration in main.py and remove debug print statements that were exposing raw JWT tokens in the terminal.

**Diagnostic Results & Fixes:**
- **Analytics Router:** `app.include_router(analytics.router, prefix="/analytics")` was commented out in `backend/main.py` — uncommented it. This was causing all `/analytics/*` frontend calls to silently fail.
- **Debug Token Leak:** Removed two `print()` debug statements inside `get_current_user()` in `backend/dependencies.py` that were printing the full Bearer credentials object and raw token prefix to the terminal on every authenticated request.

**Files Created:** None

**Files Modified:**
- `backend/main.py` *(by user — uncommented analytics router)*
- `backend/dependencies.py` *(by user — removed DEBUG print statements)*

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix 401 Login Race Condition & Sign-Out Loop] | 28 Apr 2026, 10:51 IST

**Prompt Summary:** User still unable to login — POST /auth/verify-token returning 401 despite backend token verification working correctly in isolation.

**Root Cause Identified:** Two compounding bugs:
1. **Race condition in `login()`** — `setLoading(false)` in the `finally` block fired before `onAuthStateChanged` finished its async `verify-token` call, leaving UI in an unauthenticated state.
2. **Self-defeating sign-out loop in `api.ts`** — the 401 Axios interceptor was calling `signOut()` on *every* 401, including `POST /auth/verify-token` itself. This wiped the session the moment verify-token returned any error.

**Fixes Applied:**
- **`contexts/AuthContext.tsx`:** Removed `setLoading` from `login()` — `onAuthStateChanged` now owns the loading lifecycle. Changed `getIdToken()` → `getIdToken(true)` to force-refresh after sign-in. Added `console.error` to the catch block so errors appear in DevTools.
- **`lib/api.ts`:** 401 interceptor now skips auto-signout when the failing request URL is `/auth/verify-token`.

**Files Created:** None

**Files Modified:**
- `frontend/contexts/AuthContext.tsx`
- `frontend/lib/api.ts`
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix TypeScript Errors in AuthContext] | 28 Apr 2026, 10:54 IST

**Prompt Summary:** Fix TypeScript compilation errors in `frontend/contexts/AuthContext.tsx`.

**Fixes Applied:**
- **TS2554 (lines 84 & 109):** `firebaseSignOut(auth)` was passing an argument to a zero-arg wrapper. Our `@/lib/firebase` exports `signOut` as `() => _signOut(auth)` — the `auth` instance is already baked in. Removed the extra `auth` argument from both call sites.
- **Unused import:** Removed `auth` and `getCurrentUserToken` from the import — neither was used in this file after the fix.

**Files Created:** None

**Files Modified:**
- `frontend/contexts/AuthContext.tsx`
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix 404 on /volunteers, /needs, /assignments Routes] | 28 Apr 2026, 11:01 IST

**Prompt Summary:** Volunteers page shows empty — `GET /volunteers` and `GET /needs` returning 404 in backend terminal despite routers being registered.

**Root Cause:** `redirect_slashes=False` was set on the FastAPI app (added earlier to fix a different issue). With this setting, `GET /volunteers` (no trailing slash) does NOT auto-redirect to `GET /volunteers/`. The router routes were all defined as `@router.get("/")`, which resolves to `/volunteers/` (with slash) when mounted with `prefix="/volunteers"`. The frontend calls `/volunteers` (without slash), so every request 404'd silently.

**Fixes Applied:**
- Changed root route paths from `"/"` to `""` in three routers:
  - `routers/volunteers.py` — `GET ""` (list volunteers)
  - `routers/needs.py` — `POST ""` (create need) and `GET ""` (list needs)
  - `routers/tasks.py` — `GET ""` (list assignments)
- `routers/auth.py` was unaffected (uses explicit paths like `/register`, `/verify-token`)

**Files Created:** None

**Files Modified:**
- `backend/routers/volunteers.py`
- `backend/routers/needs.py`
- `backend/routers/tasks.py`
- `LOG_Changes.md`

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Volunteer Directory Validation Errors] | 28 Apr 2026, 11:15 IST

**Prompt Summary:** Fix "Volunteer not found" error caused by missing `phone` and `verified` fields skipping Pydantic validation on seeded volunteers.

**Files Created:**
- `backend/patch_volunteers.py`

**Files Modified:**
- `backend/models/volunteer.py`
- `backend/seed_data.py`
- `LOG_Changes.md`

**Status:** ✅ Complete
---

---
## [Fix Frontend Volunteer UID Bug] | 28 Apr 2026, 11:16 IST

**Prompt Summary:** Fix 404 "Volunteer not found" error when clicking volunteer cards caused by mismatch between frontend (`userId`) and backend (`uid`) models.

**Files Created:** None

**Files Modified:**
- `frontend/app/volunteers/page.tsx` — updated `Volunteer` interface and `VolunteerCard` usages to expect `uid` instead of `userId` matching the backend `VolunteerResponse`.
- `LOG_Changes.md`

**Status:** ✅ Complete
---

---
## [Fix Backend/Frontend Data Issues] | 28 Apr 2026, 13:31 IST

**Prompt Summary:** Fix three backend/frontend issues: GET /needs returning only 1 result, GET /assignments not returning seeded data, and new need location saving as "Unknown, Unknown".

**Files Created:** None

**Files Modified:**
- `backend/routers/needs.py` — Updated GET /needs to fetch all documents without Firestore filters and apply status/urgency/category filters in Python to avoid composite index errors. Removed .where() clauses that were causing partial results.
- `backend/routers/tasks.py` — Updated GET /assignments to fetch all documents without Firestore filters and apply volunteerId/needId/status filters in Python. Resolves Recent Assignments panel showing empty.
- `frontend/app/needs/new/page.tsx` — Added area field to free text form (was hardcoded to "Unknown, Unknown"). Added freeTextArea state variable, updated validation, and added required area input field to the free text tab UI.

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Needs Board Pydantic Validation Errors] | 28 Apr 2026, 13:42 IST

**Prompt Summary:** Fix Needs Board showing only 1 need due to Pydantic validation errors for missing requiredLanguages field in seeded data.

**Files Created:** None

**Files Modified:**
- `backend/routers/needs.py` — Updated _doc_to_need() helper function to handle missing fields from seeded data with default values. Added graceful handling for requiredLanguages, requiredSkills, aiTags, and title fields that were causing validation errors and preventing needs from loading.

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Volunteer Names in Match Suggestions] | 28 Apr 2026, 13:54 IST

**Prompt Summary:** Fix volunteer names showing as UIDs instead of actual names in match suggestions by fetching names from users collection.

**Files Created:** None

**Files Modified:**
- `backend/services/matching.py` — Updated get_top_matches() to fetch volunteer names from users collection. Added Firestore query to get user document for each volunteer and include actual name in suggestion response with UID fallback.
- `frontend/components/needs/MatchRecommendations.tsx` — Updated VolunteerSuggestion interface to include required 'name' field and modified VolunteerCard to display suggestion.name instead of suggestion.volunteerName with UID fallback.

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Volunteer Names and Need Titles Display] | 28 Apr 2026, 14:14 IST

**Prompt Summary:** Fix volunteer names and need titles showing as raw IDs in match suggestions and recent assignments by reading names from volunteer documents instead of users collection, and enriching assignments with volunteer names and need titles.

**Files Created:** None

**Files Modified:**
- `backend/services/matching.py` — Fixed name lookup to read from volunteer document instead of users collection. Changed from Firestore query to reading name directly from volunteer data: `name = volunteer.get("name") or volunteer.get("displayName") or volunteer_id`.
- `backend/routers/tasks.py` — Enriched list_assignments endpoint to fetch volunteer names from volunteers collection and need titles from needs collection. Added enrichment loop that populates volunteerName and needTitle fields for each assignment.
- `backend/models/assignment.py` — Added volunteerName and needTitle optional fields to AssignmentResponse model to support enriched assignment data.
- `frontend/components/dashboard/ActivityFeed.tsx` — Added truncateTitle function to limit needTitle to 40 characters with ellipsis. Updated display logic to use truncateTitle for need titles with proper TypeScript type safety.

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Volunteer Names in Match Suggestions Response] | 28 Apr 2026, 14:24 IST

**Prompt Summary:** Fix volunteer names still showing as vol_001, vol_002 in match suggestion cards by ensuring the name field is included in the API response from the backend.

**Files Created:** None

**Files Modified:**
- `backend/models/assignment.py` — Added required 'name' field to VolunteerSuggestion model to support volunteer names in match suggestions response.
- `backend/routers/needs.py` — Updated match suggestions endpoint to include name field when constructing VolunteerSuggestion responses. Changed from only including volunteerId, score, and reasons to also including the name field fetched from volunteer documents.
- `backend/services/matching.py` — Enhanced name lookup to check multiple field names (name, fullName, displayName) with friendly fallback to "Volunteer _006" format. Removed debug logging.

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix TypeError in Volunteers Page Search] | 28 Apr 2026, 14:30 IST

**Prompt Summary:** Fix TypeError: Cannot read properties of null (reading 'toLowerCase') in volunteers page search filter.

**Files Created:** None

**Files Modified:**
- `frontend/app/volunteers/page.tsx` — Added null check for v.name before calling toLowerCase() in search filter. Changed from `v.name.toLowerCase()` to `v.name?.toLowerCase() ?? false` to prevent runtime error when volunteer name is null or undefined.

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Volunteer Detail Page Display Issues] | 28 Apr 2026, 14:36 IST

**Prompt Summary:** Fix two display issues on Volunteer Detail page: "Member since Unknown date" and "Unknown Need" in task history.

**Files Created:** None

**Files Modified:**
- `frontend/app/volunteers/[id]/page.tsx` — Updated formatDate function to handle Firestore Timestamp objects serialized as {_seconds: 1234567, _nanoseconds: 0}. Added check for object type with _seconds property and converts to Date using seconds * 1000.
- `backend/routers/volunteers.py` — Enriched GET /volunteers/{uid}/tasks endpoint to fetch need titles, urgency, and area from needs collection. Added enrichment loop that populates needTitle, urgency, and area fields for each assignment.
- `backend/models/assignment.py` — Added urgency and area optional fields to AssignmentResponse model to support enriched task data for volunteer detail page.

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Volunteer Profile Data Issues] | 28 Apr 2026, 14:43 IST

**Prompt Summary:** Fix two issues with volunteer profile data: real volunteer accounts have no name on their profile, and seeded volunteers show "Unknown date" for Member since.

**Files Created:** None

**Files Modified:**
- `backend/routers/volunteers.py` — Enriched GET /volunteers/{uid} endpoint to fetch name and email from users collection as fallback if missing from volunteer document. Added user_doc lookup when volunteer_data.get("name") is falsy.
- `backend/routers/auth.py` — Updated POST /auth/volunteer-profile to fetch name from users collection during volunteer profile creation and include it in the volunteer document. Added user_doc lookup before creating volunteer_doc.
- `frontend/app/volunteers/[id]/page.tsx` — Updated formatDate and formatAssignedDate functions to handle Firestore Timestamp objects with both _seconds and seconds fields. Added support for ISO strings and proper null checking.

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Volunteer Names on Dashboard] | 28 Apr 2026, 14:46 IST

**Prompt Summary:** Fix volunteer names not showing on volunteer dashboard (directory page). Names show on detail page but not on the directory list.

**Files Created:** None

**Files Modified:**
- `backend/routers/volunteers.py` — Enriched GET /volunteers endpoint (list_volunteers) to fetch names from users collection for volunteers missing name field. Added user_doc lookup when volunteer_data.get("name") is falsy, similar to the single volunteer endpoint fix.

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Volunteer Card Truncation and My Tasks Need Titles] | 28 Apr 2026, 15:03 IST

**Prompt Summary:** Fix volunteer name truncation in volunteer card and "Unknown Need" showing in volunteer My Tasks page.

**Files Created:** None

**Files Modified:**
- `frontend/app/volunteers/page.tsx` — Added min-w-0 to volunteer name h3 element for proper truncation when names are long.
- `frontend/app/my-tasks/page.tsx` — Updated to use backend-enriched need data from /volunteers/{uid}/tasks endpoint instead of client-side enrichment. Removed client-side need fetching, simplified Assignment type to include needTitle, urgency, and area fields. Updated formatDate to handle Firestore Timestamp objects.

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Assignment orgId for Real Volunteer Accounts] | 28 Apr 2026, 19:33 IST

**Prompt Summary:** Fix assignments created for real volunteer accounts (registered via app) not appearing in Recent Assignments on Dashboard. Root cause: real volunteer accounts have incomplete volunteers/{uid} documents missing orgId field, so assignments were created without orgId and Recent Assignments query couldn't find them.

**Files Created:** None

**Files Modified:**
- `backend/routers/needs.py` — Updated POST /needs/{id}/assign to fetch orgId from coordinator's user document instead of volunteer document. Added admin_user_doc lookup to get organization field and included orgId in assignment_data.
- `backend/routers/auth.py` — Updated POST /auth/volunteer-profile to fetch orgId from users collection during volunteer profile creation and include it in the volunteer document. Added org_id lookup and included orgId in volunteer_doc.

**Files Deleted:** None

**Status:** ✅ Complete
**Manual Step Required:** Backfill existing test volunteer account in Firestore by adding orgId field with the same value as coordinator's org to volunteers/{your-volunteer-uid} document.
---

---
## [Fix Recent Assignments Showing VolunteerId] | 28 Apr 2026, 19:56 IST

**Prompt Summary:** Fix Recent Assignments on Dashboard showing volunteerId (e.g., "4mIIMLW87aYL3yKLIqbptbJRG4H2") instead of volunteer name. Root cause: volunteer documents for real accounts may be missing the name field, so the enrichment logic in list_assignments endpoint falls back to volunteerId.

**Files Created:** None

**Files Modified:**
- `backend/routers/tasks.py` — Updated GET /assignments endpoint to add fallback logic for volunteer name. If name is missing from volunteer document, fetch it from users collection as fallback before using volunteerId.

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix Assignment Validation Errors for Seeded Data] | 28 Apr 2026, 21:04 IST

**Prompt Summary:** Fix validation errors in terminal showing "Skipping malformed assignment doc" for seeded assignment documents (assign_001, assign_002, etc.) missing required fields matchScore, matchReasons, and notes.

**Files Created:** None

**Files Modified:**
- `backend/models/assignment.py` — Made matchScore, matchReasons, and notes fields optional with default values in AssignmentResponse model. matchScore defaults to 0.0, matchReasons defaults to empty list, notes defaults to empty string. This handles seeded assignment documents that were created without these fields.

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Update ESLint Config to Flat Config Format] | 28 Apr 2026, 21:43 IST

**Prompt Summary:** Update ESLint configuration to flat config format for ESLint v9, which dropped the .eslintrc format.

**Files Created:**
- `frontend/eslint.config.mjs` — New flat config file using @eslint/eslintrc FlatCompat to extend next/core-web-vitals and next/typescript.

**Files Modified:** None

**Files Deleted:** None

**Status:** ✅ Complete
---

---
## [Fix REPLACE_WITH_CLOUD_RUN_URL Placeholder] | 28 Apr 2026, 21:58 IST

**Prompt Summary:** Fix console errors showing API requests to "REPLACE_WITH_CLOUD_RUN_URL" instead of actual backend URL. The placeholder was hardcoded in vercel.json build env, overriding Vercel environment variables.

**Files Created:** None

**Files Modified:**
- `frontend/vercel.json` — Removed the build.env section that hardcoded NEXT_PUBLIC_BACKEND_URL to "REPLACE_WITH_CLOUD_RUN_URL". This allows Vercel environment variables to be used instead of the placeholder.

**Files Deleted:** None

**Status:** ✅ Complete
**Note:** User needs to set NEXT_PUBLIC_BACKEND_URL in Vercel project settings with the actual Cloud Run URL.
---
