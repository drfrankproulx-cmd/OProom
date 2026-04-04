# OProom - OR Scheduling Platform PRD

## Original Problem Statement
Full-stack OR scheduling platform for surgical residents. Major phases include:
1. Productionization (Docker, HIPAA audit logging, externalized configs)
2. Pre-Op Checklist & Task System overhaul
3. Full Calendar Management with drag-and-drop
4. Critical bug fixes and platform audit
5. Deployment fixes for production readiness

## Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB Atlas
- **Auth:** JWT + WebAuthn (biometrics)
- **Calendar:** @dnd-kit for drag-and-drop
- **Deployment:** Emergent native (Kubernetes)

## Key Files
- `/app/backend/server.py` — All backend endpoints (~3488 lines)
- `/app/backend/google_integration.py` — Google OAuth/Calendar/Gmail
- `/app/backend/cpt_codes.json` — CPT codes data
- `/app/frontend/src/components/AppleDashboard.jsx` — Dashboard, Quick Add, Add-On lists
- `/app/frontend/src/components/UnifiedPatients.jsx` — Patients, Checklist v2, Tasks v2
- `/app/frontend/src/components/Calendar.jsx` — Drag & drop calendar
- `/app/frontend/src/components/AuthPage.jsx` — Login/Register
- `/app/frontend/src/App.js` — Router/navigation

## What's Been Implemented
- [x] Dockerization & AWS Prep
- [x] HIPAA Audit Logging
- [x] Deployment blocker fixes
- [x] Add-On list deletions
- [x] Pre-Op Checklist v2 (5 defaults + free-form)
- [x] Task System v2 (3 auto-tasks, free-text)
- [x] Full Calendar with Drag & Drop (@dnd-kit)
- [x] "Body stream already read" bug fix
- [x] **Deployment fixes (Apr 2026):** 
  - Trimmed requirements.txt (221→23 packages)
  - Added /health root endpoint for production health checks
  - Fixed DB_NAME explicit usage with fail-fast on missing MONGO_URL
  - Removed localhost MongoDB default
  - Cleaned .env comments
  - Added .limit() to 7 unbounded queries
- [x] **Full Platform Smoke Test (Apr 2026):** All features verified working
  - Auth: login/logout/persistent session ✅
  - Dashboard: stat cards, greeting, Quick Add form ✅
  - Calendar: week/month views, navigation, Add-On list ✅
  - Patients: list, search, filters, pre-op checklist, tasks ✅
  - Settings: residents/attendings tabs ✅
  - Bulk Import: CSV upload ✅
  - Mobile: responsive at 390x844 ✅
  - All 22 backend API tests passed ✅

## Pending / Upcoming (P1-P2)
- [ ] Legacy code cleanup (ClinicalDashboard.jsx, surgery-timeline/)
- [ ] Audit Log viewer UI page
- [ ] Break down server.py into modular routes (~3488 lines → modular route files)

## Backlog (P2-P3)
- [ ] Weekly email digest for notifications
- [ ] Push notification service worker
- [ ] Database query pagination for scalability

## Test Reports
- `/app/test_reports/iteration_14.json` — Previous iteration
- `/app/test_reports/iteration_15.json` — Previous iteration
- `/app/test_reports/iteration_16.json` — Previous iteration
- `/app/test_reports/iteration_17.json` — Full smoke test (100% pass rate)
