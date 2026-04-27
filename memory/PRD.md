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
- `/app/frontend/src/components/Sidebar.jsx` — Collapsible sidebar
- `/app/frontend/src/components/PageLayout.jsx` — Layout with sidebar state
- `/app/frontend/src/components/AuthPage.jsx` — Login/Register

## What's Been Implemented
- [x] Dockerization, HIPAA Audit Logging, Deployment Fixes
- [x] Pre-Op Checklist v2, Task System v2, Calendar DnD
- [x] Orthodontist field, Diagnosis/CPT "Other" free text
- [x] Patient Categories (color-coded, filter pills, Group by Category)
- [x] Last Clinic Appointment & Records Appointment (VSP) date fields
- [x] Code Quality Fixes (security, hooks, catch blocks, array keys)
- [x] **Collapsible Sidebar (Apr 2026):**
  - Toggle button (chevrons) to minimize/expand
  - Collapsed: icons-only, 68px width
  - Expanded: full 256px with labels
  - Smooth animation transition
  - Content area adjusts automatically

## Pending
- [ ] Refactor high-complexity functions (normalize_preop_checklist, calendar_action, parse_csv_file)
- [ ] Split oversized components (AppleDashboard 1424 lines, Settings 795 lines, AuthPage 628 lines)
- [ ] Break down server.py into modular routes
- [ ] Audit Log viewer UI page
- [ ] Weekly email digest for notifications
- [ ] Push notification service worker
- [ ] Database query pagination for scalability
