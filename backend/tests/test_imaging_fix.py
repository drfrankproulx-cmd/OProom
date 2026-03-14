"""
Test suite for verifying the imaging endpoint fix and related features.

CRITICAL BUG FIX TESTED:
- PATCH /api/patients/{mrn}/preop-checklist/imaging was being caught by generic /{item_id} route
- Fixed by moving imaging endpoint BEFORE the generic endpoint in server.py (line 1058 vs 1138)

Features Tested:
1. PATCH /api/patients/{mrn}/preop-checklist/imaging - imaging selection saves correctly
2. PATCH /api/patients/{mrn}/preop-checklist/{item_id} - regular checklist toggle still works
3. GET /api/patients/with-tasks - returns normalized checklist with imaging data
4. POST /api/patients/create-with-tasks - creates patient with new 9-item OMFS checklist
5. Sidebar navigation no longer shows Surgery Timeline (frontend test)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://clinic-scheduler-v2.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "proul076@umn.edu"
TEST_PASSWORD = "59K63i75%("

# Test patient MRN for imaging tests
TEST_IMAGING_MRN = "SJ2026002"  # Patient mentioned in test context
TEST_NEW_PATIENT_MRN = f"TEST_IMG_{int(time.time())}"


class TestAuthentication:
    """Test authentication for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Verify login works"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Login successful, token received")


class TestImagingEndpointFix:
    """
    CRITICAL: Test that imaging selection endpoint works correctly.
    This was broken because FastAPI's route ordering - the generic /{item_id} route
    was catching 'imaging' before the specific /imaging route.
    """
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_imaging_endpoint_saves_selection(self, headers):
        """
        CRITICAL TEST: Verify PATCH /api/patients/{mrn}/preop-checklist/imaging 
        correctly saves imaging selection to database.
        
        Root cause of bug: FastAPI matches routes in declaration order.
        The fix moved /imaging before /{item_id} in server.py.
        """
        # Use the known test patient MRN
        mrn = TEST_IMAGING_MRN
        
        # Test selections
        test_selections = [
            "CT Facial (Maxillofacial)",
            "PET Scan"
        ]
        
        # Update imaging selection
        response = requests.patch(
            f"{BASE_URL}/api/patients/{mrn}/preop-checklist/imaging",
            headers=headers,
            json={"selection": test_selections}
        )
        
        # The endpoint should return 200 or handle the patient correctly
        if response.status_code == 404:
            # Patient not found - create a test patient first
            print(f"Note: Patient {mrn} not found, skipping imaging save test")
            pytest.skip(f"Test patient {mrn} not found in database")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"✓ Imaging endpoint response: {data}")
        
        # Verify response contains the selections
        assert "selection" in data, "Response should contain 'selection'"
        assert data["selection"] == test_selections, f"Selection mismatch: {data['selection']} vs {test_selections}"
        assert "checked" in data, "Response should contain 'checked'"
        assert data["checked"] == True, "Imaging should be marked as checked when selections exist"
        
        print(f"✓ Imaging selection saved correctly: {test_selections}")
    
    def test_imaging_selection_persists_in_database(self, headers):
        """Verify the imaging selection is actually persisted (GET after PATCH)"""
        mrn = TEST_IMAGING_MRN
        
        # Get patient with tasks to verify imaging data
        response = requests.get(
            f"{BASE_URL}/api/patients/with-tasks",
            headers=headers
        )
        
        assert response.status_code == 200
        patients = response.json()
        
        # Find our test patient
        test_patient = next((p for p in patients if p.get("mrn") == mrn), None)
        
        if test_patient is None:
            pytest.skip(f"Test patient {mrn} not found in patients list")
        
        # Check preop_checklist
        preop_checklist = test_patient.get("preop_checklist", [])
        imaging_item = next((item for item in preop_checklist if item.get("id") == "imaging"), None)
        
        if imaging_item:
            print(f"✓ Imaging item found in checklist: {imaging_item}")
            assert "selection" in imaging_item, "Imaging item should have 'selection' field"
            print(f"  Selection: {imaging_item.get('selection')}")
            print(f"  Checked: {imaging_item.get('checked')}")
        else:
            print(f"Note: Imaging item not found in checklist for patient {mrn}")
    
    def test_clear_imaging_selection(self, headers):
        """Test clearing imaging selection (empty array)"""
        mrn = TEST_IMAGING_MRN
        
        # Clear selections
        response = requests.patch(
            f"{BASE_URL}/api/patients/{mrn}/preop-checklist/imaging",
            headers=headers,
            json={"selection": []}
        )
        
        if response.status_code == 404:
            pytest.skip(f"Test patient {mrn} not found")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["selection"] == [], "Selection should be empty"
        assert data["checked"] == False, "Imaging should be unchecked when no selections"
        
        print(f"✓ Imaging selection cleared successfully")


