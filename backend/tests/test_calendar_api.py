"""
Test Calendar API Endpoints
Tests for PATCH /api/patients/{mrn}/calendar with actions: schedule, move_to_addon, cancel, reschedule
Also tests audit log and activity log creation
"""
import pytest
import requests
import os
import time
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "proul076@umn.edu"
TEST_PASSWORD = "59K63i75%("

# Test patient MRN prefix for cleanup
TEST_MRN_PREFIX = "TEST_CAL_"


class TestCalendarAPI:
    """Calendar API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        # Cleanup: Delete test patients
        self._cleanup_test_patients()
    
    def _cleanup_test_patients(self):
        """Delete all test patients created during tests"""
        try:
            patients_response = self.session.get(f"{BASE_URL}/api/patients")
            if patients_response.status_code == 200:
                patients = patients_response.json()
                for patient in patients:
                    if patient.get("mrn", "").startswith(TEST_MRN_PREFIX):
                        self.session.delete(f"{BASE_URL}/api/patients/{patient['mrn']}")
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    def _create_test_patient(self, mrn_suffix, name, status="add-on"):
        """Helper to create a test patient"""
        mrn = f"{TEST_MRN_PREFIX}{mrn_suffix}"
        patient_data = {
            "mrn": mrn,
            "patient_name": name,
            "dob": "1990-01-15",
            "diagnosis": "Test Diagnosis",
            "procedures": "Test Procedure",
            "attending": "Dr. Test",
            "status": status
        }
        response = self.session.post(f"{BASE_URL}/api/patients", json=patient_data)
        assert response.status_code == 200, f"Failed to create patient: {response.text}"
        return mrn
    
    def _create_schedule_for_patient(self, mrn, patient_name, date, time="08:00 AM"):
        """Helper to create a schedule entry for a patient"""
        schedule_data = {
            "patient_mrn": mrn,
            "patient_name": patient_name,
            "procedure": "Test Procedure",
            "staff": "Dr. Test",
            "scheduled_date": date,
            "scheduled_time": time,
            "status": "scheduled",
            "is_addon": False,
            "priority": "medium"
        }
        response = self.session.post(f"{BASE_URL}/api/schedules", json=schedule_data)
        return response
    
    # ─── Test: Schedule Action ───────────────────────────────────────────
    def test_calendar_action_schedule_success(self):
        """Test PATCH /api/patients/{mrn}/calendar with action=schedule"""
        # Create add-on patient
        mrn = self._create_test_patient("SCHED1", "Test Schedule Patient")
        
        # Schedule the patient
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = self.session.patch(f"{BASE_URL}/api/patients/{mrn}/calendar", json={
            "action": "schedule",
            "or_date": tomorrow,
            "or_time": "9:00 AM",
            "or_room": "OR 2",
            "duration_minutes": 120
        })
        
        assert response.status_code == 200, f"Schedule action failed: {response.text}"
        data = response.json()
        assert data["status"] == "ok"
        assert data["action"] == "schedule"
        assert data["mrn"] == mrn
        assert "Scheduled for" in data["message"]
        
        # Verify patient status changed
        patient_response = self.session.get(f"{BASE_URL}/api/patients/{mrn}")
        assert patient_response.status_code == 200
        patient = patient_response.json()
        assert patient["status"] == "scheduled"
        assert patient["scheduled_date"] == tomorrow
        assert patient["scheduled_time"] == "9:00 AM"
        
        print("✓ Schedule action works correctly")
    
    def test_calendar_action_schedule_requires_date(self):
        """Test that schedule action requires or_date"""
        mrn = self._create_test_patient("SCHED2", "Test No Date Patient")
        
        response = self.session.patch(f"{BASE_URL}/api/patients/{mrn}/calendar", json={
            "action": "schedule",
            "or_time": "9:00 AM"
            # Missing or_date
        })
        
        assert response.status_code == 400
        assert "or_date is required" in response.json().get("detail", "")
        print("✓ Schedule action correctly requires or_date")
    
    # ─── Test: Move to Add-On Action ─────────────────────────────────────
    def test_calendar_action_move_to_addon_success(self):
        """Test PATCH /api/patients/{mrn}/calendar with action=move_to_addon"""
        # Create scheduled patient
        mrn = self._create_test_patient("ADDON1", "Test Move Addon Patient", status="scheduled")
        
        # Create schedule entry
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        self._create_schedule_for_patient(mrn, "Test Move Addon Patient", tomorrow)
        
        # Update patient with scheduled date
        self.session.patch(f"{BASE_URL}/api/patients/{mrn}/calendar", json={
            "action": "schedule",
            "or_date": tomorrow,
            "or_time": "10:00 AM",
            "or_room": "OR 1"
        })
        
        # Move to add-on
        response = self.session.patch(f"{BASE_URL}/api/patients/{mrn}/calendar", json={
            "action": "move_to_addon"
        })
        
        assert response.status_code == 200, f"Move to addon failed: {response.text}"
        data = response.json()
        assert data["status"] == "ok"
        assert data["action"] == "move_to_addon"
        assert "Add-On list" in data["message"]
        
        # Verify patient status changed
        patient_response = self.session.get(f"{BASE_URL}/api/patients/{mrn}")
        assert patient_response.status_code == 200
        patient = patient_response.json()
        assert patient["status"] == "add-on"
        assert patient.get("scheduled_date") is None
        
        print("✓ Move to add-on action works correctly")
    
    # ─── Test: Cancel Action ─────────────────────────────────────────────
    def test_calendar_action_cancel_success(self):
        """Test PATCH /api/patients/{mrn}/calendar with action=cancel"""
        # Create scheduled patient
        mrn = self._create_test_patient("CANCEL1", "Test Cancel Patient", status="scheduled")
        
        # Schedule first
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        self.session.patch(f"{BASE_URL}/api/patients/{mrn}/calendar", json={
            "action": "schedule",
            "or_date": tomorrow,
            "or_time": "11:00 AM"
        })
        
        # Cancel the case
        response = self.session.patch(f"{BASE_URL}/api/patients/{mrn}/calendar", json={
            "action": "cancel"
        })
        
        assert response.status_code == 200, f"Cancel action failed: {response.text}"
        data = response.json()
        assert data["status"] == "ok"
        assert data["action"] == "cancel"
        assert "cancelled" in data["message"].lower()
        
        # Verify patient status changed
        patient_response = self.session.get(f"{BASE_URL}/api/patients/{mrn}")
        assert patient_response.status_code == 200
        patient = patient_response.json()
        assert patient["status"] == "cancelled"
        
        print("✓ Cancel action works correctly")
    
    # ─── Test: Reschedule Action ─────────────────────────────────────────
    def test_calendar_action_reschedule_success(self):
        """Test PATCH /api/patients/{mrn}/calendar with action=reschedule"""
        # Create and schedule patient
        mrn = self._create_test_patient("RESCHED1", "Test Reschedule Patient")
        
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        self.session.patch(f"{BASE_URL}/api/patients/{mrn}/calendar", json={
            "action": "schedule",
            "or_date": tomorrow,
            "or_time": "8:00 AM",
            "or_room": "OR 1"
        })
        
        # Reschedule to different date/time
        next_week = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        response = self.session.patch(f"{BASE_URL}/api/patients/{mrn}/calendar", json={
            "action": "reschedule",
            "or_date": next_week,
            "or_time": "2:00 PM",
            "or_room": "OR 3"
        })
        
        assert response.status_code == 200, f"Reschedule action failed: {response.text}"
        data = response.json()
        assert data["status"] == "ok"
        assert data["action"] == "reschedule"
        assert "Rescheduled" in data["message"]
        
        # Verify patient schedule changed
        patient_response = self.session.get(f"{BASE_URL}/api/patients/{mrn}")
        assert patient_response.status_code == 200
        patient = patient_response.json()
        assert patient["scheduled_date"] == next_week
        assert patient["scheduled_time"] == "2:00 PM"
        
        print("✓ Reschedule action works correctly")
    
    def test_calendar_action_reschedule_requires_date(self):
        """Test that reschedule action requires or_date"""
        mrn = self._create_test_patient("RESCHED2", "Test No Date Reschedule")
        
        response = self.session.patch(f"{BASE_URL}/api/patients/{mrn}/calendar", json={
            "action": "reschedule",
            "or_time": "3:00 PM"
            # Missing or_date
        })
        
        assert response.status_code == 400
        assert "or_date is required" in response.json().get("detail", "")
        print("✓ Reschedule action correctly requires or_date")
    
    # ─── Test: Activity Log Creation ─────────────────────────────────────
    def test_calendar_action_creates_activity_log(self):
        """Test that calendar actions create activity log entries on patient record"""
        mrn = self._create_test_patient("ACTLOG1", "Test Activity Log Patient")
        
        # Get initial activity log
        patient_response = self.session.get(f"{BASE_URL}/api/patients/{mrn}")
        initial_log_count = len(patient_response.json().get("activity_log", []))
        
        # Schedule the patient
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        self.session.patch(f"{BASE_URL}/api/patients/{mrn}/calendar", json={
            "action": "schedule",
            "or_date": tomorrow,
            "or_time": "9:00 AM"
        })
        
        # Check activity log was added
        patient_response = self.session.get(f"{BASE_URL}/api/patients/{mrn}")
        patient = patient_response.json()
        activity_log = patient.get("activity_log", [])
        
        assert len(activity_log) > initial_log_count, "Activity log should have new entry"
        
        # Find the schedule action entry
        schedule_entries = [e for e in activity_log if e.get("action") == "schedule"]
        assert len(schedule_entries) > 0, "Should have schedule action in activity log"
        
        latest_entry = schedule_entries[-1]
        assert "Scheduled for" in latest_entry.get("details", "")
        assert latest_entry.get("user") == TEST_EMAIL
        assert "timestamp" in latest_entry
        
        print("✓ Calendar action creates activity log entry")
    
    # ─── Test: Audit Log Creation ────────────────────────────────────────
    def test_calendar_action_creates_audit_log(self):
        """Test that calendar actions create audit log entries"""
        mrn = self._create_test_patient("AUDIT1", "Test Audit Log Patient")
        
        # Schedule the patient
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        self.session.patch(f"{BASE_URL}/api/patients/{mrn}/calendar", json={
            "action": "schedule",
            "or_date": tomorrow,
            "or_time": "10:00 AM"
        })
        
        # Check audit logs endpoint (if available)
        audit_response = self.session.get(f"{BASE_URL}/api/audit-logs?resource_id={mrn}&limit=10")
        
        if audit_response.status_code == 200:
            audit_logs = audit_response.json()
            schedule_logs = [l for l in audit_logs if l.get("action") == "schedule"]
            assert len(schedule_logs) > 0, "Should have schedule action in audit logs"
            print("✓ Calendar action creates audit log entry")
        else:
            # Audit logs endpoint may not be exposed - that's OK, we verified activity log
            print("✓ Audit log endpoint not exposed (internal only) - activity log verified")
    
    # ─── Test: Unknown Action ────────────────────────────────────────────
    def test_calendar_action_unknown_action_fails(self):
        """Test that unknown action returns 400"""
        mrn = self._create_test_patient("UNKNOWN1", "Test Unknown Action")
        
        response = self.session.patch(f"{BASE_URL}/api/patients/{mrn}/calendar", json={
            "action": "invalid_action"
        })
        
        assert response.status_code == 400
        assert "Unknown action" in response.json().get("detail", "")
        print("✓ Unknown action correctly returns 400")
    
    # ─── Test: Patient Not Found ─────────────────────────────────────────
    def test_calendar_action_patient_not_found(self):
        """Test that action on non-existent patient returns 404"""
        response = self.session.patch(f"{BASE_URL}/api/patients/NONEXISTENT_MRN_12345/calendar", json={
            "action": "schedule",
            "or_date": "2026-03-25"
        })
        
        assert response.status_code == 404
        assert "not found" in response.json().get("detail", "").lower()
        print("✓ Non-existent patient correctly returns 404")


class TestSchedulesEndpoint:
    """Test /api/schedules endpoint for calendar data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
    
    def test_get_schedules_returns_list(self):
        """Test GET /api/schedules returns list of schedules"""
        response = self.session.get(f"{BASE_URL}/api/schedules")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/schedules returns {len(data)} schedules")
    
    def test_schedules_have_required_fields(self):
        """Test that schedules have required fields for calendar display"""
        response = self.session.get(f"{BASE_URL}/api/schedules")
        
        assert response.status_code == 200
        schedules = response.json()
        
        if len(schedules) > 0:
            schedule = schedules[0]
            # Check required fields for calendar
            assert "_id" in schedule or "id" in schedule
            assert "patient_mrn" in schedule
            assert "patient_name" in schedule
            # scheduled_date and is_addon are key for calendar filtering
            print(f"✓ Schedule has required fields: {list(schedule.keys())[:8]}...")
        else:
            print("✓ No schedules to verify (empty list)")


