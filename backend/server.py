from dotenv import load_dotenv
load_dotenv()  # Load environment variables before any other imports

import warnings
import logging
import sys

# Suppress passlib bcrypt version warning (compatibility issue with newer bcrypt)
# This must be set before importing passlib
warnings.filterwarnings("ignore", message=".*bcrypt.*")
warnings.filterwarnings("ignore", category=UserWarning)
logging.getLogger("passlib").setLevel(logging.CRITICAL)

# Redirect stderr temporarily to suppress bcrypt version error message
class SuppressBcryptWarning:
    def __enter__(self):
        self._stderr = sys.stderr
        sys.stderr = open('/dev/null', 'w')
        return self
    def __exit__(self, *args):
        sys.stderr.close()
        sys.stderr = self._stderr

# Patch bcrypt to avoid passlib version detection error
try:
    import bcrypt
    if not hasattr(bcrypt, '__about__'):
        class About:
            __version__ = bcrypt.__version__
        bcrypt.__about__ = About()
except Exception:
    pass

# Import passlib with stderr suppressed
with SuppressBcryptWarning():
    from passlib.context import CryptContext
    # Force load bcrypt backend
    _ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    _ctx.hash("test")

from fastapi import FastAPI, HTTPException, Depends, status, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
from bson import ObjectId
import os
import jwt

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from icalendar import Calendar, Event as ICalEvent
import pytz

# Import Google integration
from google_integration import (
    get_google_auth_url,
    exchange_code_for_tokens,
    get_google_user_info,
    refresh_tokens_if_needed,
    list_calendar_events,
    create_calendar_event,
    update_calendar_event,
    delete_calendar_event,
    list_emails,
    get_email_details,
    search_emails_for_vsp,
    search_emails_for_patient,
    extract_vsp_link_from_email,
    create_vsp_calendar_event
)

# WebAuthn imports for biometric authentication
import base64
import secrets
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    ResidentKeyRequirement,
    AuthenticatorAttachment,
    PublicKeyCredentialDescriptor,
)
from webauthn.helpers.cose import COSEAlgorithmIdentifier

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/or_scheduler')
client = MongoClient(MONGO_URL)
db = client.get_database()

# Collections
users_collection = db.users
patients_collection = db.patients
archived_patients_collection = db.archived_patients
schedules_collection = db.schedules
tasks_collection = db.tasks
conferences_collection = db.conferences
residents_collection = db.residents
attendings_collection = db.attendings
notifications_collection = db.notifications
usage_stats = db.usage_stats  # For tracking frequently used diagnoses/CPT codes
webauthn_credentials = db.webauthn_credentials  # For biometric auth credentials
webauthn_challenges = db.webauthn_challenges  # For temporary challenge storage
push_subscriptions = db.push_subscriptions  # For web push notification subscriptions
notification_preferences = db.notification_preferences  # User notification settings

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
# Extended to 30 days for persistent login (was 1440 minutes = 24 hours)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 43200))  # 30 days

# WebAuthn Configuration - Uses FRONTEND_URL from env for flexibility
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://clinic-scheduler-v2.preview.emergentagent.com')
# Extract domain from FRONTEND_URL for RP_ID
_parsed_url = FRONTEND_URL.replace('https://', '').replace('http://', '').split('/')[0]
RP_ID = os.environ.get('WEBAUTHN_RP_ID', _parsed_url)
RP_NAME = os.environ.get('WEBAUTHN_RP_NAME', 'OR Scheduler')
RP_ORIGIN = os.environ.get('WEBAUTHN_RP_ORIGIN', FRONTEND_URL)

# Email Configuration
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
EMAIL_FROM = os.environ.get('EMAIL_FROM', '')
CALENDAR_SYNC_ENABLED = os.environ.get('CALENDAR_SYNC_ENABLED', 'false').lower() == 'true'

# Auto-archive configuration (hours after procedure completion)
AUTO_ARCHIVE_DELAY_HOURS = int(os.environ.get('AUTO_ARCHIVE_DELAY_HOURS', 48))  # Default: 48 hours

# Helper functions for email/calendar
def create_ical_event(title, description, start_datetime, end_datetime, location="", attendees=[]):
    """Create an iCalendar event"""
    cal = Calendar()
    cal.add('prodid', '-//OR Scheduler//umn.edu//')
    cal.add('version', '2.0')
    cal.add('method', 'REQUEST')
    
    event = ICalEvent()
    event.add('summary', title)
    event.add('description', description)
    event.add('dtstart', start_datetime)
    event.add('dtend', end_datetime)
    event.add('dtstamp', datetime.now(pytz.UTC))
    event.add('uid', f'{datetime.now().timestamp()}@orscheduler.umn.edu')
    event.add('location', location)
    event.add('status', 'CONFIRMED')
    
    # Add organizer
    if EMAIL_FROM:
        event.add('organizer', f'mailto:{EMAIL_FROM}')
    
    # Add attendees
    for attendee in attendees:
        event.add('attendee', f'mailto:{attendee}', parameters={'ROLE': 'REQ-PARTICIPANT', 'RSVP': 'TRUE'})
    
    cal.add_component(event)
    return cal.to_ical()

def send_calendar_invite(to_email, subject, body, ical_content, cc_emails=[]):
    """Send email with calendar invite attachment"""
    if not CALENDAR_SYNC_ENABLED or not SMTP_USERNAME or not SMTP_PASSWORD:
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_FROM or SMTP_USERNAME
        msg['To'] = to_email
        if cc_emails:
            msg['Cc'] = ', '.join(cc_emails)
        msg['Subject'] = subject

        # Add text body
        msg.attach(MIMEText(body, 'plain'))

        # Attach calendar invite
        ical_attach = MIMEBase('text', 'calendar', method='REQUEST', name='invite.ics')
        ical_attach.set_payload(ical_content)
        encoders.encode_base64(ical_attach)
        ical_attach.add_header('Content-Disposition', 'attachment', filename='invite.ics')
        msg.attach(ical_attach)

        # Send email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)

        recipients = [to_email] + cc_emails
        server.sendmail(EMAIL_FROM or SMTP_USERNAME, recipients, msg.as_string())
        server.quit()

        return True
    except Exception as e:
        print(f"Email send error: {str(e)}")
        return False

def send_notification_email(to_email, subject, body):
    """Send a simple notification email"""
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_FROM or SMTP_USERNAME
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(EMAIL_FROM or SMTP_USERNAME, to_email, msg.as_string())
        server.quit()

        return True
    except Exception as e:
        print(f"Email send error: {str(e)}")
        return False

def create_notification(recipient_email, recipient_name, notif_type, title, message, case_mrn=None, task_id=None):
    """Create a notification in the database and optionally send email"""
    notification = {
        "recipient_email": recipient_email,
        "recipient_name": recipient_name,
        "type": notif_type,
        "title": title,
        "message": message,
        "case_mrn": case_mrn,
        "task_id": task_id,
        "read": False,
        "created_at": datetime.utcnow()
    }

    notifications_collection.insert_one(notification)

    # Send email notification
    if SMTP_USERNAME and SMTP_PASSWORD:
        send_notification_email(recipient_email, title, message)

    return notification

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "resident"  # resident, attending, admin

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PatientComment(BaseModel):
    comment_text: str
    patient_mrn: str
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

class Patient(BaseModel):
    """
    Patient model with status workflow:
    - pending: Initial status, pre-op prep in progress
    - confirmed: All pre-op requirements met, ready for surgery
    - deficient: Missing requirements, needs attention
    - in_or: Patient has entered the operating room
    - completed: Procedure completed successfully
    - archived: Patient record archived after completion (moved to archived_patients collection)
    """
    mrn: str
    patient_name: str
    dob: Optional[str] = None
    diagnosis: Optional[str] = None
    procedures: Optional[str] = None
    procedure_code: Optional[str] = None
    attending: Optional[str] = None
    status: str = "pending"
    prep_checklist: dict = {
        "xrays": False,
        "lab_tests": False,
        "insurance_approval": False,
        "medical_optimization": False
    }
    comments: List[dict] = []
    activity_log: List[dict] = []
    completed_at: Optional[datetime] = None  # Timestamp when procedure completed
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None

class Schedule(BaseModel):
    patient_mrn: str
    patient_name: str
    procedure: str
    staff: str
    scheduled_date: str
    scheduled_time: Optional[str] = None
    status: str = "scheduled"
    is_addon: bool = False
    priority: str = "medium"
    diagnosis: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

class SchedulePartialUpdate(BaseModel):
    """Partial update model for Schedule - used for drag-and-drop scheduling"""
    patient_mrn: Optional[str] = None
    patient_name: Optional[str] = None
    procedure: Optional[str] = None
    staff: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    status: Optional[str] = None
    is_addon: Optional[bool] = None
    priority: Optional[str] = None
    diagnosis: Optional[str] = None

class Task(BaseModel):
    patient_mrn: str
    task_description: str
    task_category: Optional[str] = None  # imaging, insurance, surgical_planning, etc.
    task_type: Optional[str] = None  # Specific task within category
    urgency: str = "medium"
    assigned_to: str
    assigned_to_email: Optional[str] = None
    due_date: Optional[str] = None
    status: str = "pending"
    completed: bool = False
    completed_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    notes: Optional[str] = None

class Conference(BaseModel):
    title: str
    date: str
    time: str
    attendees: List[str] = []
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

class Resident(BaseModel):
    name: str
    email: EmailStr
    hospital: str
    specialty: Optional[str] = None
    year: Optional[str] = None  # PGY-1, PGY-2, etc.
    is_active: bool = True
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

class Attending(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    hospital: str
    specialty: Optional[str] = None
    is_active: bool = True
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

class Notification(BaseModel):
    recipient_email: str
    recipient_name: str
    type: str  # task_due_today, task_due_soon, task_overdue, task_assigned, case_scheduled, weekly_digest
    title: str
    message: str
    case_mrn: Optional[str] = None
    task_id: Optional[str] = None
    priority: str = "normal"  # low, normal, high, urgent
    read: bool = False
    dismissed: bool = False
    action_url: Optional[str] = None  # Deep link to relevant page
    created_at: Optional[datetime] = None

class PushSubscription(BaseModel):
    user_email: str
    endpoint: str
    keys: dict  # p256dh and auth keys
    created_at: Optional[datetime] = None

class NotificationPreferences(BaseModel):
    user_email: str
    in_app_enabled: bool = True
    email_digest_enabled: bool = True
    email_digest_day: str = "monday"  # monday, friday, sunday
    push_enabled: bool = True
    notify_task_due_today: bool = True
    notify_task_due_soon: bool = True  # 3 days
    notify_task_overdue: bool = True
    notify_task_assigned: bool = True
    notify_case_scheduled: bool = True

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.exceptions.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# Routes
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/auth/register")
async def register(user: UserRegister):
    # Check if user exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user.password)
    user_doc = {
        "email": user.email,
        "hashed_password": hashed_password,
        "full_name": user.full_name,
        "role": user.role,
        "created_at": datetime.utcnow()
    }
    result = users_collection.insert_one(user_doc)
    
    # Create token
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@app.post("/api/auth/login")
async def login(user: UserLogin):
    # Find user
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Create token
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": db_user["email"],
            "full_name": db_user["full_name"],
            "role": db_user["role"]
        }
    }

@app.get("/api/auth/me")
async def get_current_user_info(current_user: str = Depends(get_current_user)):
    db_user = users_collection.find_one({"email": current_user})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has WebAuthn credentials registered
    has_webauthn = webauthn_credentials.find_one({"user_email": current_user}) is not None
    
    return {
        "email": db_user["email"],
        "full_name": db_user["full_name"],
        "role": db_user["role"],
        "has_webauthn": has_webauthn
    }

# ============== WebAuthn Biometric Authentication Endpoints ==============

class WebAuthnRegisterRequest(BaseModel):
    credential: str  # Base64 encoded credential response

