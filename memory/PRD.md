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
- **Removed**: Tasks tab (merged into Patients), Pre-Op Status tab (removed), Surgery Timeline (removed)

## Key Pages & Components
- `AppleDashboard.jsx` - Main dashboard with Quick Add Patient form (preloads CPT codes)
- `UnifiedPatients.jsx` - Central patient hub (expandable rows, checklist, tasks, imaging dropdown, attending filter)
- `ImagingDropdown.jsx` - Multi-select imaging studies dropdown
- `CPTCodeAutocomplete.jsx` - Multi-select CPT autocomplete with category-grouped dropdown
- `Calendar.jsx` - Full-screen calendar view with Week/Month toggle
- `Settings.jsx` - Residents, Attendings, Google Integration tabs
- `BulkImport.jsx` - CSV import wizard
- `Sidebar.jsx` / `MobileNav.jsx` - Navigation components
- `SessionTimeout.jsx` - 15-min inactivity auto-logout with 3-min warning modal

## CPT Code System (771 codes, 12 categories)
- **Source**: Optum Current Procedural Coding Expert 2024 (Book2 pages 1-237 + pages 475-808) + Optum OMS Coding Guide (Book1, 784 pages OCR'd) + OMFS clinical expertise
- **Backend**: `/app/backend/cpt_codes.json` — served via `/api/cpt-codes/*` endpoints
- **Frontend**: Async-loaded from backend, local search with relevance scoring
- **Categories**: Dentoalveolar (60), Orthognathic (33), Reconstruction & Free Flaps (97), Oncology & Ablative (113), Pathology (35), TMJ (18), Odontogenic Infections (17), Trauma (91), Complex Case & Supportive (48), Implants & Preprosthetic (18), Cleft & Craniofacial (20), Miscellaneous (221)

## 9-Item OMFS Pre-Op Checklist
1. Imaging (dropdown: CT Facial, CT Abd/Leg Run-Off, PET Scan, OPG, Lateral Cephalometric)
2. Labs Ordered
3. Labs Reviewed
4. Prior Authorization Approved
5. VSP Complete
6. Orthodontist Approval
7. Anesthesia Clearance
8. Medical Optimization Complete
9. OR Scheduled

## API Endpoints
- `/api/auth/*` - Authentication (rate-limited login: 10/min)
- `/api/patients/*` - Patient CRUD + status transitions (audit-logged)
- `/api/patients/{mrn}/preop-checklist/imaging` - Update imaging selections
- `/api/patients/{mrn}/preop-checklist/{item_id}` - Toggle checklist items
- `/api/cpt-codes/search?query=` - Search CPT codes
- `/api/cpt-codes/all` - Full categorized CPT JSON
- `/api/cpt-codes/categories` - Category names with counts
- `/api/cpt-codes/favorites?diagnosis=` - Diagnosis-filtered favorites
- `/api/imaging-options` - Imaging study options
- `/api/schedules/*` - Schedule management
- `/api/tasks/*` - Task management
- `/api/notifications/*` - Notification system
- `/api/google/*` - Google OAuth and Calendar/Gmail
- `/api/import/*` - Bulk CSV import
- `/api/usage/*` - Usage tracking
- `/api/audit-logs` - HIPAA-compliant audit log viewer (supports filters: limit, resource_type, action, user_email)
- `/api/health` - Health check

## Test Credentials
- Admin: `proul076@umn.edu` / `59K63i75%(`

## Completed Work
- [x] Unified Patients page (merged Patients + Tasks tabs)
- [x] Quick Add Patient with auto-generated tasks & 9-item OMFS checklist
- [x] Imaging multi-select dropdown (FIXED route ordering bug)
- [x] Quick-filter by attending on Patients page
- [x] Multi-select CPT codes (removable tags)
- [x] 771 OMFS CPT/CDT codes from 3 PDFs, categorized, deployed
- [x] Category-grouped CPT autocomplete dropdown with color coding
- [x] In-app notification system
- [x] Pre-Op Status tab removed, Surgery Timeline removed
- [x] Legacy components deleted
- [x] **Dockerization** — backend/Dockerfile, frontend/Dockerfile, frontend/nginx.conf, docker-compose.yml
- [x] **Production env config** — .env.example template, fail-fast on missing secrets in production
- [x] **HIPAA audit logging** — audit_logs collection, all auth+patient actions logged, GET /api/audit-logs endpoint
- [x] **Session timeout** — 15-min inactivity auto-logout with 3-min warning modal (SessionTimeout.jsx)
- [x] **Security hardening** — rate limiting (10/min on login via slowapi), security headers middleware (X-Frame-Options, X-Content-Type-Options, HSTS, X-XSS-Protection, Referrer-Policy, Cache-Control, Pragma)
- [x] **AWS deployment artifacts** — task-definition.json (ECS Fargate), buildspec.yml (CodeBuild CI/CD)

## Upcoming Tasks (P1)
- [ ] Code cleanup: delete remaining legacy components (surgery-timeline/, ClinicalDashboard.jsx, etc.)

## Future/Backlog (P2)
- [ ] Weekly email digest for notifications
- [ ] Push notification service worker
- [ ] Additional patient intake fields (insurance, notes)

## Last Updated
March 14, 2026 - Productionization for AWS complete (Docker, audit logging, session timeout, security hardening, AWS deployment artifacts)
