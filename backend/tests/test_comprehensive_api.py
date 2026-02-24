"""
Comprehensive Backend API Tests for OR Scheduling Platform
Tests: Login (bcrypt fix), Patients CRUD, Schedules, Tasks, Residents, Attendings, Bulk Import
"""
import pytest
import requests
import os
import time
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from requirements
TEST_USER_EMAIL = "testuser@example.com"
TEST_USER_PASSWORD = "Test123!"

# Unique identifiers for test data
TEST_TIMESTAMP = int(time.time())


class TestHealthAndBcryptFix:
    """Health check and bcrypt fix verification"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


class TestLoginBcryptFix:
    """Test login API works correctly (bcrypt fix verification)"""
    
    def test_login_with_test_credentials(self):
        """Test login with provided test credentials - verifies bcrypt fix"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data, "Missing access_token in response"
        assert "token_type" in data, "Missing token_type in response"
        assert "user" in data, "Missing user in response"
        
        # Verify user data
        assert data["user"]["email"] == TEST_USER_EMAIL
        assert "full_name" in data["user"]
        assert "role" in data["user"]
        
        print(f"✓ Login with bcrypt fix passed - user: {data['user']['email']}")
        return data
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        print("✓ Login with invalid credentials correctly returns 401")
    
    def test_get_current_user(self):
        """Test /api/auth/me endpoint with valid token"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        # Get current user
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == TEST_USER_EMAIL
        print("✓ Get current user passed")


@pytest.fixture(scope="module")
def auth_headers():
    """Get authentication headers for all tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip("Could not authenticate - login failed")
    
    token = response.json()["access_token"]
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


class TestPatientsCRUD:
    """Patients CRUD operations tests"""
    
    def test_create_patient(self, auth_headers):
        """Test creating a new patient"""
        patient_mrn = f"TEST_MRN_{TEST_TIMESTAMP}"
        
        response = requests.post(f"{BASE_URL}/api/patients", 
            headers=auth_headers,
            json={
                "mrn": patient_mrn,
                "patient_name": "Test Patient API",
                "dob": "1990-01-15",
                "diagnosis": "K80.20 - Calculus of gallbladder without cholecystitis",
                "procedures": "Laparoscopic Cholecystectomy",
                "procedure_code": "47562",
                "attending": "Dr. Test Attending",
                "status": "pending"
            }
        )
        
        assert response.status_code == 200, f"Create patient failed: {response.text}"
        data = response.json()
        
        # Verify response data
        assert data["mrn"] == patient_mrn
        assert data["patient_name"] == "Test Patient API"
        assert data["diagnosis"] == "K80.20 - Calculus of gallbladder without cholecystitis"
        assert "prep_checklist" in data
        assert "_id" in data
        
        print(f"✓ Create patient passed - MRN: {patient_mrn}")
        return patient_mrn
    
    def test_get_patients(self, auth_headers):
        """Test getting all patients"""
        response = requests.get(f"{BASE_URL}/api/patients", headers=auth_headers)
        
        assert response.status_code == 200, f"Get patients failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get patients passed - count: {len(data)}")
    
    def test_get_patient_by_mrn(self, auth_headers):
        """Test getting a specific patient by MRN"""
        # First create a patient
        patient_mrn = f"TEST_GET_{TEST_TIMESTAMP}"
        requests.post(f"{BASE_URL}/api/patients", 
            headers=auth_headers,
            json={
                "mrn": patient_mrn,
                "patient_name": "Test Get Patient",
                "dob": "1985-05-20",
                "status": "pending"
            }
        )
        
        # Get the patient
        response = requests.get(f"{BASE_URL}/api/patients/{patient_mrn}", headers=auth_headers)
        
        assert response.status_code == 200, f"Get patient by MRN failed: {response.text}"
        data = response.json()
        assert data["mrn"] == patient_mrn
        assert data["patient_name"] == "Test Get Patient"
        print(f"✓ Get patient by MRN passed - MRN: {patient_mrn}")
    
    def test_update_patient(self, auth_headers):
        """Test updating a patient"""
        # First create a patient
        patient_mrn = f"TEST_UPDATE_{TEST_TIMESTAMP}"
        requests.post(f"{BASE_URL}/api/patients", 
            headers=auth_headers,
            json={
                "mrn": patient_mrn,
                "patient_name": "Test Update Patient",
                "dob": "1980-03-10",
                "status": "pending"
            }
        )
        
        # Update the patient
        response = requests.put(f"{BASE_URL}/api/patients/{patient_mrn}", 
            headers=auth_headers,
            json={
                "mrn": patient_mrn,
                "patient_name": "Test Update Patient - Updated",
                "dob": "1980-03-10",
                "diagnosis": "Updated Diagnosis",
                "status": "confirmed"
            }
        )
        
        assert response.status_code == 200, f"Update patient failed: {response.text}"
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/patients/{patient_mrn}", headers=auth_headers)
        updated_data = get_response.json()
        assert updated_data["patient_name"] == "Test Update Patient - Updated"
        assert updated_data["status"] == "confirmed"
        
        print(f"✓ Update patient passed - MRN: {patient_mrn}")
    
    def test_update_patient_checklist(self, auth_headers):
        """Test updating patient prep checklist"""
        # First create a patient
        patient_mrn = f"TEST_CHECKLIST_{TEST_TIMESTAMP}"
        requests.post(f"{BASE_URL}/api/patients", 
            headers=auth_headers,
            json={
                "mrn": patient_mrn,
                "patient_name": "Test Checklist Patient",
                "dob": "1975-07-25",
                "status": "pending"
            }
        )
        
        # Update checklist item
        response = requests.patch(
            f"{BASE_URL}/api/patients/{patient_mrn}/checklist?checklist_item=xrays&checked=true",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Update checklist failed: {response.text}"
        data = response.json()
        assert data["checklist_item"] == "xrays"
        assert data["checked"] == True
        
        print(f"✓ Update patient checklist passed - MRN: {patient_mrn}")
    
    def test_delete_patient(self, auth_headers):
        """Test deleting a patient"""
        # First create a patient
        patient_mrn = f"TEST_DELETE_{TEST_TIMESTAMP}"
        requests.post(f"{BASE_URL}/api/patients", 
            headers=auth_headers,
            json={
                "mrn": patient_mrn,
                "patient_name": "Test Delete Patient",
                "dob": "1970-12-01",
                "status": "pending"
            }
        )
        
        # Delete the patient
        response = requests.delete(f"{BASE_URL}/api/patients/{patient_mrn}", headers=auth_headers)
        
        assert response.status_code == 200, f"Delete patient failed: {response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/patients/{patient_mrn}", headers=auth_headers)
        assert get_response.status_code == 404
        
        print(f"✓ Delete patient passed - MRN: {patient_mrn}")