class WebAuthnLoginRequest(BaseModel):
    credential: str  # Base64 encoded credential response
    email: str

@app.post("/api/auth/webauthn/register-options")
async def webauthn_register_options(current_user: str = Depends(get_current_user)):
    """Generate registration options for WebAuthn credential creation"""
    db_user = users_collection.find_one({"email": current_user})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get existing credentials for this user (to exclude them)
    existing_creds = list(webauthn_credentials.find({"user_email": current_user}))
    exclude_credentials = [
        PublicKeyCredentialDescriptor(id=base64.urlsafe_b64decode(cred["credential_id"] + "=="))
        for cred in existing_creds
    ]
    
    # Generate a unique user ID (use email hash for consistency)
    user_id = base64.urlsafe_b64encode(current_user.encode()).decode().rstrip("=")
    
    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=user_id.encode(),
        user_name=current_user,
        user_display_name=db_user.get("full_name", current_user),
        exclude_credentials=exclude_credentials,
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment=AuthenticatorAttachment.PLATFORM,
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
        supported_pub_key_algs=[
            COSEAlgorithmIdentifier.ECDSA_SHA_256,
            COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256,
        ],
    )
    
    # Store challenge temporarily (expires in 5 minutes)
    challenge_b64 = base64.urlsafe_b64encode(options.challenge).decode().rstrip("=")
    webauthn_challenges.delete_many({"user_email": current_user})  # Clean old challenges
    webauthn_challenges.insert_one({
        "user_email": current_user,
        "challenge": challenge_b64,
        "type": "registration",
        "created_at": datetime.utcnow()
    })
    
    # Create TTL index for auto-cleanup (if not exists)
    try:
        webauthn_challenges.create_index("created_at", expireAfterSeconds=300)
    except:
        pass
    
    return {"options": options_to_json(options)}