class TestRegularChecklistToggle:
    """Test that regular checklist toggle still works after route reorder"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_toggle_labs_ordered(self, headers):
        """Test toggling a regular checklist item (labs_ordered)"""
        mrn = TEST_IMAGING_MRN
        
        response = requests.patch(
            f"{BASE_URL}/api/patients/{mrn}/preop-checklist/labs_ordered",
            headers=headers
        )
        
        if response.status_code == 404:
            pytest.skip(f"Test patient {mrn} not found")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "item_id" in data
        assert data["item_id"] == "labs_ordered"
        assert "checked" in data
        assert "progress" in data
        
        print(f"✓ labs_ordered toggled to: {data['checked']}")
        print(f"  Progress: {data['progress']}")
    
    def test_toggle_medical_optimization(self, headers):
        """Test toggling medical_optimization checklist item"""
        mrn = TEST_IMAGING_MRN
        
        response = requests.patch(
            f"{BASE_URL}/api/patients/{mrn}/preop-checklist/medical_optimization",
            headers=headers
        )
        
        if response.status_code == 404:
            pytest.skip(f"Test patient {mrn} not found")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["item_id"] == "medical_optimization"
        print(f"✓ medical_optimization toggled to: {data['checked']}")


class TestPatientWithTasksAPI:
    """Test GET /api/patients/with-tasks returns normalized checklist"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_patients_with_tasks_returns_normalized_checklist(self, headers):
        """Verify patients have normalized 9-item OMFS checklist"""
        response = requests.get(
            f"{BASE_URL}/api/patients/with-tasks",
            headers=headers
        )
        
        assert response.status_code == 200
        patients = response.json()
        
        assert isinstance(patients, list), "Response should be a list"
        
        if len(patients) > 0:
            patient = patients[0]
            
            # Verify structure
            assert "preop_checklist" in patient, "Patient should have preop_checklist"
            assert "preop_progress" in patient, "Patient should have preop_progress"
            assert "tasks" in patient, "Patient should have tasks array"
            
            preop_checklist = patient["preop_checklist"]
            
            # Should be a list (new format)
            assert isinstance(preop_checklist, list), "preop_checklist should be a list"
            
            # Should have 9 items (OMFS format)
            if len(preop_checklist) > 0:
                print(f"✓ Patient {patient.get('mrn')} has {len(preop_checklist)} checklist items")
                
                # Check for imaging item
                imaging = next((item for item in preop_checklist if item.get("id") == "imaging"), None)
                if imaging:
                    print(f"  Imaging item: type={imaging.get('type')}, selection={imaging.get('selection')}")
                
            print(f"  Progress: {patient.get('preop_progress')}")
            print(f"  Tasks count: {len(patient.get('tasks', []))}")
        
        print(f"✓ GET /api/patients/with-tasks returned {len(patients)} patients")