class TestSchedulesAPI:
    """Schedules API tests"""
    
    def test_create_schedule(self, auth_headers):
        """Test creating a new schedule"""
        response = requests.post(f"{BASE_URL}/api/schedules", 
            headers=auth_headers,
            json={
                "patient_mrn": f"SCHED_MRN_{TEST_TIMESTAMP}",
                "patient_name": "Test Schedule Patient",
                "procedure": "Laparoscopic Cholecystectomy",
                "staff": "Dr. Test Surgeon",
                "scheduled_date": "2026-02-15",
                "scheduled_time": "08:00",
                "status": "scheduled",
                "is_addon": False,
                "priority": "medium"
            }
        )
        
        assert response.status_code == 200, f"Create schedule failed: {response.text}"
        data = response.json()
        
        assert data["patient_name"] == "Test Schedule Patient"
        assert data["procedure"] == "Laparoscopic Cholecystectomy"
        assert "_id" in data
        
        print(f"✓ Create schedule passed - ID: {data['_id']}")
        return data["_id"]
    
    def test_create_addon_schedule(self, auth_headers):
        """Test creating an add-on schedule"""
        response = requests.post(f"{BASE_URL}/api/schedules", 
            headers=auth_headers,
            json={
                "patient_mrn": f"ADDON_MRN_{TEST_TIMESTAMP}",
                "patient_name": "Test Add-On Patient",
                "procedure": "Emergency Appendectomy",
                "staff": "Dr. Emergency",
                "scheduled_date": "",
                "status": "pending",
                "is_addon": True,
                "priority": "high"
            }
        )
        
        assert response.status_code == 200, f"Create add-on schedule failed: {response.text}"
        data = response.json()
        
        assert data["is_addon"] == True
        assert data["priority"] == "high"
        
        print(f"✓ Create add-on schedule passed - ID: {data['_id']}")
    
    def test_get_schedules(self, auth_headers):
        """Test getting all schedules"""
        response = requests.get(f"{BASE_URL}/api/schedules", headers=auth_headers)
        
        assert response.status_code == 200, f"Get schedules failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get schedules passed - count: {len(data)}")
    
    def test_update_schedule(self, auth_headers):
        """Test updating a schedule"""
        # First create a schedule
        create_response = requests.post(f"{BASE_URL}/api/schedules", 
            headers=auth_headers,
            json={
                "patient_mrn": f"UPDATE_SCHED_{TEST_TIMESTAMP}",
                "patient_name": "Test Update Schedule",
                "procedure": "Original Procedure",
                "staff": "Dr. Original",
                "scheduled_date": "2026-02-20",
                "status": "scheduled",
                "is_addon": False,
                "priority": "low"
            }
        )
        schedule_id = create_response.json()["_id"]
        
        # Update the schedule
        response = requests.put(f"{BASE_URL}/api/schedules/{schedule_id}", 
            headers=auth_headers,
            json={
                "patient_mrn": f"UPDATE_SCHED_{TEST_TIMESTAMP}",
                "patient_name": "Test Update Schedule",
                "procedure": "Updated Procedure",
                "staff": "Dr. Updated",
                "scheduled_date": "2026-02-21",
                "status": "confirmed",
                "is_addon": False,
                "priority": "high"
            }
        )
        
        assert response.status_code == 200, f"Update schedule failed: {response.text}"
        print(f"✓ Update schedule passed - ID: {schedule_id}")
    
    def test_delete_schedule(self, auth_headers):
        """Test deleting a schedule"""
        # First create a schedule
        create_response = requests.post(f"{BASE_URL}/api/schedules", 
            headers=auth_headers,
            json={
                "patient_mrn": f"DELETE_SCHED_{TEST_TIMESTAMP}",
                "patient_name": "Test Delete Schedule",
                "procedure": "To Be Deleted",
                "staff": "Dr. Delete",
                "scheduled_date": "2026-02-25",
                "status": "scheduled",
                "is_addon": False,
                "priority": "medium"
            }
        )
        schedule_id = create_response.json()["_id"]
        
        # Delete the schedule
        response = requests.delete(f"{BASE_URL}/api/schedules/{schedule_id}", headers=auth_headers)
        
        assert response.status_code == 200, f"Delete schedule failed: {response.text}"
        print(f"✓ Delete schedule passed - ID: {schedule_id}")


