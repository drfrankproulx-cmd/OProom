# OProom - OR Scheduling Platform PRD

## Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB Atlas
- **Auth:** JWT + WebAuthn, centralized via `utils/auth.js` (sessionStorage)
- **PWA:** Service worker with network-first strategy (sw.js v3)

## Key Files
- `/app/backend/server.py` — All backend endpoints
- `/app/frontend/src/components/UnifiedPatients.jsx` — Patients tab with categories, filters
- `/app/frontend/src/components/Sidebar.jsx` — Collapsible sidebar
- `/app/frontend/src/components/PageLayout.jsx` — Layout with sidebar state
- `/app/frontend/public/sw.js` — Service worker (network-first, v3)

## What's Been Implemented
- [x] Dockerization, HIPAA Audit Logging, Deployment Fixes
- [x] Pre-Op Checklist v2, Task System v2, Calendar DnD
- [x] Orthodontist field, Diagnosis/CPT "Other" free text
- [x] Patient Categories (color-coded, filter pills, Group by Category)
- [x] Last Clinic Appointment & Records Appointment (VSP) date fields
- [x] Code Quality Fixes (security, hooks, catch blocks, array keys)
- [x] Collapsible Sidebar (toggle chevrons, icons-only mode)
- [x] Service Worker Fix (network-first strategy, auto-update)
- [x] **Severity & Procedure Filters (Apr 2026):**
  - Severity dropdown: Severe/Malignant, Moderate, Mild/Cosmetic, Unspecified
  - Procedure dropdown: populated from patient data
  - Keywords: malignancy/carcinoma/cancer → Severe, fracture/cyst/tumor → Moderate, hypoplasia/asymmetry → Mild

## Pending
- [ ] Audit Log viewer UI page
- [ ] Split oversized components (AppleDashboard 1424 lines, Settings 795 lines)
- [ ] Break down server.py into modular routes
- [ ] Weekly email digest for notifications
- [ ] Push notification service worker
- [ ] Database query pagination for scalability
