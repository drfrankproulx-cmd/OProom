# OProom - OR Scheduling Platform PRD

## Original Problem Statement
Full-stack OR scheduling platform for surgical residents. Major phases include:
1. Productionization (Docker, HIPAA audit logging, externalized configs)
2. Pre-Op Checklist & Task System overhaul
3. Full Calendar Management with drag-and-drop
4. Critical bug fixes and platform audit

## Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB Atlas
- **Auth:** JWT + WebAuthn (biometrics)
- **Calendar:** @dnd-kit for drag-and-drop
- **Deployment:** Emergent native (Kubernetes)

## Key Files
- `/app/backend/server.py` — All backend endpoints
- `/app/backend/google_integration.py` — Google OAuth/Calendar/Gmail
- `/app/frontend/src/components/AppleDashboard.jsx` — Dashboard
- `/app/frontend/src/components/UnifiedPatients.jsx` — Patients, Checklist, Tasks
- `/app/frontend/src/components/Calendar.jsx` — Drag & drop calendar
- `/app/frontend/src/components/AuthPage.jsx` — Login/Register

## What's Been Implemented
- [x] Dockerization & AWS Prep
- [x] HIPAA Audit Logging
- [x] Deployment blocker fixes
- [x] Add-On list deletions
- [x] Pre-Op Checklist v2 (5 defaults + free-form)
- [x] Task System v2 (3 auto-tasks, free-text)
- [x] Full Calendar with Drag & Drop
- [x] "Body stream already read" bug fix
- [x] **Deployment fixes (Apr 2026):** Trimmed requirements.txt (221→23 packages), added /health endpoint, fixed DB_NAME usage, removed MONGO_URL default, cleaned .env comments

## Pending / In Progress
- [ ] Full Platform Audit (end-to-end UI verification)

## Upcoming (P1-P2)
- [ ] Legacy code cleanup (ClinicalDashboard.jsx, surgery-timeline/)
- [ ] Audit Log viewer UI page
- [ ] Break down server.py into modular routes

## Backlog (P2-P3)
- [ ] Weekly email digest for notifications
- [ ] Push notification service worker
- [ ] Database query pagination for scalability