@app.post("/api/auth/webauthn/register")
async def webauthn_register(request: WebAuthnRegisterRequest, current_user: str = Depends(get_current_user)):
    """Verify and store WebAuthn credential after registration"""
    import json
    
    # Get stored challenge
    challenge_doc = webauthn_challenges.find_one({"user_email": current_user, "type": "registration"})
    if not challenge_doc:
        raise HTTPException(status_code=400, detail="No registration challenge found. Please restart the process.")
    
    challenge = base64.urlsafe_b64decode(challenge_doc["challenge"] + "==")
    
    try:
        # Parse the credential response
        credential_data = json.loads(request.credential)
        
        # Verify registration response
        verification = verify_registration_response(
            credential=credential_data,
            expected_challenge=challenge,
            expected_rp_id=RP_ID,
            expected_origin=RP_ORIGIN,
            require_user_verification=True,
        )
        
        # Store credential
        credential_id_b64 = base64.urlsafe_b64encode(verification.credential_id).decode().rstrip("=")
        public_key_b64 = base64.urlsafe_b64encode(verification.credential_public_key).decode().rstrip("=")
        
        webauthn_credentials.insert_one({
            "user_email": current_user,
            "credential_id": credential_id_b64,
            "public_key": public_key_b64,
            "sign_count": verification.sign_count,
            "transports": credential_data.get("response", {}).get("transports", []),
            "created_at": datetime.utcnow()
        })
        
        # Clean up challenge
        webauthn_challenges.delete_one({"_id": challenge_doc["_id"]})
        
        return {"success": True, "message": "Biometric authentication enabled successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

@app.post("/api/auth/webauthn/login-options")
async def webauthn_login_options(email: str):
    """Generate authentication options for WebAuthn login"""
    # Check if user exists and has credentials
    db_user = users_collection.find_one({"email": email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_creds = list(webauthn_credentials.find({"user_email": email}))
    if not user_creds:
        raise HTTPException(status_code=404, detail="No biometric credentials registered for this user")
    
    # Build list of allowed credentials
    allow_credentials = [
        PublicKeyCredentialDescriptor(
            id=base64.urlsafe_b64decode(cred["credential_id"] + "=="),
            transports=cred.get("transports", [])
        )
        for cred in user_creds
    ]
    
    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=allow_credentials,
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    
    # Store challenge
    challenge_b64 = base64.urlsafe_b64encode(options.challenge).decode().rstrip("=")
    webauthn_challenges.delete_many({"user_email": email, "type": "authentication"})
    webauthn_challenges.insert_one({
        "user_email": email,
        "challenge": challenge_b64,
        "type": "authentication",
        "created_at": datetime.utcnow()
    })
    
    return {"options": options_to_json(options)}

@app.post("/api/auth/webauthn/login")
async def webauthn_login(request: WebAuthnLoginRequest):
    """Verify WebAuthn authentication and issue JWT"""
    import json
    
    # Get stored challenge
    challenge_doc = webauthn_challenges.find_one({"user_email": request.email, "type": "authentication"})
    if not challenge_doc:
        raise HTTPException(status_code=400, detail="No authentication challenge found. Please restart the process.")
    
    challenge = base64.urlsafe_b64decode(challenge_doc["challenge"] + "==")
    
    try:
        # Parse the credential response
        credential_data = json.loads(request.credential)
        
        # Find the matching credential
        credential_id_from_response = credential_data.get("id", "")
        stored_cred = webauthn_credentials.find_one({
            "user_email": request.email,
            "credential_id": credential_id_from_response
        })
        
        if not stored_cred:
            # Try with padding variations
            stored_cred = webauthn_credentials.find_one({"user_email": request.email})
        
        if not stored_cred:
            raise HTTPException(status_code=400, detail="Credential not found")
        
        # Verify authentication response
        verification = verify_authentication_response(
            credential=credential_data,
            expected_challenge=challenge,
            expected_rp_id=RP_ID,
            expected_origin=RP_ORIGIN,
            credential_public_key=base64.urlsafe_b64decode(stored_cred["public_key"] + "=="),
            credential_current_sign_count=stored_cred.get("sign_count", 0),
            require_user_verification=True,
        )
        
        # Update sign count
        webauthn_credentials.update_one(
            {"_id": stored_cred["_id"]},
            {"$set": {"sign_count": verification.new_sign_count}}
        )
        
        # Clean up challenge
        webauthn_challenges.delete_one({"_id": challenge_doc["_id"]})
        
        # Get user info and create JWT
        db_user = users_collection.find_one({"email": request.email})
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        access_token = create_access_token(data={"sub": request.email})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "email": db_user["email"],
                "full_name": db_user["full_name"],
                "role": db_user["role"]
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")

@app.get("/api/auth/webauthn/check/{email}")
async def check_webauthn_available(email: str):
    """Check if user has WebAuthn credentials registered"""
    has_credentials = webauthn_credentials.find_one({"user_email": email}) is not None
    return {"has_webauthn": has_credentials}

@app.delete("/api/auth/webauthn/credential")
async def delete_webauthn_credential(current_user: str = Depends(get_current_user)):
    """Delete all WebAuthn credentials for current user"""
    result = webauthn_credentials.delete_many({"user_email": current_user})
    return {"success": True, "deleted_count": result.deleted_count}

@app.get("/api/users")
async def get_all_users(current_user: str = Depends(get_current_user)):
    """Get all registered users for task assignment dropdown"""
    users = list(users_collection.find({}, {"email": 1, "full_name": 1, "role": 1}))
    for user in users:
        user["_id"] = str(user["_id"])
    return users

# Imaging options for OMFS pre-op checklist
IMAGING_OPTIONS = [
    "CT Facial (Maxillofacial)",
    "CT Abd/Leg Run-Off (Fibula Free Flap Planning)",
    "PET Scan",
    "OPG (Orthopantomogram / Panorex)",
    "Lateral Cephalometric"
]

# OMFS-specific pre-op checklist (9 items)
DEFAULT_PREOP_CHECKLIST = [
    {"id": "imaging", "item": "Imaging", "checked": False, "type": "dropdown", "selection": []},
    {"id": "labs_ordered", "item": "Labs Ordered", "checked": False},
    {"id": "labs_reviewed", "item": "Labs Reviewed", "checked": False},
    {"id": "prior_auth", "item": "Prior Authorization Approved", "checked": False},
    {"id": "vsp_complete", "item": "VSP Complete", "checked": False},
    {"id": "ortho_approval", "item": "Orthodontist Approval", "checked": False},
    {"id": "anesthesia_clearance", "item": "Anesthesia Clearance", "checked": False},
    {"id": "medical_optimization", "item": "Medical Optimization Complete", "checked": False},
    {"id": "or_scheduled", "item": "OR Scheduled", "checked": False},
]

# Default tasks to auto-generate on patient creation (OMFS-specific)
DEFAULT_PATIENT_TASKS = [
    {"description": "Prior Authorization", "category": "insurance", "task_type": "Prior Auth"},
    {"description": "Labs (CBC/BMP)", "category": "labs", "task_type": "Labs"},
    {"description": "Anesthesia Pre-Op Evaluation", "category": "labs", "task_type": "Anesthesia Eval"},
    {"description": "VSP (Virtual Surgical Planning)", "category": "surgical_planning", "task_type": "VSP"},
    {"description": "Imaging", "category": "imaging", "task_type": "Imaging"},
    {"description": "Orthodontist Approval", "category": "patient_coordination", "task_type": "Ortho Approval"},
]

class PatientCreateRequest(BaseModel):
    """Extended patient creation request with auto-generate options"""
    mrn: str
    patient_name: str
    dob: Optional[str] = None
    diagnosis: Optional[str] = None
    procedures: Optional[str] = None
    procedure_code: Optional[str] = None
    attending: Optional[str] = None
    scheduled_date: Optional[str] = None  # If provided, status = scheduled
    scheduled_time: Optional[str] = None
    auto_generate_tasks: bool = True  # Default: generate pre-op tasks

# Patient routes
@app.post("/api/patients")
async def create_patient(patient: Patient, current_user: str = Depends(get_current_user)):
    patient_dict = patient.dict()
    patient_dict["created_by"] = current_user
    patient_dict["created_at"] = datetime.utcnow()
    patient_dict["activity_log"] = [{
        "action": "created",
        "user": current_user,
        "timestamp": datetime.utcnow().isoformat(),
        "details": f"Patient record created"
    }]
    patient_dict["comments"] = []

    # Ensure prep_checklist is initialized
    if "prep_checklist" not in patient_dict or not patient_dict["prep_checklist"]:
        patient_dict["prep_checklist"] = {
            "xrays": False,
            "lab_tests": False,
            "insurance_approval": False,
            "medical_optimization": False
        }

    result = patients_collection.insert_one(patient_dict)
    patient_dict["_id"] = str(result.inserted_id)
    
    # Track usage for intelligent suggestions
    if patient_dict.get("diagnosis"):
        track_usage(current_user, "diagnosis", patient_dict["diagnosis"])
    if patient_dict.get("procedure_code"):
        track_usage(current_user, "cpt_code", patient_dict["procedure_code"])

    return patient_dict

@app.post("/api/patients/create-with-tasks")
async def create_patient_with_tasks(request: PatientCreateRequest, current_user: str = Depends(get_current_user)):
    """
    Enhanced patient creation endpoint that:
    1. Creates patient with new 13-item preop_checklist
    2. Sets status based on scheduled_date (add-on vs scheduled)
    3. Auto-generates default tasks if enabled
    4. Creates schedule entry if date provided
    """
    # Get user info for task assignment
    user_info = users_collection.find_one({"email": current_user})
    user_name = user_info.get("full_name", current_user) if user_info else current_user
    
    # Determine status based on scheduled_date
    status = "scheduled" if request.scheduled_date else "add-on"
    
    # Create patient document with new checklist format
    patient_dict = {
        "mrn": request.mrn,
        "patient_name": request.patient_name,
        "dob": request.dob,
        "diagnosis": request.diagnosis,
        "procedures": request.procedures,
        "procedure_code": request.procedure_code,
        "attending": request.attending,
        "status": status,
        "scheduled_date": request.scheduled_date,
        "scheduled_time": request.scheduled_time,
        "preop_checklist": [item.copy() for item in DEFAULT_PREOP_CHECKLIST],  # New 13-item format
        "prep_checklist": {  # Keep old format for backward compatibility
            "xrays": False,
            "lab_tests": False,
            "insurance_approval": False,
            "medical_optimization": False
        },
        "comments": [],
        "activity_log": [{
            "action": "created",
            "user": current_user,
            "timestamp": datetime.utcnow().isoformat(),
            "details": f"Patient record created as {status}"
        }],
        "created_by": current_user,
        "created_at": datetime.utcnow(),
        "updated_by": None,
        "updated_at": None,
        "completed_at": None
    }
    
    # Insert patient
    result = patients_collection.insert_one(patient_dict)
    patient_dict["_id"] = str(result.inserted_id)
    
    created_tasks = []
    
    # Auto-generate tasks if enabled
    if request.auto_generate_tasks:
        for task_template in DEFAULT_PATIENT_TASKS:
            task_doc = {
                "patient_mrn": request.mrn,
                "patient_name": request.patient_name,
                "task_description": task_template["description"],
                "task_category": task_template["category"],
                "task_type": task_template["task_type"],
                "urgency": "medium",
                "assigned_to": user_name,
                "assigned_to_email": current_user,
                "due_date": request.scheduled_date,  # Due by surgery date
                "status": "pending",
                "completed": False,
                "completed_at": None,
                "created_by": current_user,
                "created_at": datetime.utcnow(),
                "notes": None
            }
            task_result = tasks_collection.insert_one(task_doc)
            task_doc["_id"] = str(task_result.inserted_id)
            created_tasks.append(task_doc)
        
        # Log task generation
        patients_collection.update_one(
            {"mrn": request.mrn},
            {"$push": {"activity_log": {
                "action": "tasks_generated",
                "user": current_user,
                "timestamp": datetime.utcnow().isoformat(),
                "details": f"Auto-generated {len(created_tasks)} pre-op tasks"
            }}}
        )
    
    # Create schedule entry if date provided
    schedule_doc = None
    if request.scheduled_date:
        schedule_doc = {
            "patient_mrn": request.mrn,
            "patient_name": request.patient_name,
            "procedure": request.procedures or "Procedure TBD",
            "staff": request.attending or "TBD",
            "scheduled_date": request.scheduled_date,
            "scheduled_time": request.scheduled_time,
            "status": "scheduled",
            "is_addon": False,
            "priority": "medium",
            "diagnosis": request.diagnosis,
            "created_by": current_user,
            "created_at": datetime.utcnow()
        }
        schedule_result = schedules_collection.insert_one(schedule_doc)
        schedule_doc["_id"] = str(schedule_result.inserted_id)
    
    # Track usage
    if request.diagnosis:
        track_usage(current_user, "diagnosis", request.diagnosis)
    if request.procedure_code:
        track_usage(current_user, "cpt_code", request.procedure_code)
    
    return {
        "patient": patient_dict,
        "tasks": created_tasks,
        "schedule": schedule_doc,
        "status": status,
        "message": f"Patient added to {'schedule' if status == 'scheduled' else 'add-on list'}"
    }

@app.get("/api/patients")
async def get_patients(current_user: str = Depends(get_current_user)):
    patients = list(patients_collection.find())
    for patient in patients:
        patient["_id"] = str(patient["_id"])
    return patients

@app.get("/api/patients/with-tasks")
async def get_patients_with_tasks(current_user: str = Depends(get_current_user)):
    """Get all patients with their associated tasks and task counts"""
    patients = list(patients_collection.find())
    all_tasks = list(tasks_collection.find())
    all_schedules = list(schedules_collection.find())
    
    # Create lookup maps
    tasks_by_mrn = {}
    for task in all_tasks:
        task["_id"] = str(task["_id"])
        mrn = task.get("patient_mrn")
        if mrn:
            if mrn not in tasks_by_mrn:
                tasks_by_mrn[mrn] = []
            tasks_by_mrn[mrn].append(task)
    
    schedules_by_mrn = {}
    for schedule in all_schedules:
        schedule["_id"] = str(schedule["_id"])
        mrn = schedule.get("patient_mrn")
        if mrn:
            schedules_by_mrn[mrn] = schedule
    
    # Enrich patients with tasks and counts
    result = []
    for patient in patients:
        patient["_id"] = str(patient["_id"])
        mrn = patient.get("mrn")
        patient_tasks = tasks_by_mrn.get(mrn, [])
        
        # Calculate task stats
        pending_tasks = [t for t in patient_tasks if not t.get("completed")]
        completed_tasks = [t for t in patient_tasks if t.get("completed")]
        
        patient["tasks"] = patient_tasks
        patient["task_count"] = len(patient_tasks)
        patient["pending_task_count"] = len(pending_tasks)
        patient["completed_task_count"] = len(completed_tasks)
        patient["schedule"] = schedules_by_mrn.get(mrn)
        
        # Normalize preop_checklist to new 9-item OMFS format
        preop_checklist = patient.get("preop_checklist", [])
        normalized_checklist = normalize_preop_checklist(preop_checklist)
        patient["preop_checklist"] = normalized_checklist
        
        # Calculate preop progress from normalized checklist (always 9 items now)
        checked = sum(1 for item in normalized_checklist if item.get("checked"))
        patient["preop_progress"] = {"checked": checked, "total": 9}
        
        result.append(patient)
    
    return result

@app.get("/api/patients/{mrn}")
async def get_patient(mrn: str, current_user: str = Depends(get_current_user)):
    patient = patients_collection.find_one({"mrn": mrn})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient["_id"] = str(patient["_id"])
    return patient

@app.get("/api/patients/{mrn}/with-tasks")
async def get_patient_with_tasks(mrn: str, current_user: str = Depends(get_current_user)):
    """Get a single patient with their tasks"""
    patient = patients_collection.find_one({"mrn": mrn})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient["_id"] = str(patient["_id"])
    
    # Get tasks for this patient
    tasks = list(tasks_collection.find({"patient_mrn": mrn}))
    for task in tasks:
        task["_id"] = str(task["_id"])
    
    # Get schedule
    schedule = schedules_collection.find_one({"patient_mrn": mrn})
    if schedule:
        schedule["_id"] = str(schedule["_id"])
    
    patient["tasks"] = tasks
    patient["schedule"] = schedule
    
    return patient

@app.get("/api/imaging-options")
async def get_imaging_options():
    """Return the list of available imaging study types for OMFS"""
    return {"options": IMAGING_OPTIONS}

@app.patch("/api/patients/{mrn}/preop-checklist/imaging")
async def update_imaging_selection(mrn: str, request: Request, current_user: str = Depends(get_current_user)):
    """Update the imaging selection for a patient's pre-op checklist.
    IMPORTANT: This route MUST be declared before the generic /{item_id} route."""
    body = await request.json()
    new_selection = body.get("selection", [])
    is_checked = len(new_selection) > 0
    
    patient = patients_collection.find_one({"mrn": mrn})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    preop_checklist = patient.get("preop_checklist", [])
    # If old format or missing, normalize and save to DB first
    if not isinstance(preop_checklist, list) or not any(isinstance(i, dict) and i.get("id") == "imaging" for i in preop_checklist):
        preop_checklist = normalize_preop_checklist(preop_checklist)
        patients_collection.update_one({"mrn": mrn}, {"$set": {"preop_checklist": preop_checklist}})
    
    imaging_exists = any(item.get("id") == "imaging" for item in preop_checklist)
    
    if imaging_exists:
        result = patients_collection.update_one(
            {"mrn": mrn},
            {
                "$set": {
                    "preop_checklist.$[elem].selection": list(new_selection),
                    "preop_checklist.$[elem].checked": is_checked,
                    "updated_by": current_user,
                    "updated_at": datetime.utcnow()
                },
                "$push": {
                    "activity_log": {
                        "action": "imaging_updated",
                        "user": current_user,
                        "timestamp": datetime.utcnow().isoformat(),
                        "details": f"Imaging studies: {', '.join(new_selection) if new_selection else 'None selected'}"
                    }
                }
            },
            array_filters=[{"elem.id": "imaging"}]
        )
    else:
        result = patients_collection.update_one(
            {"mrn": mrn},
            {
                "$push": {
                    "preop_checklist": {
                        "$each": [{
                            "id": "imaging",
                            "item": "Imaging",
                            "checked": is_checked,
                            "type": "dropdown",
                            "selection": list(new_selection)
                        }],
                        "$position": 0
                    },
                    "activity_log": {
                        "action": "imaging_updated",
                        "user": current_user,
                        "timestamp": datetime.utcnow().isoformat(),
                        "details": f"Imaging studies: {', '.join(new_selection) if new_selection else 'None selected'}"
                    }
                },
                "$set": {
                    "updated_by": current_user,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    
    updated_patient = patients_collection.find_one({"mrn": mrn})
    updated_checklist = updated_patient.get("preop_checklist", []) if updated_patient else []
    checked_count = sum(1 for item in updated_checklist if item.get("checked"))
    
    return {
        "selection": new_selection,
        "checked": is_checked,
        "progress": {"checked": checked_count, "total": len(updated_checklist)}
    }

@app.patch("/api/patients/{mrn}/preop-checklist/{item_id}")
async def toggle_preop_checklist_item(mrn: str, item_id: str, current_user: str = Depends(get_current_user)):
    """Toggle a specific item in the preop_checklist"""
    patient = patients_collection.find_one({"mrn": mrn})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    preop_checklist = patient.get("preop_checklist", [])
    # Normalize old format if needed
    if not isinstance(preop_checklist, list) or (len(preop_checklist) > 0 and not any(isinstance(i, dict) and "id" in i for i in preop_checklist)):
        preop_checklist = normalize_preop_checklist(preop_checklist)
        patients_collection.update_one({"mrn": mrn}, {"$set": {"preop_checklist": preop_checklist}})
    
    item_found = False
    new_value = False
    for item in preop_checklist:
        if item.get("id") == item_id:
            item["checked"] = not item.get("checked", False)
            new_value = item["checked"]
            item_found = True
            break
    
    if not item_found:
        raise HTTPException(status_code=404, detail=f"Checklist item '{item_id}' not found")
    
    result = patients_collection.update_one(
        {"mrn": mrn},
        {
            "$set": {
                "preop_checklist": preop_checklist,
                "updated_by": current_user,
                "updated_at": datetime.utcnow()
            },
            "$push": {
                "activity_log": {
                    "action": "checklist_updated",
                    "user": current_user,
                    "timestamp": datetime.utcnow().isoformat(),
                    "details": f"{'Checked' if new_value else 'Unchecked'}: {item_id}"
                }
            }
        }
    )
    
    checked_count = sum(1 for item in preop_checklist if item.get("checked"))
    
    return {
        "item_id": item_id,
        "checked": new_value,
        "progress": {"checked": checked_count, "total": len(preop_checklist)}
    }

def normalize_preop_checklist(checklist):
    """
    Normalize an old checklist format to the new 9-item OMFS format.
    Preserves checked states and imaging selections for items that still exist.
    If the checklist is already in the new format, preserve it as-is.
    """
    if not isinstance(checklist, list):
        return [item.copy() for item in DEFAULT_PREOP_CHECKLIST]
    
    # Check if this is already the new 9-item format (has the expected IDs)
    new_format_ids = {item["id"] for item in DEFAULT_PREOP_CHECKLIST}
    current_ids = {item.get("id") for item in checklist if isinstance(item, dict)}
    
    # If it's already the new format (same IDs), preserve it exactly
    if current_ids == new_format_ids and len(checklist) == 9:
        # Just ensure all required fields exist
        normalized = []
        for item in checklist:
            item_copy = item.copy()
            # Ensure imaging has selection array
            if item_copy.get("id") == "imaging":
                if "selection" not in item_copy:
                    item_copy["selection"] = []
                if "type" not in item_copy:
                    item_copy["type"] = "dropdown"
            normalized.append(item_copy)
        return normalized
    
    # Otherwise, this is an old format - need to migrate
    # Map old item IDs to their checked states and imaging selection
    old_states = {}
    old_imaging_selection = []
    for item in checklist:
        if isinstance(item, dict):
            item_id = item.get("id", "")
            old_states[item_id] = item.get("checked", False)
            # Preserve imaging selection if it exists
            if item_id == "imaging" and "selection" in item:
                old_imaging_selection = item.get("selection", [])
            # Convert old imaging_ordered to imaging
            if item_id == "imaging_ordered" and item.get("checked"):
                old_states["imaging"] = True
    
    # Create new checklist with preserved states
    new_checklist = []
    for item in DEFAULT_PREOP_CHECKLIST:
        new_item = item.copy()
        item_id = new_item["id"]
        
        # Preserve checked state if item existed before
        if item_id in old_states:
            new_item["checked"] = old_states[item_id]
        
        # For imaging, preserve selection
        if item_id == "imaging":
            new_item["selection"] = old_imaging_selection
            # Auto-check if there are selections
            if old_imaging_selection:
                new_item["checked"] = True
        
        new_checklist.append(new_item)
    
    return new_checklist

@app.put("/api/patients/{mrn}")
async def update_patient(mrn: str, patient: Patient, current_user: str = Depends(get_current_user)):
    # Get current patient to compare changes
    current_patient = patients_collection.find_one({"mrn": mrn})
    if not current_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient_dict = patient.dict()
    patient_dict["updated_by"] = current_user
    patient_dict["updated_at"] = datetime.utcnow()
    
    # Add activity log entry
    if "activity_log" not in patient_dict:
        patient_dict["activity_log"] = current_patient.get("activity_log", [])
    
    changes = []
    for key in ["patient_name", "dob", "diagnosis", "procedures", "attending", "status"]:
        if current_patient.get(key) != patient_dict.get(key):
            changes.append(f"{key}: {current_patient.get(key)} → {patient_dict.get(key)}")
    
    if changes:
        patient_dict["activity_log"].append({
            "action": "updated",
            "user": current_user,
            "timestamp": datetime.utcnow().isoformat(),
            "details": ", ".join(changes)
        })
    
    result = patients_collection.update_one(
        {"mrn": mrn},
        {"$set": patient_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient updated successfully"}

@app.post("/api/patients/{mrn}/comments")
async def add_patient_comment(mrn: str, comment: PatientComment, current_user: str = Depends(get_current_user)):
    """Add a comment to a patient's record"""
    patient = patients_collection.find_one({"mrn": mrn})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    comment_dict = {
        "comment_text": comment.comment_text,
        "created_by": current_user,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Get user's full name
    user = users_collection.find_one({"email": current_user})
    if user:
        comment_dict["created_by_name"] = user.get("full_name", current_user)
    
    result = patients_collection.update_one(
        {"mrn": mrn},
        {
            "$push": {
                "comments": comment_dict,
                "activity_log": {
                    "action": "comment_added",
                    "user": current_user,
                    "timestamp": datetime.utcnow().isoformat(),
                    "details": f"Added comment: {comment.comment_text[:50]}..."
                }
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return comment_dict

@app.delete("/api/patients/{mrn}")
async def delete_patient(mrn: str, current_user: str = Depends(get_current_user)):
    result = patients_collection.delete_one({"mrn": mrn})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient deleted successfully"}

@app.patch("/api/patients/{mrn}/checklist")
async def update_patient_checklist(mrn: str, checklist_item: str, checked: bool, current_user: str = Depends(get_current_user)):
    """Update a specific prep checklist item for a patient"""
    # Validate checklist item
    valid_items = ["xrays", "lab_tests", "insurance_approval", "medical_optimization"]
    if checklist_item not in valid_items:
        raise HTTPException(status_code=400, detail=f"Invalid checklist item. Must be one of: {', '.join(valid_items)}")

    patient = patients_collection.find_one({"mrn": mrn})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Initialize prep_checklist if it doesn't exist
    if "prep_checklist" not in patient:
        patient["prep_checklist"] = {
            "xrays": False,
            "lab_tests": False,
            "insurance_approval": False,
            "medical_optimization": False
        }

    # Update the specific checklist item
    patient["prep_checklist"][checklist_item] = checked

    # Update in database
    result = patients_collection.update_one(
        {"mrn": mrn},
        {
            "$set": {
                f"prep_checklist.{checklist_item}": checked,
                "updated_by": current_user,
                "updated_at": datetime.utcnow()
            },
            "$push": {
                "activity_log": {
                    "action": "checklist_updated",
                    "user": current_user,
                    "timestamp": datetime.utcnow().isoformat(),
                    "details": f"Updated {checklist_item.replace('_', ' ').title()}: {'checked' if checked else 'unchecked'}"
                }
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")

    return {
        "message": "Checklist updated successfully",
        "checklist_item": checklist_item,
        "checked": checked
    }

@app.post("/api/patients/{mrn}/send-to-or")
async def send_patient_to_or(mrn: str, current_user: str = Depends(get_current_user)):
    """Send patient to operating room - changes status to 'in_or'"""
    patient = patients_collection.find_one({"mrn": mrn})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Update patient status to in_or
    result = patients_collection.update_one(
        {"mrn": mrn},
        {
            "$set": {
                "status": "in_or",
                "updated_by": current_user,
                "updated_at": datetime.utcnow()
            },
            "$push": {
                "activity_log": {
                    "action": "status_changed",
                    "user": current_user,
                    "timestamp": datetime.utcnow().isoformat(),
                    "details": f"Patient sent to OR - Status changed from '{patient.get('status', 'unknown')}' to 'in_or'"
                }
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Notify relevant staff
    active_residents = list(residents_collection.find({"is_active": True}))
    for resident in active_residents:
        if resident["email"] != current_user:
            create_notification(
                recipient_email=resident["email"],
                recipient_name=resident["name"],
                notif_type="case_updated",
                title=f"Patient in OR: {patient.get('patient_name')}",
                message=f"Patient {patient.get('patient_name')} (MRN: {mrn}) has been sent to the operating room.",
                case_mrn=mrn
            )

    return {"message": "Patient sent to OR successfully", "status": "in_or"}

@app.post("/api/patients/{mrn}/mark-complete")
async def mark_procedure_complete(mrn: str, current_user: str = Depends(get_current_user)):
    """Mark procedure as completed - changes status to 'completed'"""
    patient = patients_collection.find_one({"mrn": mrn})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    completion_time = datetime.utcnow()

    # Update patient status to completed
    result = patients_collection.update_one(
        {"mrn": mrn},
        {
            "$set": {
                "status": "completed",
                "completed_at": completion_time,
                "updated_by": current_user,
                "updated_at": completion_time
            },
            "$push": {
                "activity_log": {
                    "action": "procedure_completed",
                    "user": current_user,
                    "timestamp": completion_time.isoformat(),
                    "details": f"Procedure completed - Status changed from '{patient.get('status', 'unknown')}' to 'completed'"
                }
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Notify relevant staff
    active_residents = list(residents_collection.find({"is_active": True}))
    for resident in active_residents:
        if resident["email"] != current_user:
            create_notification(
                recipient_email=resident["email"],
                recipient_name=resident["name"],
                notif_type="case_updated",
                title=f"Procedure Completed: {patient.get('patient_name')}",
                message=f"Procedure for {patient.get('patient_name')} (MRN: {mrn}) has been marked as completed.",
                case_mrn=mrn
            )

    return {
        "message": "Procedure marked as complete",
        "status": "completed",
        "completed_at": completion_time.isoformat(),
        "auto_archive_in_hours": AUTO_ARCHIVE_DELAY_HOURS
    }

@app.post("/api/patients/{mrn}/archive")
async def archive_patient(mrn: str, current_user: str = Depends(get_current_user)):
    """Manually archive a patient record (soft delete)"""
    patient = patients_collection.find_one({"mrn": mrn})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Add archival metadata
    patient["archived_at"] = datetime.utcnow()
    patient["archived_by"] = current_user
    patient["archived_reason"] = "manual_archive"
    patient["activity_log"].append({
        "action": "archived",
        "user": current_user,
        "timestamp": datetime.utcnow().isoformat(),
        "details": "Patient record manually archived"
    })

    # Move to archived collection
    archived_patients_collection.insert_one(patient)

    # Also archive related schedules
    schedules = list(schedules_collection.find({"patient_mrn": mrn}))
    for schedule in schedules:
        schedule["archived_at"] = datetime.utcnow()
        schedule["archived_by"] = current_user
        # Keep schedules in same collection but mark as archived
        schedules_collection.update_one(
            {"_id": schedule["_id"]},
            {"$set": {"archived": True, "archived_at": datetime.utcnow()}}
        )

    # Remove from active patients collection
    patients_collection.delete_one({"mrn": mrn})

    return {
        "message": "Patient archived successfully",
        "mrn": mrn,
        "archived_at": patient["archived_at"].isoformat()
    }

@app.get("/api/patients/archived")
async def get_archived_patients(current_user: str = Depends(get_current_user)):
    """Get all archived patients"""
    archived = list(archived_patients_collection.find().sort("archived_at", -1))
    for patient in archived:
        patient["_id"] = str(patient["_id"])
    return archived

@app.post("/api/patients/{mrn}/restore")
async def restore_patient(mrn: str, current_user: str = Depends(get_current_user)):
    """Restore a patient from archive back to active patients"""
    archived_patient = archived_patients_collection.find_one({"mrn": mrn})
    if not archived_patient:
        raise HTTPException(status_code=404, detail="Archived patient not found")

    # Remove archival metadata
    archived_patient.pop("archived_at", None)
    archived_patient.pop("archived_by", None)
    archived_patient.pop("archived_reason", None)

    # Add restoration activity log
    archived_patient["activity_log"].append({
        "action": "restored",
        "user": current_user,
        "timestamp": datetime.utcnow().isoformat(),
        "details": "Patient record restored from archive"
    })
    archived_patient["status"] = "pending"  # Reset to pending status
    archived_patient["updated_by"] = current_user
    archived_patient["updated_at"] = datetime.utcnow()

    # Move back to active patients
    patients_collection.insert_one(archived_patient)

    # Restore associated schedules
    schedules_collection.update_many(
        {"patient_mrn": mrn, "archived": True},
        {"$set": {"archived": False}, "$unset": {"archived_at": ""}}
    )

    # Remove from archive
    archived_patients_collection.delete_one({"mrn": mrn})

    return {
        "message": "Patient restored successfully",
        "mrn": mrn
    }

@app.post("/api/patients/auto-archive")
async def run_auto_archive(current_user: str = Depends(get_current_user)):
    """Run automatic archival for completed patients past the delay threshold"""
    # Find patients that are completed and past the auto-archive delay
    cutoff_time = datetime.utcnow() - timedelta(hours=AUTO_ARCHIVE_DELAY_HOURS)

    completed_patients = list(patients_collection.find({
        "status": "completed",
        "completed_at": {"$lt": cutoff_time}
    }))

    archived_count = 0
    for patient in completed_patients:
        # Add archival metadata
        patient["archived_at"] = datetime.utcnow()
        patient["archived_by"] = "system_auto_archive"
        patient["archived_reason"] = f"auto_archive_after_{AUTO_ARCHIVE_DELAY_HOURS}h"
        patient["activity_log"].append({
            "action": "auto_archived",
            "user": "system",
            "timestamp": datetime.utcnow().isoformat(),
            "details": f"Automatically archived {AUTO_ARCHIVE_DELAY_HOURS} hours after procedure completion"
        })

        # Move to archived collection
        archived_patients_collection.insert_one(patient)

        # Archive related schedules
        schedules_collection.update_many(
            {"patient_mrn": patient["mrn"]},
            {"$set": {"archived": True, "archived_at": datetime.utcnow()}}
        )

        # Remove from active patients
        patients_collection.delete_one({"mrn": patient["mrn"]})
        archived_count += 1

    return {
        "message": f"Auto-archive completed",
        "archived_count": archived_count,
        "delay_hours": AUTO_ARCHIVE_DELAY_HOURS
    }

# Schedule routes
@app.post("/api/schedules")
async def create_schedule(schedule: Schedule, current_user: str = Depends(get_current_user)):
    schedule_dict = schedule.dict()
    schedule_dict["created_by"] = current_user
    schedule_dict["created_at"] = datetime.utcnow()

    result = schedules_collection.insert_one(schedule_dict)
    schedule_dict["_id"] = str(result.inserted_id)

    # Get current user info
    current_user_obj = users_collection.find_one({"email": current_user})
    creator_name = current_user_obj.get("full_name", current_user) if current_user_obj else current_user

    # Notify all active residents about the new case
    active_residents = list(residents_collection.find({"is_active": True}))
    for resident in active_residents:
        # Don't notify the creator
        if resident["email"] != current_user:
            notification_title = f"New Case Added: {schedule.patient_name}"
            notification_message = f"""
A new case has been added by {creator_name}:

Patient: {schedule.patient_name} (MRN: {schedule.patient_mrn})
Procedure: {schedule.procedure}
Attending: {schedule.staff}
Status: {schedule.status}
Date: {schedule.scheduled_date if schedule.scheduled_date else 'Not scheduled (Add-on list)'}

Please review and complete any necessary prep tasks.
            """.strip()

            create_notification(
                recipient_email=resident["email"],
                recipient_name=resident["name"],
                notif_type="case_added",
                title=notification_title,
                message=notification_message,
                case_mrn=schedule.patient_mrn
            )
    
    # Send calendar invite if enabled and scheduled date exists
    if CALENDAR_SYNC_ENABLED and schedule.scheduled_date and not schedule.is_addon:
        try:
            # Parse date and time
            schedule_date = datetime.fromisoformat(schedule.scheduled_date)
            schedule_time_parts = schedule.scheduled_time.split(':') if schedule.scheduled_time else ['08', '00']
            start_datetime = datetime(
                schedule_date.year,
                schedule_date.month,
                schedule_date.day,
                int(schedule_time_parts[0]),
                int(schedule_time_parts[1]),
                tzinfo=pytz.timezone('America/Chicago')
            )
            end_datetime = start_datetime + timedelta(hours=2)  # Default 2 hour procedure
            
            # Create calendar event
            title = f"OR Case: {schedule.patient_name} - {schedule.procedure}"
            description = f"""
OR Surgical Case

Patient: {schedule.patient_name} (MRN: {schedule.patient_mrn})
Procedure: {schedule.procedure}
Attending Surgeon: {schedule.staff}
Status: {schedule.status}

Scheduled by: {current_user}
            """.strip()
            
            ical_content = create_ical_event(
                title=title,
                description=description,
                start_datetime=start_datetime,
                end_datetime=end_datetime,
                location="Operating Room",
                attendees=[current_user]
            )
            
            # Send to current user (creator)
            send_calendar_invite(
                to_email=current_user,
                subject=f"OR Case Scheduled: {schedule.patient_name}",
                body=description,
                ical_content=ical_content
            )
        except Exception as e:
            print(f"Calendar invite error: {str(e)}")
    
    return schedule_dict

@app.get("/api/schedules")
async def get_schedules(current_user: str = Depends(get_current_user)):
    schedules = list(schedules_collection.find())
    for schedule in schedules:
        schedule["_id"] = str(schedule["_id"])
    return schedules

@app.put("/api/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, schedule: SchedulePartialUpdate, current_user: str = Depends(get_current_user)):
    # Only update fields that are provided (not None)
    update_data = {k: v for k, v in schedule.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = schedules_collection.update_one(
        {"_id": ObjectId(schedule_id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Return the updated schedule
    updated_schedule = schedules_collection.find_one({"_id": ObjectId(schedule_id)})
    if updated_schedule:
        updated_schedule["_id"] = str(updated_schedule["_id"])
    return updated_schedule

@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, current_user: str = Depends(get_current_user)):
    result = schedules_collection.delete_one({"_id": ObjectId(schedule_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted successfully"}

# Task routes
@app.post("/api/tasks")
async def create_task(task: Task, current_user: str = Depends(get_current_user)):
    task_dict = task.dict()
    task_dict["created_by"] = current_user
    task_dict["created_at"] = datetime.utcnow()

    result = tasks_collection.insert_one(task_dict)
    task_dict["_id"] = str(result.inserted_id)

    # Get current user info
    current_user_obj = users_collection.find_one({"email": current_user})
    creator_name = current_user_obj.get("full_name", current_user) if current_user_obj else current_user

    # Notify the assigned resident if they're not the creator
    if task.assigned_to_email and task.assigned_to_email != current_user:
        notification_title = f"New Task Assigned: {task.task_description[:50]}"
        notification_message = f"""
You have been assigned a new task by {creator_name}:

Task: {task.task_description}
Patient MRN: {task.patient_mrn}
Urgency: {task.urgency}
Due Date: {task.due_date if task.due_date else 'Not specified'}

Please complete this task to prepare the patient for the operating room.
        """.strip()

        create_notification(
            recipient_email=task.assigned_to_email,
            recipient_name=task.assigned_to,
            notif_type="task_assigned",
            title=notification_title,
            message=notification_message,
            case_mrn=task.patient_mrn,
            task_id=str(result.inserted_id)
        )

    return task_dict

@app.get("/api/tasks")
async def get_tasks(current_user: str = Depends(get_current_user)):
    tasks = list(tasks_collection.find())
    for task in tasks:
        task["_id"] = str(task["_id"])
    return tasks

@app.put("/api/tasks/{task_id}")
async def update_task(task_id: str, task: Task, current_user: str = Depends(get_current_user)):
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task ID format")
    
    result = tasks_collection.update_one(
        {"_id": oid},
        {"$set": task.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task updated successfully"}

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str, current_user: str = Depends(get_current_user)):
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task ID format")
    
    result = tasks_collection.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

@app.patch("/api/tasks/{task_id}/toggle")
async def toggle_task(task_id: str, current_user: str = Depends(get_current_user)):
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task ID format")
    
    task = tasks_collection.find_one({"_id": oid})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    new_status = not task.get("completed", False)
    result = tasks_collection.update_one(
        {"_id": oid},
        {"$set": {"completed": new_status, "status": "completed" if new_status else "pending"}}
    )
    
    return {"message": "Task status updated", "completed": new_status}

# Conference routes
@app.post("/api/conferences")
async def create_conference(conference: Conference, current_user: str = Depends(get_current_user)):
    conference_dict = conference.dict()
    conference_dict["created_by"] = current_user
    conference_dict["created_at"] = datetime.utcnow()
    
    result = conferences_collection.insert_one(conference_dict)
    conference_dict["_id"] = str(result.inserted_id)
    
    # Send calendar invites if enabled
    if CALENDAR_SYNC_ENABLED and conference.date:
        try:
            # Parse date and time
            conf_date = datetime.fromisoformat(conference.date)
            time_parts = conference.time.split(':') if conference.time else ['08', '00']
            start_datetime = datetime(
                conf_date.year,
                conf_date.month,
                conf_date.day,
                int(time_parts[0]),
                int(time_parts[1]),
                tzinfo=pytz.timezone('America/Chicago')
            )
            end_datetime = start_datetime + timedelta(hours=1)  # Default 1 hour meeting
            
            # Create calendar event
            description = f"""
{conference.title}

{conference.notes if conference.notes else 'No additional notes'}

Organizer: {current_user}
Attendees: {', '.join(conference.attendees) if conference.attendees else 'None listed'}
            """.strip()
            
            ical_content = create_ical_event(
                title=conference.title,
                description=description,
                start_datetime=start_datetime,
                end_datetime=end_datetime,
                location="Conference Room",
                attendees=conference.attendees if conference.attendees else []
            )
            
            # Send to organizer
            send_calendar_invite(
                to_email=current_user,
                subject=f"Meeting Scheduled: {conference.title}",
                body=description,
                ical_content=ical_content,
                cc_emails=conference.attendees if conference.attendees else []
            )
        except Exception as e:
            print(f"Calendar invite error: {str(e)}")
    
    return conference_dict

@app.get("/api/conferences")
async def get_conferences(current_user: str = Depends(get_current_user)):
    conferences = list(conferences_collection.find())
    for conference in conferences:
        conference["_id"] = str(conference["_id"])
    return conferences

@app.put("/api/conferences/{conference_id}")
async def update_conference(conference_id: str, conference: Conference, current_user: str = Depends(get_current_user)):
    result = conferences_collection.update_one(
        {"_id": ObjectId(conference_id)},
        {"$set": conference.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conference not found")
    return {"message": "Conference updated successfully"}

@app.delete("/api/conferences/{conference_id}")
async def delete_conference(conference_id: str, current_user: str = Depends(get_current_user)):
    result = conferences_collection.delete_one({"_id": ObjectId(conference_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conference not found")
    return {"message": "Conference deleted successfully"}

# Resident routes
@app.post("/api/residents")
async def create_resident(resident: Resident, current_user: str = Depends(get_current_user)):
    """Create a new resident"""
    resident_dict = resident.dict()
    resident_dict["created_by"] = current_user
    resident_dict["created_at"] = datetime.utcnow()

    # Check if resident email already exists
    if residents_collection.find_one({"email": resident.email}):
        raise HTTPException(status_code=400, detail="Resident with this email already exists")

    result = residents_collection.insert_one(resident_dict)
    resident_dict["_id"] = str(result.inserted_id)

    return resident_dict

@app.get("/api/residents")
async def get_residents(hospital: Optional[str] = None, current_user: str = Depends(get_current_user)):
    """Get all residents, optionally filtered by hospital"""
    query = {}
    if hospital:
        query["hospital"] = hospital

    residents = list(residents_collection.find(query))
    for resident in residents:
        resident["_id"] = str(resident["_id"])
    return residents

@app.get("/api/residents/active")
async def get_active_residents(hospital: Optional[str] = None, current_user: str = Depends(get_current_user)):
    """Get only active residents"""
    query = {"is_active": True}
    if hospital:
        query["hospital"] = hospital

    residents = list(residents_collection.find(query))
    for resident in residents:
        resident["_id"] = str(resident["_id"])
    return residents

@app.put("/api/residents/{resident_id}")
async def update_resident(resident_id: str, resident: Resident, current_user: str = Depends(get_current_user)):
    """Update a resident"""
    result = residents_collection.update_one(
        {"_id": ObjectId(resident_id)},
        {"$set": resident.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Resident not found")
    return {"message": "Resident updated successfully"}

@app.delete("/api/residents/{resident_id}")
async def delete_resident(resident_id: str, current_user: str = Depends(get_current_user)):
    """Delete a resident"""
    result = residents_collection.delete_one({"_id": ObjectId(resident_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resident not found")
    return {"message": "Resident deleted successfully"}

# Attending routes
@app.post("/api/attendings")
async def create_attending(attending: Attending, current_user: str = Depends(get_current_user)):
    """Create a new attending physician"""
    attending_dict = attending.dict()
    attending_dict["created_by"] = current_user
    attending_dict["created_at"] = datetime.utcnow()

    result = attendings_collection.insert_one(attending_dict)
    attending_dict["_id"] = str(result.inserted_id)

    return attending_dict

@app.get("/api/attendings")
async def get_attendings(hospital: Optional[str] = None, current_user: str = Depends(get_current_user)):
    """Get all attending physicians, optionally filtered by hospital"""
    query = {}
    if hospital:
        query["hospital"] = hospital

    attendings = list(attendings_collection.find(query))
    for attending in attendings:
        attending["_id"] = str(attending["_id"])
    return attendings

@app.get("/api/attendings/active")
async def get_active_attendings(hospital: Optional[str] = None, current_user: str = Depends(get_current_user)):
    """Get only active attending physicians"""
    query = {"is_active": True}
    if hospital:
        query["hospital"] = hospital

    attendings = list(attendings_collection.find(query))
    for attending in attendings:
        attending["_id"] = str(attending["_id"])
    return attendings

@app.put("/api/attendings/{attending_id}")
async def update_attending(attending_id: str, attending: Attending, current_user: str = Depends(get_current_user)):
    """Update an attending physician"""
    result = attendings_collection.update_one(
        {"_id": ObjectId(attending_id)},
        {"$set": attending.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Attending not found")
    return {"message": "Attending updated successfully"}

@app.delete("/api/attendings/{attending_id}")
async def delete_attending(attending_id: str, current_user: str = Depends(get_current_user)):
    """Delete an attending physician"""
    result = attendings_collection.delete_one({"_id": ObjectId(attending_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Attending not found")
    return {"message": "Attending deleted successfully"}

# ============================================
# Bulk Import Endpoints for Residents & Attendings
# ============================================
import csv
import io
from fastapi import File, UploadFile
from fastapi.responses import StreamingResponse

# Field definitions for CSV import
RESIDENT_FIELDS = {
    "required": ["name", "email"],
    "optional": ["pgy_level", "phone", "specialty"],
    "all": ["name", "email", "pgy_level", "phone", "specialty"]
}

ATTENDING_FIELDS = {
    "required": ["name", "email"],
    "optional": ["phone", "specialty", "department"],
    "all": ["name", "email", "phone", "specialty", "department"]
}

def normalize_header(header: str) -> str:
    """Normalize CSV header to lowercase, stripped, underscored"""
    return header.strip().lower().replace(" ", "_").replace("-", "_")

def parse_csv_file(file_content: bytes, entity_type: str):
    """Parse CSV file and return rows with validation"""
    fields = RESIDENT_FIELDS if entity_type == "residents" else ATTENDING_FIELDS
    
    # Handle BOM for Excel files
    try:
        content = file_content.decode('utf-8-sig')
    except UnicodeDecodeError:
        content = file_content.decode('utf-8')
    
    reader = csv.DictReader(io.StringIO(content))
    
    # Normalize headers
    if reader.fieldnames is None:
        return [], [{"row": 0, "error": "Empty CSV file or no headers found"}], []
    
    normalized_headers = {normalize_header(h): h for h in reader.fieldnames}
    
    # Check for required headers
    missing_headers = []
    for req in fields["required"]:
        if req not in normalized_headers:
            missing_headers.append(req)
    
    if missing_headers:
        return [], [{"row": 0, "error": f"Missing required headers: {', '.join(missing_headers)}"}], list(normalized_headers.keys())
    
    valid_rows = []
    error_rows = []
    
    for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
        # Create normalized row
        normalized_row = {}
        for norm_key, orig_key in normalized_headers.items():
            if norm_key in fields["all"]:
                value = row.get(orig_key, "") or ""
                normalized_row[norm_key] = value.strip()
        
        # Skip completely empty rows
        if all(not v for v in normalized_row.values()):
            continue
        
        # Validate required fields
        errors = []
        for req in fields["required"]:
            if not normalized_row.get(req):
                errors.append(f"Missing required field '{req}'")
        
        # Validate email format if present
        email = normalized_row.get("email", "")
        if email and "@" not in email:
            errors.append(f"Invalid email format: '{email}'")
        
        if errors:
            error_rows.append({
                "row": row_num,
                "data": normalized_row,
                "error": "; ".join(errors)
            })
        else:
            normalized_row["_row_num"] = row_num
            valid_rows.append(normalized_row)
    
    return valid_rows, error_rows, list(normalized_headers.keys())

@app.get("/api/import/template/{entity_type}")
async def get_import_template(entity_type: str, current_user: str = Depends(get_current_user)):
    """Download CSV template for bulk import"""
    if entity_type not in ["residents", "attendings"]:
        raise HTTPException(status_code=400, detail="Invalid entity type. Use 'residents' or 'attendings'")
    
    fields = RESIDENT_FIELDS if entity_type == "residents" else ATTENDING_FIELDS
    
    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(fields["all"])
    
    # Write sample row
    if entity_type == "residents":
        writer.writerow(["John Smith", "john.smith@hospital.org", "PGY-2", "555-123-4567", "General Surgery"])
    else:
        writer.writerow(["Dr. Jane Doe", "jane.doe@hospital.org", "555-987-6543", "Cardiothoracic Surgery", "Surgery"])
    
    # Prepare response
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={entity_type}_template.csv"
        }
    )

@app.post("/api/import/preview/{entity_type}")
async def preview_import(
    entity_type: str,
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    """Preview CSV import without saving - validate and return summary"""
    if entity_type not in ["residents", "attendings"]:
        raise HTTPException(status_code=400, detail="Invalid entity type. Use 'residents' or 'attendings'")
    
    # Check file type
    if not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    # Read file content
    content = await file.read()
    
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    
    # Parse CSV
    valid_rows, error_rows, headers = parse_csv_file(content, entity_type)
    
    # Check for duplicates in database
    collection = residents_collection if entity_type == "residents" else attendings_collection
    
    duplicate_rows = []
    new_rows = []
    
    for row in valid_rows:
        existing = collection.find_one({"email": row["email"].lower()})
        if existing:
            duplicate_rows.append({
                "row": row["_row_num"],
                "data": {k: v for k, v in row.items() if k != "_row_num"},
                "error": f"Email '{row['email']}' already exists in database"
            })
        else:
            new_rows.append({k: v for k, v in row.items() if k != "_row_num"})
    
    return {
        "entity_type": entity_type,
        "total_rows": len(valid_rows) + len(error_rows),
        "valid_count": len(new_rows),
        "duplicate_count": len(duplicate_rows),
        "error_count": len(error_rows),
        "valid_rows": new_rows,
        "duplicate_rows": duplicate_rows,
        "error_rows": error_rows,
        "headers_found": headers
    }

@app.post("/api/import/{entity_type}")
async def import_bulk(
    entity_type: str,
    file: UploadFile = File(...),
    skip_duplicates: bool = Query(True, description="Skip rows with duplicate emails"),
    current_user: str = Depends(get_current_user)
):
    """Import CSV data to database"""
    if entity_type not in ["residents", "attendings"]:
        raise HTTPException(status_code=400, detail="Invalid entity type. Use 'residents' or 'attendings'")
    
    # Check file type
    if not file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    # Read file content
    content = await file.read()
    
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")
    
    # Parse CSV
    valid_rows, error_rows, headers = parse_csv_file(content, entity_type)
    
    collection = residents_collection if entity_type == "residents" else attendings_collection
    
    imported_count = 0
    skipped_count = 0
    import_errors = []
    
    for row in valid_rows:
        row_num = row.pop("_row_num", 0)
        
        # Check for duplicate
        existing = collection.find_one({"email": row["email"].lower()})
        if existing:
            if skip_duplicates:
                skipped_count += 1
                continue
            else:
                import_errors.append({
                    "row": row_num,
                    "data": row,
                    "error": f"Email '{row['email']}' already exists"
                })
                continue
        
        # Prepare document for insert
        doc = {
            "name": row["name"],
            "email": row["email"].lower(),
            "hospital": "Default Hospital",  # Default value
            "specialty": row.get("specialty", ""),
            "is_active": True,
            "created_by": current_user,
            "created_at": datetime.utcnow()
        }
        
        # Add entity-specific fields
        if entity_type == "residents":
            doc["year"] = row.get("pgy_level", "")
            doc["phone"] = row.get("phone", "")
        else:
            doc["phone"] = row.get("phone", "")
            doc["department"] = row.get("department", "")
        
        try:
            collection.insert_one(doc)
            imported_count += 1
        except Exception as e:
            import_errors.append({
                "row": row_num,
                "data": row,
                "error": str(e)
            })
    
    return {
        "success": True,
        "entity_type": entity_type,
        "imported_count": imported_count,
        "skipped_count": skipped_count,
        "error_count": len(error_rows) + len(import_errors),
        "parse_errors": error_rows,
        "import_errors": import_errors
    }

# Notification routes
@app.get("/api/notifications")
async def get_notifications(current_user: str = Depends(get_current_user)):
    """Get all notifications for current user"""
    notifications = list(notifications_collection.find({"recipient_email": current_user}).sort("created_at", -1).limit(50))
    for notification in notifications:
        notification["_id"] = str(notification["_id"])
    return notifications

@app.get("/api/notifications/unread")
async def get_unread_notifications(current_user: str = Depends(get_current_user)):
    """Get unread notifications for current user"""
    notifications = list(notifications_collection.find({
        "recipient_email": current_user,
        "read": False
    }).sort("created_at", -1))
    for notification in notifications:
        notification["_id"] = str(notification["_id"])
    return notifications

@app.patch("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: str = Depends(get_current_user)):
    """Mark a notification as read"""
    result = notifications_collection.update_one(
        {"_id": ObjectId(notification_id), "recipient_email": current_user},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@app.patch("/api/notifications/mark-all-read")
async def mark_all_notifications_read(current_user: str = Depends(get_current_user)):
    """Mark all notifications as read for current user"""
    result = notifications_collection.update_many(
        {"recipient_email": current_user, "read": False},
        {"$set": {"read": True}}
    )
    return {"message": f"{result.modified_count} notifications marked as read"}

@app.delete("/api/notifications/{notification_id}")
async def delete_notification(notification_id: str, current_user: str = Depends(get_current_user)):
    """Delete a notification"""
    result = notifications_collection.delete_one({
        "_id": ObjectId(notification_id),
        "recipient_email": current_user
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted successfully"}

@app.post("/api/notifications/dismiss/{notification_id}")
async def dismiss_notification(notification_id: str, current_user: str = Depends(get_current_user)):
    """Dismiss a notification (hide from feed but keep in history)"""
    result = notifications_collection.update_one(
        {"_id": ObjectId(notification_id), "recipient_email": current_user},
        {"$set": {"dismissed": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification dismissed"}

# ============ NOTIFICATION PREFERENCES ============

@app.get("/api/notifications/preferences")
async def get_notification_preferences(current_user: str = Depends(get_current_user)):
    """Get notification preferences for current user"""
    prefs = notification_preferences.find_one({"user_email": current_user})
    if prefs:
        prefs["_id"] = str(prefs["_id"])
        return prefs
    # Return defaults if no preferences set
    return {
        "user_email": current_user,
        "in_app_enabled": True,
        "email_digest_enabled": True,
        "email_digest_day": "monday",
        "push_enabled": True,
        "notify_task_due_today": True,
        "notify_task_due_soon": True,
        "notify_task_overdue": True,
        "notify_task_assigned": True,
        "notify_case_scheduled": True
    }

@app.put("/api/notifications/preferences")
async def update_notification_preferences(prefs: NotificationPreferences, current_user: str = Depends(get_current_user)):
    """Update notification preferences for current user"""
    prefs_dict = prefs.dict()
    prefs_dict["user_email"] = current_user
    prefs_dict["updated_at"] = datetime.utcnow()
    
    result = notification_preferences.update_one(
        {"user_email": current_user},
        {"$set": prefs_dict},
        upsert=True
    )
    return {"message": "Preferences updated successfully"}

# ============ PUSH SUBSCRIPTIONS ============

@app.post("/api/push/subscribe")
async def subscribe_push(subscription: PushSubscription, current_user: str = Depends(get_current_user)):
    """Subscribe to push notifications"""
    sub_dict = subscription.dict()
    sub_dict["user_email"] = current_user
    sub_dict["created_at"] = datetime.utcnow()
    
    # Remove existing subscription for this endpoint
    push_subscriptions.delete_many({"endpoint": subscription.endpoint})
    
    # Add new subscription
    push_subscriptions.insert_one(sub_dict)
    return {"message": "Push subscription saved"}

@app.delete("/api/push/unsubscribe")
async def unsubscribe_push(current_user: str = Depends(get_current_user)):
    """Unsubscribe from push notifications"""
    result = push_subscriptions.delete_many({"user_email": current_user})
    return {"message": f"Removed {result.deleted_count} push subscriptions"}

# ============ TASK NOTIFICATION GENERATION ============

@app.post("/api/notifications/generate-task-notifications")
async def generate_task_notifications(current_user: str = Depends(get_current_user)):
    """Generate notifications for tasks due today, due soon, and overdue"""
    from datetime import date, timedelta
    
    today = date.today()
    three_days_later = today + timedelta(days=3)
    
    # Get user info
    user = users_collection.find_one({"email": current_user})
    user_name = user.get("full_name", current_user) if user else current_user
    
    # Get all incomplete tasks assigned to or created by user
    tasks = list(tasks_collection.find({
        "$or": [
            {"assigned_to_email": current_user},
            {"created_by": current_user}
        ],
        "completed": False
    }))
    
    notifications_created = 0
    
    for task in tasks:
        if not task.get("due_date"):
            continue
            
        try:
            due_date = datetime.strptime(task["due_date"], "%Y-%m-%d").date()
        except:
            continue
        
        task_id = str(task["_id"])
        
        # Check for existing notification of same type for this task today
        existing = notifications_collection.find_one({
            "task_id": task_id,
            "recipient_email": current_user,
            "created_at": {"$gte": datetime.combine(today, datetime.min.time())}
        })
        
        if existing:
            continue
        
        notification = None
        
        # Overdue tasks
        if due_date < today:
            days_overdue = (today - due_date).days
            notification = {
                "recipient_email": current_user,
                "recipient_name": user_name,
                "type": "task_overdue",
                "title": f"⚠️ Overdue: {task['task_description'][:50]}",
                "message": f"This task is {days_overdue} day{'s' if days_overdue > 1 else ''} overdue. Assigned to: {task.get('assigned_to', 'Unassigned')}",
                "task_id": task_id,
                "priority": "urgent",
                "read": False,
                "dismissed": False,
                "action_url": "/tasks",
                "created_at": datetime.utcnow()
            }
        # Due today
        elif due_date == today:
            notification = {
                "recipient_email": current_user,
                "recipient_name": user_name,
                "type": "task_due_today",
                "title": f"📅 Due Today: {task['task_description'][:50]}",
                "message": f"This task is due today. Assigned to: {task.get('assigned_to', 'Unassigned')}",
                "task_id": task_id,
                "priority": "high",
                "read": False,
                "dismissed": False,
                "action_url": "/tasks",
                "created_at": datetime.utcnow()
            }
        # Due within 3 days
        elif today < due_date <= three_days_later:
            days_until = (due_date - today).days
            notification = {
                "recipient_email": current_user,
                "recipient_name": user_name,
                "type": "task_due_soon",
                "title": f"🔔 Due Soon: {task['task_description'][:50]}",
                "message": f"This task is due in {days_until} day{'s' if days_until > 1 else ''}. Assigned to: {task.get('assigned_to', 'Unassigned')}",
                "task_id": task_id,
                "priority": "normal",
                "read": False,
                "dismissed": False,
                "action_url": "/tasks",
                "created_at": datetime.utcnow()
            }
        
        if notification:
            notifications_collection.insert_one(notification)
            notifications_created += 1
    
    return {"message": f"Generated {notifications_created} task notifications"}

@app.get("/api/notifications/summary")
async def get_notification_summary(current_user: str = Depends(get_current_user)):
    """Get summary of notifications for the notification bell badge"""
    # First generate fresh notifications
    from datetime import date, timedelta
    
    today = date.today()
    three_days_later = today + timedelta(days=3)
    
    # Count tasks by category
    tasks = list(tasks_collection.find({
        "$or": [
            {"assigned_to_email": current_user},
            {"created_by": current_user}
        ],
        "completed": False
    }))
    
    overdue_count = 0
    due_today_count = 0
    due_soon_count = 0
    
    for task in tasks:
        if not task.get("due_date"):
            continue
        try:
            due_date = datetime.strptime(task["due_date"], "%Y-%m-%d").date()
            if due_date < today:
                overdue_count += 1
            elif due_date == today:
                due_today_count += 1
            elif due_date <= three_days_later:
                due_soon_count += 1
        except:
            continue
    
    # Count unread notifications
    unread_count = notifications_collection.count_documents({
        "recipient_email": current_user,
        "read": False,
        "dismissed": False
    })
    
    return {
        "unread_count": unread_count,
        "overdue_tasks": overdue_count,
        "due_today_tasks": due_today_count,
        "due_soon_tasks": due_soon_count,
        "total_action_items": overdue_count + due_today_count + due_soon_count
    }

@app.get("/api/notifications/weekly-digest")
async def get_weekly_digest(current_user: str = Depends(get_current_user)):
    """Get weekly digest data for email or in-app display"""
    from datetime import date, timedelta
    
    today = date.today()
    week_end = today + timedelta(days=7)
    
    user = users_collection.find_one({"email": current_user})
    user_name = user.get("full_name", current_user) if user else current_user
    
    # Get tasks
    tasks = list(tasks_collection.find({
        "$or": [
            {"assigned_to_email": current_user},
            {"created_by": current_user}
        ],
        "completed": False
    }))
    
    overdue_tasks = []
    due_this_week = []
    upcoming_tasks = []
    
    for task in tasks:
        task["_id"] = str(task["_id"])
        if not task.get("due_date"):
            upcoming_tasks.append(task)
            continue
        try:
            due_date = datetime.strptime(task["due_date"], "%Y-%m-%d").date()
            if due_date < today:
                overdue_tasks.append(task)
            elif due_date <= week_end:
                due_this_week.append(task)
            else:
                upcoming_tasks.append(task)
        except:
            upcoming_tasks.append(task)
    
    # Get scheduled cases this week
    schedules = list(schedules_collection.find({
        "is_addon": False,
        "scheduled_date": {
            "$gte": today.isoformat(),
            "$lte": week_end.isoformat()
        }
    }))
    for s in schedules:
        s["_id"] = str(s["_id"])
    
    return {
        "user_name": user_name,
        "generated_at": datetime.utcnow().isoformat(),
        "week_start": today.isoformat(),
        "week_end": week_end.isoformat(),
        "summary": {
            "overdue_count": len(overdue_tasks),
            "due_this_week_count": len(due_this_week),
            "upcoming_count": len(upcoming_tasks),
            "scheduled_cases_count": len(schedules)
        },
        "overdue_tasks": overdue_tasks[:10],  # Limit to 10
        "due_this_week": due_this_week[:10],
        "upcoming_tasks": upcoming_tasks[:5],
        "scheduled_cases": schedules[:10]
    }


# ============ CPT CODES SEARCH ============

# Load CPT codes from JSON file
import json
CPT_CODES_FILE = os.path.join(os.path.dirname(__file__), 'cpt_codes.json')
CPT_CODES_DATA = {"categories": [], "metadata": {}}
CPT_CODES_FLAT = []  # Flattened list for fast searching
try:
    with open(CPT_CODES_FILE, 'r') as f:
        CPT_CODES_DATA = json.load(f)
    # Build flat index for search
    for cat in CPT_CODES_DATA.get("categories", []):
        cat_name = cat["name"]
        for c in cat.get("codes", []):
            CPT_CODES_FLAT.append({**c, "category": cat_name})
except Exception as e:
    print(f"Warning: Could not load CPT codes: {e}")

@app.get("/api/cpt-codes/search")
async def search_cpt_codes(query: str = Query(..., min_length=1)):
    """Search CPT codes by code, description, or common_name — grouped by category"""
    q = query.lower()
    results = []
    seen = set()
    for entry in CPT_CODES_FLAT:
        if (q in entry["code"].lower()
            or q in entry.get("description", "").lower()
            or q in entry.get("common_name", "").lower()
            or q in entry.get("subcategory", "").lower()):
            if entry["code"] not in seen:
                seen.add(entry["code"])
                results.append(entry)
            if len(results) >= 30:
                break
    return results

@app.get("/api/cpt-codes/categories")
async def get_cpt_categories():
    """Get all CPT code category names with counts"""
    return [
        {"name": cat["name"], "count": len(cat.get("codes", []))}
        for cat in CPT_CODES_DATA.get("categories", [])
    ]

@app.get("/api/cpt-codes/category/{category_name}")
async def get_cpt_by_category(category_name: str):
    """Get all codes in a specific category"""
    for cat in CPT_CODES_DATA.get("categories", []):
        if cat["name"].lower() == category_name.lower():
            return cat
    raise HTTPException(status_code=404, detail=f"Category '{category_name}' not found")

@app.get("/api/cpt-codes/all")
async def get_all_cpt_codes():
    """Get the full categorized CPT codes data"""
    return CPT_CODES_DATA

@app.get("/api/cpt-codes/favorites")
async def get_cpt_favorites(diagnosis: str = Query(None)):
    """Get favorite/common CPT codes, optionally filtered by diagnosis"""
    
    DIAGNOSIS_CATEGORY_MAP = {
        "mandible fracture": "Trauma", "mandibular fracture": "Trauma",
        "jaw fracture": "Trauma", "zmc fracture": "Trauma",
        "zygomatic fracture": "Trauma", "orbital fracture": "Trauma",
        "lefort fracture": "Trauma", "noe fracture": "Trauma",
        "nasal fracture": "Trauma", "midface fracture": "Trauma",
        "condyle fracture": "Trauma", "panfacial": "Trauma",
        "malocclusion": "Orthognathic Surgery", "prognathism": "Orthognathic Surgery",
        "retrognathia": "Orthognathic Surgery", "micrognathia": "Orthognathic Surgery",
        "orthognathic": "Orthognathic Surgery", "bsso": "Orthognathic Surgery",
        "lefort i": "Orthognathic Surgery", "open bite": "Orthognathic Surgery",
        "abscess": "Odontogenic Infections", "infection": "Odontogenic Infections",
        "osteomyelitis": "Odontogenic Infections", "cellulitis": "Odontogenic Infections",
        "ludwig": "Odontogenic Infections",
        "cancer": "Oncology & Ablative", "tumor": "Oncology & Ablative",
        "carcinoma": "Oncology & Ablative", "scc": "Oncology & Ablative",
        "squamous cell": "Oncology & Ablative", "malignant": "Oncology & Ablative",
        "ameloblastoma": "Oncology & Ablative", "odontogenic tumor": "Oncology & Ablative",
        "reconstruction": "Reconstruction & Free Flaps", "defect": "Reconstruction & Free Flaps",
        "free flap": "Reconstruction & Free Flaps", "fibula flap": "Reconstruction & Free Flaps",
        "biopsy": "Pathology", "lesion": "Pathology", "mass": "Pathology", "cyst": "Pathology",
        "tmj": "TMJ", "temporomandibular": "TMJ", "disc displacement": "TMJ", "ankylosis": "TMJ",
        "cleft": "Cleft & Craniofacial", "cleft lip": "Cleft & Craniofacial",
        "cleft palate": "Cleft & Craniofacial",
        "rhinoplasty": "Miscellaneous", "blepharoplasty": "Miscellaneous",
        "implant": "Implants & Preprosthetic", "sinus lift": "Implants & Preprosthetic",
        "extraction": "Dentoalveolar Surgery", "impacted": "Dentoalveolar Surgery",
        "torus": "Dentoalveolar Surgery", "wisdom": "Dentoalveolar Surgery",
    }
    
    if diagnosis:
        diagnosis_lower = diagnosis.lower()
        matched_category = None
        for keyword, category in DIAGNOSIS_CATEGORY_MAP.items():
            if keyword in diagnosis_lower:
                matched_category = category
                break
        
        if matched_category:
            for cat in CPT_CODES_DATA.get("categories", []):
                if cat["name"] == matched_category:
                    return [
                        {**c, "category": matched_category}
                        for c in cat.get("codes", [])
                    ]
    
    # Default: return all favorites
    return [e for e in CPT_CODES_FLAT if e.get("isFavorite")]


# ============ USAGE TRACKING ENDPOINTS ============

def track_usage(user_email: str, usage_type: str, value: str):
    """Track usage of diagnoses and CPT codes for intelligent suggestions"""
    try:
        usage_stats.update_one(
            {"user_email": user_email, "type": usage_type, "value": value},
            {
                "$inc": {"count": 1},
                "$set": {"last_used": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
    except Exception as e:
        print(f"Error tracking usage: {e}")

@app.get("/api/usage/frequently-used-diagnoses")
async def get_frequently_used_diagnoses(
    limit: int = Query(10, ge=1, le=50),
    current_user: str = Depends(get_current_user)
):
    """Get user's most frequently used diagnoses"""
    try:
        results = list(usage_stats.find(
            {"user_email": current_user, "type": "diagnosis"},
            {"_id": 0, "value": 1, "count": 1}
        ).sort("count", -1).limit(limit))
        
        return [{"diagnosis": r["value"], "count": r["count"]} for r in results]
    except Exception as e:
        print(f"Error fetching frequently used diagnoses: {e}")
        return []

@app.get("/api/usage/frequently-used-cpt")
async def get_frequently_used_cpt(
    limit: int = Query(10, ge=1, le=50),
    current_user: str = Depends(get_current_user)
):
    """Get user's most frequently used CPT codes"""
    try:
        results = list(usage_stats.find(
            {"user_email": current_user, "type": "cpt_code"},
            {"_id": 0, "value": 1, "count": 1}
        ).sort("count", -1).limit(limit))
        
        # Enrich with CPT code details from our database
        enriched = []
        for r in results:
            code = r["value"]
            # Search for the code in our CPT_CODES_DATA
            for category, codes in CPT_CODES_DATA.items():
                if category == 'favorites':
                    continue
                if code in codes:
                    enriched.append({
                        "code": code,
                        "description": codes[code],
                        "category": category.replace('_', ' ').title(),
                        "count": r["count"]
                    })
                    break
            else:
                # Check favorites
                if code in CPT_CODES_DATA.get('favorites', {}):
                    enriched.append({
                        "code": code,
                        "description": CPT_CODES_DATA['favorites'][code],
                        "category": "Favorites",
                        "count": r["count"]
                    })
        
        return enriched
    except Exception as e:
        print(f"Error fetching frequently used CPT codes: {e}")
        return []


# ============ GOOGLE OAUTH ENDPOINTS ============

@app.get("/api/google/auth-url")
async def get_google_auth_url_endpoint(current_user: str = Depends(get_current_user)):
    """Get Google OAuth authorization URL"""
    auth_url = get_google_auth_url(state=current_user)
    return {"authorization_url": auth_url}


@app.get("/api/google/callback")
async def google_oauth_callback(code: str, state: str = None):
    """Handle Google OAuth callback"""
    try:
        # Exchange code for tokens
        tokens = exchange_code_for_tokens(code)
        
        # Get user info
        google_user = get_google_user_info(tokens['access_token'])
        
        # Store tokens in user document
        user_email = state or google_user.get('email')
        
        users_collection.update_one(
            {"email": user_email},
            {
                "$set": {
                    "google_tokens": tokens,
                    "google_email": google_user.get('email'),
                    "google_connected": True,
                    "google_connected_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Redirect to frontend with success
        frontend_url = os.environ.get('FRONTEND_URL', 'https://clinic-scheduler-v2.preview.emergentagent.com')
        return RedirectResponse(f"{frontend_url}?google_connected=true")
        
    except Exception as e:
        frontend_url = os.environ.get('FRONTEND_URL', 'https://clinic-scheduler-v2.preview.emergentagent.com')
        return RedirectResponse(f"{frontend_url}?google_error={str(e)}")


@app.get("/api/google/status")
async def get_google_connection_status(current_user: str = Depends(get_current_user)):
    """Check if user has connected Google account"""
    user = users_collection.find_one({"email": current_user})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "connected": user.get("google_connected", False),
        "google_email": user.get("google_email"),
        "connected_at": user.get("google_connected_at")
    }


@app.post("/api/google/disconnect")
async def disconnect_google(current_user: str = Depends(get_current_user)):
    """Disconnect Google account"""
    users_collection.update_one(
        {"email": current_user},
        {
            "$unset": {
                "google_tokens": "",
                "google_email": "",
                "google_connected": "",
                "google_connected_at": ""
            }
        }
    )
    return {"message": "Google account disconnected"}


# ============ GOOGLE CALENDAR ENDPOINTS ============

async def get_user_google_tokens(current_user: str):
    """Helper to get and refresh Google tokens"""
    user = users_collection.find_one({"email": current_user})
    if not user or not user.get("google_tokens"):
        raise HTTPException(status_code=400, detail="Google account not connected")
    
    tokens = user["google_tokens"]
    
    # Refresh if needed
    try:
        updated_tokens, was_refreshed = refresh_tokens_if_needed(tokens)
        if was_refreshed:
            users_collection.update_one(
                {"email": current_user},
                {"$set": {"google_tokens": updated_tokens}}
            )
        return updated_tokens
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google token refresh failed: {str(e)}")


@app.get("/api/google/calendar/events")
async def get_calendar_events(
    days: int = 30,
    current_user: str = Depends(get_current_user)
):
    """Get calendar events from Google Calendar"""
    tokens = await get_user_google_tokens(current_user)
    
    time_min = datetime.now(timezone.utc)
    time_max = time_min + timedelta(days=days)
    
    try:
        events = list_calendar_events(tokens, time_min, time_max)
        return {"events": events}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch calendar events: {str(e)}")


class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    location: Optional[str] = ""
    start: str  # ISO format datetime
    end: str    # ISO format datetime
    attendees: Optional[List[str]] = []
    conference_link: Optional[str] = None


@app.post("/api/google/calendar/events")
async def create_google_calendar_event(
    event: CalendarEventCreate,
    current_user: str = Depends(get_current_user)
):
    """Create a new calendar event"""
    tokens = await get_user_google_tokens(current_user)
    
    try:
        created_event = create_calendar_event(tokens, event.dict())
        return {"event": created_event, "message": "Event created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create event: {str(e)}")


@app.put("/api/google/calendar/events/{event_id}")
async def update_google_calendar_event(
    event_id: str,
    event: CalendarEventCreate,
    current_user: str = Depends(get_current_user)
):
    """Update a calendar event"""
    tokens = await get_user_google_tokens(current_user)
    
    try:
        updated_event = update_calendar_event(tokens, event_id, event.dict())
        return {"event": updated_event, "message": "Event updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update event: {str(e)}")


@app.delete("/api/google/calendar/events/{event_id}")
async def delete_google_calendar_event(
    event_id: str,
    current_user: str = Depends(get_current_user)
):
    """Delete a calendar event"""
    tokens = await get_user_google_tokens(current_user)
    
    try:
        delete_calendar_event(tokens, event_id)
        return {"message": "Event deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete event: {str(e)}")


# ============ GMAIL ENDPOINTS ============

@app.get("/api/google/gmail/messages")
async def get_gmail_messages(
    query: str = "",
    max_results: int = 20,
    current_user: str = Depends(get_current_user)
):
    """Get emails from Gmail"""
    tokens = await get_user_google_tokens(current_user)
    
    try:
        emails = list_emails(tokens, query=query, max_results=max_results)
        return {"emails": emails}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch emails: {str(e)}")


@app.get("/api/google/gmail/messages/{message_id}")
async def get_gmail_message(
    message_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get a specific email"""
    tokens = await get_user_google_tokens(current_user)
    
    try:
        email = get_email_details(tokens, message_id)
        if not email:
            raise HTTPException(status_code=404, detail="Email not found")
        return {"email": email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch email: {str(e)}")


@app.get("/api/google/gmail/vsp-emails")
async def get_vsp_related_emails(current_user: str = Depends(get_current_user)):
    """Get emails related to VSP sessions"""
    tokens = await get_user_google_tokens(current_user)
    
    try:
        emails = search_emails_for_vsp(tokens)
        
        # Extract VSP links from emails
        for email in emails:
            email['vsp_links'] = extract_vsp_link_from_email(email.get('body', '') + email.get('snippet', ''))
        
        return {"emails": emails}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search VSP emails: {str(e)}")


@app.get("/api/google/gmail/patient-emails/{patient_name}")
async def get_patient_related_emails(
    patient_name: str,
    mrn: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    """Get emails related to a specific patient"""
    tokens = await get_user_google_tokens(current_user)
    
    try:
        emails = search_emails_for_patient(tokens, patient_name, mrn)
        return {"emails": emails}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search patient emails: {str(e)}")


# ============ VSP SESSION ENDPOINTS ============

class VSPSessionCreate(BaseModel):
    patient_name: str
    mrn: Optional[str] = None
    procedure: str
    attending: Optional[str] = None
    start: str  # ISO format
    end: str    # ISO format
    conference_link: Optional[str] = None
    attendees: Optional[List[str]] = []
    notes: Optional[str] = ""


@app.post("/api/vsp-sessions")
async def create_vsp_session(
    vsp: VSPSessionCreate,
    current_user: str = Depends(get_current_user)
):
    """Create a VSP session and calendar event"""
    tokens = await get_user_google_tokens(current_user)
    
    # Create VSP record in database
    vsp_record = {
        "patient_name": vsp.patient_name,
        "mrn": vsp.mrn,
        "procedure": vsp.procedure,
        "attending": vsp.attending,
        "start": vsp.start,
        "end": vsp.end,
        "conference_link": vsp.conference_link,
        "attendees": vsp.attendees,
        "notes": vsp.notes,
        "created_by": current_user,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "scheduled"
    }
    
    result = db.vsp_sessions.insert_one(vsp_record)
    vsp_record["_id"] = str(result.inserted_id)
    
    # Create Google Calendar event
    try:
        calendar_event = create_vsp_calendar_event(tokens, vsp.dict())
        vsp_record["google_event_id"] = calendar_event.get("id")
        
        # Update record with calendar event ID
        db.vsp_sessions.update_one(
            {"_id": result.inserted_id},
            {"$set": {"google_event_id": calendar_event.get("id")}}
        )
    except Exception as e:
        # VSP created but calendar event failed
        vsp_record["calendar_error"] = str(e)
    
    return {"vsp_session": vsp_record, "message": "VSP session created"}


@app.get("/api/vsp-sessions")
async def list_vsp_sessions(current_user: str = Depends(get_current_user)):
    """List all VSP sessions"""
    sessions = list(db.vsp_sessions.find().sort("start", -1))
    for session in sessions:
        session["_id"] = str(session["_id"])
    return {"sessions": sessions}


@app.get("/api/vsp-sessions/{session_id}")
async def get_vsp_session(session_id: str, current_user: str = Depends(get_current_user)):
    """Get a specific VSP session"""
    session = db.vsp_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="VSP session not found")
    session["_id"] = str(session["_id"])
    return {"session": session}


@app.delete("/api/vsp-sessions/{session_id}")
async def delete_vsp_session(session_id: str, current_user: str = Depends(get_current_user)):
    """Delete a VSP session and its calendar event"""
    session = db.vsp_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="VSP session not found")
    
    # Delete calendar event if exists
    if session.get("google_event_id"):
        try:
            tokens = await get_user_google_tokens(current_user)
            delete_calendar_event(tokens, session["google_event_id"])
        except:
            pass  # Continue even if calendar deletion fails
    
    db.vsp_sessions.delete_one({"_id": ObjectId(session_id)})
    return {"message": "VSP session deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
