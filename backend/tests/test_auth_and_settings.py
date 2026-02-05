"""
Backend API Tests for OR Scheduling Platform
Tests: Authentication, Residents, Attendings CRUD operations
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_USER_EMAIL = f"test_user_{int(time.time())}@hospital.com"
TEST_USER_PASSWORD = "TestPassword123"
TEST_USER_NAME = "Test User"


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test that health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


class TestAuthentication:
    """Authentication flow tests"""
    
    @pytest.fixture(scope="class")
    def registered_user(self):
        """Register a new user and return credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": TEST_USER_NAME,
            "role": "resident"
        })
        
        if response.status_code == 400:
            # User already exists, try login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            })
            if login_response.status_code == 200:
                return login_response.json()
            pytest.skip("Could not register or login test user")
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        return response.json()
    
    def test_register_new_user(self, registered_user):
        """Test user registration returns token and user data"""
        assert "access_token" in registered_user
        assert "user" in registered_user
        assert registered_user["user"]["email"] == TEST_USER_EMAIL
        assert registered_user["user"]["full_name"] == TEST_USER_NAME
        print(f"✓ User registration passed - email: {TEST_USER_EMAIL}")
    
    def test_login_with_valid_credentials(self):
        """Test login with valid credentials"""
        # First register
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": TEST_USER_NAME,
            "role": "resident"
        })
        
        # Then login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_USER_EMAIL
        print("✓ Login with valid credentials passed")
    
    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@hospital.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        print("✓ Login with invalid credentials correctly returns 401")
    
    def test_get_current_user_with_valid_token(self, registered_user):
        """Test /api/auth/me endpoint with valid token"""
        token = registered_user["access_token"]
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        })
        
        assert response.status_code == 200, f"Get current user failed: {response.text}"
        data = response.json()
        assert data["email"] == TEST_USER_EMAIL
        print("✓ Get current user with valid token passed")
    
    def test_get_current_user_with_invalid_token(self):
        """Test /api/auth/me endpoint with invalid token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": "Bearer invalid_token_here",
            "Content-Type": "application/json"
        })
        
        assert response.status_code == 401
        print("✓ Get current user with invalid token correctly returns 401")


class TestResidentsCRUD:
    """Residents CRUD operations tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        # Register or login
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": TEST_USER_NAME,
            "role": "resident"
        })
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip("Could not authenticate for resident tests")
        
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_resident(self, auth_headers):
        """Test creating a new resident"""
        resident_email = f"test_resident_{int(time.time())}@hospital.com"
        
        response = requests.post(f"{BASE_URL}/api/residents", 
            headers=auth_headers,
            json={
                "name": "Dr. Test Resident",
                "email": resident_email,
                "hospital": "Test Hospital",
                "specialty": "Orthopedics",
                "year": "PGY-2",
                "is_active": True
            }
        )
        
        assert response.status_code == 200, f"Create resident failed: {response.text}"
        data = response.json()
        assert data["name"] == "Dr. Test Resident"
        assert data["email"] == resident_email
        assert data["hospital"] == "Test Hospital"
        assert "_id" in data
        print(f"✓ Create resident passed - ID: {data['_id']}")
        return data
    
    def test_create_resident_without_auth(self):
        """Test creating resident without auth returns 401/403"""
        response = requests.post(f"{BASE_URL}/api/residents", 
            json={
                "name": "Dr. Unauthorized",
                "email": "unauthorized@hospital.com",
                "hospital": "Test Hospital"
            }
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Create resident without auth correctly returns 401/403")
    
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
    
    def test_create_resident_missing_required_fields(self, auth_headers):
        """Test creating resident with missing required fields"""
        response = requests.post(f"{BASE_URL}/api/residents", 
            headers=auth_headers,
            json={
                "name": "Dr. Incomplete"
                # Missing email and hospital
            }
        )
        
        assert response.status_code == 422, f"Expected 422 for missing fields, got {response.status_code}"
        print("✓ Create resident with missing fields correctly returns 422")


class TestAttendingsCRUD:
    """Attendings CRUD operations tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": TEST_USER_NAME,
            "role": "resident"
        })
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip("Could not authenticate for attending tests")
        
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_attending(self, auth_headers):
        """Test creating a new attending"""
        response = requests.post(f"{BASE_URL}/api/attendings", 
            headers=auth_headers,
            json={
                "name": "Dr. Test Attending",
                "email": f"test_attending_{int(time.time())}@hospital.com",
                "hospital": "Test Hospital",
                "specialty": "General Surgery",
                "is_active": True
            }
        )
        
        assert response.status_code == 200, f"Create attending failed: {response.text}"
        data = response.json()
        assert data["name"] == "Dr. Test Attending"
        assert data["hospital"] == "Test Hospital"
        assert "_id" in data
        print(f"✓ Create attending passed - ID: {data['_id']}")
        return data
    
    def test_create_attending_without_auth(self):
        """Test creating attending without auth returns 401/403"""
        response = requests.post(f"{BASE_URL}/api/attendings", 
            json={
                "name": "Dr. Unauthorized Attending",
                "hospital": "Test Hospital"
            }
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Create attending without auth correctly returns 401/403")
    
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


class TestTokenExpiration:
    """Token expiration and session handling tests"""
    
    def test_expired_token_returns_401(self):
        """Test that an expired/invalid token returns 401"""
        # Use a clearly invalid token
        response = requests.get(f"{BASE_URL}/api/residents", headers={
            "Authorization": "Bearer expired_or_invalid_token",
            "Content-Type": "application/json"
        })
        
        assert response.status_code == 401
        print("✓ Expired/invalid token correctly returns 401")
    
    def test_missing_token_returns_401_or_403(self):
        """Test that missing token returns 401 or 403"""
        response = requests.get(f"{BASE_URL}/api/residents")
        
        assert response.status_code in [401, 403]
        print("✓ Missing token correctly returns 401/403")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
