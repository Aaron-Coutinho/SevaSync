---
name: seva-frontend-patterns
description: Load this skill when building any Next.js page, React component, Tailwind UI, admin dashboard, coordinator view, volunteer portal, intake form, assignment workflow, or any frontend feature in SevaSync.
---

# SevaSync — Frontend Patterns

## Tech Stack
- Next.js 14 App Router
- Tailwind CSS
- shadcn/ui (Button, Card, Badge, Table, Dialog, Select, Input, Textarea)
- Axios for API calls (configured in `lib/api.ts`)
- Firebase client SDK for auth (`lib/firebase.ts`)

## App Router Pages
```
app/
├── page.tsx                    # Landing/login redirect
├── (auth)/
│   ├── login/page.tsx          # Login form
│   └── register/page.tsx       # Register: choose role + details
├── dashboard/page.tsx          # Admin overview with KPIs + activity
├── needs/
│   ├── page.tsx                # Needs board (list + kanban toggle)
│   ├── new/page.tsx            # New need intake form
│   └── [id]/page.tsx           # Need detail + AI analysis + match suggestions
├── volunteers/
│   ├── page.tsx                # Volunteer directory (admin)
│   └── [uid]/page.tsx          # Volunteer profile page
├── my-tasks/page.tsx           # Volunteer: their assigned tasks
└── my-profile/page.tsx         # Volunteer: edit own profile
```

## Auth State
- Store Firebase token in React context (`AuthContext`)
- On login: `firebase.auth().signInWithEmailAndPassword()` → get ID token → store in context
- Attach token to all Axios requests via interceptor: `Authorization: Bearer <token>`
- Protect pages: wrap in `<ProtectedRoute role="admin">` or `<ProtectedRoute role="volunteer">`
- Do NOT use localStorage for token storage

## Component Map
```
components/
├── layout/
│   ├── Sidebar.tsx             # Admin nav links (Dashboard, Needs, Volunteers)
│   ├── Navbar.tsx              # Top bar with user avatar + logout
│   └── ProtectedRoute.tsx      # Role-based route guard
├── dashboard/
│   ├── StatsCard.tsx           # Single KPI card (icon + number + label)
│   ├── UrgentQueue.tsx         # Top 5 unassigned urgent needs list
│   └── ActivityFeed.tsx        # Recent action log
├── needs/
│   ├── NeedCard.tsx            # Card showing title, urgency badge, category, area
│   ├── NeedForm.tsx            # Create/edit need form (raw text + structured fields)
│   ├── AISummaryPanel.tsx      # Shows Gemini-generated analysis (editable)
│   └── MatchList.tsx           # Top 3 volunteer suggestions with score + reasons
├── volunteers/
│   ├── VolunteerCard.tsx        # Card: name, skills, status, workload
│   └── SkillBadge.tsx          # Colored badge per skill tag
└── tasks/
    ├── TaskCard.tsx            # Assignment card for volunteer my-tasks view
    └── StatusBadge.tsx         # Status with correct color
```

## Urgency Colors (Tailwind)
```
critical → bg-red-100 text-red-700 border-red-300
high     → bg-orange-100 text-orange-700 border-orange-300
medium   → bg-yellow-100 text-yellow-700 border-yellow-300
low      → bg-green-100 text-green-700 border-green-300
```

## Status Colors
```
new / analyzed      → bg-gray-100 text-gray-600
pending_assignment  → bg-blue-100 text-blue-700
assigned / accepted → bg-indigo-100 text-indigo-700
in_progress         → bg-purple-100 text-purple-700
completed           → bg-green-100 text-green-700
escalated           → bg-red-100 text-red-700
```

## Dashboard KPIs (GET /analytics/summary)
Show 4 StatsCard components:
1. Total Active Needs
2. Unassigned Urgent Needs (critical + high with status pending_assignment)
3. Volunteers Available
4. Tasks Completed Today

## Needs Board Page
- Default: list view with NeedCard grid (2 cols on desktop)
- Filter bar: urgency dropdown, category dropdown, status dropdown
- Sort: by priorityScore descending (default)
- Each card shows: title, urgency badge, category, area, beneficiaryCount, status badge
- Click card → navigate to `/needs/[id]`
- "+ New Need" button top-right → `/needs/new`

## Need Detail Page (`/needs/[id]`)
Sections (top to bottom):
1. Header: title, urgency, status, submittedAt
2. AI Analysis Panel: category, skills, summary, priorityScore (editable by admin)
3. "Generate Matches" button → POST `/needs/{id}/suggestions` → show MatchList
4. MatchList: 3 VolunteerCard-style rows with score bar + reasons + "Assign" button
5. Assignment confirmation: Dialog with volunteer name + confirm button
6. Activity log timeline at bottom

## Need Intake Form (`/needs/new`)
Two modes via tab toggle:
- **Quick Form**: title, category dropdown, urgency dropdown, area, beneficiaryCount, description textarea
- **Free Text**: single large textarea ("Describe the situation") + "Analyze with AI" button

On submit: POST `/needs` → backend saves + triggers Gemini → redirect to `/needs/[id]`
Show loading state during Gemini analysis ("Analyzing with AI...")

