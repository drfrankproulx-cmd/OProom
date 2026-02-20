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
- Bulk CSV import for residents and attendings

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **Architecture**: Single-Page Application (SPA) with dedicated page components
- **Integrations**: Google OAuth 2.0 (Gmail/Calendar), PWA

## What's Been Implemented

### Core Features (Complete)
- [x] User authentication (register/login/logout with JWT)
- [x] Main dashboard (AppleDashboard.jsx) with clickable stats cards
- [x] Weekly and monthly calendar views
- [x] Patient CRUD operations with status workflow (pending → scheduled → completed → archived)
- [x] Resident and Attending management (Settings page)
- [x] Task management system with assignments
- [x] Add-On List for unscheduled cases
- [x] Pre-Op Status module with expandable checklist and delete functionality
- [x] Surgery Timeline tracker with document age validation
- [x] Notifications system
- [x] CPT Code lookup with autocomplete (combined Procedure/CPT field)
- [x] **CPT Favorites** - Common maxillofacial procedures from maxillofacial.org
- [x] PWA setup for mobile installation
- [x] **Bulk CSV Import** - Import residents and attendings from CSV files

### Bulk CSV Import (Complete - Feb 2026)
- [x] Backend API: `GET /api/import/template/{entity_type}` - Download CSV template
- [x] Backend API: `POST /api/import/preview/{entity_type}` - Preview/validate without saving
- [x] Backend API: `POST /api/import/{entity_type}` - Import with skip_duplicates option
- [x] BulkImport.jsx - Multi-step wizard (Upload → Preview → Importing → Complete)
- [x] Entity type selector (Residents/Attendings)
- [x] Drag-and-drop file upload + click-to-browse
- [x] Duplicate detection by email
- [x] Error handling for invalid CSV, wrong headers, missing fields
- [x] Skip duplicates checkbox
- [x] "View Residents/Attendings" navigation after import
- [x] "Import Another File" wizard reset

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
- `AppleDashboard.jsx` - Main dashboard/command center with PageLayout
- `PageLayout.jsx` - Shared layout wrapper with Sidebar (NEW)
- `Sidebar.jsx` - Navigation sidebar component (NEW)
- `Settings.jsx` - Residents, Attendings, Google Integration tabs (uses PageLayout)
- `Patients.jsx` - Excel-like patient list with search/filter (uses PageLayout)
- `Tasks.jsx` - Task management page (uses PageLayout)
- `Calendar.jsx` - Full-screen calendar view with Week/Month toggle (uses PageLayout)
- `PatientStatusList.jsx` - Pre-Op Status tracking (uses PageLayout)
- `SurgeryDashboard.jsx` - Surgery Timeline view (uses PageLayout)
- `BulkImport.jsx` - CSV import wizard (uses PageLayout)

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

## Recently Completed (Feb 20, 2026)
- [x] **ICD-10 Diagnosis Codes Integration**:
  - Added 80+ ICD-10 diagnosis codes to the diagnosis autocomplete
  - Categories: Trauma, H&N Oncology, TMJ, Orthognathic, Cleft & Craniofacial, Cosmetics
  - ICD codes displayed in dropdown with monospace badge (e.g., `S02.65xB`)
  - Search by diagnosis name, category, or ICD code
  - Selected diagnosis shows ICD code in parentheses
- [x] **UI/UX Refactor - Consistent Sidebar Navigation**:
  - Created shared `PageLayout.jsx` and `Sidebar.jsx` components
  - All 8 pages now have consistent sidebar: Dashboard, Calendar, Patients, Tasks, Pre-Op Status, Surgery Timeline, Bulk Import, Settings
  - Navigation items with proper icons and active state highlighting
  - User profile section at bottom of sidebar with logout
- [x] **Calendar Toggle (Week/Month)**:
  - Dashboard calendar: Replaced stacked weekly+monthly views with toggleable single view
  - Calendar page: Already had toggle, added data-testid for testing
  - Toggle buttons with visual state indicators
- [x] **Dashboard Layout Improvements**:
  - Cleaner 3-column layout: Left (Weekly/Add-Ons/Urgent), Center (Calendar), Right (Create Task/Patient Details)
  - Improved spacing and reduced visual clutter
  - Consistent teal color scheme replacing old blue gradients
- [x] **Settings Page Refactor**:
  - Now uses PageLayout with sidebar
  - Cleaner tab design with proper styling
  - Fixed typo: `setAtttendings` → `setAttendings`

## Previously Completed (Feb 12, 2026)
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
- [ ] Drag-and-drop from Add-On List to Calendar

## Future/Backlog (P2)
- [ ] "Admin / Reference" view in dashboard dropdown
- [ ] Legacy component cleanup (ClinicalDashboard.jsx, PatientManagement.jsx, etc.)
- [ ] Additional patient intake fields (insurance, notes)
- [ ] Activity log for patient cases

## Test Credentials
- Test User: `testuser@example.com` / `Test123!`

## Last Updated
February 20, 2026
