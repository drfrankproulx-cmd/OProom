# Quick Fix: Google OAuth redirect_uri_mismatch Error

## The Problem
You're seeing this error when trying to connect Google Calendar:

```
Access blocked: This app's request is invalid
Error 400: redirect_uri_mismatch
```

## The Solution (3 Steps)

### Step 1: Get Your Credentials

Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

1. Create a new OAuth 2.0 Client ID (or edit existing)
2. Application type: **Web application**

### Step 2: Add Correct Redirect URI

**For Emergent (Production):**
```
https://oproom.preview.emergent.com/settings
```

**For Local Development:**
```
http://localhost:3000/settings
```

⚠️ **CRITICAL:** The redirect URI must match **exactly**:
- Correct protocol (https vs http)
- Exact domain
- Include `/settings` at the end
- NO trailing slash

### Step 3: Update Environment Variables

Set these in your Emergent project settings or `/backend/.env`:

```bash
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
GOOGLE_REDIRECT_URI=https://oproom.preview.emergent.com/settings
FRONTEND_URL=https://oproom.preview.emergent.com
```

## Test It

1. Restart your backend
2. Go to Settings → Integrations tab
3. Click "Connect Google Calendar"
4. Should work now! ✅

## Still Not Working?

### Check These:

1. **Wait 5 minutes** after changing redirect URI in Google Console (changes need to propagate)

2. **Verify redirect URI** matches exactly:
   - Go to Google Cloud Console → Credentials
   - Click your OAuth client ID
   - Check "Authorized redirect URIs"
   - Should see: `https://oproom.preview.emergent.com/settings`

3. **Check environment variables** are set correctly:
   ```bash
   # View backend logs to see what redirect_uri is being used
   docker logs backend | grep redirect
   ```

4. **Clear browser cache** and try again

5. **Check OAuth consent screen**:
   - Go to Google Cloud Console → OAuth consent screen
   - Add yourself as a test user
   - Add required scopes (calendar.events, calendar.readonly, userinfo.email)

## Common Mistakes

❌ **Wrong:**
```
http://oproom.preview.emergent.com/settings  (should be https)
https://oproom.preview.emergent.com/         (missing /settings)
https://oproom.preview.emergent.com/settings/ (has trailing slash)
http://localhost:3000/                       (missing /settings)
```

✅ **Correct:**
```
https://oproom.preview.emergent.com/settings
http://localhost:3000/settings
```

## Need More Help?

See the full setup guide: [GOOGLE_CALENDAR_OAUTH_SETUP.md](./GOOGLE_CALENDAR_OAUTH_SETUP.md)
