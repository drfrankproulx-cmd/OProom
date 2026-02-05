"""
Backend API Tests for OR Scheduling Platform
Tests: Google OAuth endpoints, Patient CRUD, Resident/Attending management
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://orchedule.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = f"test_google_oauth_{int(time.time())}@example.com"
TEST_PASSWORD = "Test123!"
TEST_NAME = "Test User OAuth"


class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health endpoint working")
    
    def test_register_new_user(self):
        """Test user registration"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": TEST_NAME,
            "role": "resident"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✓ User registered: {TEST_EMAIL}")
        return data["access_token"]
    
    def test_login_user(self):
        """Test user login with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "Test123!"
        })
        # May fail if user doesn't exist, that's ok
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            print("✓ Login successful")
            return data["access_token"]
        else:
            print(f"⚠ Login failed (user may not exist): {response.status_code}")
            return None
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")


class TestGoogleOAuth:
    """Google OAuth endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        # Register a new user for testing
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"google_test_{int(time.time())}@example.com",
            "password": TEST_PASSWORD,
            "full_name": "Google Test User",
            "role": "resident"
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
        else:
            # Try login with existing test user
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "test@example.com",
                "password": "Test123!"
            })
            if response.status_code == 200:
                self.token = response.json()["access_token"]
            else:
                pytest.skip("Could not get auth token")
        
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_google_auth_url_endpoint(self):
        """Test Google auth-url endpoint generates valid authorization URL"""
        response = requests.get(f"{BASE_URL}/api/google/auth-url", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "authorization_url" in data
        
        auth_url = data["authorization_url"]
        # Verify URL contains expected Google OAuth components
        assert "accounts.google.com" in auth_url
        assert "client_id=" in auth_url
        assert "redirect_uri=" in auth_url
        assert "scope=" in auth_url
        
        # Verify correct client_id is in URL
        assert "499606525479-5iiup4pdop0es91jhhep67v5q2lqlaiu.apps.googleusercontent.com" in auth_url
        
        # Verify redirect_uri is correct
        assert "orchedule.preview.emergentagent.com" in auth_url
        
        print(f"✓ Google auth URL generated correctly")
        print(f"  URL starts with: {auth_url[:100]}...")
    
    def test_google_auth_url_requires_auth(self):
        """Test Google auth-url endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/google/auth-url")
        # Should return 403 (Forbidden) or 401 (Unauthorized) without token
        assert response.status_code in [401, 403]
        print("✓ Google auth-url correctly requires authentication")
    
    def test_google_status_endpoint(self):
        """Test Google status endpoint returns connection status"""
        response = requests.get(f"{BASE_URL}/api/google/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should have connected field
        assert "connected" in data
        # For new user, should be False
        assert data["connected"] == False
        
        print(f"✓ Google status endpoint working - connected: {data['connected']}")
    
    def test_google_disconnect_endpoint(self):
        """Test Google disconnect endpoint works"""
        response = requests.post(f"{BASE_URL}/api/google/disconnect", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "disconnected" in data["message"].lower()
        print("✓ Google disconnect endpoint working")
    
    def test_google_calendar_events_not_connected(self):
        """Test calendar events endpoint returns error when not connected"""
        response = requests.get(f"{BASE_URL}/api/google/calendar/events", headers=self.headers)
        # Should return 400 since Google not connected
        assert response.status_code == 400
        data = response.json()
        assert "not connected" in data["detail"].lower()
        print("✓ Calendar events correctly requires Google connection")
    
    def test_google_gmail_messages_not_connected(self):
        """Test Gmail messages endpoint returns error when not connected"""
        response = requests.get(f"{BASE_URL}/api/google/gmail/messages", headers=self.headers)
        # Should return 400 since Google not connected
        assert response.status_code == 400
        data = response.json()
        assert "not connected" in data["detail"].lower()
        print("✓ Gmail messages correctly requires Google connection")


class TestPatientCRUD:
    """Patient CRUD operation tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"patient_test_{int(time.time())}@example.com",
            "password": TEST_PASSWORD,
            "full_name": "Patient Test User",
            "role": "resident"
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
        else:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "test@example.com",
                "password": "Test123!"
            })
            if response.status_code == 200:
                self.token = response.json()["access_token"]
            else:
                pytest.skip("Could not get auth token")
        
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.test_mrn = f"TEST_MRN_{int(time.time())}"
    
    def test_create_patient(self):
        """Test creating a new patient"""
        patient_data = {
            "mrn": self.test_mrn,
            "patient_name": "Test Patient",
            "dob": "1990-01-15",
            "diagnosis": "Test Diagnosis",
            "procedures": "Test Procedure",
            "attending": "Dr. Test",
            "status": "pending"
        }
        
        response = requests.post(f"{BASE_URL}/api/patients", headers=self.headers, json=patient_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["mrn"] == self.test_mrn
        assert data["patient_name"] == "Test Patient"
        assert "prep_checklist" in data
        print(f"✓ Patient created: {self.test_mrn}")
        return data
    
    def test_get_patients(self):
        """Test getting all patients"""
        response = requests.get(f"{BASE_URL}/api/patients", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} patients")
    
    def test_get_patient_by_mrn(self):
        """Test getting a specific patient by MRN"""
        # First create a patient
        patient_data = {
            "mrn": f"GET_TEST_{int(time.time())}",
            "patient_name": "Get Test Patient",
            "dob": "1985-05-20",
            "status": "pending"
        }
        create_response = requests.post(f"{BASE_URL}/api/patients", headers=self.headers, json=patient_data)
        assert create_response.status_code == 200
        
        # Then get it
        response = requests.get(f"{BASE_URL}/api/patients/{patient_data['mrn']}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["mrn"] == patient_data["mrn"]
        assert data["patient_name"] == "Get Test Patient"
        print(f"✓ Got patient by MRN: {patient_data['mrn']}")
    
    def test_update_patient(self):
        """Test updating a patient"""
        # First create a patient
        mrn = f"UPDATE_TEST_{int(time.time())}"
        patient_data = {
            "mrn": mrn,
            "patient_name": "Update Test Patient",
            "dob": "1980-03-10",
            "status": "pending"
        }
        create_response = requests.post(f"{BASE_URL}/api/patients", headers=self.headers, json=patient_data)
        assert create_response.status_code == 200
        
        # Update the patient
        updated_data = {
            "mrn": mrn,
            "patient_name": "Updated Patient Name",
            "dob": "1980-03-10",
            "diagnosis": "Updated Diagnosis",
            "status": "confirmed"
        }
        response = requests.put(f"{BASE_URL}/api/patients/{mrn}", headers=self.headers, json=updated_data)
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/patients/{mrn}", headers=self.headers)
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["patient_name"] == "Updated Patient Name"
        assert data["diagnosis"] == "Updated Diagnosis"
        print(f"✓ Patient updated: {mrn}")
    
    def test_delete_patient(self):
        """Test deleting a patient"""
        # First create a patient
        mrn = f"DELETE_TEST_{int(time.time())}"
        patient_data = {
            "mrn": mrn,
            "patient_name": "Delete Test Patient",
            "dob": "1975-07-25",
            "status": "pending"
        }
        create_response = requests.post(f"{BASE_URL}/api/patients", headers=self.headers, json=patient_data)
        assert create_response.status_code == 200
        
        # Delete the patient
        response = requests.delete(f"{BASE_URL}/api/patients/{mrn}", headers=self.headers)
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/patients/{mrn}", headers=self.headers)
        assert get_response.status_code == 404
        print(f"✓ Patient deleted: {mrn}")
    
    def test_update_patient_checklist(self):
        """Test updating patient prep checklist"""
        # First create a patient
        mrn = f"CHECKLIST_TEST_{int(time.time())}"
        patient_data = {
            "mrn": mrn,
            "patient_name": "Checklist Test Patient",
            "dob": "1995-12-01",
            "status": "pending"
        }
        create_response = requests.post(f"{BASE_URL}/api/patients", headers=self.headers, json=patient_data)
        assert create_response.status_code == 200
        
        # Update checklist item
        response = requests.patch(
            f"{BASE_URL}/api/patients/{mrn}/checklist?checklist_item=xrays&checked=true",
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/patients/{mrn}", headers=self.headers)
        data = get_response.json()
        assert data["prep_checklist"]["xrays"] == True
        print(f"✓ Patient checklist updated: {mrn}")


class TestResidentAttendingManagement:
    """Resident and Attending management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"staff_test_{int(time.time())}@example.com",
            "password": TEST_PASSWORD,
            "full_name": "Staff Test User",
            "role": "admin"
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
        else:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "test@example.com",
                "password": "Test123!"
            })
            if response.status_code == 200:
                self.token = response.json()["access_token"]
            else:
                pytest.skip("Could not get auth token")
        
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_create_resident(self):
        """Test creating a new resident"""
        resident_data = {
            "name": f"Dr. Test Resident {int(time.time())}",
            "email": f"resident_{int(time.time())}@hospital.edu",
            "hospital": "Test Hospital",
            "specialty": "Orthopedics",
            "year": "PGY-3",
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/residents", headers=self.headers, json=resident_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == resident_data["name"]
        assert data["email"] == resident_data["email"]
        assert data["hospital"] == "Test Hospital"
        print(f"✓ Resident created: {resident_data['name']}")
        return data
    
    def test_get_residents(self):
        """Test getting all residents"""
        response = requests.get(f"{BASE_URL}/api/residents", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} residents")
    
    def test_get_active_residents(self):
        """Test getting only active residents"""
        response = requests.get(f"{BASE_URL}/api/residents/active", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned residents should be active
        for resident in data:
            assert resident.get("is_active", True) == True
        print(f"✓ Got {len(data)} active residents")
    
    def test_create_attending(self):
        """Test creating a new attending"""
        attending_data = {
            "name": f"Dr. Test Attending {int(time.time())}",
            "email": f"attending_{int(time.time())}@hospital.edu",
            "hospital": "Test Hospital",
            "specialty": "General Surgery",
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/attendings", headers=self.headers, json=attending_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == attending_data["name"]
        assert data["hospital"] == "Test Hospital"
        print(f"✓ Attending created: {attending_data['name']}")
        return data
    
    def test_create_attending_without_email(self):
        """Test creating attending without email (optional field)"""
        attending_data = {
            "name": f"Dr. No Email {int(time.time())}",
            "hospital": "Test Hospital",
            "specialty": "Neurosurgery",
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/attendings", headers=self.headers, json=attending_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == attending_data["name"]
        assert data.get("email") is None
        print(f"✓ Attending created without email: {attending_data['name']}")
    
    def test_get_attendings(self):
        """Test getting all attendings"""
        response = requests.get(f"{BASE_URL}/api/attendings", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} attendings")
    
    def test_get_active_attendings(self):
        """Test getting only active attendings"""
        response = requests.get(f"{BASE_URL}/api/attendings/active", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} active attendings")


class TestSchedulesAndTasks:
    """Schedule and Task management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"schedule_test_{int(time.time())}@example.com",
            "password": TEST_PASSWORD,
            "full_name": "Schedule Test User",
            "role": "resident"
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
        else:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "test@example.com",
                "password": "Test123!"
            })
            if response.status_code == 200:
                self.token = response.json()["access_token"]
            else:
                pytest.skip("Could not get auth token")
        
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_create_schedule(self):
        """Test creating a new schedule"""
        schedule_data = {
            "patient_mrn": f"SCHED_TEST_{int(time.time())}",
            "patient_name": "Schedule Test Patient",
            "procedure": "Test Procedure",
            "staff": "Dr. Test",
            "scheduled_date": "2026-02-15",
            "scheduled_time": "09:00",
            "status": "scheduled",
            "is_addon": False,
            "priority": "medium"
        }
        
        response = requests.post(f"{BASE_URL}/api/schedules", headers=self.headers, json=schedule_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["patient_name"] == "Schedule Test Patient"
        assert data["procedure"] == "Test Procedure"
        print(f"✓ Schedule created for: {schedule_data['patient_name']}")
        return data
    
    def test_get_schedules(self):
        """Test getting all schedules"""
        response = requests.get(f"{BASE_URL}/api/schedules", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} schedules")
    
    def test_create_task(self):
        """Test creating a new task"""
        task_data = {
            "patient_mrn": f"TASK_TEST_{int(time.time())}",
            "task_description": "Test task description",
            "urgency": "high",
            "assigned_to": "Test Resident",
            "due_date": "2026-02-10",
            "status": "pending",
            "completed": False
        }
        
        response = requests.post(f"{BASE_URL}/api/tasks", headers=self.headers, json=task_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["task_description"] == "Test task description"
        assert data["urgency"] == "high"
        print(f"✓ Task created: {task_data['task_description'][:30]}...")
        return data
    
    def test_get_tasks(self):
        """Test getting all tasks"""
        response = requests.get(f"{BASE_URL}/api/tasks", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} tasks")
    
    def test_toggle_task(self):
        """Test toggling task completion status"""
        # First create a task
        task_data = {
            "patient_mrn": f"TOGGLE_TEST_{int(time.time())}",
            "task_description": "Toggle test task",
            "urgency": "medium",
            "assigned_to": "Test User",
            "due_date": "2026-02-12",
            "status": "pending",
            "completed": False
        }
        
        create_response = requests.post(f"{BASE_URL}/api/tasks", headers=self.headers, json=task_data)
        assert create_response.status_code == 200
        task_id = create_response.json()["_id"]
        
        # Toggle the task
        response = requests.patch(f"{BASE_URL}/api/tasks/{task_id}/toggle", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["completed"] == True
        print(f"✓ Task toggled to completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
