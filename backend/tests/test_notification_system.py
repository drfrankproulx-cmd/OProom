"""
Test suite for Notification System APIs
Tests: GET /api/notifications/summary, GET /api/notifications, 
       GET /api/notifications/preferences, PUT /api/notifications/preferences,
       PATCH /api/notifications/{id}/read, PATCH /api/notifications/mark-all-read,
       POST /api/notifications/dismiss/{id}, POST /api/notifications/generate-task-notifications
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "proul076@umn.edu"
TEST_PASSWORD = "59K63i75%("


class TestNotificationSystem:
    """Notification System API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - authenticate before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    # ============ GET /api/notifications/summary ============
    def test_get_notification_summary_success(self):
        """Test GET /api/notifications/summary returns correct structure"""
        response = self.session.get(f"{BASE_URL}/api/notifications/summary")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify response structure
        assert "unread_count" in data, "Missing unread_count field"
        assert "overdue_tasks" in data, "Missing overdue_tasks field"
        assert "due_today_tasks" in data, "Missing due_today_tasks field"
        assert "due_soon_tasks" in data, "Missing due_soon_tasks field"
        assert "total_action_items" in data, "Missing total_action_items field"
        
        # Verify data types
        assert isinstance(data["unread_count"], int), "unread_count should be int"
        assert isinstance(data["overdue_tasks"], int), "overdue_tasks should be int"
        assert isinstance(data["due_today_tasks"], int), "due_today_tasks should be int"
        assert isinstance(data["due_soon_tasks"], int), "due_soon_tasks should be int"
        assert isinstance(data["total_action_items"], int), "total_action_items should be int"
        
        # Verify total_action_items calculation
        expected_total = data["overdue_tasks"] + data["due_today_tasks"] + data["due_soon_tasks"]
        assert data["total_action_items"] == expected_total, "total_action_items calculation incorrect"
        
        print(f"✓ Notification summary: unread={data['unread_count']}, overdue={data['overdue_tasks']}, due_today={data['due_today_tasks']}, due_soon={data['due_soon_tasks']}")
    
    # ============ GET /api/notifications ============
    def test_get_notifications_success(self):
        """Test GET /api/notifications returns list of notifications"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are notifications, verify structure
        if len(data) > 0:
            notification = data[0]
            assert "_id" in notification, "Missing _id field"
            assert "type" in notification, "Missing type field"
            assert "title" in notification, "Missing title field"
            assert "message" in notification, "Missing message field"
            assert "read" in notification, "Missing read field"
            print(f"✓ Found {len(data)} notifications, first: {notification.get('title', 'N/A')[:50]}")
        else:
            print("✓ No notifications found (empty list)")
    
    # ============ GET /api/notifications/unread ============
    def test_get_unread_notifications_success(self):
        """Test GET /api/notifications/unread returns only unread notifications"""
        response = self.session.get(f"{BASE_URL}/api/notifications/unread")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify all returned notifications are unread
        for notification in data:
            assert notification.get("read") == False, f"Found read notification in unread list: {notification.get('_id')}"
        
        print(f"✓ Found {len(data)} unread notifications")
    
    # ============ GET /api/notifications/preferences ============
    def test_get_notification_preferences_success(self):
        """Test GET /api/notifications/preferences returns preferences"""
        response = self.session.get(f"{BASE_URL}/api/notifications/preferences")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify required fields exist
        required_fields = [
            "in_app_enabled", "email_digest_enabled", "email_digest_day",
            "push_enabled", "notify_task_due_today", "notify_task_due_soon",
            "notify_task_overdue", "notify_task_assigned", "notify_case_scheduled"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify boolean fields
        boolean_fields = [
            "in_app_enabled", "email_digest_enabled", "push_enabled",
            "notify_task_due_today", "notify_task_due_soon", "notify_task_overdue",
            "notify_task_assigned", "notify_case_scheduled"
        ]
        
        for field in boolean_fields:
            assert isinstance(data[field], bool), f"{field} should be boolean"
        
        print(f"✓ Preferences: in_app={data['in_app_enabled']}, push={data['push_enabled']}, email_digest={data['email_digest_enabled']}")
    
    # ============ PUT /api/notifications/preferences ============
    def test_update_notification_preferences_success(self):
        """Test PUT /api/notifications/preferences updates preferences"""
        # First get current preferences
        get_response = self.session.get(f"{BASE_URL}/api/notifications/preferences")
        assert get_response.status_code == 200
        original_prefs = get_response.json()
        
        # Update preferences
        new_prefs = {
            "user_email": TEST_EMAIL,
            "in_app_enabled": True,
            "email_digest_enabled": False,  # Toggle this
            "email_digest_day": "friday",
            "push_enabled": True,
            "notify_task_due_today": True,
            "notify_task_due_soon": True,
            "notify_task_overdue": True,
            "notify_task_assigned": True,
            "notify_case_scheduled": True
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/notifications/preferences", json=new_prefs)
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        # Verify update was persisted
        verify_response = self.session.get(f"{BASE_URL}/api/notifications/preferences")
        assert verify_response.status_code == 200
        
        updated_prefs = verify_response.json()
        assert updated_prefs["email_digest_enabled"] == False, "email_digest_enabled not updated"
        assert updated_prefs["email_digest_day"] == "friday", "email_digest_day not updated"
        
        # Restore original preferences
        restore_prefs = {
            "user_email": TEST_EMAIL,
            "in_app_enabled": original_prefs.get("in_app_enabled", True),
            "email_digest_enabled": original_prefs.get("email_digest_enabled", True),
            "email_digest_day": original_prefs.get("email_digest_day", "monday"),
            "push_enabled": original_prefs.get("push_enabled", True),
            "notify_task_due_today": original_prefs.get("notify_task_due_today", True),
            "notify_task_due_soon": original_prefs.get("notify_task_due_soon", True),
            "notify_task_overdue": original_prefs.get("notify_task_overdue", True),
            "notify_task_assigned": original_prefs.get("notify_task_assigned", True),
            "notify_case_scheduled": original_prefs.get("notify_case_scheduled", True)
        }
        self.session.put(f"{BASE_URL}/api/notifications/preferences", json=restore_prefs)
        
        print("✓ Preferences updated and verified successfully")
    
    # ============ POST /api/notifications/generate-task-notifications ============
    def test_generate_task_notifications_success(self):
        """Test POST /api/notifications/generate-task-notifications generates notifications"""
        response = self.session.post(f"{BASE_URL}/api/notifications/generate-task-notifications")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data, "Missing message field"
        assert "Generated" in data["message"], "Unexpected message format"
        
        print(f"✓ {data['message']}")
    
    # ============ PATCH /api/notifications/mark-all-read ============
    def test_mark_all_notifications_read_success(self):
        """Test PATCH /api/notifications/mark-all-read marks all as read"""
        response = self.session.patch(f"{BASE_URL}/api/notifications/mark-all-read")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data, "Missing message field"
        
        # Verify all notifications are now read
        verify_response = self.session.get(f"{BASE_URL}/api/notifications/unread")
        assert verify_response.status_code == 200
        
        unread = verify_response.json()
        assert len(unread) == 0, f"Expected 0 unread notifications, found {len(unread)}"
        
        print(f"✓ {data['message']}")
    
    # ============ Test notification CRUD flow ============
    def test_notification_read_and_dismiss_flow(self):
        """Test marking notification as read and dismissing it"""
        # First generate notifications to ensure we have some
        self.session.post(f"{BASE_URL}/api/notifications/generate-task-notifications")
        
        # Get notifications
        get_response = self.session.get(f"{BASE_URL}/api/notifications")
        assert get_response.status_code == 200
        
        notifications = get_response.json()
        
        if len(notifications) == 0:
            # Create a test task to generate a notification
            task_data = {
                "patient_mrn": "TEST_NOTIF_001",
                "task_description": "TEST notification task",
                "urgency": "high",
                "assigned_to": "Test User",
                "assigned_to_email": TEST_EMAIL,
                "due_date": datetime.now().strftime("%Y-%m-%d"),
                "status": "pending",
                "completed": False
            }
            self.session.post(f"{BASE_URL}/api/tasks", json=task_data)
            
            # Generate notifications again
            self.session.post(f"{BASE_URL}/api/notifications/generate-task-notifications")
            
            # Get notifications again
            get_response = self.session.get(f"{BASE_URL}/api/notifications")
            notifications = get_response.json()
        
        if len(notifications) > 0:
            notification_id = notifications[0]["_id"]
            
            # Mark as read
            read_response = self.session.patch(f"{BASE_URL}/api/notifications/{notification_id}/read")
            assert read_response.status_code == 200, f"Mark as read failed: {read_response.status_code}"
            
            # Dismiss notification
            dismiss_response = self.session.post(f"{BASE_URL}/api/notifications/dismiss/{notification_id}")
            assert dismiss_response.status_code == 200, f"Dismiss failed: {dismiss_response.status_code}"
            
            print(f"✓ Notification {notification_id} marked as read and dismissed")
        else:
            print("✓ No notifications to test read/dismiss flow (skipped)")
    
    # ============ Test unauthorized access ============
    def test_notifications_unauthorized(self):
        """Test that notifications endpoints require authentication"""
        # Create a new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        # Test summary endpoint
        response = unauth_session.get(f"{BASE_URL}/api/notifications/summary")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        # Test notifications list endpoint
        response = unauth_session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        # Test preferences endpoint
        response = unauth_session.get(f"{BASE_URL}/api/notifications/preferences")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print("✓ Unauthorized access correctly rejected")


class TestNotificationPreferencesValidation:
    """Test notification preferences validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - authenticate before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_preferences_toggle_in_app(self):
        """Test toggling in_app_enabled preference"""
        # Get current
        get_response = self.session.get(f"{BASE_URL}/api/notifications/preferences")
        original = get_response.json()
        
        # Toggle in_app_enabled
        new_value = not original.get("in_app_enabled", True)
        update_prefs = {
            "user_email": TEST_EMAIL,
            "in_app_enabled": new_value,
            "email_digest_enabled": original.get("email_digest_enabled", True),
            "email_digest_day": original.get("email_digest_day", "monday"),
            "push_enabled": original.get("push_enabled", True),
            "notify_task_due_today": original.get("notify_task_due_today", True),
            "notify_task_due_soon": original.get("notify_task_due_soon", True),
            "notify_task_overdue": original.get("notify_task_overdue", True),
            "notify_task_assigned": original.get("notify_task_assigned", True),
            "notify_case_scheduled": original.get("notify_case_scheduled", True)
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/notifications/preferences", json=update_prefs)
        assert update_response.status_code == 200
        
        # Verify
        verify_response = self.session.get(f"{BASE_URL}/api/notifications/preferences")
        verified = verify_response.json()
        assert verified["in_app_enabled"] == new_value
        
        # Restore
        update_prefs["in_app_enabled"] = original.get("in_app_enabled", True)
        self.session.put(f"{BASE_URL}/api/notifications/preferences", json=update_prefs)
        
        print(f"✓ in_app_enabled toggled to {new_value} and restored")
    
    def test_preferences_toggle_notification_types(self):
        """Test toggling individual notification type preferences"""
        # Get current
        get_response = self.session.get(f"{BASE_URL}/api/notifications/preferences")
        original = get_response.json()
        
        # Toggle notify_task_overdue
        new_value = not original.get("notify_task_overdue", True)
        update_prefs = {
            "user_email": TEST_EMAIL,
            "in_app_enabled": original.get("in_app_enabled", True),
            "email_digest_enabled": original.get("email_digest_enabled", True),
            "email_digest_day": original.get("email_digest_day", "monday"),
            "push_enabled": original.get("push_enabled", True),
            "notify_task_due_today": original.get("notify_task_due_today", True),
            "notify_task_due_soon": original.get("notify_task_due_soon", True),
            "notify_task_overdue": new_value,  # Toggle this
            "notify_task_assigned": original.get("notify_task_assigned", True),
            "notify_case_scheduled": original.get("notify_case_scheduled", True)
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/notifications/preferences", json=update_prefs)
        assert update_response.status_code == 200
        
        # Verify
        verify_response = self.session.get(f"{BASE_URL}/api/notifications/preferences")
        verified = verify_response.json()
        assert verified["notify_task_overdue"] == new_value
        
        # Restore
        update_prefs["notify_task_overdue"] = original.get("notify_task_overdue", True)
        self.session.put(f"{BASE_URL}/api/notifications/preferences", json=update_prefs)
        
        print(f"✓ notify_task_overdue toggled to {new_value} and restored")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
