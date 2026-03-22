# OR Scheduler (SurgiFlow) - Product Requirements Document

## Original Problem Statement
Build a web-based operating room scheduling platform for surgical residents featuring:
- A central, dense, EMR-style clinical command center as a single-page application
- A dominant calendar view for scheduling OR cases, conferences, and meetings
- A patient intake form with CPT code lookup
- An "Add-On List" for unscheduled patients
- A task management system
- Multi-user login for residents
- Ability to assign tasks to other residents
- Comments/notes section for each patient case and an activity log
- Integration with Gmail for calendar event syncing
- Responsive, information-dense UI/UX
- Bulk CSV import for residents and attendings

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **Architecture**: Single-Page Application (SPA) with dedicated page components
- **Integrations**: Google OAuth 2.0 (Gmail/Calendar), PWA
- **DevOps**: Docker, Nginx, AWS (ECS/ECR/CodeBuild)

## Current Navigation
- **Desktop Sidebar**: Dashboard, Calendar, Patients, Bulk Import, Settings
- **Mobile Nav**: Home, Calendar, Patients, Settings

## Key Pages & Components
- `AppleDashboard.jsx` - Main dashboard with Quick Add Patient form
- `UnifiedPatients.jsx` - Central patient hub (expandable rows, checklist, tasks, imaging dropdown, attending filter)
- `ImagingDropdown.jsx` - Multi-select imaging studies dropdown
- `CPTCodeAutocomplete.jsx` - Multi-select CPT autocomplete with category-grouped dropdown
- `Calendar.jsx` - Full-screen calendar view
- `Settings.jsx` - Residents, Attendings, Google Integration tabs
- `BulkImport.jsx` - CSV import wizard
- `SessionTimeout.jsx` - 15-min inactivity auto-logout with 3-min warning modal

## Pre-Op Checklist (5 default items + custom)
**Default items (cannot be deleted):**
1. Imaging (dropdown: CT Facial, CT Abd/Leg Run-Off, PET Scan, OPG, Lateral Cephalometric)
2. Prior Authorization Approved
3. VSP Complete
4. Orthodontist Approval
5. OR Scheduled

**Custom items:** Provider can add any custom checklist item per patient via "+ Add checklist item" input. Custom items are deletable.

**Removed items:** Labs Ordered, Labs Reviewed, Anesthesia Clearance, Medical Optimization

## Auto-Generated Tasks (3 only)
1. Prior Authorization (insurance)
2. VSP - Virtual Surgical Planning (surgical_planning)
3. Imaging (imaging)

**Removed auto-tasks:** Labs (CBC/BMP), Anesthesia Pre-Op Evaluation, Orthodontist Approval

Task creation uses **free-text name input** — provider types whatever they want. Category dropdown is optional.

## CPT Code System (771 codes, 12 categories)
- **Backend**: `/app/backend/cpt_codes.json` — served via `/api/cpt-codes/*` endpoints
- **Frontend**: Async-loaded from backend, local search with relevance scoring

## API Endpoints
- `/api/auth/*` - Authentication (no rate limiting)
- `/api/patients/*` - Patient CRUD + status transitions (audit-logged)
- `/api/patients/{mrn}/preop-checklist/imaging` - Update imaging selections
- `/api/patients/{mrn}/preop-checklist/{item_id}` - Toggle checklist items
- `/api/patients/{mrn}/preop-checklist/custom-item` - POST: add custom item, DELETE: remove custom item
- `/api/cpt-codes/*` - CPT code search/browse
- `/api/imaging-options` - Imaging study options
- `/api/schedules/*` - Schedule management
- `/api/tasks/*` - Task management
- `/api/notifications/*` - Notification system
- `/api/google/*` - Google OAuth and Calendar/Gmail
- `/api/import/*` - Bulk CSV import
- `/api/audit-logs` - HIPAA-compliant audit log viewer
- `/api/health` - Health check

## Test Credentials
- Admin: `proul076@umn.edu` / `59K63i75%(`

## Completed Work
- [x] Unified Patients page
- [x] Quick Add Patient with auto-generated tasks & checklist
- [x] Imaging multi-select dropdown
- [x] Quick-filter by attending on Patients page
- [x] Multi-select CPT codes
- [x] 771 OMFS CPT/CDT codes
- [x] In-app notification system
- [x] Dockerization (backend/frontend Dockerfiles, nginx.conf, docker-compose.yml)
- [x] Production env config (.env.example, fail-fast)
- [x] HIPAA audit logging
- [x] Session timeout (15-min with 3-min warning)
- [x] Security hardening (security headers middleware)
- [x] AWS deployment artifacts (task-definition.json, buildspec.yml)
- [x] Add-on list delete feature
- [x] **Pre-Op Checklist v2** — 5 defaults + free-form custom items, migration of existing patients
- [x] **Task System v2** — 3 auto-tasks, free-text task creation, optional category

## Upcoming Tasks (P1)
- [ ] Legacy code cleanup (surgery-timeline/, ClinicalDashboard.jsx)

## Future/Backlog (P2)
- [ ] Weekly email digest for notifications
- [ ] Push notification service worker
- [ ] Audit log viewer UI page
- [ ] DB query pagination for production scalability

## Last Updated
March 22, 2026 - Pre-Op Checklist v2 and Task System v2 complete