class TestTasksAPI:
    """Tasks API tests"""
    
    def test_create_task(self, auth_headers):
        """Test creating a new task"""
        response = requests.post(f"{BASE_URL}/api/tasks", 
            headers=auth_headers,
            json={
                "patient_mrn": f"TASK_MRN_{TEST_TIMESTAMP}",
                "task_description": "Order pre-op labs for patient",
                "urgency": "high",
                "assigned_to": "Dr. Resident",
                "assigned_to_email": "resident@hospital.com",
                "due_date": "2026-01-30",
                "status": "pending",
                "completed": False
            }
        )
        
        assert response.status_code == 200, f"Create task failed: {response.text}"
        data = response.json()
        
        assert data["task_description"] == "Order pre-op labs for patient"
        assert data["urgency"] == "high"
        assert "_id" in data
        
        print(f"✓ Create task passed - ID: {data['_id']}")
        return data["_id"]
    
    def test_get_tasks(self, auth_headers):
        """Test getting all tasks"""
        response = requests.get(f"{BASE_URL}/api/tasks", headers=auth_headers)
        
        assert response.status_code == 200, f"Get tasks failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get tasks passed - count: {len(data)}")
    
    def test_toggle_task(self, auth_headers):
        """Test toggling task completion status"""
        # First create a task
        create_response = requests.post(f"{BASE_URL}/api/tasks", 
            headers=auth_headers,
            json={
                "patient_mrn": f"TOGGLE_TASK_{TEST_TIMESTAMP}",
                "task_description": "Task to toggle",
                "urgency": "medium",
                "assigned_to": "Dr. Toggle",
                "due_date": "2026-02-01",
                "status": "pending",
                "completed": False
            }
        )
        task_id = create_response.json()["_id"]
        
        # Toggle the task
        response = requests.patch(f"{BASE_URL}/api/tasks/{task_id}/toggle", headers=auth_headers)
        
        assert response.status_code == 200, f"Toggle task failed: {response.text}"
        data = response.json()
        assert data["completed"] == True
        
        print(f"✓ Toggle task passed - ID: {task_id}")
    
    def test_update_task(self, auth_headers):
        """Test updating a task"""
        # First create a task
        create_response = requests.post(f"{BASE_URL}/api/tasks", 
            headers=auth_headers,
            json={
                "patient_mrn": f"UPDATE_TASK_{TEST_TIMESTAMP}",
                "task_description": "Original task description",
                "urgency": "low",
                "assigned_to": "Dr. Original",
                "due_date": "2026-02-05",
                "status": "pending",
                "completed": False
            }
        )
        task_id = create_response.json()["_id"]
        
        # Update the task
        response = requests.put(f"{BASE_URL}/api/tasks/{task_id}", 
            headers=auth_headers,
            json={
                "patient_mrn": f"UPDATE_TASK_{TEST_TIMESTAMP}",
                "task_description": "Updated task description",
                "urgency": "urgent",
                "assigned_to": "Dr. Updated",
                "due_date": "2026-02-06",
                "status": "in_progress",
                "completed": False
            }
        )
        
        assert response.status_code == 200, f"Update task failed: {response.text}"
        print(f"✓ Update task passed - ID: {task_id}")
    
    def test_delete_task(self, auth_headers):
        """Test deleting a task"""
        # First create a task
        create_response = requests.post(f"{BASE_URL}/api/tasks", 
            headers=auth_headers,
            json={
                "patient_mrn": f"DELETE_TASK_{TEST_TIMESTAMP}",
                "task_description": "Task to delete",
                "urgency": "low",
                "assigned_to": "Dr. Delete",
                "due_date": "2026-02-10",
                "status": "pending",
                "completed": False
            }
        )
        task_id = create_response.json()["_id"]
        
        # Delete the task
        response = requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=auth_headers)
        
        assert response.status_code == 200, f"Delete task failed: {response.text}"
        print(f"✓ Delete task passed - ID: {task_id}")


