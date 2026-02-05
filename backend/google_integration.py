"""
Google OAuth, Gmail, and Calendar Integration for OProom
"""
import os
import requests
from datetime import datetime, timezone, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', '')

# Scopes for Gmail and Calendar access
GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.labels',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
]


def get_google_auth_url(state: str = None):
    """Generate Google OAuth authorization URL"""
    params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': GOOGLE_REDIRECT_URI,
        'scope': ' '.join(GOOGLE_SCOPES),
        'response_type': 'code',
        'access_type': 'offline',
        'prompt': 'consent'
    }
    if state:
        params['state'] = state
    
    base_url = 'https://accounts.google.com/o/oauth2/v2/auth'
    query_string = '&'.join([f'{k}={v}' for k, v in params.items()])
    return f'{base_url}?{query_string}'


def exchange_code_for_tokens(code: str):
    """Exchange authorization code for access and refresh tokens"""
    token_response = requests.post('https://oauth2.googleapis.com/token', data={
        'code': code,
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'redirect_uri': GOOGLE_REDIRECT_URI,
        'grant_type': 'authorization_code'
    })
    
    if token_response.status_code != 200:
        raise Exception(f"Token exchange failed: {token_response.text}")
    
    return token_response.json()


def get_google_user_info(access_token: str):
    """Get user info from Google"""
    response = requests.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    
    if response.status_code != 200:
        raise Exception(f"Failed to get user info: {response.text}")
    
    return response.json()


def get_credentials(tokens: dict):
    """Create Google credentials from stored tokens"""
    creds = Credentials(
        token=tokens.get('access_token'),
        refresh_token=tokens.get('refresh_token'),
        token_uri='https://oauth2.googleapis.com/token',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=GOOGLE_SCOPES
    )
    
    # Refresh if expired
    if creds.expired and creds.refresh_token:
        creds.refresh(GoogleRequest())
    
    return creds


def refresh_tokens_if_needed(tokens: dict):
    """Refresh tokens if expired and return updated tokens"""
    creds = get_credentials(tokens)
    
    if creds.token != tokens.get('access_token'):
        # Token was refreshed
        tokens['access_token'] = creds.token
        return tokens, True
    
    return tokens, False


# ============ CALENDAR FUNCTIONS ============

def get_calendar_service(tokens: dict):
    """Get Google Calendar service"""
    creds = get_credentials(tokens)
    return build('calendar', 'v3', credentials=creds)


def list_calendar_events(tokens: dict, time_min: datetime = None, time_max: datetime = None, max_results: int = 50):
    """List calendar events"""
    service = get_calendar_service(tokens)
    
    if not time_min:
        time_min = datetime.now(timezone.utc)
    if not time_max:
        time_max = time_min + timedelta(days=30)
    
    events_result = service.events().list(
        calendarId='primary',
        timeMin=time_min.isoformat(),
        timeMax=time_max.isoformat(),
        maxResults=max_results,
        singleEvents=True,
        orderBy='startTime'
    ).execute()
    
    return events_result.get('items', [])


def create_calendar_event(tokens: dict, event_data: dict):
    """Create a calendar event"""
    service = get_calendar_service(tokens)
    
    event = {
        'summary': event_data.get('title', 'OProom Event'),
        'description': event_data.get('description', ''),
        'location': event_data.get('location', ''),
        'start': {
            'dateTime': event_data['start'],
            'timeZone': event_data.get('timezone', 'America/Chicago')
        },
        'end': {
            'dateTime': event_data['end'],
            'timeZone': event_data.get('timezone', 'America/Chicago')
        },
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'popup', 'minutes': 60},
                {'method': 'popup', 'minutes': 15}
            ]
        }
    }
    
    # Add attendees if provided
    if event_data.get('attendees'):
        event['attendees'] = [{'email': email} for email in event_data['attendees']]
    
    # Add conference/video link if VSP session
    if event_data.get('conference_link'):
        event['description'] += f"\n\nVSP Session Link: {event_data['conference_link']}"
    
    created_event = service.events().insert(
        calendarId='primary',
        body=event,
        sendUpdates='all' if event_data.get('attendees') else 'none'
    ).execute()
    
    return created_event


def update_calendar_event(tokens: dict, event_id: str, event_data: dict):
    """Update a calendar event"""
    service = get_calendar_service(tokens)
    
    # Get existing event first
    existing = service.events().get(calendarId='primary', eventId=event_id).execute()
    
    # Update fields
    if 'title' in event_data:
        existing['summary'] = event_data['title']
    if 'description' in event_data:
        existing['description'] = event_data['description']
    if 'location' in event_data:
        existing['location'] = event_data['location']
    if 'start' in event_data:
        existing['start'] = {'dateTime': event_data['start'], 'timeZone': 'America/Chicago'}
    if 'end' in event_data:
        existing['end'] = {'dateTime': event_data['end'], 'timeZone': 'America/Chicago'}
    
    updated_event = service.events().update(
        calendarId='primary',
        eventId=event_id,
        body=existing
    ).execute()
    
    return updated_event


def delete_calendar_event(tokens: dict, event_id: str):
    """Delete a calendar event"""
    service = get_calendar_service(tokens)
    service.events().delete(calendarId='primary', eventId=event_id).execute()
    return True