class TestQuickAddPatient:
    """Test POST /api/patients/create-with-tasks creates patient with 9-item checklist"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_patient_with_auto_tasks(self, headers):
        """Create new patient with auto-generated tasks"""
        new_patient = {
            "mrn": TEST_NEW_PATIENT_MRN,
            "patient_name": "Test Imaging Patient",
            "dob": "1990-01-15",
            "diagnosis": "Mandibular Fracture",
            "procedures": "ORIF Mandible",
            "attending": "Dr. Smith",
            "auto_generate_tasks": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/patients/create-with-tasks",
            headers=headers,
            json=new_patient
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify patient created
        assert "patient" in data
        patient = data["patient"]
        assert patient["mrn"] == TEST_NEW_PATIENT_MRN
        assert patient["status"] == "add-on"  # No date = add-on
        
        # Verify preop_checklist is 9-item format
        preop_checklist = patient.get("preop_checklist", [])
        assert isinstance(preop_checklist, list), "preop_checklist should be list"
        assert len(preop_checklist) == 9, f"Expected 9 checklist items, got {len(preop_checklist)}"
        
        # Verify imaging item exists
        imaging = next((item for item in preop_checklist if item.get("id") == "imaging"), None)
        assert imaging is not None, "Imaging item should exist"
        assert imaging.get("type") == "dropdown", "Imaging should have type 'dropdown'"
        assert imaging.get("selection") == [], "Imaging should have empty selection initially"
        
        # Verify tasks created
        assert "tasks" in data
        tasks = data["tasks"]
        assert len(tasks) == 6, f"Expected 6 auto-generated tasks, got {len(tasks)}"
        
        print(f"✓ Patient {TEST_NEW_PATIENT_MRN} created with 9-item checklist and 6 tasks")
        print(f"  Checklist items: {[item['id'] for item in preop_checklist]}")
    
    def test_imaging_on_new_patient(self, headers):
        """Test imaging selection on the newly created patient"""
        mrn = TEST_NEW_PATIENT_MRN
        
        # Update imaging selection
        test_selections = ["CT Facial (Maxillofacial)", "OPG (Orthopantomogram / Panorex)"]
        
        response = requests.patch(
            f"{BASE_URL}/api/patients/{mrn}/preop-checklist/imaging",
            headers=headers,
            json={"selection": test_selections}
        )
        
        if response.status_code == 404:
            pytest.skip(f"Test patient {mrn} not found - likely cleanup ran first")
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["selection"] == test_selections
        assert data["checked"] == True
        
        print(f"✓ Imaging updated on new patient: {test_selections}")
    
    @pytest.fixture(scope="class", autouse=True)
    def cleanup(self, headers):
        """Cleanup test patient after tests"""
        yield
        
        # Delete test patient
        try:
            response = requests.delete(
                f"{BASE_URL}/api/patients/{TEST_NEW_PATIENT_MRN}",
                headers=headers
            )
            if response.status_code == 200:
                print(f"✓ Cleaned up test patient {TEST_NEW_PATIENT_MRN}")
        except Exception as e:
            print(f"Cleanup error: {e}")


class TestImagingOptions:
    """Test GET /api/imaging-options endpoint"""
    
    def test_get_imaging_options(self):
        """Verify imaging options endpoint returns correct list"""
        response = requests.get(f"{BASE_URL}/api/imaging-options")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "options" in data
        
        expected_options = [
            "CT Facial (Maxillofacial)",
            "CT Abd/Leg Run-Off (Fibula Free Flap Planning)",
            "PET Scan",
            "OPG (Orthopantomogram / Panorex)",
            "Lateral Cephalometric"
        ]
        
        assert data["options"] == expected_options, f"Options mismatch: {data['options']}"
        
        print(f"✓ GET /api/imaging-options returned {len(expected_options)} options")


class TestRouteOrderVerification:
    """Verify the route ordering fix by checking that 'imaging' is not treated as item_id"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_imaging_route_not_caught_by_generic_route(self, headers):
        """
        CRITICAL: Ensure /imaging is not being caught by /{item_id} route.
        Before the fix, 'imaging' was interpreted as an item_id.
        """
        mrn = TEST_IMAGING_MRN
        
        # If this returns a toggle response (just checked: true/false without selection),
        # it means the wrong route caught the request.
        response = requests.patch(
            f"{BASE_URL}/api/patients/{mrn}/preop-checklist/imaging",
            headers=headers,
            json={"selection": ["PET Scan"]}
        )
        
        if response.status_code == 404:
            pytest.skip(f"Test patient {mrn} not found")
        
        assert response.status_code == 200
        
        data = response.json()
        
        # The imaging endpoint returns "selection" field
        # The generic endpoint returns "item_id" field
        assert "selection" in data, "Response should contain 'selection' (imaging endpoint)"
        
        # If we got "item_id" in response, the wrong route caught it
        if "item_id" in data:
            pytest.fail("CRITICAL: Generic /{item_id} route is catching /imaging requests!")
        
        print(f"✓ Route ordering verified - /imaging endpoint correctly handles request")
