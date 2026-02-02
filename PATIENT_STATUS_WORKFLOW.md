# Patient Status Management & Auto-Archival System

## Overview

The OProom application now includes a comprehensive patient status management system with automatic archival capabilities. This system tracks patients through their entire surgical workflow from pre-operative preparation through procedure completion and archival.

## Status Workflow

### Status Progression

```
┌──────────┐      ┌───────────┐      ┌────────┐      ┌───────────┐      ┌──────────┐
│ Pending  │ ───▶ │ Confirmed │ ───▶ │ In OR  │ ───▶ │ Completed │ ───▶ │ Archived │
└──────────┘      └───────────┘      └────────┘      └───────────┘      └──────────┘
      │
      │
      ▼
┌───────────┐
│ Deficient │
└───────────┘
```

### Status Definitions

1. **Pending** (Default)
   - Initial status when patient is added
   - Pre-operative requirements in progress
   - Color: Yellow/Warning

2. **Confirmed**
   - All pre-operative requirements completed
   - Patient ready for surgery
   - Can be sent to OR
   - Color: Green/Success

3. **Deficient**
   - Missing required pre-operative items
   - Needs attention before proceeding
   - Color: Red/Destructive

4. **In OR**
   - Patient has entered the operating room
   - Procedure in progress
   - Can be marked as completed
   - Color: Blue

5. **Completed**
   - Procedure successfully completed
   - Timestamp recorded (completed_at)
   - Eligible for archival
   - Auto-archives after configured delay (default: 48 hours)
   - Color: Dark Green

6. **Archived**
   - Patient record moved to archived collection
   - Maintains full history and audit log
   - Can be restored if needed
   - Related schedules also marked as archived

## Features

### 1. Status Transition Actions

#### Send to OR
- **Trigger**: Manual button click in Patient Management
- **Prerequisites**: Patient status must be "confirmed"
- **Action**: Changes status to "in_or"
- **Notifications**: All active residents notified
- **Activity Log**: Records user, timestamp, and status change

#### Mark Procedure Complete
- **Trigger**: Manual button click in Patient Management
- **Prerequisites**: Patient status must be "in_or"
- **Action**:
  - Changes status to "completed"
  - Records completion timestamp
  - Starts auto-archive timer
- **Notifications**: All active residents notified
- **Activity Log**: Records completion details
- **User Feedback**: Toast shows auto-archive countdown

#### Manual Archive
- **Trigger**: Manual button click in Patient Management
- **Prerequisites**: Patient status is "completed" (recommended)
- **Action**:
  - Moves patient to archived_patients collection
  - Marks related schedules as archived
  - Records archive reason as "manual_archive"
- **Confirmations**: User must confirm action
- **Reversible**: Yes, via restore function

### 2. Automatic Archival

#### Configuration
- **Environment Variable**: `AUTO_ARCHIVE_DELAY_HOURS`
- **Default**: 48 hours (2 days)
- **Location**: Backend server.py line 62

#### Auto-Archive Process
```python
# Trigger endpoint
POST /api/patients/auto-archive

# Finds all patients:
# - status = "completed"
# - completed_at < (now - AUTO_ARCHIVE_DELAY_HOURS)

# Archives each patient automatically
```

#### Scheduling Options

**Option A: Cron Job (Recommended)**
```bash
# Add to system crontab
# Runs daily at 2 AM
0 2 * * * curl -X POST http://localhost:8001/api/patients/auto-archive \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Option B: Python Scheduler (APScheduler)**
```python
# Add to server.py
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()
scheduler.add_job(
    func=run_auto_archive_job,
    trigger="interval",
    hours=6  # Run every 6 hours
)
scheduler.start()
```

**Option C: Docker Compose Service**
```yaml
services:
  auto-archiver:
    image: curlimages/curl
    command: >
      sh -c "while true; do
        curl -X POST http://backend:8001/api/patients/auto-archive
          -H 'Authorization: Bearer ${API_TOKEN}';
        sleep 21600;
      done"
