"""
Test suite for Patient Appointment Dates feature
Tests the PATCH /api/patients/{mrn}/appointment-dates endpoint
- last_clinic_appointment field
- records_appointment field (VSP)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "proul076@umn.edu"
TEST_PASSWORD = "59K63i75%("

# Test patient MRNs
ANDREW_BURTON_MRN = "6011054"
FRIEDDERICH_WILL_MRN = "602343"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    # Note: auth token key is 'access_token' not 'token'
    return data.get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestAppointmentDatesEndpoint:
    """Tests for PATCH /api/patients/{mrn}/appointment-dates endpoint"""
    
    def test_get_patient_andrew_burton_has_dates(self, auth_headers):
        """Verify Andrew Burton (MRN: 6011054) has appointment dates set"""
        response = requests.get(
            f"{BASE_URL}/api/patients/{ANDREW_BURTON_MRN}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get patient: {response.text}"
        patient = response.json()
        
        # Verify patient exists and has the expected fields
        assert patient["mrn"] == ANDREW_BURTON_MRN
        assert patient["patient_name"] == "Andrew Burton"
        
        # Check appointment date fields exist
        assert "last_clinic_appointment" in patient, "last_clinic_appointment field missing"
        assert "records_appointment" in patient, "records_appointment field missing"
        
        # Verify dates are set (from previous API test)
        assert patient["last_clinic_appointment"] == "2026-04-01", f"Expected 2026-04-01, got {patient['last_clinic_appointment']}"
        assert patient["records_appointment"] == "2026-04-05", f"Expected 2026-04-05, got {patient['records_appointment']}"
        print(f"✓ Andrew Burton has dates: last_clinic={patient['last_clinic_appointment']}, records={patient['records_appointment']}")
    
    def test_update_last_clinic_appointment(self, auth_headers):
        """Test updating last_clinic_appointment for Andrew Burton"""
        new_date = "2026-04-10"
        response = requests.patch(
            f"{BASE_URL}/api/patients/{ANDREW_BURTON_MRN}/appointment-dates",
            headers=auth_headers,
            json={"last_clinic_appointment": new_date}
        )
        assert response.status_code == 200, f"Failed to update: {response.text}"
        result = response.json()
        
        # Verify response
        assert "message" in result
        assert "updates" in result
        assert result["updates"].get("last_clinic_appointment") == new_date
        print(f"✓ Updated last_clinic_appointment to {new_date}")
        
        # Verify persistence with GET
        get_response = requests.get(
            f"{BASE_URL}/api/patients/{ANDREW_BURTON_MRN}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        patient = get_response.json()
        assert patient["last_clinic_appointment"] == new_date, "Date not persisted"
        print(f"✓ Verified persistence: last_clinic_appointment = {new_date}")
    
    def test_update_records_appointment(self, auth_headers):
        """Test updating records_appointment for Andrew Burton"""
        new_date = "2026-04-15"
        response = requests.patch(
            f"{BASE_URL}/api/patients/{ANDREW_BURTON_MRN}/appointment-dates",
            headers=auth_headers,
            json={"records_appointment": new_date}
        )
        assert response.status_code == 200, f"Failed to update: {response.text}"
        result = response.json()
        
        # Verify response
        assert "message" in result
        assert "updates" in result
        assert result["updates"].get("records_appointment") == new_date
        print(f"✓ Updated records_appointment to {new_date}")
        
        # Verify persistence with GET
        get_response = requests.get(
            f"{BASE_URL}/api/patients/{ANDREW_BURTON_MRN}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        patient = get_response.json()
        assert patient["records_appointment"] == new_date, "Date not persisted"
        print(f"✓ Verified persistence: records_appointment = {new_date}")
    
    def test_update_both_dates_at_once(self, auth_headers):
        """Test updating both dates in a single request"""
        new_last_clinic = "2026-04-01"
        new_records = "2026-04-05"
        
        response = requests.patch(
            f"{BASE_URL}/api/patients/{ANDREW_BURTON_MRN}/appointment-dates",
            headers=auth_headers,
            json={
                "last_clinic_appointment": new_last_clinic,
                "records_appointment": new_records
            }
        )
        assert response.status_code == 200, f"Failed to update: {response.text}"
        result = response.json()
        
        # Verify response
        assert result["updates"].get("last_clinic_appointment") == new_last_clinic
        assert result["updates"].get("records_appointment") == new_records
        print(f"✓ Updated both dates: last_clinic={new_last_clinic}, records={new_records}")
        
        # Verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/patients/{ANDREW_BURTON_MRN}",
            headers=auth_headers
        )
        patient = get_response.json()
        assert patient["last_clinic_appointment"] == new_last_clinic
        assert patient["records_appointment"] == new_records
        print("✓ Both dates persisted correctly")
    
    def test_set_dates_for_friedderich_will(self, auth_headers):
        """Test setting dates for Friedderich Will (MRN: 602343) who has no dates yet"""
        new_last_clinic = "2026-05-01"
        new_records = "2026-05-10"
        
        response = requests.patch(
            f"{BASE_URL}/api/patients/{FRIEDDERICH_WILL_MRN}/appointment-dates",
            headers=auth_headers,
            json={
                "last_clinic_appointment": new_last_clinic,
                "records_appointment": new_records
            }
        )
        assert response.status_code == 200, f"Failed to update: {response.text}"
        result = response.json()
        
        # Verify response
        assert "message" in result
        print(f"✓ Set dates for Friedderich Will: last_clinic={new_last_clinic}, records={new_records}")
        
        # Verify persistence
        get_response = requests.get(
            f"{BASE_URL}/api/patients/{FRIEDDERICH_WILL_MRN}",
            headers=auth_headers
        )
        patient = get_response.json()
        assert patient["last_clinic_appointment"] == new_last_clinic
        assert patient["records_appointment"] == new_records
        print("✓ Dates persisted for Friedderich Will")
    
    def test_clear_date_with_null(self, auth_headers):
        """Test clearing a date by setting it to null/empty"""
        # First set a date
        response = requests.patch(
            f"{BASE_URL}/api/patients/{FRIEDDERICH_WILL_MRN}/appointment-dates",
            headers=auth_headers,
            json={"last_clinic_appointment": "2026-06-01"}
        )
        assert response.status_code == 200
        
        # Now clear it
        response = requests.patch(
            f"{BASE_URL}/api/patients/{FRIEDDERICH_WILL_MRN}/appointment-dates",
            headers=auth_headers,
            json={"last_clinic_appointment": None}
        )
        assert response.status_code == 200, f"Failed to clear date: {response.text}"
        
        # Verify it's cleared
        get_response = requests.get(
            f"{BASE_URL}/api/patients/{FRIEDDERICH_WILL_MRN}",
            headers=auth_headers
        )
        patient = get_response.json()
        assert patient["last_clinic_appointment"] is None or patient["last_clinic_appointment"] == ""
        print("✓ Date cleared successfully")
    
    def test_activity_log_records_date_changes(self, auth_headers):
        """Verify activity log records date changes"""
        # Update a date
        response = requests.patch(
            f"{BASE_URL}/api/patients/{ANDREW_BURTON_MRN}/appointment-dates",
            headers=auth_headers,
            json={"last_clinic_appointment": "2026-04-20"}
        )
        assert response.status_code == 200
        
        # Get patient and check activity log
        get_response = requests.get(
            f"{BASE_URL}/api/patients/{ANDREW_BURTON_MRN}",
            headers=auth_headers
        )
        patient = get_response.json()
        
        # Check activity log has the update
        activity_log = patient.get("activity_log", [])
        assert len(activity_log) > 0, "Activity log is empty"
        
        # Find the most recent update entry
        recent_logs = [log for log in activity_log if "Last Clinic Appt" in log.get("details", "")]
        assert len(recent_logs) > 0, "No activity log entry for date change"
        print(f"✓ Activity log recorded date change: {recent_logs[-1]['details']}")
        
        # Restore original date
        requests.patch(
            f"{BASE_URL}/api/patients/{ANDREW_BURTON_MRN}/appointment-dates",
            headers=auth_headers,
            json={"last_clinic_appointment": "2026-04-01"}
        )
    
    def test_invalid_patient_mrn_returns_404(self, auth_headers):
        """Test that invalid MRN returns 404"""
        response = requests.patch(
            f"{BASE_URL}/api/patients/INVALID_MRN_12345/appointment-dates",
            headers=auth_headers,
            json={"last_clinic_appointment": "2026-01-01"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid MRN returns 404 as expected")
    
    def test_no_changes_returns_no_changes_message(self, auth_headers):
        """Test that sending same values returns 'No changes' message"""
        # First get current values
        get_response = requests.get(
            f"{BASE_URL}/api/patients/{ANDREW_BURTON_MRN}",
            headers=auth_headers
        )
        patient = get_response.json()
        current_date = patient.get("last_clinic_appointment")
        
        # Send same value
        response = requests.patch(
            f"{BASE_URL}/api/patients/{ANDREW_BURTON_MRN}/appointment-dates",
            headers=auth_headers,
            json={"last_clinic_appointment": current_date}
        )
        assert response.status_code == 200
        result = response.json()
        assert result.get("message") == "No changes", f"Expected 'No changes', got {result}"
        print("✓ No changes message returned when values unchanged")


class TestPatientWithTasksEndpoint:
    """Test that /api/patients/with-tasks returns appointment date fields"""
    
    def test_patients_with_tasks_includes_date_fields(self, auth_headers):
        """Verify /api/patients/with-tasks includes appointment date fields"""
        response = requests.get(
            f"{BASE_URL}/api/patients/with-tasks",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get patients: {response.text}"
        patients = response.json()
        
        # Find Andrew Burton
        andrew = next((p for p in patients if p["mrn"] == ANDREW_BURTON_MRN), None)
        assert andrew is not None, "Andrew Burton not found in patients list"
        
        # Verify date fields are present
        assert "last_clinic_appointment" in andrew, "last_clinic_appointment missing from with-tasks response"
        assert "records_appointment" in andrew, "records_appointment missing from with-tasks response"
        print(f"✓ /api/patients/with-tasks includes date fields: last_clinic={andrew['last_clinic_appointment']}, records={andrew['records_appointment']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
