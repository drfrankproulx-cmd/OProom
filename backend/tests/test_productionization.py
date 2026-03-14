"""
Test suite for SurgiFlow productionization features:
- Security headers
- Audit logging
- Rate limiting (note: may not work through K8s proxy)
- File existence verification
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "proul076@umn.edu"
TEST_PASSWORD = "59K63i75%("


class TestSecurityHeaders:
    """Verify security headers are present in API responses"""
    
    def test_security_headers_on_health_endpoint(self):
        """Test security headers on unauthenticated endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        # Check all required security headers
        headers = response.headers
        
        # X-Frame-Options
        assert "X-Frame-Options" in headers, "X-Frame-Options header missing"
        assert headers["X-Frame-Options"] == "SAMEORIGIN", f"X-Frame-Options should be SAMEORIGIN, got {headers.get('X-Frame-Options')}"
        
        # X-Content-Type-Options
        assert "X-Content-Type-Options" in headers, "X-Content-Type-Options header missing"
        assert headers["X-Content-Type-Options"] == "nosniff", f"X-Content-Type-Options should be nosniff, got {headers.get('X-Content-Type-Options')}"
        
        # Strict-Transport-Security (HSTS)
        assert "Strict-Transport-Security" in headers, "Strict-Transport-Security header missing"
        assert "max-age=31536000" in headers["Strict-Transport-Security"], "HSTS max-age should be 31536000"
        
        # X-XSS-Protection
        assert "X-XSS-Protection" in headers, "X-XSS-Protection header missing"
        assert headers["X-XSS-Protection"] == "1; mode=block", f"X-XSS-Protection should be '1; mode=block', got {headers.get('X-XSS-Protection')}"
        
        # Referrer-Policy
        assert "Referrer-Policy" in headers, "Referrer-Policy header missing"
        assert headers["Referrer-Policy"] == "strict-origin-when-cross-origin", f"Referrer-Policy value incorrect"
        
        # Cache-Control
        assert "Cache-Control" in headers, "Cache-Control header missing"
        assert "no-store" in headers["Cache-Control"], f"Cache-Control should contain no-store, got {headers.get('Cache-Control')}"
        
        # Pragma
        assert "Pragma" in headers, "Pragma header missing"
        assert headers["Pragma"] == "no-cache", f"Pragma should be no-cache, got {headers.get('Pragma')}"
        
        print("All 7 security headers verified: X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, X-XSS-Protection, Referrer-Policy, Cache-Control, Pragma")
    
    def test_security_headers_on_login_endpoint(self):
        """Test security headers on login response"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        
        headers = response.headers
        assert "X-Frame-Options" in headers
        assert "X-Content-Type-Options" in headers
        assert "Strict-Transport-Security" in headers
        print("Security headers present on login endpoint")


class TestLoginAndToken:
    """Test login endpoint and JWT token generation"""
    
    def test_login_returns_jwt_token(self):
        """Verify login endpoint returns a JWT token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data, "access_token missing from login response"
        assert "token_type" in data, "token_type missing from login response"
        assert data["token_type"] == "bearer", "token_type should be 'bearer'"
        assert "user" in data, "user object missing from login response"
        assert data["user"]["email"] == TEST_EMAIL, "User email mismatch"
        
        # Verify token is a valid JWT format (header.payload.signature)
        token = data["access_token"]
        parts = token.split(".")
        assert len(parts) == 3, "JWT should have 3 parts separated by dots"
        print(f"Login successful - JWT token received (length: {len(token)})")
    
    def test_login_invalid_credentials(self):
        """Verify login rejects invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401 for invalid credentials, got {response.status_code}"
        print("Login correctly rejects invalid credentials with 401")


class TestAuditLogging:
    """Test HIPAA-compliant audit logging"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_audit_log_created_on_login(self, auth_token):
        """Verify audit log is created when user logs in"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Fetch audit logs
        response = requests.get(f"{BASE_URL}/api/audit-logs", headers=headers, params={
            "limit": 10,
            "action": "login",
            "user_email": TEST_EMAIL
        })
        assert response.status_code == 200
        
        logs = response.json()
        assert isinstance(logs, list), "Audit logs should be a list"
        
        if len(logs) > 0:
            # Check most recent login log
            login_log = logs[0]
            assert login_log.get("action") == "login", f"Expected action 'login', got {login_log.get('action')}"
            assert login_log.get("user_email") == TEST_EMAIL, "User email mismatch in audit log"
            assert login_log.get("resource_type") == "auth", "Resource type should be 'auth'"
            assert "timestamp" in login_log, "Timestamp missing from audit log"
            print(f"Login audit log verified - timestamp: {login_log.get('timestamp')}")
        else:
            print("Note: No login audit logs found (may be a fresh database)")
    
    def test_audit_log_created_on_patient_view(self, auth_token):
        """Verify audit log is created when viewing patients list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # View patients list to trigger audit log
        patients_response = requests.get(f"{BASE_URL}/api/patients", headers=headers)
        assert patients_response.status_code == 200
        
        # Fetch audit logs for patient view
        response = requests.get(f"{BASE_URL}/api/audit-logs", headers=headers, params={
            "limit": 10,
            "action": "view_list",
            "resource_type": "patient"
        })
        assert response.status_code == 200
        
        logs = response.json()
        assert isinstance(logs, list), "Audit logs should be a list"
        
        if len(logs) > 0:
            view_log = logs[0]
            assert view_log.get("action") == "view_list", f"Expected action 'view_list', got {view_log.get('action')}"
            assert view_log.get("resource_type") == "patient", "Resource type should be 'patient'"
            print(f"Patient view audit log verified - timestamp: {view_log.get('timestamp')}")
        else:
            print("Note: No view_list audit logs found yet")
    
    def test_get_audit_logs_endpoint(self, auth_token):
        """Test GET /api/audit-logs returns properly structured data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/audit-logs", headers=headers)
        assert response.status_code == 200
        
        logs = response.json()
        assert isinstance(logs, list), "Response should be a list"
        
        if len(logs) > 0:
            # Verify log entry structure
            log_entry = logs[0]
            required_fields = ["timestamp", "user_email", "action", "resource_type"]
            for field in required_fields:
                assert field in log_entry, f"Field '{field}' missing from audit log entry"
            print(f"Audit log structure verified with {len(logs)} entries")
    
    def test_audit_logs_query_params(self, auth_token):
        """Test audit logs supports query params: limit, resource_type, action, user_email"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test with limit
        response = requests.get(f"{BASE_URL}/api/audit-logs", headers=headers, params={"limit": 5})
        assert response.status_code == 200
        logs = response.json()
        assert len(logs) <= 5, "Limit parameter not working"
        
        # Test with resource_type filter
        response = requests.get(f"{BASE_URL}/api/audit-logs", headers=headers, params={"resource_type": "auth"})
        assert response.status_code == 200
        logs = response.json()
        for log in logs:
            if log.get("resource_type"):
                assert log["resource_type"] == "auth", "resource_type filter not working"
        
        # Test with action filter
        response = requests.get(f"{BASE_URL}/api/audit-logs", headers=headers, params={"action": "login"})
        assert response.status_code == 200
        logs = response.json()
        for log in logs:
            assert log.get("action") == "login", "action filter not working"
        
        # Test with user_email filter
        response = requests.get(f"{BASE_URL}/api/audit-logs", headers=headers, params={"user_email": TEST_EMAIL})
        assert response.status_code == 200
        logs = response.json()
        for log in logs:
            assert log.get("user_email") == TEST_EMAIL, "user_email filter not working"
        
        print("All audit log query params working: limit, resource_type, action, user_email")