class TestResidentsAPI:
    """Residents API tests"""
    
    def test_create_resident(self, auth_headers):
        """Test creating a new resident"""
        resident_email = f"test_resident_{TEST_TIMESTAMP}@hospital.com"
        
        response = requests.post(f"{BASE_URL}/api/residents", 
            headers=auth_headers,
            json={
                "name": "Dr. Test Resident API",
                "email": resident_email,
                "hospital": "Test Hospital",
                "specialty": "Orthopedics",
                "year": "PGY-3",
                "is_active": True
            }
        )
        
        assert response.status_code == 200, f"Create resident failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "Dr. Test Resident API"
        assert data["email"] == resident_email
        assert "_id" in data
        
        print(f"✓ Create resident passed - ID: {data['_id']}")
        return data["_id"]
    
    def test_get_residents(self, auth_headers):
        """Test getting all residents"""
        response = requests.get(f"{BASE_URL}/api/residents", headers=auth_headers)
        
        assert response.status_code == 200, f"Get residents failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get residents passed - count: {len(data)}")
    
    def test_get_active_residents(self, auth_headers):
        """Test getting active residents"""
        response = requests.get(f"{BASE_URL}/api/residents/active", headers=auth_headers)
        
        assert response.status_code == 200, f"Get active residents failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # All returned residents should be active
        for resident in data:
            assert resident.get("is_active", True) == True
        
        print(f"✓ Get active residents passed - count: {len(data)}")


