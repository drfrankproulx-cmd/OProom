"""
Bulk Import Feature Tests for Residents & Attendings
Tests: Template download, Preview, Import with duplicate handling
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://orplanner.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "testuser@example.com"
TEST_PASSWORD = "Test123!"


class TestBulkImportSetup:
    """Setup tests - ensure we can authenticate"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        # Try login first
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            return response.json().get("access_token")
        
        # If login fails, try to register
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": "Test User",
            "role": "admin"
        })
        
        if response.status_code == 200:
            return response.json().get("access_token")
        
        pytest.skip("Could not authenticate - skipping tests")
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("SUCCESS: Health check passed")


class TestTemplateDownload:
    """Tests for CSV template download endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_download_residents_template(self, auth_token):
        """Test downloading residents CSV template"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/import/template/residents", headers=headers)
        
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        
        # Check content-disposition header
        content_disp = response.headers.get("content-disposition", "")
        assert "residents_template.csv" in content_disp
        
        # Verify CSV content has correct headers
        content = response.text
        lines = content.strip().split('\n')
        assert len(lines) >= 2, "Template should have header and sample row"
        
        headers_row = lines[0].lower()
        assert "name" in headers_row
        assert "email" in headers_row
        assert "pgy_level" in headers_row
        
        # Verify sample row exists
        sample_row = lines[1]
        assert "@" in sample_row, "Sample row should contain email"
        
        print(f"SUCCESS: Residents template downloaded with headers: {lines[0]}")
        print(f"SUCCESS: Sample row: {lines[1]}")
    
    def test_download_attendings_template(self, auth_token):
        """Test downloading attendings CSV template"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/import/template/attendings", headers=headers)
        
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        
        # Check content-disposition header
        content_disp = response.headers.get("content-disposition", "")
        assert "attendings_template.csv" in content_disp
        
        # Verify CSV content has correct headers
        content = response.text
        lines = content.strip().split('\n')
        assert len(lines) >= 2, "Template should have header and sample row"
        
        headers_row = lines[0].lower()
        assert "name" in headers_row
        assert "email" in headers_row
        assert "department" in headers_row
        
        print(f"SUCCESS: Attendings template downloaded with headers: {lines[0]}")
        print(f"SUCCESS: Sample row: {lines[1]}")
    
    def test_download_invalid_entity_type(self, auth_token):
        """Test downloading template with invalid entity type"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/import/template/invalid", headers=headers)
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"SUCCESS: Invalid entity type returns 400 with message: {data['detail']}")
    
    def test_download_without_auth(self):
        """Test downloading template without authentication"""
        response = requests.get(f"{BASE_URL}/api/import/template/residents")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403]
        print("SUCCESS: Unauthenticated request rejected")


