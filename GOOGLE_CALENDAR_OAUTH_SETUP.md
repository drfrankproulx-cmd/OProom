# Google Calendar OAuth Integration Setup Guide

## Overview
This guide will help you set up Google Calendar OAuth integration for OProom. This allows users to connect their personal Google Calendar accounts to automatically sync OR case schedules.

## Error: redirect_uri_mismatch

If you're seeing **"Error 400: redirect_uri_mismatch"**, it means the redirect URI in your Google Cloud Console doesn't match the one configured in your application.

### Quick Fix

**For Emergent Platform Users:**
Use this exact redirect URI in Google Cloud Console:
```
https://oproom.preview.emergent.com/settings
```

**For Local Development:**
Use this exact redirect URI:
```
http://localhost:3000/settings
```

---

## Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: **"OProom Calendar Integration"**
4. Click **"Create"**

### Step 2: Enable Google Calendar API

1. In your project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Calendar API"**
3. Click on it and press **"Enable"**

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace organization)
3. Click **"Create"**

**Fill in the required fields:**
- **App name:** OProom
- **User support email:** Your email (e.g., proul076@umn.edu)
- **Developer contact email:** Your email

4. Under **"Scopes"**, click **"Add or Remove Scopes"**
5. Add these scopes:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`

6. Under **"Test users"**, add your email and any co-residents' emails

7. Click **"Save and Continue"**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"**
4. Enter name: **"OProom Web Client"**

5. **CRITICAL: Add Authorized Redirect URIs**

   **For Emergent (Production):**
   ```
   https://oproom.preview.emergent.com/settings
   ```

   **For Local Development:**
   ```
   http://localhost:3000/settings
   ```

   **Important:**
   - Use the **exact URL** shown above
   - Include `/settings` at the end
   - Match the protocol exactly (https vs http)
   - No trailing slash

6. Click **"Create"**

7. **Copy your credentials:**
   - **Client ID** (looks like: `123456789-abc.apps.googleusercontent.com`)
   - **Client Secret** (looks like: `GOCSPX-abc123xyz`)

### Step 5: Configure Backend Environment Variables

**On Emergent Platform:**

1. Go to your Emergent project settings
2. Add these environment variables:

```bash
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=https://oproom.preview.emergent.com/settings
FRONTEND_URL=https://oproom.preview.emergent.com
```

**For Local Development:**

Edit `/backend/.env`:

```bash
# Google Calendar OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz
GOOGLE_REDIRECT_URI=http://localhost:3000/settings
FRONTEND_URL=http://localhost:3000
```

### Step 6: Restart Backend

**On Emergent:**
The backend will restart automatically when you save environment variables.

**Local Development:**
```bash
cd backend
# Stop the server (Ctrl+C)
python server.py
# Or with supervisor
supervisorctl restart backend
```

### Step 7: Test the Integration

1. Open OProom in your browser
2. Go to **Settings** (gear icon)
3. Click on the **"Integrations"** tab
4. Click **"Connect Google Calendar"**
5. You should be redirected to Google's sign-in page
6. Select your Google account
7. Click **"Allow"** to grant permissions
8. You'll be redirected back to Settings with a success message

---

## Troubleshooting

### Error: redirect_uri_mismatch

**Cause:** The redirect URI in Google Cloud Console doesn't match your application's redirect URI.

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", verify it matches **exactly**:
   - For Emergent: `https://oproom.preview.emergent.com/settings`
   - For Local: `http://localhost:3000/settings`
4. Save changes (wait 5 minutes for Google to propagate changes)
5. Try again

### Error: Access blocked: This app's request is invalid

**Cause:** OAuth consent screen not properly configured or missing scopes.

**Solution:**
1. Go to OAuth consent screen
2. Add the required scopes (see Step 3)
3. Add yourself as a test user
4. Verify app name and support email are filled

### Error: 400 Bad Request (invalid_grant)

**Cause:** Authorization code has expired or been used already.

**Solution:**
1. Try the connection process again
2. Authorization codes are single-use and expire after 10 minutes

### Connection successful but not syncing events

**Check:**
1. User has Google Calendar connected (green checkmark in Settings)
2. Backend has valid access token
3. Cases have dates and times set

**Verify in MongoDB:**
```javascript
db.users.findOne({"email": "your.email@umn.edu"})
// Should have:
// - google_calendar_connected: true
// - google_access_token: "ya29.xxx..."
// - google_refresh_token: "1//xxx..."
```

### Token expired errors

The system automatically refreshes tokens. If you see errors:
1. Disconnect Google Calendar in Settings
2. Reconnect Google Calendar
3. This will generate new refresh token

---

## Security Best Practices

