# OProom - OR Scheduling Platform PRD

## Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB Atlas
- **Auth:** JWT + WebAuthn, centralized via `utils/auth.js` (sessionStorage)

## Key Files
- `/app/backend/server.py` — All backend endpoints
- `/app/backend/google_integration.py` — Google OAuth/Calendar/Gmail
- `/app/backend/requirements.txt` — 20 packages (trimmed)
- `/app/frontend/src/utils/auth.js` — Centralized auth (sessionStorage)
- `/app/frontend/src/components/AppleDashboard.jsx` — Dashboard, Quick Add
- `/app/frontend/src/components/UnifiedPatients.jsx` — Patients, Checklist, Tasks, Categories
- `/app/frontend/src/components/Calendar.jsx` — Drag & drop calendar
- `/app/frontend/src/components/AuthPage.jsx` — Login/Register

## What's Been Implemented
- [x] Dockerization, HIPAA Audit Logging, Deployment Fixes
- [x] Pre-Op Checklist v2, Task System v2, Calendar DnD
- [x] Orthodontist field, Diagnosis/CPT "Other" free text
- [x] Patient Categories (color-coded, filter pills, Group by Category)
- [x] Last Clinic Appointment & Records Appointment (VSP) date fields
- [x] **Code Quality Fixes (Apr 2026 - Round 2):**
  - Deleted test file with hardcoded secrets (test_appointment_dates.py)
  - Switched auth token storage from localStorage to sessionStorage (XSS mitigation)
  - Fixed React hooks missing dependencies (UnifiedPatients, use-toast, PatientDetailPanel)
  - Fixed 10 empty catch blocks (nativeFeatures, NotificationBell, Settings)
  - Fixed array-index-as-key in UnifiedPatients, ConferenceManager, BulkImport
  - Fixed Settings.jsx fetchAttendings regression

## Pending
- [ ] Refactor high-complexity functions (normalize_preop_checklist, calendar_action, parse_csv_file)
- [ ] Split oversized components (AppleDashboard 1242 lines, Settings 795 lines, AuthPage 577 lines)
- [ ] Break down server.py into modular routes
- [ ] Audit Log viewer UI page
- [ ] Weekly email digest for notifications
- [ ] Push notification service worker
- [ ] Database query pagination for scalability