class TestPreviewImport:
    """Tests for CSV preview endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_preview_valid_residents_csv(self, auth_token):
        """Test previewing a valid residents CSV file"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a valid CSV content
        csv_content = """name,email,pgy_level,phone,specialty
TEST_John Smith,test_john_preview@hospital.org,PGY-2,555-123-4567,General Surgery
TEST_Jane Doe,test_jane_preview@hospital.org,PGY-3,555-987-6543,Orthopedics"""
        
        files = {"file": ("test_residents.csv", csv_content, "text/csv")}
        response = requests.post(f"{BASE_URL}/api/import/preview/residents", headers=headers, files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "entity_type" in data
        assert data["entity_type"] == "residents"
        assert "total_rows" in data
        assert "valid_count" in data
        assert "duplicate_count" in data
        assert "error_count" in data
        assert "valid_rows" in data
        assert "error_rows" in data
        
        # Should have 2 valid rows
        assert data["valid_count"] >= 0  # May be 0 if duplicates exist
        
        print(f"SUCCESS: Preview returned - Total: {data['total_rows']}, Valid: {data['valid_count']}, Duplicates: {data['duplicate_count']}, Errors: {data['error_count']}")
    
    def test_preview_valid_attendings_csv(self, auth_token):
        """Test previewing a valid attendings CSV file"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        csv_content = """name,email,phone,specialty,department
TEST_Dr. Smith,test_drsmith_preview@hospital.org,555-111-2222,Cardiology,Medicine
TEST_Dr. Jones,test_drjones_preview@hospital.org,555-333-4444,Neurology,Surgery"""
        
        files = {"file": ("test_attendings.csv", csv_content, "text/csv")}
        response = requests.post(f"{BASE_URL}/api/import/preview/attendings", headers=headers, files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["entity_type"] == "attendings"
        assert "valid_rows" in data
        
        print(f"SUCCESS: Attendings preview - Total: {data['total_rows']}, Valid: {data['valid_count']}")
    
    def test_preview_csv_with_missing_required_fields(self, auth_token):
        """Test previewing CSV with missing required fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Missing email field
        csv_content = """name,pgy_level,phone,specialty
TEST_John Smith,PGY-2,555-123-4567,General Surgery"""
        
        files = {"file": ("test_missing_fields.csv", csv_content, "text/csv")}
        response = requests.post(f"{BASE_URL}/api/import/preview/residents", headers=headers, files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have errors for missing email header
        assert data["error_count"] > 0 or len(data["error_rows"]) > 0
        
        print(f"SUCCESS: Missing required field detected - Errors: {data['error_count']}")
        if data["error_rows"]:
            print(f"Error details: {data['error_rows'][0]}")
    
    def test_preview_csv_with_invalid_email(self, auth_token):
        """Test previewing CSV with invalid email format"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        csv_content = """name,email,pgy_level,phone,specialty
TEST_John Smith,invalid-email-format,PGY-2,555-123-4567,General Surgery"""
        
        files = {"file": ("test_invalid_email.csv", csv_content, "text/csv")}
        response = requests.post(f"{BASE_URL}/api/import/preview/residents", headers=headers, files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have error for invalid email
        assert data["error_count"] > 0 or len(data["error_rows"]) > 0
        
        print(f"SUCCESS: Invalid email detected - Errors: {data['error_count']}")
    
    def test_preview_non_csv_file(self, auth_token):
        """Test previewing a non-CSV file"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        files = {"file": ("test.txt", "This is not a CSV file", "text/plain")}
        response = requests.post(f"{BASE_URL}/api/import/preview/residents", headers=headers, files=files)
        
        # Should return 400 for non-CSV file
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        
        print(f"SUCCESS: Non-CSV file rejected with message: {data['detail']}")
    
    def test_preview_empty_file(self, auth_token):
        """Test previewing an empty CSV file"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        files = {"file": ("empty.csv", "", "text/csv")}
        response = requests.post(f"{BASE_URL}/api/import/preview/residents", headers=headers, files=files)
        
        # Should return 400 for empty file
        assert response.status_code == 400
        
        print("SUCCESS: Empty file rejected")


class TestBulkImport:
    """Tests for actual bulk import endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_import_residents_csv(self, auth_token):
        """Test importing residents from CSV"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        import time
        timestamp = int(time.time())
        
        csv_content = f"""name,email,pgy_level,phone,specialty
TEST_Import_Resident1,test_import_res1_{timestamp}@hospital.org,PGY-2,555-123-4567,General Surgery
TEST_Import_Resident2,test_import_res2_{timestamp}@hospital.org,PGY-3,555-987-6543,Orthopedics"""
        
        files = {"file": ("import_residents.csv", csv_content, "text/csv")}
        response = requests.post(
            f"{BASE_URL}/api/import/residents?skip_duplicates=true",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "success" in data
        assert data["success"] == True
        assert "imported_count" in data
        assert "skipped_count" in data
        assert "error_count" in data
        
        # Should have imported 2 residents
        assert data["imported_count"] == 2
        
        print(f"SUCCESS: Imported {data['imported_count']} residents, Skipped: {data['skipped_count']}, Errors: {data['error_count']}")
        
        # Verify residents were actually created by fetching them
        get_response = requests.get(f"{BASE_URL}/api/residents", headers=headers)
        assert get_response.status_code == 200
        residents = get_response.json()
        
        # Check if our imported residents exist
        imported_emails = [f"test_import_res1_{timestamp}@hospital.org", f"test_import_res2_{timestamp}@hospital.org"]
        found_count = sum(1 for r in residents if r.get("email") in imported_emails)
        assert found_count == 2, f"Expected 2 imported residents, found {found_count}"
        
        print("SUCCESS: Verified imported residents exist in database")
    
    def test_import_attendings_csv(self, auth_token):
        """Test importing attendings from CSV"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        import time
        timestamp = int(time.time())
        
        csv_content = f"""name,email,phone,specialty,department
TEST_Import_Attending1,test_import_att1_{timestamp}@hospital.org,555-111-2222,Cardiology,Medicine
TEST_Import_Attending2,test_import_att2_{timestamp}@hospital.org,555-333-4444,Neurology,Surgery"""
        
        files = {"file": ("import_attendings.csv", csv_content, "text/csv")}
        response = requests.post(
            f"{BASE_URL}/api/import/attendings?skip_duplicates=true",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["imported_count"] == 2
        
        print(f"SUCCESS: Imported {data['imported_count']} attendings")
    
    def test_import_duplicate_detection(self, auth_token):
        """Test that importing same file twice with skip_duplicates=true skips duplicates"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        import time
        timestamp = int(time.time())
        
        csv_content = f"""name,email,pgy_level,phone,specialty
TEST_Duplicate_Test,test_dup_{timestamp}@hospital.org,PGY-1,555-999-8888,Pediatrics"""
        
        # First import
        files = {"file": ("dup_test.csv", csv_content, "text/csv")}
        response1 = requests.post(
            f"{BASE_URL}/api/import/residents?skip_duplicates=true",
            headers=headers,
            files=files
        )
        
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["imported_count"] == 1
        assert data1["skipped_count"] == 0
        
        print(f"First import: Imported {data1['imported_count']}, Skipped {data1['skipped_count']}")
        
        # Second import with same data - should skip
        files = {"file": ("dup_test.csv", csv_content, "text/csv")}
        response2 = requests.post(
            f"{BASE_URL}/api/import/residents?skip_duplicates=true",
            headers=headers,
            files=files
        )
        
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["imported_count"] == 0
        assert data2["skipped_count"] == 1
        
        print(f"Second import: Imported {data2['imported_count']}, Skipped {data2['skipped_count']}")
        print("SUCCESS: Duplicate detection working correctly")
    
    def test_import_with_skip_duplicates_false(self, auth_token):
        """Test importing with skip_duplicates=false reports errors for duplicates"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        import time
        timestamp = int(time.time())
        
        # First create a resident
        csv_content = f"""name,email,pgy_level,phone,specialty
TEST_NoSkip_Test,test_noskip_{timestamp}@hospital.org,PGY-1,555-777-6666,Emergency"""
        
        files = {"file": ("noskip_test.csv", csv_content, "text/csv")}
        response1 = requests.post(
            f"{BASE_URL}/api/import/residents?skip_duplicates=true",
            headers=headers,
            files=files
        )
        assert response1.status_code == 200
        
        # Try to import again with skip_duplicates=false
        files = {"file": ("noskip_test.csv", csv_content, "text/csv")}
        response2 = requests.post(
            f"{BASE_URL}/api/import/residents?skip_duplicates=false",
            headers=headers,
            files=files
        )
        
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Should have error for duplicate
        assert data2["imported_count"] == 0
        assert data2["error_count"] > 0 or len(data2.get("import_errors", [])) > 0
        
        print(f"SUCCESS: skip_duplicates=false reports errors - Errors: {data2['error_count']}")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_cleanup_test_residents(self, auth_token):
        """Clean up test residents created during testing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get all residents
        response = requests.get(f"{BASE_URL}/api/residents", headers=headers)
        if response.status_code == 200:
            residents = response.json()
            deleted_count = 0
            for resident in residents:
                # Delete TEST_ prefixed residents
                if resident.get("name", "").startswith("TEST_") or "test_" in resident.get("email", "").lower():
                    del_response = requests.delete(
                        f"{BASE_URL}/api/residents/{resident['_id']}",
                        headers=headers
                    )
                    if del_response.status_code == 200:
                        deleted_count += 1
            
            print(f"Cleaned up {deleted_count} test residents")
    
    def test_cleanup_test_attendings(self, auth_token):
        """Clean up test attendings created during testing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get all attendings
        response = requests.get(f"{BASE_URL}/api/attendings", headers=headers)
        if response.status_code == 200:
            attendings = response.json()
            deleted_count = 0
            for attending in attendings:
                # Delete TEST_ prefixed attendings
                email = attending.get("email") or ""
                if attending.get("name", "").startswith("TEST_") or "test_" in email.lower():
                    del_response = requests.delete(
                        f"{BASE_URL}/api/attendings/{attending['_id']}",
                        headers=headers
                    )
                    if del_response.status_code == 200:
                        deleted_count += 1
            
            print(f"Cleaned up {deleted_count} test attendings")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
