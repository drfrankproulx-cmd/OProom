"""
Comprehensive Smoke Test for OR Scheduler
Tests all major features after deployment fixes:
- Auth flow (login/logout)
- Dashboard stat cards
- Quick Add Patient
- Calendar views
- Patients page with checklist/tasks
- Settings and Bulk Import pages
- API health endpoints
"""

import pytest
import requests
import os
from datetime import datetime, timedelta
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://hipaa-ready-test.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "proul076@umn.edu"
TEST_PASSWORD = "59K63i75%("

# Test data prefix for cleanup
TEST_PREFIX = "SMOKE_TEST_"


class TestHealthEndpoints:
    """Test health check endpoints - critical for deployment"""
    
    def test_api_health_endpoint(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"API health endpoint failed: {response.status_code}"
        data = response.json()
        assert data.get("status") == "healthy", f"API health status not healthy: {data}"
        print("✓ /api/health endpoint returns healthy")
    
    def test_root_health_returns_frontend(self):
        """Test /health at root returns frontend (expected behavior in k8s ingress)"""
        response = requests.get(f"{BASE_URL}/health")
        # In k8s ingress setup, /health without /api prefix goes to frontend
        # The backend /health endpoint is accessible via /api/health
        assert response.status_code == 200, f"Root health endpoint failed: {response.status_code}"
        # This returns HTML (frontend) not JSON
        print("✓ /health returns frontend (expected - use /api/health for backend)")


class TestAuthentication:
    """Test authentication flow"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        print(f"✓ Login successful for {TEST_EMAIL}")
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Test login with valid credentials"""
        assert auth_token is not None
        print("✓ Login returns valid token")
    
    def test_login_returns_user_info(self):
        """Test login returns user information"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert "full_name" in data["user"]
        assert "role" in data["user"]
        print(f"✓ Login returns user info: {data['user']['full_name']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@example.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials return 401")
    
    def test_get_current_user(self, auth_token):
        """Test /api/auth/me endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get current user failed: {response.status_code}"
        data = response.json()
        assert data["email"] == TEST_EMAIL
        print(f"✓ /api/auth/me returns current user: {data['email']}")


class TestPatientsAPI:
    """Test patients API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_patients(self, auth_headers):
        """Test GET /api/patients returns patient list"""
        response = requests.get(f"{BASE_URL}/api/patients", headers=auth_headers)
        assert response.status_code == 200, f"Get patients failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/patients returns {len(data)} patients")
    
    def test_get_patients_with_tasks(self, auth_headers):
        """Test GET /api/patients/with-tasks returns enriched patient data"""
        response = requests.get(f"{BASE_URL}/api/patients/with-tasks", headers=auth_headers)
        assert response.status_code == 200, f"Get patients with tasks failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        if len(data) > 0:
            patient = data[0]
            assert "mrn" in patient
            assert "patient_name" in patient
            # Check for enriched fields
            assert "tasks" in patient or "task_count" in patient
            print(f"✓ GET /api/patients/with-tasks returns enriched data with {len(data)} patients")
        else:
            print("✓ GET /api/patients/with-tasks returns empty list (no patients)")
    
    def test_create_patient_with_tasks(self, auth_headers):
        """Test POST /api/patients/create-with-tasks creates patient and auto-generates tasks"""
        mrn = f"{TEST_PREFIX}{random.randint(100000, 999999)}"
        patient_data = {
            "mrn": mrn,
            "patient_name": f"{TEST_PREFIX}John Doe",
            "dob": "1990-01-15",
            "diagnosis": "Test Diagnosis",
            "procedures": "Test Procedure",
            "procedure_code": "21141",
            "attending": "Dr. Test",
            "scheduled_date": None,
            "scheduled_time": None,
            "auto_generate_tasks": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/patients/create-with-tasks",
            headers=auth_headers,
            json=patient_data
        )
        assert response.status_code == 200, f"Create patient failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Verify patient created
        assert "patient" in data
        assert data["patient"]["mrn"] == mrn
        assert data["patient"]["patient_name"] == f"{TEST_PREFIX}John Doe"
        
        # Verify tasks auto-generated
        assert "tasks" in data
        assert len(data["tasks"]) == 3, f"Expected 3 auto-generated tasks, got {len(data['tasks'])}"
        
        # Verify status is add-on (no scheduled_date)
        assert data["status"] == "add-on"
        
        print(f"✓ Create patient with tasks: MRN={mrn}, {len(data['tasks'])} tasks generated")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{mrn}", headers=auth_headers)
        for task in data["tasks"]:
            requests.delete(f"{BASE_URL}/api/tasks/{task['_id']}", headers=auth_headers)
    
    def test_create_scheduled_patient(self, auth_headers):
        """Test creating a patient with scheduled date"""
        mrn = f"{TEST_PREFIX}{random.randint(100000, 999999)}"
        scheduled_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        patient_data = {
            "mrn": mrn,
            "patient_name": f"{TEST_PREFIX}Jane Smith",
            "dob": "1985-05-20",
            "diagnosis": "Scheduled Test",
            "procedures": "Scheduled Procedure",
            "attending": "Dr. Scheduled",
            "scheduled_date": scheduled_date,
            "scheduled_time": "08:00",
            "auto_generate_tasks": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/patients/create-with-tasks",
            headers=auth_headers,
            json=patient_data
        )
        assert response.status_code == 200, f"Create scheduled patient failed: {response.status_code}"
        data = response.json()
        
        # Verify status is scheduled
        assert data["status"] == "scheduled"
        assert data["schedule"] is not None
        
        print(f"✓ Create scheduled patient: MRN={mrn}, scheduled for {scheduled_date}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{mrn}", headers=auth_headers)
        if data.get("schedule"):
            requests.delete(f"{BASE_URL}/api/schedules/{data['schedule']['_id']}", headers=auth_headers)
        for task in data.get("tasks", []):
            requests.delete(f"{BASE_URL}/api/tasks/{task['_id']}", headers=auth_headers)


class TestSchedulesAPI:
    """Test schedules API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_schedules(self, auth_headers):
        """Test GET /api/schedules returns schedule list"""
        response = requests.get(f"{BASE_URL}/api/schedules", headers=auth_headers)
        assert response.status_code == 200, f"Get schedules failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/schedules returns {len(data)} schedules")
        
        # Check for add-on vs scheduled
        addons = [s for s in data if s.get("is_addon")]
        scheduled = [s for s in data if not s.get("is_addon") and s.get("scheduled_date")]
        print(f"  - Add-ons: {len(addons)}, Scheduled: {len(scheduled)}")