## Volunteer Directory Page (`/volunteers`)
- Grid of VolunteerCard components
- Filter: skill, status, area
- Each card: name, skills (SkillBadge), status indicator (green/yellow/grey dot), activeTaskCount / maxActiveTasks bar
- Click → `/volunteers/[uid]`

## My Tasks Page (`/my-tasks`) — Volunteer view
- List of TaskCard for assignments where volunteerId = currentUser.uid
- Group by status: Pending Acceptance | In Progress | Completed
- Each card: need title, urgency, area, assigned date, status + action buttons:
  - If assigned → "Accept" / "Decline"
  - If accepted → "Mark Started"
  - If started → "Mark Completed" + notes textarea

## API Calls Pattern
All API calls go through `lib/api.ts` (Axios instance with base URL from env):
- Always attach auth token via request interceptor
- On 401 → redirect to login
- Show loading spinner during calls
- Show toast on success/error (use shadcn Toaster)

## Key UX Rules
- Always show loading states during API calls — never freeze the UI
- Gemini analysis shown as editable suggestion, not auto-saved values
- Assign button opens a confirmation Dialog before POSTing
- Empty states: show message + action button (e.g., "No needs yet — Add one")
- Mobile: stack all 2-col grids to 1-col, sidebar collapses to hamburger

## Mobile-First Rules (MANDATORY)

### Breakpoint Strategy
All layouts use mobile-first Tailwind breakpoints:
- Default (no prefix) = mobile (375px+)
- `md:` = tablet (768px+)
- `lg:` = desktop (1024px+)

Never start with desktop layout and add mobile overrides. Always reverse.

### Grid Breakdowns
1-column on mobile → 2-column on md → 3-column on lg
grid-cols-1 md:grid-cols-2 lg:grid-cols-3
Apply this to: StatsCards, NeedCard grid, VolunteerCard grid, MatchList.

### Navigation on Mobile
- Sidebar is HIDDEN on mobile (`hidden lg:flex`)
- Show bottom tab bar on mobile with 4 icons:
  Dashboard | Needs | Volunteers | My Tasks
- Bottom tab bar: fixed bottom-0, full-width, bg-white, border-top
- Each tab: min touch target h-16, icon + label

### Touch Targets
- Every button, link, tab: minimum `h-11` (44px) tall
- Form inputs: minimum `h-11`
- Never use small icon-only buttons without padding on mobile

### Typography
- Body text minimum `text-base` (16px) — prevents iOS Safari auto-zoom
- Form input font-size must be 16px minimum — if smaller, iOS zooms in on focus

### Forms on Mobile
- Stack all form fields single column on mobile
- Use correct input types: `type="tel"`, `type="email"`, `type="number"`
- Submit button: full-width on mobile (`w-full md:w-auto`)
- Label above input always (never inline/side-by-side on mobile)

### Tables → Cards on Mobile
- Never show raw `<table>` on mobile
- Use `hidden md:block` on table, `block md:hidden` on card-list version
- Card list: each row becomes a card with label: value pairs

### Modals/Dialogs on Mobile
- Use shadcn `Sheet` (drawer) instead of `Dialog` on mobile
- Sheet slides up from bottom on mobile, dialog on desktop:
  `<Sheet>` for mobile, `<Dialog>` for md+
- Or use Dialog with `w-full mx-4` on mobile to prevent edge overflow

### Volunteer Screens (highest mobile priority)
These screens are used primarily on mobile by volunteers:
- `/my-tasks` — large status buttons, single column, bottom sticky action
- `/my-profile` — full-width form, large inputs
- `/needs/[id]` — readable AI summary, stacked sections

### Sticky Action Buttons
On mobile, primary actions should be sticky at bottom:
<div class="fixed bottom-20 left-0 right-0 p-4 bg-white border-t md:static md:border-0 md:p-0 md:bg-transparent">
<button class="w-full md:w-auto ...">Assign Volunteer</button>
</div>
bottom-20 leaves space for bottom tab bar (h-16).

### No Hover-Only UI
- Never rely on `:hover` to reveal information on mobile
- Tooltips → use tap-to-toggle or always-visible labels instead
- Hover cards → use expandable accordion or tap-to-expand pattern

### Scroll Behavior
- Only ONE scroll region per screen (the page itself)
- No nested scrollable divs — causes scroll trapping on iOS
- Exception: horizontal scroll for status tabs is fine with `overflow-x-auto`

## Volunteer Detail Page (`/volunteers/[uid]`)
Sections (top to bottom):
1. Profile header: name, avatar initials, joined date, verified badge
2. Info grid: skills as SkillBadge components, preferred area, languages, availability (days + hours/week)
3. Stats row: totalCompleted tasks, current activeTaskCount / maxActiveTasks, rating stars
4. For admin role: "Assign to Need" button → opens Dialog with needs dropdown
5. Tasks section: tabbed — Active Tasks | Completed Tasks
   Each task shows: need title, urgency badge, area, assigned date, status badge
6. Data fetched from: GET /volunteers/{uid} + GET /volunteers/{uid}/tasks
7. Loading skeleton while fetching, error state if uid not found