# ============ GMAIL FUNCTIONS ============

def get_gmail_service(tokens: dict):
    """Get Gmail service"""
    creds = get_credentials(tokens)
    return build('gmail', 'v1', credentials=creds)


def list_emails(tokens: dict, query: str = '', max_results: int = 20):
    """List emails from Gmail inbox"""
    service = get_gmail_service(tokens)
    
    results = service.users().messages().list(
        userId='me',
        q=query,
        maxResults=max_results
    ).execute()
    
    messages = results.get('messages', [])
    emails = []
    
    for msg in messages:
        email_data = get_email_details(tokens, msg['id'])
        if email_data:
            emails.append(email_data)
    
    return emails


def get_email_details(tokens: dict, message_id: str):
    """Get detailed email information"""
    service = get_gmail_service(tokens)
    
    try:
        message = service.users().messages().get(
            userId='me',
            id=message_id,
            format='full'
        ).execute()
        
        headers = message.get('payload', {}).get('headers', [])
        
        # Extract common headers
        subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), 'No Subject')
        from_email = next((h['value'] for h in headers if h['name'].lower() == 'from'), '')
        to_email = next((h['value'] for h in headers if h['name'].lower() == 'to'), '')
        date = next((h['value'] for h in headers if h['name'].lower() == 'date'), '')
        
        # Get body
        body = ''
        payload = message.get('payload', {})
        
        if 'body' in payload and payload['body'].get('data'):
            import base64
            body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='ignore')
        elif 'parts' in payload:
            for part in payload['parts']:
                if part.get('mimeType') == 'text/plain' and part.get('body', {}).get('data'):
                    import base64
                    body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='ignore')
                    break
        
        return {
            'id': message_id,
            'thread_id': message.get('threadId'),
            'subject': subject,
            'from': from_email,
            'to': to_email,
            'date': date,
            'snippet': message.get('snippet', ''),
            'body': body[:2000],  # Limit body size
            'labels': message.get('labelIds', [])
        }
    except HttpError as e:
        print(f"Error fetching email {message_id}: {e}")
        return None


def search_emails_for_vsp(tokens: dict):
    """Search for VSP (Virtual Surgical Planning) related emails"""
    vsp_queries = [
        'subject:(VSP OR "Virtual Surgical Planning" OR "surgical planning session")',
        'from:(vsp OR materialise OR 3dsystems OR stryker)',
        'subject:(planning session OR surgical conference)'
    ]
    
    all_emails = []
    for query in vsp_queries:
        emails = list_emails(tokens, query=query, max_results=10)
        all_emails.extend(emails)
    
    # Remove duplicates
    seen_ids = set()
    unique_emails = []
    for email in all_emails:
        if email['id'] not in seen_ids:
            seen_ids.add(email['id'])
            unique_emails.append(email)
    
    return unique_emails


def search_emails_for_patient(tokens: dict, patient_name: str, mrn: str = None):
    """Search for emails related to a specific patient"""
    queries = [f'"{patient_name}"']
    if mrn:
        queries.append(f'"{mrn}"')
    
    query = ' OR '.join(queries)
    return list_emails(tokens, query=query, max_results=20)


# ============ VSP SESSION HELPERS ============

def extract_vsp_link_from_email(email_body: str):
    """Extract VSP meeting links from email body"""
    import re
    
    # Common VSP/meeting link patterns
    patterns = [
        r'https?://[^\s<>"\']+zoom\.us[^\s<>"\']*',
        r'https?://[^\s<>"\']+teams\.microsoft\.com[^\s<>"\']*',
        r'https?://[^\s<>"\']+meet\.google\.com[^\s<>"\']*',
        r'https?://[^\s<>"\']+webex\.com[^\s<>"\']*',
        r'https?://[^\s<>"\']+gotomeeting\.com[^\s<>"\']*',
        r'https?://[^\s<>"\']+materialise[^\s<>"\']*',
        r'https?://[^\s<>"\']+3dsystems[^\s<>"\']*'
    ]
    
    links = []
    for pattern in patterns:
        matches = re.findall(pattern, email_body, re.IGNORECASE)
        links.extend(matches)
    
    return list(set(links))


def create_vsp_calendar_event(tokens: dict, vsp_data: dict):
    """Create a calendar event for a VSP session"""
    event_data = {
        'title': f"VSP Session: {vsp_data.get('patient_name', 'Patient')} - {vsp_data.get('procedure', 'Surgical Planning')}",
        'description': f"""Virtual Surgical Planning Session

Patient: {vsp_data.get('patient_name', 'N/A')}
MRN: {vsp_data.get('mrn', 'N/A')}
Procedure: {vsp_data.get('procedure', 'N/A')}
Attending: {vsp_data.get('attending', 'N/A')}

Notes: {vsp_data.get('notes', '')}
""",
        'location': 'Virtual - See link in description',
        'start': vsp_data['start'],
        'end': vsp_data['end'],
        'conference_link': vsp_data.get('conference_link', ''),
        'attendees': vsp_data.get('attendees', []),
        'timezone': 'America/Chicago'
    }
    
    return create_calendar_event(tokens, event_data)
