from dotenv import load_dotenv
load_dotenv()  # Load environment variables before any other imports

from fastapi import FastAPI, HTTPException, Depends, status, Query
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
from passlib.context import CryptContext
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from icalendar import Calendar, Event as ICalEvent
import pytz
import requests
from urllib.parse import urlencode

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
usage_stats_collection = db.usage_stats  # Track frequently used diagnoses and CPT codes

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 1440))

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
    dob: str
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

class Task(BaseModel):
    patient_mrn: str
    task_description: str
    urgency: str = "medium"
    assigned_to: str
    assigned_to_email: Optional[str] = None
    due_date: Optional[str] = None
    status: str = "pending"
    completed: bool = False
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

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
    type: str  # case_added, task_assigned, case_updated
    title: str
    message: str
    case_mrn: Optional[str] = None
    task_id: Optional[str] = None
    read: bool = False
    created_at: Optional[datetime] = None

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
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Usage Tracking Helper Functions
def track_usage(user_email: str, item_type: str, item_value: str):
    """
    Track usage of diagnoses and CPT codes for intelligent suggestions
    item_type: 'diagnosis' or 'cpt_code'
    item_value: the actual diagnosis text or CPT code
    """
    if not item_value or not item_value.strip():
        return

    # Find or create usage record for this user and item
    usage_record = usage_stats_collection.find_one({
        "user_email": user_email,
        "item_type": item_type,
        "item_value": item_value.strip()
    })

    if usage_record:
        # Increment usage count and update last used timestamp
        usage_stats_collection.update_one(
            {"_id": usage_record["_id"]},
            {
                "$inc": {"usage_count": 1},
                "$set": {"last_used": datetime.utcnow()}
            }
        )
    else:
        # Create new usage record
        usage_stats_collection.insert_one({
            "user_email": user_email,
            "item_type": item_type,
            "item_value": item_value.strip(),
            "usage_count": 1,
            "first_used": datetime.utcnow(),
            "last_used": datetime.utcnow()
        })

def get_frequently_used(user_email: str, item_type: str, limit: int = 10):
    """
    Get frequently used diagnoses or CPT codes for a user
    Returns items sorted by usage count (descending)
    """
    usage_records = list(usage_stats_collection.find({
        "user_email": user_email,
        "item_type": item_type
    }).sort("usage_count", -1).limit(limit))

    return [record["item_value"] for record in usage_records]

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
    
    return {
        "email": db_user["email"],
        "full_name": db_user["full_name"],
        "role": db_user["role"]
    }

@app.get("/api/users")
async def get_all_users(current_user: str = Depends(get_current_user)):
    """Get all registered users for task assignment dropdown"""
    users = list(users_collection.find({}, {"email": 1, "full_name": 1, "role": 1}))
    for user in users:
        user["_id"] = str(user["_id"])
    return users

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

    # Track usage of diagnosis and CPT code for intelligent suggestions
    if patient_dict.get("diagnosis"):
        track_usage(current_user, "diagnosis", patient_dict["diagnosis"])
    if patient_dict.get("procedure_code"):
        track_usage(current_user, "cpt_code", patient_dict["procedure_code"])

    return patient_dict

@app.get("/api/patients")
async def get_patients(current_user: str = Depends(get_current_user)):
    patients = list(patients_collection.find())
    for patient in patients:
        patient["_id"] = str(patient["_id"])
    return patients

@app.get("/api/patients/{mrn}")
async def get_patient(mrn: str, current_user: str = Depends(get_current_user)):
    patient = patients_collection.find_one({"mrn": mrn})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient["_id"] = str(patient["_id"])
    return patient

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

    # Track usage if diagnosis or CPT code changed
    if patient_dict.get("diagnosis") and current_patient.get("diagnosis") != patient_dict.get("diagnosis"):
        track_usage(current_user, "diagnosis", patient_dict["diagnosis"])
    if patient_dict.get("procedure_code") and current_patient.get("procedure_code") != patient_dict.get("procedure_code"):
        track_usage(current_user, "cpt_code", patient_dict["procedure_code"])

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
async def update_schedule(schedule_id: str, schedule: Schedule, current_user: str = Depends(get_current_user)):
    result = schedules_collection.update_one(
        {"_id": ObjectId(schedule_id)},
        {"$set": schedule.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule updated successfully"}

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
    result = tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": task.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task updated successfully"}

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str, current_user: str = Depends(get_current_user)):
    result = tasks_collection.delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

@app.patch("/api/tasks/{task_id}/toggle")
async def toggle_task(task_id: str, current_user: str = Depends(get_current_user)):
    task = tasks_collection.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    new_status = not task.get("completed", False)
    result = tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
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


# ============ CPT CODES SEARCH ============

# Load CPT codes from JSON file
import json
CPT_CODES_FILE = os.path.join(os.path.dirname(__file__), 'cpt_codes.json')
CPT_CODES_DATA = {}
try:
    with open(CPT_CODES_FILE, 'r') as f:
        CPT_CODES_DATA = json.load(f)
except Exception as e:
    print(f"Warning: Could not load CPT codes: {e}")

@app.get("/api/cpt-codes/search")
async def search_cpt_codes(query: str = Query(..., min_length=2)):
    """Search CPT codes by code or description"""
    results = []
    query_lower = query.lower()

    for category, codes in CPT_CODES_DATA.items():
        for code, description in codes.items():
            if query_lower in code.lower() or query_lower in description.lower():
                results.append({
                    "code": code,
                    "description": description,
                    "category": category.replace('_', ' ').title()
                })
                if len(results) >= 15:  # Limit results
                    return results

    return results

@app.get("/api/cpt-codes/categories")
async def get_cpt_categories():
    """Get all CPT code categories"""
    return list(CPT_CODES_DATA.keys())

@app.get("/api/cpt-codes/favorites")
async def get_cpt_favorites():
    """Get favorite/common CPT codes"""
    favorites = CPT_CODES_DATA.get('favorites', {})
    return [
        {
            "code": code,
            "description": description,
            "category": "Favorites"
        }
        for code, description in favorites.items()
    ]

@app.get("/api/usage/frequently-used-cpt")
async def get_frequently_used_cpt_codes(current_user: str = Depends(get_current_user), limit: int = Query(10, le=50)):
    """Get frequently used CPT codes for the current user"""
    cpt_codes = get_frequently_used(current_user, "cpt_code", limit)

    # Enrich with descriptions from CPT codes data
    enriched_codes = []
    for code in cpt_codes:
        # Find the code in any category
        description = None
        category = None
        for cat_name, cat_codes in CPT_CODES_DATA.items():
            if code in cat_codes:
                description = cat_codes[code]
                category = cat_name.replace('_', ' ').title()
                break

        if description:
            enriched_codes.append({
                "code": code,
                "description": description,
                "category": category
            })

    return enriched_codes

@app.get("/api/usage/frequently-used-diagnoses")
async def get_frequently_used_diagnoses(current_user: str = Depends(get_current_user), limit: int = Query(10, le=50)):
    """Get frequently used diagnoses for the current user"""
    diagnoses = get_frequently_used(current_user, "diagnosis", limit)
    return [{"diagnosis": diag} for diag in diagnoses]


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
        frontend_url = os.environ.get('FRONTEND_URL', 'https://orchedule.preview.emergentagent.com')
        return RedirectResponse(f"{frontend_url}?google_connected=true")

    except Exception as e:
        frontend_url = os.environ.get('FRONTEND_URL', 'https://orchedule.preview.emergentagent.com')
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
