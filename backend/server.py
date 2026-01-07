from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta
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
schedules_collection = db.schedules
tasks_collection = db.tasks
conferences_collection = db.conferences

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 1440))

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "resident"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Patient(BaseModel):
    mrn: str
    patient_name: str
    dob: str
    diagnosis: Optional[str] = None
    procedures: Optional[str] = None
    procedure_code: Optional[str] = None
    attending: Optional[str] = None
    status: str = "pending"
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

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

# Patient routes
@app.post("/api/patients")
async def create_patient(patient: Patient, current_user: str = Depends(get_current_user)):
    patient_dict = patient.dict()
    patient_dict["created_by"] = current_user
    patient_dict["created_at"] = datetime.utcnow()
    
    result = patients_collection.insert_one(patient_dict)
    patient_dict["_id"] = str(result.inserted_id)
    
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
    result = patients_collection.update_one(
        {"mrn": mrn},
        {"$set": patient.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient updated successfully"}

@app.delete("/api/patients/{mrn}")
async def delete_patient(mrn: str, current_user: str = Depends(get_current_user)):
    result = patients_collection.delete_one({"mrn": mrn})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"message": "Patient deleted successfully"}

# Schedule routes
@app.post("/api/schedules")
async def create_schedule(schedule: Schedule, current_user: str = Depends(get_current_user)):
    schedule_dict = schedule.dict()
    schedule_dict["created_by"] = current_user
    schedule_dict["created_at"] = datetime.utcnow()
    
    result = schedules_collection.insert_one(schedule_dict)
    schedule_dict["_id"] = str(result.inserted_id)
    
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
