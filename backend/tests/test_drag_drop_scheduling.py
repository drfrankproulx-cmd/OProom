"""
Test suite for drag-and-drop scheduling, PatientDetailPanel, and TaskCategorySelect features.
Tests the new features:
1. Schedule partial update (for drag-and-drop from add-on to calendar)
2. Task creation with category and task_type fields
3. Schedule CRUD operations
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "proul076@umn.edu"
TEST_PASSWORD = "59K63i75%("

class TestAuthentication:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Test login returns valid token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"Login successful, token length: {len(auth_token)}")


class TestScheduleOperations:
    """Test schedule CRUD and partial update for drag-and-drop"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_schedules(self, auth_headers):
        """Test getting all schedules"""
        response = requests.get(f"{BASE_URL}/api/schedules", headers=auth_headers)
        assert response.status_code == 200
        schedules = response.json()
        assert isinstance(schedules, list)
        print(f"Found {len(schedules)} schedules")
    
    def test_create_addon_schedule(self, auth_headers):
        """Test creating an add-on schedule (for drag-and-drop source)"""
        schedule_data = {
            "patient_mrn": "TEST_DND_001",
            "patient_name": "Test DnD Patient",
            "procedure": "Test Procedure",
            "staff": "Dr. Test",
            "scheduled_date": "",
            "scheduled_time": "",
            "status": "pending",
            "is_addon": True,
            "priority": "medium"
        }
        response = requests.post(f"{BASE_URL}/api/schedules", headers=auth_headers, json=schedule_data)
        assert response.status_code == 200
        data = response.json()
        assert data["is_addon"] == True
        assert data["patient_name"] == "Test DnD Patient"
        print(f"Created add-on schedule with ID: {data['_id']}")
        return data["_id"]
    
    def test_partial_update_schedule_for_drag_drop(self, auth_headers):
        """Test partial update - simulates drag-and-drop from add-on to calendar"""
        # First create an add-on
        schedule_data = {
            "patient_mrn": "TEST_DND_002",
            "patient_name": "Test DnD Patient 2",
            "procedure": "Test Procedure 2",
            "staff": "Dr. Test",
            "scheduled_date": "",
            "scheduled_time": "",
            "status": "pending",
            "is_addon": True,
            "priority": "high"
        }
        create_response = requests.post(f"{BASE_URL}/api/schedules", headers=auth_headers, json=schedule_data)
        assert create_response.status_code == 200
        schedule_id = create_response.json()["_id"]
        
        # Now do partial update (drag-and-drop to calendar)
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        partial_update = {
            "is_addon": False,
            "scheduled_date": tomorrow,
            "scheduled_time": "09:00",
            "staff": "Dr. Updated"
        }
        update_response = requests.put(f"{BASE_URL}/api/schedules/{schedule_id}", headers=auth_headers, json=partial_update)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["is_addon"] == False
        assert updated["scheduled_date"] == tomorrow
        assert updated["scheduled_time"] == "09:00"
        assert updated["staff"] == "Dr. Updated"
        # Original fields should be preserved
        assert updated["patient_name"] == "Test DnD Patient 2"
        assert updated["priority"] == "high"
        print(f"Partial update successful - schedule moved from add-on to calendar")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/schedules/{schedule_id}", headers=auth_headers)
    
    def test_cancel_case_return_to_addon(self, auth_headers):
        """Test canceling a scheduled case (return to add-on list)"""
        # Create a scheduled case
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        schedule_data = {
            "patient_mrn": "TEST_CANCEL_001",
            "patient_name": "Test Cancel Patient",
            "procedure": "Test Procedure",
            "staff": "Dr. Test",
            "scheduled_date": tomorrow,
            "scheduled_time": "10:00",
            "status": "scheduled",
            "is_addon": False,
            "priority": "medium"
        }
        create_response = requests.post(f"{BASE_URL}/api/schedules", headers=auth_headers, json=schedule_data)
        assert create_response.status_code == 200
        schedule_id = create_response.json()["_id"]
        
        # Cancel the case (return to add-on)
        cancel_update = {
            "is_addon": True,
            "scheduled_date": "",
            "scheduled_time": ""
        }
        update_response = requests.put(f"{BASE_URL}/api/schedules/{schedule_id}", headers=auth_headers, json=cancel_update)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["is_addon"] == True
        assert updated["scheduled_date"] == ""
        print(f"Case cancelled and returned to add-on list")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/schedules/{schedule_id}", headers=auth_headers)


