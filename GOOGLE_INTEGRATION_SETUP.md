# OProom - Google Integration Setup Guide

## 📧 Full Gmail & Calendar Integration

This guide will help you set up the full Google integration for OProom, enabling:
- ✅ Two-way Google Calendar sync
- ✅ Gmail inbox access within OProom
- ✅ Auto-detect VSP session emails
- ✅ Automatic calendar events for VSP sessions
- ✅ Patient-related email search

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name it: `OProom Healthcare`
4. Click **Create**

---

## Step 2: Enable Required APIs

1. In Google Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Search and enable these APIs:
   - **Gmail API**
   - **Google Calendar API**
   - **Google People API** (for user info)

---

## Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (or Internal if using Google Workspace)
3. Fill in the details:
   - **App name**: OProom OR Scheduler
   - **User support email**: Your email
   - **App logo**: (optional)
   - **Developer contact**: Your email

4. Click **"Add or Remove Scopes"** and add:
   ```
   https://www.googleapis.com/auth/calendar
   https://www.googleapis.com/auth/calendar.events
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.labels
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   ```

5. Add yourself as a **Test User** (required during testing)
6. Save and continue

---

## Step 4: Create OAuth Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Select **"Web application"**
4. Name it: `OProom Web Client`
5. Add **Authorized redirect URIs**:
   ```
   https://orchedule.preview.emergentagent.com/api/google/callback
   ```
   
6. Click **Create**
7. **COPY** the Client ID and Client Secret

---

## Step 5: Configure OProom

Provide me with your Google OAuth credentials:
- **Client ID**: (starts with something like `123456789-xxxx.apps.googleusercontent.com`)
- **Client Secret**: (a random string)

I will securely add them to the backend configuration.

---

## Step 6: Connect Your Google Account

Once configured:
1. Go to OProom Settings (⚙️ icon)
2. Click **"Connect Google Account"**
3. Sign in with your Google account
4. Grant the requested permissions
5. You'll be redirected back to OProom

---

## 🎉 What You Can Do After Setup

### Gmail Integration
- View emails in OProom inbox
- Search emails by patient name or MRN
- Auto-detect VSP session invitations
- Extract meeting links from emails

### Calendar Integration
- See your Google Calendar events in OProom
- OR cases automatically sync to your calendar
- VSP sessions create calendar events with:
  - Patient name
  - Procedure details
  - Video conference link
  - Attending information
- Meetings and conferences sync both ways

### VSP Sessions
- Create VSP sessions from OProom
- Automatically creates Google Calendar event
- Sends invites to attendees
- Links to video conference platforms:
  - Zoom
  - Microsoft Teams
  - Google Meet
  - WebEx

---

## 🔒 Security Notes

- Your Google credentials are stored securely
- Tokens are encrypted in the database
- OProom only requests necessary permissions
- You can disconnect Google anytime from Settings
- HIPAA-compliant data handling

---

## Troubleshooting

### "Access Denied" Error
- Make sure you added yourself as a Test User
- The OAuth consent screen must be published (or in testing mode with you as tester)

### "Invalid Redirect URI"
- Ensure the redirect URI exactly matches: `https://orchedule.preview.emergentagent.com/api/google/callback`

### Tokens Expired
- OProom automatically refreshes tokens
- If issues persist, disconnect and reconnect Google

---

## Need Help?

If you encounter any issues, please share:
1. The error message you see
2. Which step you're on
3. Screenshots if possible

I'll help you get connected! 🚀
