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
- **Removed**: Tasks tab (merged into Patients), Pre-Op Status tab (removed), Surgery Timeline (removed from sidebar)

## Key Pages & Components
- `AppleDashboard.jsx` - Main dashboard/command center with Quick Add Patient form
- `UnifiedPatients.jsx` - Central patient management hub (expandable rows with details, checklist, tasks, activity log)
- `ImagingDropdown.jsx` - Multi-select imaging studies dropdown (CT Facial, CT Abd/Leg, PET, OPG, Lat Ceph)
- `Calendar.jsx` - Full-screen calendar view with Week/Month toggle
- `Settings.jsx` - Residents, Attendings, Google Integration tabs
- `BulkImport.jsx` - CSV import wizard
- `Sidebar.jsx` / `MobileNav.jsx` - Navigation components
- `PageLayout.jsx` - Shared layout wrapper

## Database Schema
- **patients**: `{ mrn, patient_name, dob, diagnosis, procedures, procedure_code, attending, status, preop_checklist: [{id, item, checked, type?, selection?}], prep_checklist, comments, activity_log, ... }`
- **tasks**: `{ patient_mrn, task_description, task_category, task_type, urgency, assigned_to, due_date, status, completed, ... }`
- **schedules**: `{ patient_mrn, patient_name, procedure, staff, scheduled_date, scheduled_time, status, is_addon, ... }`

## 9-Item OMFS Pre-Op Checklist (Current)
1. Imaging (dropdown with multi-select: CT Facial, CT Abd/Leg Run-Off, PET Scan, OPG, Lateral Cephalometric)
2. Labs Ordered
3. Labs Reviewed
4. Prior Authorization Approved
5. VSP Complete
6. Orthodontist Approval
7. Anesthesia Clearance
8. Medical Optimization Complete
9. OR Scheduled

## API Endpoints
- `/api/auth/*` - Authentication (login, register, me, webauthn)
- `/api/patients/*` - Patient CRUD + status transitions
- `/api/patients/create-with-tasks` - Create patient with auto-generated tasks & checklist
- `/api/patients/with-tasks` - Get all patients with enriched task data
- `/api/patients/{mrn}/preop-checklist/imaging` - Update imaging selections (FIXED: route ordering)
- `/api/patients/{mrn}/preop-checklist/{item_id}` - Toggle checklist items
- `/api/imaging-options` - Get imaging study options
- `/api/schedules/*` - Schedule management
- `/api/tasks/*` - Task management
- `/api/residents/*` / `/api/attendings/*` - Staff management
- `/api/notifications/*` - Notification system
- `/api/google/*` - Google OAuth and Calendar/Gmail integration
- `/api/cpt-codes/*` - CPT code search & favorites
- `/api/import/*` - Bulk CSV import

## Test Credentials
- Admin User: `proul076@umn.edu` / `59K63i75%(`

## Upcoming Tasks (P1)
- [ ] Code cleanup: delete legacy components (surgery-timeline/, ClinicalDashboard.jsx, PatientManagement.jsx, etc.)

## Future/Backlog (P2)
- [ ] Weekly email digest for notifications
- [ ] Push notification service worker for real-time alerts
- [ ] Additional patient intake fields (insurance, notes)

## Last Updated
March 12, 2026 - Multi-select CPT codes on Quick Add Patient form
