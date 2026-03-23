# OR Scheduler (SurgiFlow) - Product Requirements Document

## Original Problem Statement
Build a web-based operating room scheduling platform for surgical residents featuring a clinical command center, calendar, patient management, task system, and multi-user support.

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, @dnd-kit (drag-and-drop)
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **DevOps**: Docker, Nginx, AWS (ECS/ECR/CodeBuild)

## Key Pages & Components
- `AppleDashboard.jsx` - Main dashboard with Quick Add Patient
- `Calendar.jsx` - **Full calendar management** with DnD, week/month views, add-on sidebar, schedule/reschedule/cancel actions
- `UnifiedPatients.jsx` - Patient hub with expandable rows, 5-item checklist + custom items, free-text tasks
- `SessionTimeout.jsx` - 15-min inactivity auto-logout

## Calendar Management (NEW)
### Adding Patients
- **Drag-and-drop** from Add-On sidebar → calendar slot (week/month view)
- **Click empty slot** → schedule form with patient search, date, time, OR room, duration
- Drop shows confirmation popover before scheduling

### Removing Patients
- **Move to Add-On List** — removes from calendar, sets status "add-on", patient reappears in sidebar
- **Cancel Case** — removes from schedule, sets status "cancelled", confirmation required
- Both actions available from detail panel and right-click context menu

### Rescheduling
- **Desktop:** Drag scheduled patient to different day/time slot, confirm
- **Mobile:** Tap patient → Edit → change date/time
- Activity log records old and new dates

### Views
- **Week View:** 7 days, 6AM-6PM, 30-min increments, schedule blocks sized by duration
- **Month View:** Full month grid, patient names on day cells, droppable days
- **Navigation:** ← → arrows, Today button, Week/Month toggle
- **Stats:** Scheduled count, Today count, Add-Ons count

### Backend Endpoint
`PATCH /api/patients/{mrn}/calendar` handles all calendar actions:
- `action: "schedule"` — sets date, time, room, duration
- `action: "move_to_addon"` — clears schedule, sets add-on
- `action: "cancel"` — removes schedule entry
- `action: "reschedule"` — changes date/time/room

## Pre-Op Checklist (5 defaults + custom)
1. Imaging (dropdown), 2. Prior Auth, 3. VSP, 4. Ortho Approval, 5. OR Scheduled
- Custom items addable/deletable per patient

## Auto-Generated Tasks (3 only)
Prior Authorization, VSP, Imaging. Task creation uses free-text name input.

## API Endpoints
- `/api/auth/*` - Authentication
- `/api/patients/*` - Patient CRUD (audit-logged)
- `/api/patients/{mrn}/calendar` - Calendar actions (schedule/addon/cancel/reschedule)
- `/api/patients/{mrn}/preop-checklist/*` - Checklist operations
- `/api/cpt-codes/*` - CPT code search
- `/api/schedules/*`, `/api/tasks/*`, `/api/notifications/*`
- `/api/audit-logs` - HIPAA audit log viewer
- `/api/health` - Health check

## Test Credentials
- Admin: `proul076@umn.edu` / `59K63i75%(`

## Completed Work
- [x] Full calendar management with DnD, week/month views, add-on sidebar, schedule/reschedule/cancel
- [x] Pre-Op Checklist v2 (5 defaults + custom items)
- [x] Task System v2 (3 auto-tasks, free-text creation)
- [x] Dockerization, HIPAA audit logging, session timeout, security hardening
- [x] AWS deployment artifacts
- [x] 771 OMFS CPT codes, category-grouped autocomplete
- [x] Patient filtering by attending
- [x] Add-on list delete feature

## Upcoming (P1)
- [ ] Legacy code cleanup

## Backlog (P2)
- [ ] Weekly email digest
- [ ] Push notifications
- [ ] Audit log viewer UI
- [ ] DB pagination

## Last Updated
March 23, 2026 - Full calendar management complete
