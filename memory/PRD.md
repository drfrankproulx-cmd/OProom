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

## CPT Code System (508 codes, 12 categories)
- **Source**: Extracted from Optum Current Procedural Coding Expert 2024 PDF + OMFS clinical expertise
- **Backend**: `/app/backend/cpt_codes.json` — served via `/api/cpt-codes/*` endpoints
- **Frontend**: Async-loaded from backend, local search with relevance scoring
- **Categories**: Dentoalveolar (42), Orthognathic (33), Reconstruction & Free Flaps (83), Oncology & Ablative (75), Pathology (22), TMJ (12), Odontogenic Infections (15), Trauma (81), Complex Case & Supportive (35), Implants & Preprosthetic (14), Cleft & Craniofacial (20), Miscellaneous (76)
- **Features**: Category headers with color coding, subcategory tags, multi-select with removable teal badges, diagnosis-based filtering

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
- `/api/auth/*` - Authentication
- `/api/patients/*` - Patient CRUD + status transitions
- `/api/patients/{mrn}/preop-checklist/imaging` - Update imaging selections (FIXED)
- `/api/patients/{mrn}/preop-checklist/{item_id}` - Toggle checklist items
- `/api/cpt-codes/search?query=` - Search 508 CPT codes by code/name/description
- `/api/cpt-codes/all` - Full categorized CPT JSON
- `/api/cpt-codes/categories` - Category names with counts
- `/api/cpt-codes/favorites?diagnosis=` - Diagnosis-filtered favorites
- `/api/imaging-options` - Imaging study options
- `/api/schedules/*` - Schedule management
- `/api/tasks/*` - Task management
- `/api/notifications/*` - Notification system
- `/api/google/*` - Google OAuth and Calendar/Gmail
- `/api/import/*` - Bulk CSV import
- `/api/usage/*` - Usage tracking (frequently used codes/diagnoses)

## Test Credentials
- Admin: `proul076@umn.edu` / `59K63i75%(`

## Completed Work
- [x] Unified Patients page (merged Patients + Tasks tabs)
- [x] Quick Add Patient with auto-generated tasks & 9-item OMFS checklist
- [x] Imaging multi-select dropdown (FIXED route ordering bug)
- [x] Quick-filter by attending on Patients page
- [x] Multi-select CPT codes (removable tags)
- [x] 508 OMFS CPT codes extracted from PDF, categorized, deployed
- [x] Category-grouped CPT autocomplete dropdown with color coding
- [x] In-app notification system
- [x] Pre-Op Status tab removed, Surgery Timeline removed
- [x] Legacy components deleted (Patients.jsx, Tasks.jsx, patient-status/)

## Upcoming Tasks (P1)
- [ ] Code cleanup: delete remaining legacy components (surgery-timeline/, ClinicalDashboard.jsx, etc.)

## Future/Backlog (P2)
- [ ] Weekly email digest for notifications
- [ ] Push notification service worker
- [ ] Additional patient intake fields (insurance, notes)

## Last Updated
March 12, 2026
