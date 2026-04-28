## Product definition

Build a web-based volunteer coordination platform for NGOs and community response teams that converts messy field inputs into structured needs, prioritizes requests, and assigns the right volunteers quickly. The solution is designed for the “Smart Resource Allocation” problem statement and is shaped to score well on judging dimensions like problem clarity, implementation depth, architecture, technical completeness, iteration, and future scalability. [developers.google](https://developers.google.com/community/gdsc-solution-challenge/terms)

The core problem is that small NGOs and local response groups often gather needs through calls, WhatsApp messages, paper forms, and ad hoc spreadsheets, which slows prioritization and assignment. The product solves this by creating one system of record for incoming needs, volunteer availability, task allocation, and response tracking. [developers.google](https://developers.google.com/community/gdsc-solution-challenge/terms)

### Product name
Use a product name **SevaSync**.

### One-line pitch
A smart volunteer allocation platform that turns scattered community requests into prioritized tasks and matches them to the best available volunteers in real time.

### Primary users
- NGO admin / coordinator.
- Field survey volunteer.
- Skilled volunteer.
- Beneficiary/community cluster record.
- Optional donor/partner observer role for dashboard-only view.

### Primary outcome
Reduce the time between request intake and volunteer assignment, while improving match quality and visibility for coordinators.

## MVP scope

The MVP should focus on one clear story: a coordinator receives multiple community needs, the system structures and prioritizes them, then recommends and confirms the best volunteer assignments. A working application matters more than a mockup because the demo is expected to show an actual functional product and how users interact with it. [developers.google](https://developers.google.com/community/gdsc-solution-challenge/terms)

### MVP features to build
- Admin login and role-based dashboard.
- Need intake form for community requests.
- Volunteer onboarding form with skills, location, availability, and preferred task types.
- Need classification using a Google AI service, ideally Gemini, because the submission requires use of a Google AI model or service. [youtube](https://www.youtube.com/watch?v=-kPPnZE8rUc)
- Priority scoring engine to rank requests.
- Matching engine to recommend volunteers for each request.
- Assignment workflow: assign, accept, in progress, completed.
- Coordinator dashboard with task status, urgency, pending backlog, and volunteer utilization.
- Proof of action: notes, timestamps, optional image upload, completion confirmation.
- Basic analytics for the deck and demo: number of requests, average response time, assignment success rate, volunteer load.

### Features to postpone
- Full multilingual voice interface.
- OCR for handwritten surveys in the first prototype unless time remains.
- Advanced route optimization.
- SMS or WhatsApp integration.
- Donor portal.
- Predictive demand forecasting.
- Complex geospatial heatmaps if they slow delivery.

### Core demo scenario
- Coordinator creates 10 sample community requests.
- 8 sample volunteers exist with different skills and availability.
- System classifies each need into category and urgency.
- Dashboard ranks the queue.
- Coordinator opens one urgent request.
- System shows top 3 volunteer recommendations with match reasons.
- Coordinator assigns volunteer.
- Volunteer marks progress and completion.
- Dashboard metrics update.

## System architecture

This solution should be built as a lightweight cloud-native web app with a React/Next.js frontend, a Python FastAPI backend, Firestore as the primary data store, Gemini as the AI analysis layer, and Cloud Run for deployment. This stack aligns with your existing strengths and also stays practical for a solo build; Firestore offers a free tier of 50,000 reads/day and 20,000 writes/day, and Cloud Run includes 2 million free requests per month plus free CPU and RAM allowances, which is enough for a hackathon prototype. [cloud.google](https://cloud.google.com/firestore/pricing)

### Frontend
Use:
- Next.js for the web interface.
- Tailwind for fast UI implementation.
- Simple chart components for dashboard stats.
- Clean admin-style layout with 3 major views:
  - Overview dashboard.
  - Needs board.
  - Volunteer board.

### Backend
Use:
- FastAPI as the API layer.
- REST endpoints for all main actions.
- Background task handling only where necessary.
- Clear service separation inside backend:
  - Auth service.
  - Need processing service.
  - Matching service.
  - Assignment service.
  - Analytics service.

### Database
Use Firestore for:
- Users.
- Volunteers.
- Needs/requests.
- Assignments.
- Activity logs.
- Feedback/test records.

### AI layer
Use Gemini for:
- Converting free-text needs into structured attributes.
- Classifying need type.
- Estimating urgency and resource category.
- Generating a short structured summary for coordinators.
- Optionally explaining why a volunteer was matched.

Gemini Developer API pricing lists free-tier input and output as free of charge, which makes it suitable for prototype-stage use. [ai.google](https://ai.google.dev/gemini-api/docs/pricing)

### Hosting
Deploy:
- Frontend on Firebase Hosting or Vercel.
- Backend on Cloud Run.
- Firestore on Google Cloud.
- This keeps the demo cloud-deployed, which is required in the submission flow. [docs.cloud.google](https://docs.cloud.google.com/free/docs/free-cloud-features)

## Data model and workflows

The product should feel like an operations system, not just a form app. Every entity needs a clear lifecycle so the prototype looks implementation-ready to judges.

### Core entities
- **User**: id, name, email, role, organization.
- **Volunteer**: userId, phone, location, skills, languages, availability slots, verified status, preferred radius, max active tasks.
- **NeedRequest**: id, source, title, raw description, structured category, urgency level, number of beneficiaries, location, required skills, createdAt, status.
- **Assignment**: id, needId, volunteerId, matchScore, assignedBy, acceptedAt, startedAt, completedAt, currentStatus.
- **FeedbackRecord**: id, relatedNeedId, userType, message, improvementTag.
- **ActivityLog**: entityType, entityId, action, actor, timestamp.

### Need categories
Keep categories simple and hackathon-friendly:
- Food and essentials.
- Medical assistance.
- Elderly support.
- Child support.
- Transport/logistics.
- Documentation/helpdesk.
- Shelter/community support.

### Urgency levels
Use:
- Critical.
- High.
- Medium.
- Low.

### Volunteer skill tags
Use:
- Medical.
- Counselling.
- Logistics.
- Translation.
- Data entry.
- Field support.
- Community outreach.
- Documentation.

### Main workflow
1. Coordinator or survey volunteer submits a community need.
2. Backend stores raw request.
3. Gemini structures the text into category, urgency, skill needs, and summary.
4. Priority engine computes score.
5. Matching engine ranks volunteers.
6. Coordinator reviews and assigns.
7. Volunteer updates task.
8. Completion data feeds dashboard.

## Matching and prioritization logic

This is the heart of the product, so Antigravity should implement it clearly and visibly.

### Priority score
Create a deterministic priority score from weighted factors:
- Urgency level.
- Number of beneficiaries affected.
- Time sensitivity.
- Vulnerable group involved, such as elderly/children/medical.
- Age of request.
- Whether request is still unassigned.

### Match score
Volunteer recommendations should use a weighted score from:
- Skill overlap.
- Distance proximity or area match.
- Availability match.
- Language compatibility.
- Current workload.
- Task history or relevant experience.
- Priority fit.

### Recommendation output
For each request, show:
- Top 3 volunteers.
- Match score.
- Why they were selected, for example:
  - Has medical skill.
  - Within service area.
  - Available now.
  - Low active workload.

### Fallback behavior
If no strong match exists:
- Show “no ideal match.”
- Suggest partial matches.
- Recommend escalation to coordinator pool.
- Allow manual assignment.

## Exact product screens

Antigravity should build these screens in this order.

### 1. Landing/Login
- Simple product intro.
- Login/sign-in.
- Demo credentials or demo mode button.

### 2. Coordinator dashboard
Widgets:
- Total active requests.
- Unassigned urgent requests.
- Active volunteers.
- Completed tasks today.
- Average assignment time.
- Category distribution.

Tables/panels:
- Recent urgent requests.
- Latest volunteer actions.
- Today’s assignments.
- Bottleneck alerts.

### 3. Needs board
Views:
- List view.
- Kanban by status.
- Filters by urgency, category, area.

Each request card should show:
- Title.
- Short summary.
- Urgency.
- Category.
- Area.
- Beneficiary count.
- Assigned/unassigned state.

### 4. Need detail page
Sections:
- Raw input.
- AI structured summary.
- Priority explanation.
- Required skills.
- Suggested volunteers.
- Assignment action panel.
- Activity history.

### 5. Volunteer board
Views:
- Card list of volunteers.
- Availability status.
- Skill filters.
- Active workload.

Volunteer card fields:
- Name.
- Skills.
- Preferred area.
- Current status.
- Number of active tasks.
- Last completed task.

### 6. Volunteer detail page
- Profile.
- Skills.
- Availability.
- Current assignments.
- Past completions.
- Match suitability tags.

### 7. Assignment workflow page
- Pending acceptance.
- Accepted.
- In progress.
- Completed.
- Notes and proof update section.

### 8. Intake form
Two modes:
- Structured quick form.
- Free-text form.

Fields:
- Request title.
- Description.
- Area/location.
- Beneficiary count.
- Contact person.
- Category if known.
- Preferred time.
- Special notes.

## AI implementation plan

Gemini should not be used as a gimmick. It must solve a visible operational task because judges want the team to explain what Google technology was used and why. [developers.google](https://developers.google.com/community/gdsc-solution-challenge/terms)

### AI tasks in prototype
- Parse a free-text request into a structured JSON-like internal object.
- Extract category.
- Detect urgency indicators.
- Identify required volunteer skill tags.
- Produce a short coordinator summary.
- Optionally suggest missing information.

### Example AI transformation behavior
Input:
“A diabetic senior citizen in Kurla has not received medicine for two days and cannot travel.”

Output fields:
- Category: medical assistance.
- Urgency: critical.
- Skills required: medical, field support.
- Vulnerable group: elderly.
- Summary: senior citizen needs urgent medicine delivery.
- Suggested SLA: immediate.

### AI safety rules
- Coordinator remains final decision-maker.
- AI output is editable.
- All AI recommendations should be labeled as suggestions.
- Store both raw input and structured output for transparency.

### Why this is strong for judges
It shows actual operational use of Google AI, not just a chatbot layer, and directly improves intake accuracy, prioritization, and assignment speed. That maps well to implementation quality and practical usefulness. [youtube](https://www.youtube.com/watch?v=-kPPnZE8rUc)

## Delivery plan for Antigravity

Paste the following as the implementation brief.

### Master implementation brief

Build a cloud-deployed web application for “Smart Resource Allocation: Data-Driven Volunteer Coordination for Social Impact.” The product is an NGO operations platform that takes incoming community needs, converts them into structured requests using Gemini, prioritizes them, and recommends the best volunteers based on skills, location, availability, and workload. The target users are NGO coordinators and volunteers. The entire MVP must demonstrate one complete workflow from request intake to volunteer assignment to completion.

#### Product goals
- Reduce coordinator decision time.
- Improve quality of volunteer-task matching.
- Make urgent requests visible immediately.
- Track assignment status clearly.
- Generate demo-friendly metrics for presentation.

#### Technical stack
- Frontend: Next.js + Tailwind.
- Backend: FastAPI.
- Database: Firestore.
- AI: Gemini API for free-text structuring and classification.
- Deployment: Cloud Run for backend, Firebase Hosting or similar for frontend.
- Authentication: Firebase Auth or simple email/password demo auth.

#### Required modules
- Authentication and role management.
- Request intake module.
- AI request analysis module.
- Priority scoring module.
- Volunteer directory module.
- Matching engine.
- Assignment and status tracking module.
- Coordinator dashboard analytics module.
- Demo seed data module.

#### Main user roles
- Coordinator: full access, create/view/assign/manage.
- Volunteer: view assigned tasks, update status.
- Optional field volunteer: submit requests only.

#### Core flows
- Coordinator submits new request.
- AI structures request.
- System computes priority.
- System recommends volunteers.
- Coordinator assigns one.
- Volunteer accepts and updates progress.
- Coordinator marks completion and sees analytics update.

#### Dashboard requirements
- KPI cards for active requests, urgent unassigned, active volunteers, completed tasks, average response time.
- Urgent queue section.
- Recent assignments section.
- Category breakdown section.
- Volunteer utilization section.

#### Need intake requirements
- Support both structured fields and free-text request input.
- Store original raw text.
- After submission, call Gemini to classify into category, urgency, required skills, and short summary.
- Show editable AI output before final save if possible.

#### Matching engine requirements
- Score based on:
  - Skill match.
  - Area match.
  - Availability.
  - Language match.
  - Current workload.
- Show top 3 volunteer recommendations per request.
- Include human-readable reasons for each recommendation.
- Allow manual override by coordinator.

#### Status workflow
- Request statuses: new, analyzed, pending assignment, assigned, in progress, completed, escalated.
- Volunteer statuses: available, busy, offline.
- Assignment statuses: assigned, accepted, started, completed, declined.

#### Data to persist
- User records.
- Volunteer profiles.
- Requests.
- AI analysis result.
- Match recommendation history.
- Assignments.
- Activity logs.
- Feedback/test notes.

#### Seed/demo data
Preload:
- 10 to 15 request records across 4 to 5 categories.
- 8 to 10 volunteers with varied skills and availability.
- 1 urgent case, 2 high-priority cases, several medium and low cases.
- At least 3 completed assignments so dashboard looks active.

#### UI expectations
- Mobile-first approach: design for 375px first, scale up. Volunteers will primarily use mobile for task management.
- Clean admin dashboard style.
- Fast navigation.
- No complex animations needed.
- Use color to show urgency and status clearly.
- Focus on usability, not visual flair.

#### Non-functional expectations
- Works on desktop first.
- Responsive enough for tablet/mobile demo.
- Handles invalid or incomplete form input.
- Keeps coordinator in control of AI output.
- Uses mock/demo data where external integrations are not essential.

#### Analytics required for demo
- Count of total requests.
- Count of urgent requests.
- Count of assigned vs unassigned.
- Average time to assign.
- Completion count.
- Volunteer load distribution.
- Top request categories.

#### Demo mode expectations
- Include a clear demo login path.
- Seed database on first run or provide a simple seed action.
- Ensure at least one request already has AI analysis and volunteer recommendations visible.

#### Stretch goals only if time remains
- OCR/scan upload for handwritten forms.
- Multilingual request input.
- Map visualization.
- SMS/WhatsApp alerts.
- Predictive prioritization.

## Build order

Because you are solo, implementation order matters more than perfect architecture.

### Phase 1: Foundation
- Set up repo structure.
- Create frontend shell.
- Create backend app structure.
- Configure Firestore.
- Configure auth.
- Deploy empty frontend and backend.

### Phase 2: Core data flows
- Volunteer create/read screens.
- Request create/read screens.
- Firestore persistence.
- Seed demo data.
- Dashboard with static metrics.

### Phase 3: Intelligence
- Gemini request analysis.
- Priority scoring.
- Match scoring.
- Recommendation panel.

### Phase 4: Assignment operations
- Assign volunteer.
- Volunteer acceptance/status changes.
- Activity logging.
- Completion flow.

### Phase 5: Demo polish
- Better dashboard charts.
- Better labels/explanations.
- Empty states and loading states.
- Slide screenshots.
- Scripted demo journey.

## Testing and judging alignment

Your implementation plan should explicitly support testing and iteration because the judging rubric asks for feedback, testing evidence, technical challenges addressed, metrics, and next steps. [developers.google](https://developers.google.com/community/gdsc-solution-challenge/terms)

### Testing checklist
- Request creation works.
- AI analysis returns structured output.
- Priority labels appear correctly.
- Volunteer recommendations rank properly.
- Assignment updates request state.
- Volunteer update changes dashboard counts.
- Invalid form inputs show errors.
- Demo data loads consistently.

### Feedback evidence to collect
Use 3 lightweight user feedback points:
- Coordinator wants urgent requests more visible.
- Volunteer wants clearer assignment reasons.
- Coordinator wants fewer fields in intake form.

Then show iteration:
- Add urgency badges.
- Add “why matched” explanation.
- Simplify intake form into essential fields.

### Technical challenge to mention later
- Balancing AI flexibility with deterministic matching logic.
- Solution: AI structures messy input, but final priority and volunteer ranking use transparent rule-based scoring.

## Cost and deployment practicality

For a prototype, this stack is financially safe: Firestore free tier includes 1 GiB storage, 50,000 reads/day, and 20,000 writes/day, while Cloud Run includes 2 million free requests per month and Gemini Developer API offers free-tier token usage. [cloud.google](https://cloud.google.com/run/pricing)

That means the implementation can honestly claim cloud deployment and Google AI usage without needing a production budget, which is useful both for the build and for the cost slide in the deck. [cloud.google](https://cloud.google.com/firestore/pricing)

## Dont's

- Do not let it turn the app into a generic chatbot.
- Do not overbuild OCR first.
- Do not add too many roles.
- Do not create too many pages before the core flow works.
- Do not depend on third-party APIs beyond Google essentials.
- Do not make the dashboard visually fancy at the cost of the assignment workflow.

The winning story is simple: messy needs come in, AI structures them, the system prioritizes them, the best volunteer is suggested, the coordinator acts fast, and the organization gets measurable visibility into impact. That story is easier to demo, easier to explain in the PPT, and much closer to what the rubric rewards. [developers.google](https://developers.google.com/community/gdsc-solution-challenge/terms)