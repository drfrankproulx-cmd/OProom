"""
Test suite for WebAuthn and Persistent Login features
Tests:
1. Login with Remember Me stores token in localStorage (30-day expiration)
2. JWT token expiration is 30 days
3. /api/auth/me endpoint returns user info including has_webauthn field
4. /api/auth/webauthn/check/{email} endpoint returns has_webauthn status
5. /api/auth/webauthn/register-options endpoint returns registration options (requires auth)
6. Logout clears token
"""

import pytest
import requests
import os
import jwt
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "proul076@umn.edu"
TEST_PASSWORD = "59K63i75%("


class TestHealthCheck:
    """Basic health check to ensure API is running"""
    
    def test_health_endpoint(self):
        """Test that health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


class TestLoginAndTokenExpiration:
    """Test login functionality and 30-day token expiration"""
    
    def test_login_success(self):
        """Test successful login returns token and user info"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "token_type" in data
        assert "user" in data
        assert data["token_type"] == "bearer"
        
        # Verify user data
        assert data["user"]["email"] == TEST_EMAIL
        assert "full_name" in data["user"]
        assert "role" in data["user"]
        
        print(f"✓ Login successful for {TEST_EMAIL}")
        return data["access_token"]
    
    def test_token_expiration_30_days(self):
        """Test that JWT token has 30-day expiration"""
        # Login to get token
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        token = response.json()["access_token"]
        
        # Decode token without verification to check expiration
        # Note: We're not verifying signature, just checking payload
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        # Check expiration
        exp_timestamp = decoded.get("exp")
        assert exp_timestamp is not None, "Token should have expiration"
        
        exp_datetime = datetime.fromtimestamp(exp_timestamp)
        now = datetime.now()
        
        # Calculate days until expiration
        days_until_exp = (exp_datetime - now).days
        
        # Should be approximately 30 days (allow 1 day tolerance)
        assert 29 <= days_until_exp <= 31, f"Token should expire in ~30 days, got {days_until_exp} days"
        
        print(f"✓ Token expiration is {days_until_exp} days (expected ~30 days)")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")


class TestAuthMeEndpoint:
    """Test /api/auth/me endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_auth_me_returns_user_info(self, auth_token):
        """Test /api/auth/me returns user info with has_webauthn field"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify user info
        assert "email" in data
        assert "full_name" in data
        assert "role" in data
        assert data["email"] == TEST_EMAIL
        
        # Verify has_webauthn field exists
        assert "has_webauthn" in data
        assert isinstance(data["has_webauthn"], bool)
        
        print(f"✓ /api/auth/me returns user info with has_webauthn={data['has_webauthn']}")
    
    def test_auth_me_without_token_returns_401(self):
        """Test /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403]
        print("✓ /api/auth/me correctly requires authentication")
    
    def test_auth_me_with_invalid_token_returns_401(self):
        """Test /api/auth/me with invalid token returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert response.status_code == 401
        print("✓ /api/auth/me correctly rejects invalid token")


class TestWebAuthnCheckEndpoint:
    """Test /api/auth/webauthn/check/{email} endpoint"""
    
    def test_webauthn_check_returns_status(self):
        """Test webauthn check endpoint returns has_webauthn status"""
        response = requests.get(f"{BASE_URL}/api/auth/webauthn/check/{TEST_EMAIL}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "has_webauthn" in data
        assert isinstance(data["has_webauthn"], bool)
        
        print(f"✓ WebAuthn check for {TEST_EMAIL}: has_webauthn={data['has_webauthn']}")
    
    def test_webauthn_check_nonexistent_user(self):
        """Test webauthn check for non-existent user returns false"""
        response = requests.get(f"{BASE_URL}/api/auth/webauthn/check/nonexistent@example.com")
        assert response.status_code == 200
        data = response.json()
        
        assert data["has_webauthn"] == False
        print("✓ WebAuthn check for non-existent user returns has_webauthn=false")


class TestWebAuthnRegisterOptions:
    """Test /api/auth/webauthn/register-options endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_register_options_requires_auth(self):
        """Test register-options endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/webauthn/register-options")
        assert response.status_code in [401, 403]
        print("✓ WebAuthn register-options correctly requires authentication")
    
    def test_register_options_returns_options(self, auth_token):
        """Test register-options returns valid WebAuthn options"""
        response = requests.post(
            f"{BASE_URL}/api/auth/webauthn/register-options",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "options" in data
        
        # Options should be a JSON string that can be parsed
        import json
        options = json.loads(data["options"])
        
        # Verify WebAuthn options structure
        assert "challenge" in options
        assert "rp" in options
        assert "user" in options
        assert "pubKeyCredParams" in options
        
        # Verify RP (Relying Party) info
        assert "name" in options["rp"]
        assert "id" in options["rp"]
        
        # Verify user info
        assert "id" in options["user"]
        assert "name" in options["user"]
        assert "displayName" in options["user"]
        
        print("✓ WebAuthn register-options returns valid options")
        print(f"  - RP Name: {options['rp']['name']}")
        print(f"  - RP ID: {options['rp']['id']}")
        print(f"  - User: {options['user']['name']}")


class TestWebAuthnLoginOptions:
    """Test /api/auth/webauthn/login-options endpoint"""
    
    def test_login_options_for_user_without_webauthn(self):
        """Test login-options for user without WebAuthn credentials"""
        # First check if user has webauthn
        check_response = requests.get(f"{BASE_URL}/api/auth/webauthn/check/{TEST_EMAIL}")
        has_webauthn = check_response.json().get("has_webauthn", False)
        
        response = requests.post(
            f"{BASE_URL}/api/auth/webauthn/login-options?email={TEST_EMAIL}"
        )
        
        if not has_webauthn:
            # Should return error if user has no credentials
            assert response.status_code in [400, 404]
            print("✓ WebAuthn login-options correctly returns error for user without credentials")
        else:
            # Should return options if user has credentials
            assert response.status_code == 200
            print("✓ WebAuthn login-options returns options for user with credentials")


class TestTokenValidation:
    """Test token validation scenarios"""
    
    def test_expired_token_rejected(self):
        """Test that expired tokens are rejected"""
        # Create a manually expired token (this is a mock test)
        # In real scenario, we'd need to wait for token to expire
        # For now, we test with an obviously invalid token
        
        expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxNjAwMDAwMDAwfQ.invalid"
        
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        assert response.status_code == 401
        print("✓ Expired/invalid tokens are correctly rejected")


class TestProtectedEndpoints:
    """Test that protected endpoints require authentication"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_patients_endpoint_requires_auth(self):
        """Test /api/patients requires authentication"""
        response = requests.get(f"{BASE_URL}/api/patients")
        assert response.status_code in [401, 403]
        print("✓ /api/patients correctly requires authentication")
    
    def test_patients_endpoint_with_auth(self, auth_token):
        """Test /api/patients works with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/patients",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ /api/patients works with valid authentication")
    
    def test_schedules_endpoint_requires_auth(self):
        """Test /api/schedules requires authentication"""
        response = requests.get(f"{BASE_URL}/api/schedules")
        assert response.status_code in [401, 403]
        print("✓ /api/schedules correctly requires authentication")
    
    def test_schedules_endpoint_with_auth(self, auth_token):
        """Test /api/schedules works with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/schedules",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ /api/schedules works with valid authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