class TestTaskCategoryFeatures:
    """Test task creation with category and task_type fields"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_create_task_with_category(self, auth_headers):
        """Test creating a task with task_category and task_type"""
        task_data = {
            "patient_mrn": "TEST_TASK_001",
            "task_description": "CT Scan (Maxillofacial)",
            "task_category": "imaging",
            "task_type": "CT Scan (Maxillofacial)",
            "urgency": "high",
            "assigned_to": "Test Resident",
            "due_date": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d"),
            "status": "pending",
            "completed": False
        }
        response = requests.post(f"{BASE_URL}/api/tasks", headers=auth_headers, json=task_data)
        assert response.status_code == 200
        data = response.json()
        assert data["task_category"] == "imaging"
        assert data["task_type"] == "CT Scan (Maxillofacial)"
        print(f"Created task with category: {data['task_category']}, type: {data['task_type']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tasks/{data['_id']}", headers=auth_headers)
    
    def test_create_task_insurance_category(self, auth_headers):
        """Test creating a task with insurance category"""
        task_data = {
            "patient_mrn": "TEST_TASK_002",
            "task_description": "Insurance Prior Authorization",
            "task_category": "insurance",
            "task_type": "Insurance Prior Authorization",
            "urgency": "urgent",
            "assigned_to": "Test Resident",
            "due_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "status": "pending",
            "completed": False
        }
        response = requests.post(f"{BASE_URL}/api/tasks", headers=auth_headers, json=task_data)
        assert response.status_code == 200
        data = response.json()
        assert data["task_category"] == "insurance"
        print(f"Created insurance task: {data['task_description']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tasks/{data['_id']}", headers=auth_headers)
    
    def test_create_task_surgical_planning_category(self, auth_headers):
        """Test creating a task with surgical planning category"""
        task_data = {
            "patient_mrn": "TEST_TASK_003",
            "task_description": "VSP (Virtual Surgical Planning) - KLS Martin",
            "task_category": "surgical_planning",
            "task_type": "VSP (Virtual Surgical Planning) - KLS Martin",
            "urgency": "medium",
            "assigned_to": "Test Resident",
            "due_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "status": "pending",
            "completed": False
        }
        response = requests.post(f"{BASE_URL}/api/tasks", headers=auth_headers, json=task_data)
        assert response.status_code == 200
        data = response.json()
        assert data["task_category"] == "surgical_planning"
        print(f"Created surgical planning task: {data['task_description']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tasks/{data['_id']}", headers=auth_headers)
    
    def test_create_task_without_category(self, auth_headers):
        """Test creating a task without category (should default to null/Other)"""
        task_data = {
            "patient_mrn": "TEST_TASK_004",
            "task_description": "Generic task without category",
            "urgency": "low",
            "assigned_to": "Test Resident",
            "due_date": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"),
            "status": "pending",
            "completed": False
        }
        response = requests.post(f"{BASE_URL}/api/tasks", headers=auth_headers, json=task_data)
        assert response.status_code == 200
        data = response.json()
        # task_category should be None or not present
        assert data.get("task_category") is None or data.get("task_category") == ""
        print(f"Created task without category - will display as 'Other'")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tasks/{data['_id']}", headers=auth_headers)
    
    def test_get_tasks_with_categories(self, auth_headers):
        """Test getting tasks and verify category fields are returned"""
        response = requests.get(f"{BASE_URL}/api/tasks", headers=auth_headers)
        assert response.status_code == 200
        tasks = response.json()
        assert isinstance(tasks, list)
        print(f"Found {len(tasks)} tasks")
        
        # Check if any tasks have categories
        tasks_with_category = [t for t in tasks if t.get("task_category")]
        print(f"Tasks with categories: {len(tasks_with_category)}")


class TestPatientOperations:
    """Test patient operations for PatientDetailPanel"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_patients(self, auth_headers):
        """Test getting all patients"""
        response = requests.get(f"{BASE_URL}/api/patients", headers=auth_headers)
        assert response.status_code == 200
        patients = response.json()
        assert isinstance(patients, list)
        print(f"Found {len(patients)} patients")
    
    def test_get_patient_by_mrn(self, auth_headers):
        """Test getting a specific patient by MRN"""
        # First get all patients
        response = requests.get(f"{BASE_URL}/api/patients", headers=auth_headers)
        patients = response.json()
        
        if len(patients) > 0:
            mrn = patients[0]["mrn"]
            patient_response = requests.get(f"{BASE_URL}/api/patients/{mrn}", headers=auth_headers)
            assert patient_response.status_code == 200
            patient = patient_response.json()
            assert patient["mrn"] == mrn
            print(f"Retrieved patient: {patient['patient_name']}")
        else:
            print("No patients found to test")
    
    def test_update_patient_checklist(self, auth_headers):
        """Test updating patient prep checklist"""
        # First get all patients
        response = requests.get(f"{BASE_URL}/api/patients", headers=auth_headers)
        patients = response.json()
        
        if len(patients) > 0:
            mrn = patients[0]["mrn"]
            # Update checklist item
            checklist_response = requests.patch(
                f"{BASE_URL}/api/patients/{mrn}/checklist?checklist_item=xrays&checked=true",
                headers=auth_headers
            )
            assert checklist_response.status_code == 200
            print(f"Updated checklist for patient {mrn}")
        else:
            print("No patients found to test checklist update")


class TestAttendingsAndResidents:
    """Test attendings and residents for schedule modal"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_active_attendings(self, auth_headers):
        """Test getting active attendings for schedule modal dropdown"""
        response = requests.get(f"{BASE_URL}/api/attendings/active", headers=auth_headers)
        assert response.status_code == 200
        attendings = response.json()
        assert isinstance(attendings, list)
        print(f"Found {len(attendings)} active attendings")
    
    def test_get_active_residents(self, auth_headers):
        """Test getting active residents for task assignment"""
        response = requests.get(f"{BASE_URL}/api/residents/active", headers=auth_headers)
        assert response.status_code == 200
        residents = response.json()
        assert isinstance(residents, list)
        print(f"Found {len(residents)} active residents")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_cleanup_test_schedules(self, auth_headers):
        """Clean up any remaining test schedules"""
        response = requests.get(f"{BASE_URL}/api/schedules", headers=auth_headers)
        schedules = response.json()
        
        deleted = 0
        for schedule in schedules:
            if schedule.get("patient_mrn", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/schedules/{schedule['_id']}", headers=auth_headers)
                deleted += 1
        
        print(f"Cleaned up {deleted} test schedules")
    
    def test_cleanup_test_tasks(self, auth_headers):
        """Clean up any remaining test tasks"""
        response = requests.get(f"{BASE_URL}/api/tasks", headers=auth_headers)
        tasks = response.json()
        
        deleted = 0
        for task in tasks:
            if task.get("patient_mrn", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/tasks/{task['_id']}", headers=auth_headers)
                deleted += 1
        
        print(f"Cleaned up {deleted} test tasks")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