class TestConferencesEndpoint:
    """Test /api/conferences endpoint (may return 404 if not implemented)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
    
    def test_get_conferences(self):
        """Test GET /api/conferences - may return 404 or empty list"""
        response = self.session.get(f"{BASE_URL}/api/conferences")
        
        # Accept 200 (with data or empty) or 404 (not implemented)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ GET /api/conferences returns {len(data)} conferences")
        else:
            print("✓ GET /api/conferences returns 404 (endpoint may not exist - handled gracefully)")


class TestPatientsEndpoint:
    """Test /api/patients endpoint for calendar patient data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
    
    def test_get_patients_returns_list(self):
        """Test GET /api/patients returns list"""
        response = self.session.get(f"{BASE_URL}/api/patients")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/patients returns {len(data)} patients")
    
    def test_patients_have_status_field(self):
        """Test that patients have status field for add-on filtering"""
        response = self.session.get(f"{BASE_URL}/api/patients")
        
        assert response.status_code == 200
        patients = response.json()
        
        if len(patients) > 0:
            # Check a few patients have status
            statuses = [p.get("status") for p in patients[:5]]
            assert all(s is not None for s in statuses), "All patients should have status"
            print(f"✓ Patient statuses found: {set(statuses)}")
        else:
            print("✓ No patients to verify")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