### For Administrators

1. **Never commit credentials to git**
   - Add `.env` to `.gitignore`
   - Use environment variables only

2. **Rotate credentials regularly**
   - Generate new OAuth client credentials every 6 months
   - Revoke old credentials after migration

3. **Monitor token usage**
   - Check Google Cloud Console → "APIs & Services" → "Dashboard"
   - Set up quota alerts

4. **Use minimal scopes**
   - Only request calendar.events and calendar.readonly
   - Don't request unnecessary permissions

### For Users

1. **Review permissions**
   - Only grant access to your work Google account
   - Revoke access anytime from [Google Account Permissions](https://myaccount.google.com/permissions)

2. **Disconnect when no longer needed**
   - Use "Disconnect" button in Settings
   - Removes all stored tokens from database

---

## How It Works

### OAuth Flow

1. **User clicks "Connect Google Calendar"**
   - Frontend calls `/api/auth/google/url`
   - Backend generates authorization URL with scopes
   - User redirected to Google's consent screen

2. **User grants permissions**
   - Google redirects to `/api/auth/google/callback?code=xxx`
   - Backend exchanges code for access_token and refresh_token
   - Tokens stored in user's MongoDB record

3. **Tokens are refreshed automatically**
   - Access tokens expire after 1 hour
   - Backend automatically uses refresh_token to get new access_token
   - Refresh tokens are long-lived (can last indefinitely if used)

### Database Schema

User document after connection:
```javascript
{
  "email": "user@example.com",
  "google_calendar_connected": true,
  "google_access_token": "ya29.a0AVvZVsqxxx...",
  "google_refresh_token": "1//0xxx...",
  "google_token_expires_at": ISODate("2024-01-15T15:30:00.000Z"),
  "google_email": "user@gmail.com",
  "google_connected_at": ISODate("2024-01-15T14:30:00.000Z")
}
```

---

## API Endpoints

### Get OAuth URL
```http
GET /api/auth/google/url
Authorization: Bearer {token}

Response:
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "redirect_uri": "https://oproom.preview.emergent.com/settings"
}
```

### OAuth Callback (handled automatically)
```http
GET /api/auth/google/callback?code={code}&state={user_email}

Redirects to: {FRONTEND_URL}/settings?google_connected=true
```

### Check Connection Status
```http
GET /api/auth/google/status
Authorization: Bearer {token}

Response:
{
  "connected": true,
  "google_email": "user@gmail.com",
  "connected_at": "2024-01-15T14:30:00.000Z"
}
```

### Disconnect Google Calendar
```http
POST /api/auth/google/disconnect
Authorization: Bearer {token}

Response:
{
  "message": "Google Calendar disconnected successfully"
}
```

---

## Future Enhancements

- [ ] Automatically create Google Calendar events when OR cases are scheduled
- [ ] Sync updates to existing events when cases are modified
- [ ] Delete calendar events when cases are canceled
- [ ] Support for recurring conferences
- [ ] Calendar event reminders configuration
- [ ] Bulk sync for existing cases
- [ ] Microsoft Outlook integration
- [ ] Apple Calendar integration

---

## Support

### Common Questions

**Q: Do all users need to connect their own Google Calendar?**
A: Yes, each user connects their personal Google account. This ensures events appear in their individual calendars.

**Q: What happens if I disconnect and reconnect?**
A: You'll need to re-authorize. Your calendar events won't be affected.

**Q: Can I use my university Google Workspace account?**
A: Yes! The integration works with both personal Gmail and Google Workspace (G Suite) accounts.

**Q: How long does the connection last?**
A: Indefinitely, as long as:
- You don't revoke access from Google Account settings
- You don't disconnect in OProom Settings
- You continue using the integration (refresh tokens can expire if unused for 6 months)

**Q: Is my data secure?**
A: Yes. Tokens are encrypted in MongoDB, transmitted over HTTPS, and automatically refreshed. We never store your Google password.

---

## Checklist

Before going live:

- [ ] Created Google Cloud project
- [ ] Enabled Google Calendar API
- [ ] Configured OAuth consent screen
- [ ] Created OAuth 2.0 credentials
- [ ] Added correct redirect URI (https://oproom.preview.emergent.com/settings)
- [ ] Set environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- [ ] Restarted backend
- [ ] Tested connection flow
- [ ] Verified tokens are stored in database
- [ ] Tested disconnection flow

---

**Last Updated:** 2024
**Version:** 1.0.0
**Support:** Check backend logs for detailed error messages

For issues, check:
1. Backend logs: `docker logs backend` or `supervisorctl tail backend stdout`
2. Browser console for frontend errors
3. MongoDB user record for token status
