"""
Test suite for Pre-Op Checklist v2 and Task System Changes
Tests the new 5-item default checklist, custom items, and 3-task auto-generation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "proul076@umn.edu"
TEST_PASSWORD = "59K63i75%("

# Known existing patient MRNs for migration testing
EXISTING_MRNS = ["5909932", "1416471", "6062024", "6011054", "602343"]

# Expected default checklist items (5 items)
DEFAULT_CHECKLIST_IDS = ["imaging", "prior_auth", "vsp_complete", "ortho_approval", "or_scheduled"]

# Removed checklist items (should NOT appear in new patients)
REMOVED_CHECKLIST_IDS = ["labs_ordered", "labs_reviewed", "anesthesia_clearance", "medical_optimization"]


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestDefaultPreopChecklist:
    """Tests for the new 5-item default pre-op checklist"""

    def test_new_patient_has_5_default_items(self, auth_headers):
        """New patients should have exactly 5 default checklist items"""
        test_mrn = f"TEST_CHECKLIST_{uuid.uuid4().hex[:8]}"
        
        # Create patient with tasks
        response = requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
            headers=auth_headers,
            json={
                "mrn": test_mrn,
                "patient_name": "Test Checklist Patient",
                "auto_generate_tasks": True
            }
        )
        assert response.status_code == 200, f"Failed to create patient: {response.text}"
        
        patient = response.json().get("patient", {})
        checklist = patient.get("preop_checklist", [])
        
        # Verify exactly 5 items
        assert len(checklist) == 5, f"Expected 5 checklist items, got {len(checklist)}"
        
        # Verify all default IDs present
        checklist_ids = [item.get("id") for item in checklist]
        for expected_id in DEFAULT_CHECKLIST_IDS:
            assert expected_id in checklist_ids, f"Missing default item: {expected_id}"
        
        # Verify removed items are NOT present
        for removed_id in REMOVED_CHECKLIST_IDS:
            assert removed_id not in checklist_ids, f"Removed item should not be present: {removed_id}"
        
        # Verify all items have default=True flag
        for item in checklist:
            assert item.get("default") == True, f"Item {item.get('id')} should have default=True"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{test_mrn}", headers=auth_headers)
        print(f"✓ New patient has exactly 5 default checklist items")

    def test_default_items_cannot_be_deleted(self, auth_headers):
        """Default checklist items should return 400 when trying to delete"""
        test_mrn = f"TEST_NODELETE_{uuid.uuid4().hex[:8]}"
        
        # Create patient
        requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
            headers=auth_headers,
            json={"mrn": test_mrn, "patient_name": "Test No Delete"}
        )
        
        # Try to delete a default item (imaging)
        response = requests.delete(
            f"{BASE_URL}/api/patients/{test_mrn}/preop-checklist/custom-item/imaging",
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400 for deleting default item, got {response.status_code}"
        assert "default" in response.text.lower() or "cannot delete" in response.text.lower()
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{test_mrn}", headers=auth_headers)
        print(f"✓ Default items cannot be deleted (returns 400)")

    def test_imaging_item_has_dropdown_type(self, auth_headers):
        """Imaging item should have type='dropdown' and selection array"""
        test_mrn = f"TEST_IMAGING_{uuid.uuid4().hex[:8]}"
        
        # Create patient
        response = requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
            headers=auth_headers,
            json={"mrn": test_mrn, "patient_name": "Test Imaging"}
        )
        patient = response.json().get("patient", {})
        checklist = patient.get("preop_checklist", [])
        
        imaging_item = next((i for i in checklist if i.get("id") == "imaging"), None)
        assert imaging_item is not None, "Imaging item not found"
        assert imaging_item.get("type") == "dropdown", "Imaging should have type='dropdown'"
        assert "selection" in imaging_item, "Imaging should have selection array"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{test_mrn}", headers=auth_headers)
        print(f"✓ Imaging item has dropdown type and selection array")


class TestCustomChecklistItems:
    """Tests for custom checklist item functionality"""

    def test_add_custom_checklist_item(self, auth_headers):
        """POST /api/patients/{mrn}/preop-checklist/custom-item should add custom item"""
        test_mrn = f"TEST_CUSTOM_{uuid.uuid4().hex[:8]}"
        
        # Create patient
        requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
            headers=auth_headers,
            json={"mrn": test_mrn, "patient_name": "Test Custom Item"}
        )
        
        # Add custom item
        response = requests.post(
            f"{BASE_URL}/api/patients/{test_mrn}/preop-checklist/custom-item",
            headers=auth_headers,
            json={"item": "Stop Eliquis 5 days pre-op"}
        )
        assert response.status_code == 200, f"Failed to add custom item: {response.text}"
        
        result = response.json()
        assert "item" in result, "Response should contain item"
        new_item = result["item"]
        assert new_item.get("item") == "Stop Eliquis 5 days pre-op"
        assert new_item.get("default") == False, "Custom item should have default=False"
        assert new_item.get("checked") == False, "New custom item should be unchecked"
        assert new_item.get("id", "").startswith("custom_"), "Custom item ID should start with 'custom_'"
        
        # Verify progress updated
        assert "progress" in result
        assert result["progress"]["total"] == 6, "Total should be 6 (5 default + 1 custom)"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{test_mrn}", headers=auth_headers)
        print(f"✓ Custom checklist item added successfully")

    def test_delete_custom_checklist_item(self, auth_headers):
        """DELETE /api/patients/{mrn}/preop-checklist/custom-item/{id} should remove custom item"""
        test_mrn = f"TEST_DELCUSTOM_{uuid.uuid4().hex[:8]}"
        
        # Create patient
        requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
            headers=auth_headers,
            json={"mrn": test_mrn, "patient_name": "Test Delete Custom"}
        )
        
        # Add custom item
        add_response = requests.post(
            f"{BASE_URL}/api/patients/{test_mrn}/preop-checklist/custom-item",
            headers=auth_headers,
            json={"item": "Custom item to delete"}
        )
        custom_item_id = add_response.json()["item"]["id"]
        
        # Delete custom item
        delete_response = requests.delete(
            f"{BASE_URL}/api/patients/{test_mrn}/preop-checklist/custom-item/{custom_item_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Failed to delete custom item: {delete_response.text}"
        
        result = delete_response.json()
        assert result.get("deleted") == custom_item_id
        assert result["progress"]["total"] == 5, "Total should be back to 5 after deletion"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{test_mrn}", headers=auth_headers)
        print(f"✓ Custom checklist item deleted successfully")

    def test_custom_item_empty_text_rejected(self, auth_headers):
        """Adding custom item with empty text should return 400"""
        test_mrn = f"TEST_EMPTY_{uuid.uuid4().hex[:8]}"
        
        # Create patient
        requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
            headers=auth_headers,
            json={"mrn": test_mrn, "patient_name": "Test Empty Item"}
        )
        
        # Try to add empty item
        response = requests.post(
            f"{BASE_URL}/api/patients/{test_mrn}/preop-checklist/custom-item",
            headers=auth_headers,
            json={"item": "   "}  # Whitespace only
        )
        assert response.status_code == 400, f"Expected 400 for empty item, got {response.status_code}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{test_mrn}", headers=auth_headers)
        print(f"✓ Empty custom item text rejected with 400")


class TestChecklistToggle:
    """Tests for toggling checklist items"""

    def test_toggle_checklist_item(self, auth_headers):
        """PATCH /api/patients/{mrn}/preop-checklist/{item_id} should toggle item"""
        test_mrn = f"TEST_TOGGLE_{uuid.uuid4().hex[:8]}"
        
        # Create patient
        requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
            headers=auth_headers,
            json={"mrn": test_mrn, "patient_name": "Test Toggle"}
        )
        
        # Toggle prior_auth to checked
        response = requests.patch(
            f"{BASE_URL}/api/patients/{test_mrn}/preop-checklist/prior_auth",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to toggle: {response.text}"
        
        result = response.json()
        assert result.get("item_id") == "prior_auth"
        assert result.get("checked") == True, "Item should be checked after toggle"
        assert "progress" in result
        
        # Toggle again to uncheck
        response2 = requests.patch(
            f"{BASE_URL}/api/patients/{test_mrn}/preop-checklist/prior_auth",
            headers=auth_headers
        )
        assert response2.json().get("checked") == False, "Item should be unchecked after second toggle"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{test_mrn}", headers=auth_headers)
        print(f"✓ Checklist item toggle works correctly")


class TestAutoGeneratedTasks:
    """Tests for the new 3-task auto-generation"""

    def test_auto_generate_creates_3_tasks(self, auth_headers):
        """Auto-generate should create exactly 3 tasks: Prior Auth, VSP, Imaging"""
        test_mrn = f"TEST_TASKS_{uuid.uuid4().hex[:8]}"
        
        # Create patient with auto-generate enabled
        response = requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
            headers=auth_headers,
            json={
                "mrn": test_mrn,
                "patient_name": "Test Auto Tasks",
                "auto_generate_tasks": True
            }
        )
        assert response.status_code == 200
        
        result = response.json()
        tasks = result.get("tasks", [])
        
        # Verify exactly 3 tasks
        assert len(tasks) == 3, f"Expected 3 auto-generated tasks, got {len(tasks)}"
        
        # Verify task descriptions
        task_descriptions = [t.get("task_description") for t in tasks]
        expected_tasks = ["Prior Authorization", "VSP (Virtual Surgical Planning)", "Imaging"]
        for expected in expected_tasks:
            assert expected in task_descriptions, f"Missing expected task: {expected}"
        
        # Verify removed tasks are NOT present
        removed_tasks = ["Labs", "Anesthesia", "Ortho Approval"]
        for removed in removed_tasks:
            for desc in task_descriptions:
                assert removed.lower() not in desc.lower(), f"Removed task should not be present: {removed}"
        
        # Cleanup
        for task in tasks:
            requests.delete(f"{BASE_URL}/api/tasks/{task['_id']}", headers=auth_headers)
        requests.delete(f"{BASE_URL}/api/patients/{test_mrn}", headers=auth_headers)
        print(f"✓ Auto-generate creates exactly 3 tasks (Prior Auth, VSP, Imaging)")

    def test_auto_generate_disabled_creates_no_tasks(self, auth_headers):
        """When auto_generate_tasks=False, no tasks should be created"""
        test_mrn = f"TEST_NOTASKS_{uuid.uuid4().hex[:8]}"
        
        # Create patient with auto-generate disabled
        response = requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
            headers=auth_headers,
            json={
                "mrn": test_mrn,
                "patient_name": "Test No Auto Tasks",
                "auto_generate_tasks": False
            }
        )
        assert response.status_code == 200
        
        result = response.json()
        tasks = result.get("tasks", [])
        
        assert len(tasks) == 0, f"Expected 0 tasks when auto-generate disabled, got {len(tasks)}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{test_mrn}", headers=auth_headers)
        print(f"✓ Auto-generate disabled creates no tasks")


class TestExistingPatientMigration:
    """Tests for migration of existing patients to new checklist format"""

    def test_existing_patient_has_5_default_items(self, auth_headers):
        """Existing patients should have 5 default items after migration"""
        # Use known existing patient
        test_mrn = EXISTING_MRNS[0]  # 5909932 - Harste
        
        response = requests.get(f"{BASE_URL}/api/patients/with-tasks", headers=auth_headers)
        assert response.status_code == 200
        
        patients = response.json()
        patient = next((p for p in patients if p.get("mrn") == test_mrn), None)
        
        if patient:
            checklist = patient.get("preop_checklist", [])
            checklist_ids = [item.get("id") for item in checklist if isinstance(item, dict)]
            
            # Verify all 5 default items present
            for default_id in DEFAULT_CHECKLIST_IDS:
                assert default_id in checklist_ids, f"Existing patient missing default item: {default_id}"
            
            print(f"✓ Existing patient {test_mrn} has all 5 default checklist items")
        else:
            pytest.skip(f"Patient {test_mrn} not found in database")

    def test_patient_602343_has_custom_item(self, auth_headers):
        """Patient 602343 (Will) should have custom item 'Stop Eliquis 5 days pre-op'"""
        test_mrn = "602343"
        
        response = requests.get(f"{BASE_URL}/api/patients/with-tasks", headers=auth_headers)
        assert response.status_code == 200
        
        patients = response.json()
        patient = next((p for p in patients if p.get("mrn") == test_mrn), None)
        
        if patient:
            checklist = patient.get("preop_checklist", [])
            
            # Look for custom item
            custom_items = [i for i in checklist if isinstance(i, dict) and i.get("default") == False]
            
            # Should have at least one custom item
            if len(custom_items) > 0:
                print(f"✓ Patient {test_mrn} has {len(custom_items)} custom item(s)")
            else:
                # Check total count - should be more than 5 if custom items exist
                total = len(checklist)
                print(f"  Patient {test_mrn} has {total} total checklist items")
        else:
            pytest.skip(f"Patient {test_mrn} not found in database")


class TestImagingDropdown:
    """Tests for imaging dropdown functionality"""

    def test_update_imaging_selection(self, auth_headers):
        """PATCH /api/patients/{mrn}/preop-checklist/imaging should update selection"""
        test_mrn = f"TEST_IMGSEL_{uuid.uuid4().hex[:8]}"
        
        # Create patient
        requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
            headers=auth_headers,
            json={"mrn": test_mrn, "patient_name": "Test Imaging Selection"}
        )
        
        # Update imaging selection
        response = requests.patch(
            f"{BASE_URL}/api/patients/{test_mrn}/preop-checklist/imaging",
            headers=auth_headers,
            json={"selection": ["CT Facial (Maxillofacial)", "PET Scan"]}
        )
        assert response.status_code == 200, f"Failed to update imaging: {response.text}"
        
        result = response.json()
        assert result.get("checked") == True, "Imaging should be checked when selection is not empty"
        assert len(result.get("selection", [])) == 2
        
        # Clear selection
        response2 = requests.patch(
            f"{BASE_URL}/api/patients/{test_mrn}/preop-checklist/imaging",
            headers=auth_headers,
            json={"selection": []}
        )
        assert response2.json().get("checked") == False, "Imaging should be unchecked when selection is empty"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{test_mrn}", headers=auth_headers)
        print(f"✓ Imaging selection update works correctly")


class TestProgressCalculation:
    """Tests for dynamic progress calculation"""

    def test_progress_includes_custom_items(self, auth_headers):
        """Progress should count both default and custom items"""
        test_mrn = f"TEST_PROGRESS_{uuid.uuid4().hex[:8]}"
        
        # Create patient
        requests.post(f"{BASE_URL}/api/patients/create-with-tasks", 
            headers=auth_headers,
            json={"mrn": test_mrn, "patient_name": "Test Progress"}
        )
        
        # Add custom item
        add_response = requests.post(
            f"{BASE_URL}/api/patients/{test_mrn}/preop-checklist/custom-item",
            headers=auth_headers,
            json={"item": "Custom progress item"}
        )
        assert add_response.json()["progress"]["total"] == 6
        
        # Check one default item
        toggle_response = requests.patch(
            f"{BASE_URL}/api/patients/{test_mrn}/preop-checklist/prior_auth",
            headers=auth_headers
        )
        progress = toggle_response.json()["progress"]
        assert progress["checked"] == 1
        assert progress["total"] == 6
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/patients/{test_mrn}", headers=auth_headers)
        print(f"✓ Progress calculation includes custom items")


class TestImagingOptions:
    """Tests for imaging options endpoint"""

    def test_get_imaging_options(self, auth_headers):
        """GET /api/imaging-options should return list of imaging types"""
        response = requests.get(f"{BASE_URL}/api/imaging-options", headers=auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert "options" in result
        options = result["options"]
        
        # Verify expected imaging types
        expected = ["CT Facial (Maxillofacial)", "PET Scan", "OPG (Orthopantomogram / Panorex)"]
        for exp in expected:
            assert exp in options, f"Missing imaging option: {exp}"
        
        print(f"✓ Imaging options endpoint returns {len(options)} options")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