class TestAttendingsAPI:
    """Attendings API tests"""
    
    def test_create_attending(self, auth_headers):
        """Test creating a new attending"""
        attending_email = f"test_attending_{TEST_TIMESTAMP}@hospital.com"
        
        response = requests.post(f"{BASE_URL}/api/attendings", 
            headers=auth_headers,
            json={
                "name": "Dr. Test Attending API",
                "email": attending_email,
                "hospital": "Test Hospital",
                "specialty": "General Surgery",
                "is_active": True
            }
        )
        
        assert response.status_code == 200, f"Create attending failed: {response.text}"
        data = response.json()
        
        assert data["name"] == "Dr. Test Attending API"
        assert "_id" in data
        
        print(f"✓ Create attending passed - ID: {data['_id']}")
        return data["_id"]
    
    def test_get_attendings(self, auth_headers):
        """Test getting all attendings"""
        response = requests.get(f"{BASE_URL}/api/attendings", headers=auth_headers)
        
        assert response.status_code == 200, f"Get attendings failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get attendings passed - count: {len(data)}")
    
    def test_get_active_attendings(self, auth_headers):
        """Test getting active attendings"""
        response = requests.get(f"{BASE_URL}/api/attendings/active", headers=auth_headers)
        
        assert response.status_code == 200, f"Get active attendings failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get active attendings passed - count: {len(data)}")


class TestBulkImportAPI:
    """Bulk Import API tests - for residents/attendings import"""
    
    def test_get_residents_import_template(self, auth_headers):
        """Test downloading residents import template"""
        response = requests.get(f"{BASE_URL}/api/import/template/residents", headers=auth_headers)
        
        assert response.status_code == 200, f"Get residents template failed: {response.text}"
        # Check content type is CSV
        assert "text/csv" in response.headers.get("content-type", "")
        
        # Verify CSV has expected headers
        csv_content = response.text
        assert "name" in csv_content.lower() or "email" in csv_content.lower()
        
        print("✓ Get residents import template passed")
    
    def test_get_attendings_import_template(self, auth_headers):
        """Test downloading attendings import template"""
        response = requests.get(f"{BASE_URL}/api/import/template/attendings", headers=auth_headers)
        
        assert response.status_code == 200, f"Get attendings template failed: {response.text}"
        # Check content type is CSV
        assert "text/csv" in response.headers.get("content-type", "")
        
        print("✓ Get attendings import template passed")
    
    def test_preview_residents_import(self, auth_headers):
        """Test previewing residents import data"""
        # Create a simple CSV content for residents
        csv_content = f"""name,email,year,phone,specialty
Test Resident Import 1,test_import_{TEST_TIMESTAMP}_1@hospital.com,PGY-2,555-111-1111,General Surgery
Test Resident Import 2,test_import_{TEST_TIMESTAMP}_2@hospital.com,PGY-3,555-222-2222,Orthopedics"""
        
        files = {
            'file': ('test_residents.csv', csv_content, 'text/csv')
        }
        
        # Remove Content-Type from headers for multipart
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/import/preview/residents", 
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Preview residents import failed: {response.text}"
        data = response.json()
        
        assert "valid_count" in data or "valid_rows" in data
        print(f"✓ Preview residents import passed - valid: {data.get('valid_count', 'N/A')}")
    
    def test_execute_residents_import(self, auth_headers):
        """Test executing residents bulk import"""
        # Create a simple CSV content with unique emails
        csv_content = f"""name,email,year,phone,specialty
Test Import Resident {TEST_TIMESTAMP},import_resident_{TEST_TIMESTAMP}@hospital.com,PGY-4,555-333-3333,Cardiology"""
        
        files = {
            'file': ('test_residents.csv', csv_content, 'text/csv')
        }
        
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = requests.post(f"{BASE_URL}/api/import/residents", 
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Execute residents import failed: {response.text}"
        data = response.json()
        
        # Verify import results
        assert "imported_count" in data or "success" in data or "imported" in data
        print(f"✓ Execute residents import passed - response: {data}")


class TestUsageTracking:
    """Usage tracking API tests (for smart sorting)"""
    
    def test_get_frequently_used_diagnoses(self, auth_headers):
        """Test getting frequently used diagnoses"""
        response = requests.get(f"{BASE_URL}/api/usage/frequently-used-diagnoses?limit=10", 
            headers=auth_headers)
        
        assert response.status_code == 200, f"Get frequently used diagnoses failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get frequently used diagnoses passed - count: {len(data)}")
    
    def test_get_frequently_used_cpt(self, auth_headers):
        """Test getting frequently used CPT codes"""
        response = requests.get(f"{BASE_URL}/api/usage/frequently-used-cpt?limit=10", 
            headers=auth_headers)
        
        assert response.status_code == 200, f"Get frequently used CPT codes failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get frequently used CPT codes passed - count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