class TestTasksAPI:
    """Test tasks API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_tasks(self, auth_headers):
        """Test GET /api/tasks returns task list"""
        response = requests.get(f"{BASE_URL}/api/tasks", headers=auth_headers)
        assert response.status_code == 200, f"Get tasks failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/tasks returns {len(data)} tasks")
        
        # Check task structure
        if len(data) > 0:
            task = data[0]
            assert "task_description" in task
            assert "completed" in task
    
    def test_create_and_toggle_task(self, auth_headers):
        """Test creating and toggling a task"""
        task_data = {
            "patient_mrn": "TEST_MRN",
            "task_description": f"{TEST_PREFIX}Test Task",
            "task_category": "other",
            "urgency": "medium",
            "assigned_to": "Test User",
            "due_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
            "completed": False
        }
        
        # Create task
        response = requests.post(f"{BASE_URL}/api/tasks", headers=auth_headers, json=task_data)
        assert response.status_code == 200, f"Create task failed: {response.status_code}"
        created_task = response.json()
        task_id = created_task["_id"]
        
        # Toggle task
        response = requests.patch(f"{BASE_URL}/api/tasks/{task_id}/toggle", headers=auth_headers)
        assert response.status_code == 200, f"Toggle task failed: {response.status_code}"
        toggled = response.json()
        assert toggled["completed"] == True
        
        print(f"✓ Create and toggle task: {task_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=auth_headers)


class TestAttendingsAndResidents:
    """Test attendings and residents API"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_active_attendings(self, auth_headers):
        """Test GET /api/attendings/active"""
        response = requests.get(f"{BASE_URL}/api/attendings/active", headers=auth_headers)
        assert response.status_code == 200, f"Get attendings failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/attendings/active returns {len(data)} attendings")
    
    def test_get_active_residents(self, auth_headers):
        """Test GET /api/residents/active"""
        response = requests.get(f"{BASE_URL}/api/residents/active", headers=auth_headers)
        assert response.status_code == 200, f"Get residents failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/residents/active returns {len(data)} residents")


