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

## Recently Completed (Feb 26, 2026)
- [x] **Mobile UI/UX Overhaul (COMPLETE)**:
  - Created `MobileNav.jsx` - Bottom tab bar navigation for mobile devices
  - Updated `PageLayout.jsx` - Switches between desktop sidebar and mobile nav
  - Added comprehensive mobile styles in `index.css` (safe areas, touch targets, z-index)
  - **Dashboard Mobile Fixes**:
    - Stat cards now display in 2-column grid on mobile (`grid-cols-2`)
    - Quick Add Patient form fields stack vertically on mobile
    - All inputs have 44px minimum touch targets
    - Calendar view is horizontally scrollable on mobile
  - **Autocomplete Mobile Fixes**:
    - `DiagnosisAutocomplete.jsx` - z-index 9999, proper sizing, touch-friendly items
    - `CPTCodeAutocomplete.jsx` - z-index 9999, proper sizing, touch-friendly items
  - **Calendar Page Mobile Fixes**:
    - Stats display in 2-column grid on mobile
    - Week view is horizontally scrollable (min-w-[600px])
    - Week/Month toggle buttons are mobile-friendly
    - Event cards have responsive sizing
  - **Patients Page Mobile Fixes**:
    - Card-based layout on mobile (md:hidden) instead of broken table
    - Cards show patient avatar, name, ID, status, diagnosis, procedure, attending, prep progress
    - Summary stats in 2-column grid
  - **Tasks Page Mobile Fixes**:
    - Card-based layout on mobile (md:hidden) instead of broken table
    - Cards show checkbox, task description, status badge, urgency badge, due date, assigned to
    - Stats display in 3-column grid on mobile
- [x] **Pull to Refresh Gesture (COMPLETE)**:
  - Created reusable `PullToRefresh.jsx` component with native-like gesture handling
  - Integrated into Dashboard, Patients, Tasks, and Calendar pages
  - Features: Visual indicator with rotation progress, "Release to refresh" text, spinning animation during refresh
  - Toast notification confirms data refresh
  - Only activates on mobile viewports (md:hidden for desktop)

## Recently Completed (Feb 20, 2026)
- [x] **Drag-and-Drop from Add-On List to Calendar**:
  - Add-On items are now draggable with visual drag handle (GripVertical icon)
  - Calendar days (both week and month view) are valid drop targets
  - Visual feedback during drag: item opacity reduces, drop target highlights orange
  - "Drop here" text appears on active drop target
  - Successfully dropping schedules the patient for that date
  - Toast notification confirms scheduling: "{Patient Name} scheduled for {Date}"
  - Backend `PUT /api/schedules/{id}` updated to support partial updates
- [x] **Backend bcrypt AttributeError Fix**:
  - Fixed recurring passlib/bcrypt version compatibility issue
  - Added stderr suppression during passlib initialization
  - Patched bcrypt module to provide __about__ attribute
  - Backend logs now clean - no more error messages on startup
- [x] **Code Cleanup - Settings.jsx Typo**:
  - Fixed all instances of `fetchAtttendings` → `fetchAttendings`
  - Fixed `setAtttendings` → `setAttendings` (completed earlier)
- [x] **Smart CPT Code Sorting by Diagnosis**:
  - When a diagnosis with ICD code is selected, CPT codes automatically re-sort by relevance
  - Added 200+ CPT codes organized by category
  - ICD-to-CPT mapping ensures relevant procedures appear first
  - Sparkle icon (✨) indicates recommended procedures for selected diagnosis
- [x] **ICD-10 Diagnosis Codes Integration**:
  - Added 80+ ICD-10 diagnosis codes to the diagnosis autocomplete
  - Categories: Trauma, H&N Oncology, TMJ, Orthognathic, Cleft & Craniofacial, Cosmetics
  - ICD codes displayed in dropdown with monospace badge
- [x] **UI/UX Refactor - Consistent Sidebar Navigation**:
  - Created shared `PageLayout.jsx` and `Sidebar.jsx` components
  - All 8 pages now have consistent sidebar
- [x] **Calendar Toggle (Week/Month)**:
  - Dashboard calendar: Replaced stacked weekly+monthly views with toggleable single view
- [x] **Dashboard Layout Improvements**:
  - Cleaner 3-column layout
  - Consistent teal color scheme

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
- LOW: "Made with Emergent" badge can overlay mobile nav buttons (navigation still works)
- PDF extraction tool non-functional (CPT codes use static JSON workaround)

## Upcoming Tasks (P1)
- [ ] Build out "Admin / Reference" view in dashboard dropdown

## Future/Backlog (P2)
- [ ] Legacy component cleanup (ClinicalDashboard.jsx, PatientManagement.jsx, etc.)
- [ ] Additional patient intake fields (insurance, notes)
- [ ] Activity log for patient cases

## Test Credentials
- Test User: `testuser@example.com` / `Test123!`
- Admin User: `proul076@umn.edu` / `59K63i75%(`

## Last Updated
February 26, 2026
