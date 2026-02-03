# OR Scheduler - Product Requirements Document

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

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **Architecture**: Single-Page Application (SPA) with dedicated page components
- **Integrations**: Google OAuth 2.0 (Gmail/Calendar), PWA

## What's Been Implemented

### Core Features (Complete)
- [x] User authentication (register/login/logout with JWT)
- [x] Main dashboard (AppleDashboard.jsx) with stats cards
- [x] Weekly and monthly calendar views
- [x] Patient CRUD operations with status workflow (pending → scheduled → completed → archived)
- [x] Resident and Attending management (Settings page)
- [x] Task management system with assignments
- [x] Add-On List for unscheduled cases
- [x] Pre-Op Status module with expandable checklist
- [x] Surgery Timeline tracker with document age validation
- [x] Notifications system
- [x] CPT Code lookup with autocomplete (combined Procedure/CPT field)
- [x] PWA setup for mobile installation

### Google Integration (Configuration Required)
- [x] Backend OAuth endpoints implemented (`/api/google/auth-url`, `/api/google/callback`, etc.)
- [x] Frontend UI for connecting Google account (Settings → Email & Calendar)
- [x] Calendar event creation/update/delete functionality
- [x] Gmail integration for VSP session detection
- [ ] **PENDING USER ACTION**: Add redirect URI to Google Cloud Console:
  - URI: `https://orchedule.preview.emergentagent.com/api/google/callback`

### CPT Code Feature (Complete - Feb 2026)
- [x] Backend API endpoint: `/api/cpt-codes/search`
- [x] JSON database with dental/oral surgery CPT codes
- [x] Combined Procedure/CPT field with autocomplete in Quick Add Patient form
- [x] Selected CPT code displayed as badge next to field label

## Key Pages & Components
- `AppleDashboard.jsx` - Main dashboard/command center
- `Settings.jsx` - Residents, Attendings, Google Integration tabs
- `Patients.jsx` - Excel-like patient list with search/filter
- `Tasks.jsx` - Task management page
- `Calendar.jsx` - Full-screen calendar view
- `PatientStatusList.jsx` - Pre-Op Status tracking
- `SurgeryDashboard.jsx` - Surgery Timeline view

## API Endpoints
- `/api/auth/*` - Authentication (login, register, me)
- `/api/patients/*` - Patient CRUD + status transitions
- `/api/schedules/*` - Schedule management
- `/api/tasks/*` - Task management
- `/api/residents/*` - Resident management
- `/api/attendings/*` - Attending management
- `/api/cpt-codes/search` - CPT code autocomplete
- `/api/google/*` - Google OAuth and Calendar/Gmail integration

## Database Collections
- `users` - User accounts with Google credentials
- `schedules` - OR cases (patients) with status workflow
- `tasks` - Task assignments
- `residents` - Resident profiles
- `attendings` - Attending profiles
- `notifications` - User notifications

## Known Issues
- Intermittent `bcrypt` AttributeError on backend startup (resolves after restart)
- PDF extraction tool non-functional (CPT codes use static JSON workaround)

## Upcoming Tasks (P1)
- [ ] Bulk import feature for residents/attendings (CSV upload)

## Future/Backlog (P2)
- [ ] Drag-and-drop from Add-On List to Calendar
- [ ] "Admin / Reference" view in dashboard dropdown
- [ ] Legacy component cleanup (ClinicalDashboard.jsx, PatientManagement.jsx, etc.)

## Test Credentials
- Test User: `test@example.com` / `Test123!`

## Last Updated
February 3, 2026
