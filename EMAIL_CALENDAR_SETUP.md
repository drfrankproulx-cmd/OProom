# OR Scheduler - Email Calendar Integration Setup Guide

## Overview
The OR Scheduler platform now includes integrated email calendar functionality that sends calendar invites (iCalendar/ICS format) for OR cases, conferences, and meetings. This guide will help you set up Gmail integration for University of Minnesota residents.

## Features
- Automatic calendar invites sent via email when scheduling OR cases
- Meeting invitations for conferences with all attendees
- iCalendar (ICS) format compatible with Gmail, Outlook, Apple Calendar
- Includes patient details, procedure information, attending surgeon
- 24-hour and 1-hour automatic reminders (set by email client)

## Setup Instructions

### Step 1: Enable Gmail App Password

Since you have a University of Minnesota Gmail account, you'll need to create an App Password:

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to Security → 2-Step Verification (enable if not already)
3. Scroll to "App passwords"
4. Select "Mail" and "Other (Custom name)"
5. Enter "OR Scheduler" as the app name
6. Copy the generated 16-character password

### Step 2: Configure Backend Environment Variables

Edit `/app/backend/.env` and add your credentials:

```bash
# Email Configuration (Gmail SMTP)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your.email@umn.edu
SMTP_PASSWORD=your-app-password-here
EMAIL_FROM=your.email@umn.edu
CALENDAR_SYNC_ENABLED=true
```

**Important:** Replace:
- `your.email@umn.edu` with your actual UMN email
- `your-app-password-here` with the 16-character App Password from Step 1

### Step 3: Restart Backend

```bash
sudo supervisorctl restart backend
```

### Step 4: Test Calendar Integration

1. Log into OR Scheduler
2. Add a new patient with an OR date and time
3. Click "Save Patient"
4. Check your UMN email - you should receive a calendar invite with `.ics` attachment
5. Click "Add to Calendar" in the email

## How It Works

### OR Case Scheduling
When you schedule an OR case with a date/time:
- Calendar invite sent to the user who scheduled it
- Title: "OR Case: [Patient Name] - [Procedure]"
- Includes patient MRN, attending surgeon, procedure details
- Default 2-hour duration
- Location: "Operating Room"

### Conference/Meeting Scheduling
When you create a conference:
- Calendar invite sent to organizer and all attendees
- Title: Conference title from form
- Includes notes/agenda
- Default 1-hour duration  
- Location: "Conference Room"
- All attendees receive email invitation

### Calendar Invite Format (ICS)
The system generates iCalendar format files that include:
- Event summary and description
- Start and end times (Central Time - America/Chicago)
- Location information
- Organizer (your email)
- Attendees list
- RSVP request

## Troubleshooting

### Email Not Sending
1. Check that `CALENDAR_SYNC_ENABLED=true` in `.env`
2. Verify SMTP credentials are correct
3. Check backend logs: `sudo supervisorctl tail backend stdout`
4. Ensure 2-factor authentication is enabled on Gmail
5. Verify App Password is correct (no spaces)

### Calendar Invite Not Appearing
1. Check spam/junk folder
2. Verify email client supports `.ics` files
3. Try manually downloading `.ics` attachment and opening

### Permission Errors
- Ensure your Gmail account allows "Less secure app access" or uses App Passwords
- Check that SMTP port 587 is not blocked by firewall

## Email Client Compatibility

### Gmail
✅ Full support - automatically adds to Google Calendar
- Calendar invite appears as event
- Can accept/decline invitation
- Automatic reminders configurable

### Outlook
✅ Full support
- Opens invitation in Outlook
- Can accept/decline
- Adds to Outlook Calendar

### Apple Mail/Calendar
✅ Full support
- Opens in Calendar.app
- Can accept/decline
- Syncs across Apple devices

## Security Considerations

1. **Never commit `.env` file** with real credentials to git
2. **Use App Passwords** instead of account password
3. **Rotate passwords regularly** (every 3-6 months)
4. **Limit access** to backend .env file (chmod 600)
5. **Use TLS/SSL** (port 587 with STARTTLS is secure)

## Advanced Configuration

### Custom Reminders
Users can set their own reminders in their email calendar after accepting invite:
- Gmail: Click event → Edit → Add notification
- Outlook: Event options → Reminder
- Apple Calendar: Event details → Alert

### Two-Way Sync (Future Enhancement)
Currently one-way (OR Scheduler → Email Calendar)
Future versions may support:
- Events created in Gmail appearing in OR Scheduler
- Updates in Gmail reflecting in OR Scheduler
- Requires Google Calendar API integration

## Example Calendar Invite Email

```
Subject: OR Case Scheduled: John Doe

OR Surgical Case

Patient: John Doe (MRN: 123456)
Procedure: Total knee arthroplasty (CPT: 27447)
Attending Surgeon: Dr. Smith
Status: scheduled

Scheduled by: sarah.johnson@umn.edu

[Add to Calendar Button]
[View in OR Scheduler]
```

## Support

For issues or questions:
1. Check backend logs: `sudo supervisorctl tail -100 backend stderr`
2. Verify email configuration in `/app/backend/.env`
3. Test SMTP connection separately if needed
4. Contact IT if university firewall blocks SMTP ports

## Next Steps After Setup

1. ✅ Configure email credentials
2. ✅ Restart backend
3. ✅ Test by scheduling a case
4. ✅ Verify calendar invite received
5. ✅ Add event to your calendar
6. ✅ Share setup instructions with co-residents

---

**Note:** Calendar sync is optional. The OR Scheduler works fully without email integration if `CALENDAR_SYNC_ENABLED=false` or credentials are not provided.