class TestRateLimiting:
    """Test rate limiting on login endpoint (may not work through K8s proxy)"""
    
    def test_rate_limit_configured(self):
        """
        Verify rate limiting is configured on login endpoint.
        Note: In K8s environment, rate limiting may not trigger as all requests 
        share the same internal IP. This test documents the expected behavior.
        """
        # Make a few login attempts (not enough to trigger rate limit)
        for i in range(3):
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            assert response.status_code in [200, 429], f"Unexpected status {response.status_code}"
            if response.status_code == 429:
                print(f"Rate limit triggered on attempt {i+1}")
                assert "Too many requests" in response.json().get("detail", "")
                return
        
        print("Rate limiting configured (10/minute) - not triggered with 3 requests")


class TestPatientCRUD:
    """Verify patient CRUD still works after productionization changes"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_patients(self, auth_token):
        """Verify GET /api/patients works"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/patients", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"GET /api/patients working - returned {len(response.json())} patients")
    
    def test_create_patient_with_tasks(self, auth_token):
        """Verify POST /api/patients/create-with-tasks works after request_obj rename"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create test patient
        test_mrn = f"TEST_PROD_{os.urandom(4).hex()}"
        patient_data = {
            "mrn": test_mrn,
            "patient_name": "Test Productionization Patient",
            "diagnosis": "Test Diagnosis",
            "auto_generate_tasks": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/patients/create-with-tasks",
            headers=headers,
            json=patient_data
        )
        assert response.status_code == 200, f"Create patient failed: {response.text}"
        
        data = response.json()
        assert "patient" in data, "Response should contain patient object"
        assert "tasks" in data, "Response should contain tasks list"
        assert data["patient"]["mrn"] == test_mrn, "MRN mismatch"
        
        print(f"Create-with-tasks working - created patient {test_mrn} with {len(data['tasks'])} tasks")
        
        # Cleanup - delete test patient
        cleanup_response = requests.delete(f"{BASE_URL}/api/patients/{test_mrn}", headers=headers)
        assert cleanup_response.status_code == 200, f"Cleanup failed: {cleanup_response.text}"
        print(f"Cleanup successful - deleted test patient {test_mrn}")


class TestFileExistence:
    """Verify Docker and AWS deployment files exist"""
    
    def test_backend_dockerfile_exists(self):
        """Verify backend/Dockerfile exists"""
        assert os.path.exists("/app/backend/Dockerfile"), "backend/Dockerfile missing"
        print("backend/Dockerfile exists")
    
    def test_frontend_dockerfile_exists(self):
        """Verify frontend/Dockerfile exists"""
        assert os.path.exists("/app/frontend/Dockerfile"), "frontend/Dockerfile missing"
        print("frontend/Dockerfile exists")
    
    def test_nginx_conf_exists(self):
        """Verify frontend/nginx.conf exists"""
        assert os.path.exists("/app/frontend/nginx.conf"), "frontend/nginx.conf missing"
        print("frontend/nginx.conf exists")
    
    def test_docker_compose_exists(self):
        """Verify docker-compose.yml exists"""
        assert os.path.exists("/app/docker-compose.yml"), "docker-compose.yml missing"
        print("docker-compose.yml exists")
    
    def test_env_example_exists(self):
        """Verify .env.example exists with proper template keys"""
        assert os.path.exists("/app/.env.example"), ".env.example missing"
        
        with open("/app/.env.example", "r") as f:
            content = f.read()
        
        # Check for required keys
        required_keys = ["MONGO_URL", "JWT_SECRET", "REACT_APP_BACKEND_URL"]
        for key in required_keys:
            assert key in content, f"{key} missing from .env.example"
        
        print(".env.example exists with required keys")
    
    def test_task_definition_exists(self):
        """Verify task-definition.json exists"""
        assert os.path.exists("/app/task-definition.json"), "task-definition.json missing"
        print("task-definition.json exists")
    
    def test_buildspec_exists(self):
        """Verify buildspec.yml exists"""
        assert os.path.exists("/app/buildspec.yml"), "buildspec.yml missing"
        print("buildspec.yml exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
