# OProom - OR Scheduling Platform PRD

## Original Problem Statement
Full-stack OR scheduling platform for surgical residents with Docker deployment, HIPAA audit logging, drag-and-drop calendar, pre-op checklists, and task management.

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
- `/app/backend/cpt_codes.json` — CPT codes data
- `/app/backend/requirements.txt` — 20 packages (trimmed from 221)
- `/app/backend/.dockerignore` — Excludes .env, raw text, caches
- `/app/frontend/src/components/AppleDashboard.jsx` — Dashboard, Quick Add
- `/app/frontend/src/components/UnifiedPatients.jsx` — Patients, Checklist, Tasks
- `/app/frontend/src/components/Calendar.jsx` — Drag & drop calendar
- `/app/frontend/src/components/DiagnosisAutocomplete.jsx` — Diagnosis search + "Other" free text
- `/app/frontend/src/components/CPTCodeAutocomplete.jsx` — CPT search + "Other" free text
- `/app/frontend/src/components/PatientDetailPanel.jsx` — Patient detail view

## What's Been Implemented
- [x] Dockerization & AWS Prep
- [x] HIPAA Audit Logging
- [x] Pre-Op Checklist v2 (5 defaults + free-form)
- [x] Task System v2 (3 auto-tasks, free-text)
- [x] Full Calendar with Drag & Drop
- [x] "Body stream already read" bug fix
- [x] Deployment fixes (requirements.txt, /health, DB_NAME, .dockerignore)
- [x] **Orthodontist field** — Free-text input on Quick Add form, stored in patient record, displayed in Patients page and PatientDetailPanel
- [x] **Diagnosis "Other" free text** — When no autocomplete match, shows "Other: Use as entered" option
- [x] **CPT Code "Other" free text** — When no autocomplete match, shows "Other: Use as entered" option

## Pending / Upcoming
- [ ] Legacy code cleanup (ClinicalDashboard.jsx, surgery-timeline/)
- [ ] Audit Log viewer UI page
- [ ] Break down server.py into modular routes

## Backlog
- [ ] Weekly email digest for notifications
- [ ] Push notification service worker
- [ ] Database query pagination for scalability