```

### 3. Archive Management

#### View Archived Patients
- **UI**: Patient Management page → "Show Archived" button
- **Endpoint**: `GET /api/patients/archived`
- **Features**:
  - Shows all archived patients sorted by archive date
  - Displays original patient data
  - Shows archive metadata (archived_at, archived_by, archived_reason)
  - Search functionality works on archived records

#### Restore Patient
- **Trigger**: Click restore button on archived patient
- **Action**:
  - Moves patient back to patients collection
  - Resets status to "pending"
  - Unarchives related schedules
  - Records restoration in activity log
- **Use Cases**:
  - Accidental archive
  - Re-admission
  - Audit review

### 4. Data Retention & Compliance

#### What Gets Archived
- Complete patient record (all fields)
- Full activity log (audit trail)
- All comments and notes
- Preparation checklist status
- Archive metadata:
  - archived_at: timestamp
  - archived_by: user email or "system_auto_archive"
  - archived_reason: "manual_archive" or "auto_archive_after_XXh"

#### What Gets Marked (Not Deleted)
- Related schedules in schedules_collection
  - marked with archived: true
  - archived_at timestamp added
  - NOT moved to separate collection

#### HIPAA Compliance
- ✅ Maintains complete audit trail
- ✅ Records all access and modifications
- ✅ Preserves data integrity
- ✅ Allows data restoration
- ✅ Soft delete (no data destruction)
- ⚠️ Long-term retention policy needed (not implemented)
- ⚠️ Anonymization for research (not implemented)

## API Endpoints

### Status Transitions

#### Send Patient to OR
```http
POST /api/patients/{mrn}/send-to-or
Authorization: Bearer {token}

Response:
{
  "message": "Patient sent to OR successfully",
  "status": "in_or"
}
```

#### Mark Procedure Complete
```http
POST /api/patients/{mrn}/mark-complete
Authorization: Bearer {token}

Response:
{
  "message": "Procedure marked as complete",
  "status": "completed",
  "completed_at": "2024-01-15T14:30:00.000Z",
  "auto_archive_in_hours": 48
}
```

#### Manual Archive
```http
POST /api/patients/{mrn}/archive
Authorization: Bearer {token}

Response:
{
  "message": "Patient archived successfully",
  "mrn": "123456",
  "archived_at": "2024-01-17T10:00:00.000Z"
}
```

### Archive Management

#### Get Archived Patients
```http
GET /api/patients/archived
Authorization: Bearer {token}

Response: Array<Patient>
```

#### Restore Patient
```http
POST /api/patients/{mrn}/restore
Authorization: Bearer {token}

Response:
{
  "message": "Patient restored successfully",
  "mrn": "123456"
}
```

#### Run Auto-Archive Job
```http
POST /api/patients/auto-archive
Authorization: Bearer {token}

Response:
{
  "message": "Auto-archive completed",
  "archived_count": 5,
  "delay_hours": 48
}
```

## Frontend Components

### Updated Components

1. **PatientManagement.jsx**
   - New status options in dropdown (in_or, completed)
   - Quick action buttons:
     - Send to OR (arrow icon) - shown for "confirmed" patients
     - Mark Complete (checkmark icon) - shown for "in_or" patients
     - Archive (archive icon) - shown for "completed" patients
   - "Show Archived" / "Show Active" toggle button
   - Restore button for archived patients

2. **PatientIntakeForm.jsx**
   - Status dropdown shown only when editing existing patients
   - All status options available
   - Workflow explanation text

3. **ClinicalDashboard.jsx**
   - Updated ReadinessIndicator with new status colors
   - Color indicators:
     - in_or: Blue
     - completed: Dark Green

4. **AppleDashboard.jsx**
   - Updated EventCard status colors
   - Visual distinction for in-progress and completed cases

5. **StatusTransitionButtons.jsx** (New)
   - Reusable component for status transitions
   - Props:
     - patient: Patient object
     - onSuccess: Callback after action
     - showLabels: Boolean (show text labels)
     - size: Button size
     - variant: Button variant
     - isArchived: Boolean (show restore vs transition buttons)

## Usage Examples

### Patient Workflow Example

```javascript
// 1. Add patient (status = "pending")
POST /api/patients
{
  "mrn": "123456",
  "patient_name": "John Doe",
  "status": "pending",
  ...
}