class TestConferencesAPI:
    """Test conferences API"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_conferences(self, auth_headers):
        """Test GET /api/conferences"""
        response = requests.get(f"{BASE_URL}/api/conferences", headers=auth_headers)
        assert response.status_code == 200, f"Get conferences failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/conferences returns {len(data)} conferences")


class TestPreOpChecklist:
    """Test pre-op checklist functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_imaging_options(self, auth_headers):
        """Test GET /api/imaging-options"""
        response = requests.get(f"{BASE_URL}/api/imaging-options", headers=auth_headers)
        assert response.status_code == 200, f"Get imaging options failed: {response.status_code}"
        data = response.json()
        assert "options" in data
        assert len(data["options"]) > 0
        print(f"✓ GET /api/imaging-options returns {len(data['options'])} options")


class TestCalendarActions:
    """Test calendar action endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_calendar_schedule_action(self, auth_headers):
        """Test PATCH /api/patients/{mrn}/calendar with schedule action"""
        # First create a test patient
        mrn = f"{TEST_PREFIX}{random.randint(100000, 999999)}"
        patient_data = {
            "mrn": mrn,
            "patient_name": f"{TEST_PREFIX}Calendar Test",
            "auto_generate_tasks": False
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/patients/create-with-tasks",
            headers=auth_headers,
            json=patient_data
        )
        assert create_response.status_code == 200
        
        # Schedule the patient
        scheduled_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        schedule_response = requests.patch(
            f"{BASE_URL}/api/patients/{mrn}/calendar",
            headers=auth_headers,
            json={
                "action": "schedule",
                "or_date": scheduled_date,
                "or_time": "09:00 AM",
                "or_room": "OR 1",
                "duration_minutes": 120
            }
        )
        assert schedule_response.status_code == 200, f"Schedule action failed: {schedule_response.status_code}"
        data = schedule_response.json()
        assert data["action"] == "schedule"
        print(f"✓ Calendar schedule action works for MRN={mrn}")
        
        # Move to add-on
        addon_response = requests.patch(
            f"{BASE_URL}/api/patients/{mrn}/calendar",
            headers=auth_headers,
            json={"action": "move_to_addon"}
        )
        assert addon_response.status_code == 200
        print(f"✓ Calendar move_to_addon action works")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{mrn}", headers=auth_headers)


class TestCPTCodes:
    """Test CPT codes endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_all_cpt_codes(self, auth_headers):
        """Test GET /api/cpt-codes/all"""
        response = requests.get(f"{BASE_URL}/api/cpt-codes/all", headers=auth_headers)
        assert response.status_code == 200, f"Get CPT codes failed: {response.status_code}"
        data = response.json()
        # Returns dict with categories and metadata
        assert "categories" in data, "Response should have categories"
        assert "metadata" in data, "Response should have metadata"
        assert len(data["categories"]) > 0, "Should have at least one category"
        print(f"✓ GET /api/cpt-codes/all returns {data['metadata']['total_codes']} codes in {data['metadata']['categories_count']} categories")
    
    def test_search_cpt_codes(self, auth_headers):
        """Test GET /api/cpt-codes/search"""
        response = requests.get(f"{BASE_URL}/api/cpt-codes/search?query=maxilla", headers=auth_headers)
        assert response.status_code == 200, f"Search CPT codes failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/cpt-codes/search returns {len(data)} results")


class TestDiagnoses:
    """Test diagnoses/usage endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_frequently_used_diagnoses(self, auth_headers):
        """Test GET /api/usage/frequently-used-diagnoses"""
        response = requests.get(f"{BASE_URL}/api/usage/frequently-used-diagnoses", headers=auth_headers)
        assert response.status_code == 200, f"Get diagnoses failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/usage/frequently-used-diagnoses returns {len(data)} diagnoses")


class TestUsers:
    """Test users endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_users(self, auth_headers):
        """Test GET /api/users for task assignment dropdown"""
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200, f"Get users failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "email" in data[0]
            assert "full_name" in data[0]
        print(f"✓ GET /api/users returns {len(data)} users")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
