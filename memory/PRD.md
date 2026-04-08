# OProom - OR Scheduling Platform PRD

## Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB Atlas
- **Auth:** JWT + WebAuthn, centralized via `utils/auth.js`

## Key Files
- `/app/backend/server.py` — All backend endpoints
- `/app/backend/google_integration.py` — Google OAuth/Calendar/Gmail
- `/app/backend/requirements.txt` — 20 packages (trimmed)
- `/app/backend/.dockerignore` — Excludes .env, raw text, caches
- `/app/frontend/src/utils/auth.js` — Centralized auth token management
- `/app/frontend/src/components/AppleDashboard.jsx` — Dashboard, Quick Add
- `/app/frontend/src/components/UnifiedPatients.jsx` — Patients, Checklist, Tasks, Categories
- `/app/frontend/src/components/Calendar.jsx` — Drag & drop calendar
- `/app/frontend/src/components/AuthPage.jsx` — Login/Register

## What's Been Implemented
- [x] Dockerization, HIPAA Audit Logging, Deployment Fixes
- [x] Pre-Op Checklist v2, Task System v2, Calendar DnD
- [x] Orthodontist field, Diagnosis/CPT "Other" free text
- [x] **Code Review Fixes (Apr 2026):**
  - Deleted 14 test files with hardcoded secrets
  - Centralized all auth token access into `utils/auth.js`
  - Fixed 2 mutable default arguments in Python (`attendees=[]`, `cc_emails=[]`)
  - Removed 66 console.log/error/warn statements
  - Deleted 15 dead components + surgery-timeline/ (12,861 lines removed)
- [x] **Patient Categories (Feb 2026):**
  - Color-coded categories: Orthognathic, Dentoalveolar, Trauma, Pathology, Implants, TMJ, Cleft/Craniofacial, Other
  - Category filter pills with counts
  - Group by Category toggle
  - Color-coded left borders and avatar gradients per category
  - Tested: 100% pass rate (9/9 tests) - iteration_18

## Pending
- [ ] Fix missing React hook dependencies (SessionTimeout, UnifiedPatients, NotificationBell)
- [ ] Refactor high-complexity functions (normalize_preop_checklist, calendar_action, parse_csv_file)
- [ ] Split oversized components (AppleDashboard 1245 lines, Settings 768 lines)
- [ ] Break down server.py into modular routes
- [ ] Audit Log viewer UI page
- [ ] Weekly email digest for notifications
- [ ] Push notification service worker
- [ ] Database query pagination for scalability
