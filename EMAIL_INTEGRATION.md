# Email Integration Documentation

## Overview

OProom includes comprehensive email integration capabilities that support:
1. **Notification emails** for task assignments and case additions
2. **Calendar invites** with iCal attachments for scheduled procedures

## Email Features

### 1. Notification System

The platform automatically sends email notifications when:
- **New case added**: All active residents are notified when a new patient case is added
- **Task assigned**: The assigned resident receives an email notification with task details
- **Updates**: Users receive notifications for important changes

### 2. Calendar Integration

The system can send calendar invites (.ics files) that include:
- Event title and description
- Start and end date/time
- Location information
- Attendee list with RSVP tracking
- Organizer information
- Compatible with Gmail, Outlook, Apple Calendar, and other calendar applications

## Configuration

### Required Environment Variables

Set these environment variables in your backend configuration:

```bash
# SMTP Configuration
SMTP_SERVER=smtp.gmail.com          # Gmail SMTP server
SMTP_PORT=587                        # TLS port
SMTP_USERNAME=your-email@gmail.com  # Your Gmail address
SMTP_PASSWORD=your-app-password     # Gmail app password (NOT your regular password)
EMAIL_FROM=your-email@gmail.com     # Sender email address

# Calendar Sync (optional)
CALENDAR_SYNC_ENABLED=true          # Set to 'true' to enable calendar invites
```

### Gmail Setup Instructions

To use Gmail for sending emails and calendar invites:

1. **Enable 2-Factor Authentication** on your Google Account:
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Create an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other" as the device and name it "OProom"
   - Copy the 16-character password generated
   - Use this password as `SMTP_PASSWORD` (NOT your regular Gmail password)

3. **Configure Environment Variables**:
   ```bash
   export SMTP_SERVER=smtp.gmail.com
   export SMTP_PORT=587
   export SMTP_USERNAME=your-email@gmail.com
   export SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # The app password
   export EMAIL_FROM=your-email@gmail.com
   export CALENDAR_SYNC_ENABLED=true
   ```

## How It Works

### Notification Flow

1. **User Action**: A resident adds a case or creates a task
2. **Backend Processing**: The system creates a notification record in MongoDB
3. **Email Delivery**: If SMTP credentials are configured, an email is sent
4. **In-App Notification**: A notification appears in the bell icon in the dashboard

### Calendar Invite Flow

1. **Schedule Creation**: When a procedure is scheduled with a date/time
2. **iCal Generation**: The backend creates an RFC 5545-compliant iCalendar file
3. **Email with Attachment**: The .ics file is attached to an email
4. **Calendar Import**: Recipients can add the event to their calendar with one click

## Current Implementation Status

### ✅ Fully Implemented

- Email notification system for task assignments
- Email notification system for case additions
- iCalendar (.ics) file generation
- SMTP email delivery with Gmail support
- Notification bell UI in dashboard
- Unread notification tracking

### 🔧 Configuration Required

To activate email features, you must:
1. Set up Gmail app password (see instructions above)
2. Configure environment variables in your deployment
3. Set `CALENDAR_SYNC_ENABLED=true` for calendar invites

### 📧 Email Templates

The system currently sends plain text emails with the following information:

**Task Assignment Email:**
```
Subject: New Task Assigned: [Task Description]

Body:
You have been assigned a new task:

Task: [Task Description]
Due Date: [Due Date]
Patient: [Patient Name] (if linked)

Please log in to OProom to view details.
```

**Case Addition Email:**
```
Subject: New Case Added: [Patient Name]

Body:
A new patient case has been added:

Patient: [Patient Name]
Procedure: [Procedure Name]
Attending: [Attending Name]

Please log in to OProom to view details and prep checklist.
```

## Testing Email Integration

### 1. Verify Configuration

Check that environment variables are set:
```bash
echo $SMTP_USERNAME
echo $SMTP_PASSWORD
echo $CALENDAR_SYNC_ENABLED
```

### 2. Test Notification Email

1. Log in to the OProom dashboard
2. Create a new task and assign it to a resident
3. Check the resident's email inbox
4. Verify the notification email was received

### 3. Test Calendar Invite

1. Schedule a new procedure with a date and time
2. The system will send a calendar invite to attendees
3. Check email for the .ics attachment
4. Click to add to your calendar

## Troubleshooting

### Emails Not Sending

**Issue**: No emails are being delivered

**Solutions**:
- Verify SMTP credentials are correctly set in environment variables
- Ensure you're using a Gmail app password, not your regular password
- Check that 2-factor authentication is enabled on your Google account
- Verify the email address in SMTP_USERNAME matches EMAIL_FROM
- Check backend logs for error messages

### Calendar Invites Not Working

**Issue**: Calendar invites not appearing

**Solutions**:
- Ensure `CALENDAR_SYNC_ENABLED=true` is set
- Verify all SMTP configuration is correct
- Check that the scheduled procedure has a valid date/time
- Confirm attendee email addresses are valid

### Gmail Blocking Emails

**Issue**: Gmail rejects login attempts

**Solutions**:
- Use an app password instead of your regular password
- Enable "Less secure app access" (not recommended; use app passwords instead)
- Check for security alerts in your Google account

## Security Best Practices

1. **Never commit credentials**: Don't add SMTP credentials to version control
2. **Use environment variables**: Always configure via environment variables
3. **App passwords only**: Use Gmail app passwords, never your main password
4. **Rotate passwords**: Periodically regenerate app passwords
5. **Monitor usage**: Check your Gmail sent folder for unusual activity

## API Endpoints Related to Email

- `POST /api/tasks` - Creates task and sends notification email to assignee
- `POST /api/patients` - Creates patient and sends notification to all active residents
- `GET /api/notifications/unread` - Retrieves unread notifications for current user
- `PATCH /api/notifications/{id}/read` - Marks notification as read

## Code Reference

Email integration code is located in:
- **Backend**: `/home/user/OProom/backend/server.py`
  - Lines 52-58: SMTP configuration
  - Lines 61-87: `create_ical_event()` - iCalendar generation
  - Lines 89-124: `send_calendar_invite()` - Calendar invite delivery
  - Lines 126-148: `send_notification_email()` - Notification email delivery
  - Lines 151-171: `create_notification()` - Notification creation and dispatch

- **Frontend**: `/home/user/OProom/frontend/src/components/AppleDashboard.jsx`
  - Lines 356-400: Notification bell UI and dropdown
  - Lines 103, 136: Notification fetching on dashboard load

## Future Enhancements

Potential improvements for email integration:

1. **HTML Email Templates**: Rich formatting for better presentation
2. **Email Preferences**: Allow users to configure notification preferences
3. **Digest Emails**: Daily/weekly summary emails instead of immediate notifications
4. **Two-way Calendar Sync**: Sync calendar events back from email to OProom
5. **Email Thread Tracking**: Group related notifications into email threads
6. **Batch Notifications**: Combine multiple notifications into single email

---

**Last Updated**: 2026-01-24
**Version**: 1.0