// 2. Complete prep checklist
PATCH /api/patients/123456/checklist?checklist_item=xrays&checked=true
PATCH /api/patients/123456/checklist?checklist_item=lab_tests&checked=true
PATCH /api/patients/123456/checklist?checklist_item=insurance_approval&checked=true
PATCH /api/patients/123456/checklist?checklist_item=medical_optimization&checked=true

// 3. Update to confirmed
PUT /api/patients/123456
{ "status": "confirmed", ... }

// 4. Send to OR
POST /api/patients/123456/send-to-or
// Status: confirmed → in_or

// 5. Complete procedure
POST /api/patients/123456/mark-complete
// Status: in_or → completed
// completed_at: 2024-01-15T14:30:00Z

// 6a. Auto-archive (after 48 hours)
POST /api/patients/auto-archive
// Finds patient, archives automatically

// 6b. OR Manual archive
POST /api/patients/123456/archive
// Archives immediately

// 7. View archived
GET /api/patients/archived
// Returns all archived patients

// 8. Restore if needed
POST /api/patients/123456/restore
// Status: completed → pending
```

### Using StatusTransitionButtons Component

```jsx
import StatusTransitionButtons from './StatusTransitionButtons';

function PatientCard({ patient, onUpdate }) {
  return (
    <div>
      <h3>{patient.patient_name}</h3>
      <StatusTransitionButtons
        patient={patient}
        onSuccess={onUpdate}
        showLabels={true}
        size="md"
      />
    </div>
  );
}
```

## Configuration

### Backend Environment Variables

```bash
# MongoDB connection
MONGO_URL=mongodb://localhost:27017/or_scheduler

# Auto-archive delay in hours
AUTO_ARCHIVE_DELAY_HOURS=48

# JWT settings
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Frontend Environment Variables

```bash
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:8001
```

## Best Practices

### For Medical Staff

1. **Status Updates**
   - Update status promptly when patient enters OR
   - Mark complete immediately after procedure
   - Review archived patients periodically

2. **Manual Archival**
   - Use manual archive for special cases
   - Do not archive patients with pending follow-ups
   - Check for related tasks before archiving

3. **Restoration**
   - Restore only when necessary (re-admission, error)
   - Review activity log after restoration
   - Update status appropriately after restore

### For Administrators

1. **Auto-Archive Configuration**
   - Set appropriate delay based on facility workflow
   - Monitor archive collection size
   - Implement backup strategy for archived data

2. **Monitoring**
   - Track auto-archive job execution
   - Monitor for failed archives
   - Review activity logs regularly

3. **Data Retention**
   - Implement long-term retention policy
   - Consider regulatory requirements (HIPAA, state laws)
   - Plan for eventual data anonymization or deletion

## Troubleshooting

### Auto-Archive Not Running
- Check cron job configuration
- Verify API endpoint is accessible
- Check authentication token validity
- Review server logs for errors

### Patient Not Archiving
- Verify patient status is "completed"
- Check completed_at timestamp exists
- Ensure delay period has passed
- Check for API errors

### Cannot Restore Patient
- Verify patient exists in archived_patients collection
- Check for MRN conflicts in active patients
- Review server logs for MongoDB errors

### Missing Activity Logs
- Ensure all status changes go through API endpoints
- Check that current_user is properly authenticated
- Verify MongoDB write operations succeed

## Future Enhancements

### Planned Features
- [ ] Configurable retention policies per facility
- [ ] Bulk archive operations
- [ ] Archive search and filtering
- [ ] Export archived data to external storage
- [ ] Anonymization workflow for research
- [ ] Dashboard statistics for archived patients
- [ ] Scheduled reports on archive metrics
- [ ] Archive audit reports

### Technical Improvements
- [ ] Background job scheduler (APScheduler integration)
- [ ] Archive compression
- [ ] S3/cloud storage integration for long-term archive
- [ ] ElasticSearch for archived patient search
- [ ] GraphQL API for complex queries
- [ ] WebSocket notifications for real-time updates

## Support

For questions or issues:
1. Check activity_log for audit trail
2. Review server logs at `/var/log/oproom/`
3. Contact system administrator
4. Refer to main README.md for setup instructions

---

**Last Updated**: 2024
**Version**: 1.0.0
**Compliance**: HIPAA-ready (pending full audit)
