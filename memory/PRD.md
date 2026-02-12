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
- [x] **CPT Favorites** - Common maxillofacial procedures from maxillofacial.org
- [x] PWA setup for mobile installation

### CPT Code Feature (Complete - Feb 2026)
- [x] Backend API endpoint: `/api/cpt-codes/search`
- [x] Backend API endpoint: `/api/cpt-codes/favorites`
- [x] JSON database with 200+ maxillofacial CPT codes from maxillofacial.org
- [x] Combined Procedure/CPT field with autocomplete in Quick Add Patient form
- [x] ⭐ Favorites dropdown shows common procedures on focus
- [x] Categories: Biopsy, Ablation, Reconstruction, Orthognathic, Cosmetic, Fractures, etc.
- [x] Selected CPT code displayed as badge next to field label

### Google Integration (Complete ✅)
- [x] Backend OAuth endpoints implemented (`/api/google/auth-url`, `/api/google/callback`, etc.)
- [x] Frontend UI for connecting Google account (Settings → Email & Calendar)
- [x] Calendar event creation/update/delete functionality
- [x] Gmail integration for VSP session detection
- [x] Google Cloud Console configured with correct redirect URI
- [x] User successfully connected Gmail, Calendar, and VSP Sessions (Feb 2026)

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
- `/api/cpt-codes/search` - CPT code autocomplete search
- `/api/cpt-codes/favorites` - Common CPT codes
- `/api/google/*` - Google OAuth and Calendar/Gmail integration

## Database Collections
- `users` - User accounts with Google credentials
- `schedules` - OR cases (patients) with status workflow
- `tasks` - Task assignments
- `residents` - Resident profiles
- `attendings` - Attending profiles
- `notifications` - User notifications

## Recently Completed (Feb 12, 2026)
- [x] **Enhanced Clickable Stat Cards UX**:
  - Click animation with ripple effect for visual feedback
  - Hover subtitles showing action hints (e.g., "Click to view add-on list →")
  - Icon container glow effect on hover
- [x] **Drill-Down Filters**:
  - "Pending Cases" → Patients view with "Add-On Cases" filter pre-applied
  - "Tasks Due" → Tasks view with "Due Soon (3 days)" filter pre-applied
  - "Today's Schedule" / "This Week" → Calendar view with filter banner
  - Toast notifications confirming filter action (e.g., "Showing 2 add-on cases")
  - Filter banners with "Clear filter" option to remove drill-down
- [x] **New Filter Options**:
  - Added "Add-On Cases" filter to Patients page
  - Added "Due Soon (3 days)" filter to Tasks page

## Previously Completed (Feb 10, 2026)
- [x] **Clickable Dashboard Stat Cards** - All 4 stat cards navigate to their respective pages
- [x] Added `data-testid` attributes to stat cards for better testability
- [x] Added Calendar component import and view routing in AppleDashboard

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
- Test User: `testuser@example.com` / `Test123!`

## Last Updated
February 10, 2026
