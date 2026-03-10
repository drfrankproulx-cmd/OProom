"""
Test suite for Unified Patients feature - Major refactoring tests
Tests:
1. Navigation has only 4 tabs (Tasks tab removed)
2. POST /api/patients/create-with-tasks - creates patient with 13-item checklist and auto-generated tasks
3. GET /api/patients/with-tasks - returns patients with tasks and progress
4. PATCH /api/patients/{mrn}/preop-checklist/{item_id} - toggle checklist items
5. Patient status workflow (add-on vs scheduled)
"""

import pytest
import requests
import os
import json
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://surgical-planner-1.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "proul076@umn.edu"
TEST_PASSWORD = "59K63i75%("

# Test patient data
TEST_MRN = f"TEST_UNIFIED_{datetime.now().strftime('%Y%m%d%H%M%S')}"
TEST_PATIENT_NAME = "Test Unified Patient"


class TestUnifiedPatientsBackend:
    """Backend API tests for unified patients feature"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json().get("status") == "healthy"
        print("✓ Health check passed")
    
    def test_02_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✓ Login successful for {TEST_EMAIL}")
    
    def test_03_create_patient_with_tasks_addon(self, auth_headers):
        """Test POST /api/patients/create-with-tasks - Add-on patient (no date)"""
        mrn = f"TEST_ADDON_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        payload = {
            "mrn": mrn,
            "patient_name": "Test Add-On Patient",
            "dob": "1990-01-15",
            "diagnosis": "Test Diagnosis",
            "procedures": "Test Procedure",
            "procedure_code": "21194",
            "attending": "Dr. Test",
            "scheduled_date": None,  # No date = add-on
            "scheduled_time": None,
            "auto_generate_tasks": True
        }
        
        response = requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
                                 headers=auth_headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Verify patient created
        assert "patient" in data
        assert data["patient"]["mrn"] == mrn
        assert data["patient"]["status"] == "add-on", "Patient without date should be add-on"
        
        # Verify 13-item preop_checklist
        preop_checklist = data["patient"].get("preop_checklist", [])
        assert isinstance(preop_checklist, list), "preop_checklist should be a list"
        assert len(preop_checklist) == 13, f"Expected 13 checklist items, got {len(preop_checklist)}"
        
        # Verify checklist items structure
        expected_items = ["hp_complete", "labs_ordered", "labs_reviewed", "imaging_ordered", 
                         "imaging_reviewed", "consent_signed", "prior_auth", "vsp_complete",
                         "anesthesia_clearance", "medical_optimization", "blood_bank", 
                         "patient_instructions", "or_scheduled"]
        actual_ids = [item["id"] for item in preop_checklist]
        for expected_id in expected_items:
            assert expected_id in actual_ids, f"Missing checklist item: {expected_id}"
        
        # Verify auto-generated tasks
        assert "tasks" in data
        tasks = data["tasks"]
        assert len(tasks) == 6, f"Expected 6 auto-generated tasks, got {len(tasks)}"
        
        # Verify task categories
        task_categories = [t.get("task_category") for t in tasks]
        assert "consents_documentation" in task_categories
        assert "insurance" in task_categories
        assert "labs" in task_categories
        assert "surgical_planning" in task_categories
        
        print(f"✓ Add-on patient created with 13-item checklist and 6 tasks: {mrn}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{mrn}", headers=auth_headers)
        for task in tasks:
            requests.delete(f"{BASE_URL}/api/tasks/{task['_id']}", headers=auth_headers)
    
    def test_04_create_patient_with_tasks_scheduled(self, auth_headers):
        """Test POST /api/patients/create-with-tasks - Scheduled patient (with date)"""
        mrn = f"TEST_SCHED_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        scheduled_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        payload = {
            "mrn": mrn,
            "patient_name": "Test Scheduled Patient",
            "dob": "1985-05-20",
            "diagnosis": "Mandibular Fracture",
            "procedures": "ORIF Mandible",
            "procedure_code": "21462",
            "attending": "Dr. Proulx",
            "scheduled_date": scheduled_date,
            "scheduled_time": "08:00",
            "auto_generate_tasks": True
        }
        
        response = requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
                                 headers=auth_headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Verify patient status is scheduled
        assert data["patient"]["status"] == "scheduled", "Patient with date should be scheduled"
        assert data["patient"]["scheduled_date"] == scheduled_date
        
        # Verify schedule entry created
        assert "schedule" in data
        assert data["schedule"] is not None
        assert data["schedule"]["scheduled_date"] == scheduled_date
        assert data["schedule"]["is_addon"] == False
        
        print(f"✓ Scheduled patient created: {mrn} for {scheduled_date}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{mrn}", headers=auth_headers)
        if data.get("schedule"):
            requests.delete(f"{BASE_URL}/api/schedules/{data['schedule']['_id']}", headers=auth_headers)
        for task in data.get("tasks", []):
            requests.delete(f"{BASE_URL}/api/tasks/{task['_id']}", headers=auth_headers)
    
    def test_05_create_patient_without_auto_tasks(self, auth_headers):
        """Test POST /api/patients/create-with-tasks with auto_generate_tasks=False"""
        mrn = f"TEST_NOTASK_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        payload = {
            "mrn": mrn,
            "patient_name": "Test No Tasks Patient",
            "auto_generate_tasks": False  # Disable auto-generation
        }
        
        response = requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
                                 headers=auth_headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Verify no tasks created
        assert "tasks" in data
        assert len(data["tasks"]) == 0, "No tasks should be created when auto_generate_tasks=False"
        
        # But checklist should still be created
        assert len(data["patient"]["preop_checklist"]) == 13
        
        print(f"✓ Patient created without auto-generated tasks: {mrn}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{mrn}", headers=auth_headers)
    
    def test_06_get_patients_with_tasks(self, auth_headers):
        """Test GET /api/patients/with-tasks - returns patients with tasks and progress"""
        response = requests.get(f"{BASE_URL}/api/patients/with-tasks", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        patients = response.json()
        assert isinstance(patients, list)
        
        if len(patients) > 0:
            patient = patients[0]
            # Verify enriched fields
            assert "tasks" in patient, "Patient should have tasks array"
            assert "task_count" in patient, "Patient should have task_count"
            assert "pending_task_count" in patient, "Patient should have pending_task_count"
            assert "completed_task_count" in patient, "Patient should have completed_task_count"
            assert "preop_progress" in patient, "Patient should have preop_progress"
            
            # Verify preop_progress structure
            progress = patient["preop_progress"]
            assert "checked" in progress
            assert "total" in progress
            
            print(f"✓ GET /api/patients/with-tasks returned {len(patients)} patients with enriched data")
        else:
            print("✓ GET /api/patients/with-tasks returned empty list (no patients)")
    
    def test_07_toggle_preop_checklist_item(self, auth_headers):
        """Test PATCH /api/patients/{mrn}/preop-checklist/{item_id}"""
        # First create a patient with new checklist format
        mrn = f"TEST_TOGGLE_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        create_response = requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
                                        headers=auth_headers, json={
                                            "mrn": mrn,
                                            "patient_name": "Test Toggle Patient",
                                            "auto_generate_tasks": False
                                        })
        assert create_response.status_code == 200
        
        # Toggle a checklist item
        item_id = "hp_complete"
        toggle_response = requests.patch(
            f"{BASE_URL}/api/patients/{mrn}/preop-checklist/{item_id}",
            headers=auth_headers
        )
        assert toggle_response.status_code == 200, f"Toggle failed: {toggle_response.text}"
        
        data = toggle_response.json()
        assert data["item_id"] == item_id
        assert data["checked"] == True, "First toggle should set to True"
        assert "progress" in data
        assert data["progress"]["checked"] == 1
        assert data["progress"]["total"] == 13
        
        # Toggle again to uncheck
        toggle_response2 = requests.patch(
            f"{BASE_URL}/api/patients/{mrn}/preop-checklist/{item_id}",
            headers=auth_headers
        )
        assert toggle_response2.status_code == 200
        assert toggle_response2.json()["checked"] == False, "Second toggle should set to False"
        
        print(f"✓ Checklist item toggle works correctly for {item_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{mrn}", headers=auth_headers)
    
    def test_08_toggle_invalid_checklist_item(self, auth_headers):
        """Test PATCH /api/patients/{mrn}/preop-checklist/{item_id} with invalid item"""
        # Create patient first
        mrn = f"TEST_INVALID_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
                      headers=auth_headers, json={
                          "mrn": mrn,
                          "patient_name": "Test Invalid Item Patient",
                          "auto_generate_tasks": False
                      })
        
        # Try to toggle invalid item
        response = requests.patch(
            f"{BASE_URL}/api/patients/{mrn}/preop-checklist/invalid_item_id",
            headers=auth_headers
        )
        assert response.status_code == 404, "Should return 404 for invalid checklist item"
        
        print("✓ Invalid checklist item returns 404")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{mrn}", headers=auth_headers)
    
    def test_09_get_single_patient_with_tasks(self, auth_headers):
        """Test GET /api/patients/{mrn}/with-tasks"""
        # Create patient with tasks
        mrn = f"TEST_SINGLE_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        create_response = requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
                                        headers=auth_headers, json={
                                            "mrn": mrn,
                                            "patient_name": "Test Single Patient",
                                            "auto_generate_tasks": True
                                        })
        assert create_response.status_code == 200
        created_data = create_response.json()
        
        # Get single patient with tasks
        response = requests.get(f"{BASE_URL}/api/patients/{mrn}/with-tasks", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        patient = response.json()
        assert patient["mrn"] == mrn
        assert "tasks" in patient
        assert len(patient["tasks"]) == 6, "Should have 6 auto-generated tasks"
        
        print(f"✓ GET /api/patients/{mrn}/with-tasks returns patient with tasks")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{mrn}", headers=auth_headers)
        for task in created_data.get("tasks", []):
            requests.delete(f"{BASE_URL}/api/tasks/{task['_id']}", headers=auth_headers)
    
    def test_10_task_toggle_endpoint(self, auth_headers):
        """Test PATCH /api/tasks/{task_id}/toggle"""
        # Create patient with tasks
        mrn = f"TEST_TASKTOG_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        create_response = requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
                                        headers=auth_headers, json={
                                            "mrn": mrn,
                                            "patient_name": "Test Task Toggle Patient",
                                            "auto_generate_tasks": True
                                        })
        assert create_response.status_code == 200
        created_data = create_response.json()
        
        # Get first task
        task_id = created_data["tasks"][0]["_id"]
        
        # Toggle task to complete
        toggle_response = requests.patch(f"{BASE_URL}/api/tasks/{task_id}/toggle", headers=auth_headers)
        assert toggle_response.status_code == 200
        assert toggle_response.json()["completed"] == True
        
        # Toggle back to incomplete
        toggle_response2 = requests.patch(f"{BASE_URL}/api/tasks/{task_id}/toggle", headers=auth_headers)
        assert toggle_response2.status_code == 200
        assert toggle_response2.json()["completed"] == False
        
        print(f"✓ Task toggle endpoint works correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{mrn}", headers=auth_headers)
        for task in created_data.get("tasks", []):
            requests.delete(f"{BASE_URL}/api/tasks/{task['_id']}", headers=auth_headers)
    
    def test_11_task_delete_endpoint(self, auth_headers):
        """Test DELETE /api/tasks/{task_id}"""
        # Create patient with tasks
        mrn = f"TEST_TASKDEL_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        create_response = requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
                                        headers=auth_headers, json={
                                            "mrn": mrn,
                                            "patient_name": "Test Task Delete Patient",
                                            "auto_generate_tasks": True
                                        })
        assert create_response.status_code == 200
        created_data = create_response.json()
        
        # Delete first task
        task_id = created_data["tasks"][0]["_id"]
        delete_response = requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # Verify task is deleted
        get_response = requests.get(f"{BASE_URL}/api/patients/{mrn}/with-tasks", headers=auth_headers)
        assert get_response.status_code == 200
        assert len(get_response.json()["tasks"]) == 5, "Should have 5 tasks after deletion"
        
        print(f"✓ Task delete endpoint works correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{mrn}", headers=auth_headers)
        for task in created_data.get("tasks", [])[1:]:  # Skip first (already deleted)
            requests.delete(f"{BASE_URL}/api/tasks/{task['_id']}", headers=auth_headers)
    
    def test_12_unauthorized_access(self):
        """Test endpoints reject unauthorized requests"""
        # Test without auth header
        response = requests.get(f"{BASE_URL}/api/patients/with-tasks")
        assert response.status_code in [401, 403], "Should reject unauthorized request"
        
        response = requests.post(f"{BASE_URL}/api/patients/create-with-tasks", json={
            "mrn": "TEST",
            "patient_name": "Test"
        })
        assert response.status_code in [401, 403], "Should reject unauthorized request"
        
        print("✓ Unauthorized access correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
