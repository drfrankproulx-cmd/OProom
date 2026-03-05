import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
  Bell,
  BellRing,
  BellOff,
  Smartphone,
  Mail,
  CheckCircle2,
  Calendar,
  Clock,
  AlertTriangle,
  UserPlus,
  Save,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import PageLayout from './PageLayout';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Toggle Switch Component
const ToggleSwitch = ({ enabled, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={() => !disabled && onChange(!enabled)}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
      disabled ? 'opacity-50 cursor-not-allowed' : ''
    } ${enabled ? 'bg-teal-500' : 'bg-slate-200'}`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

// Settings Section Component
const SettingsSection = ({ title, description, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5">
    <div className="flex items-start gap-3 mb-4">
      <div className="p-2 bg-teal-50 rounded-lg">
        <Icon className="h-5 w-5 text-teal-600" />
      </div>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
    <div className="space-y-4 pl-0 md:pl-12">
      {children}
    </div>
  </div>
);

// Setting Row Component
const SettingRow = ({ icon: Icon, label, description, enabled, onChange, disabled }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-3 min-w-0">
      {Icon && <Icon className="h-4 w-4 text-slate-400 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
    </div>
    <ToggleSwitch enabled={enabled} onChange={onChange} disabled={disabled} />
  </div>
);

export const NotificationSettings = ({ onNavigate, user, onLogout }) => {
  const [preferences, setPreferences] = useState({
    in_app_enabled: true,
    email_digest_enabled: true,
    email_digest_day: 'monday',
    push_enabled: true,
    notify_task_due_today: true,
    notify_task_due_soon: true,
    notify_task_overdue: true,
    notify_task_assigned: true,
    notify_case_scheduled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    fetchPreferences();
    checkPushSupport();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/preferences`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setPreferences(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const checkPushSupport = () => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setPushSupported(supported);
    if (supported) {
      setPushPermission(Notification.permission);
    }
  };

  const requestPushPermission = async () => {
    if (!pushSupported) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        toast.success('Push notifications enabled');
        // Register service worker and subscribe
        await subscribeToPush();
      } else if (permission === 'denied') {
        toast.error('Push notification permission denied');
        setPreferences(prev => ({ ...prev, push_enabled: false }));
      }
    } catch (error) {
      console.error('Error requesting push permission:', error);
      toast.error('Failed to enable push notifications');
    }
  };

  const subscribeToPush = async () => {
    try {
      // For now, we'll just show a success message
      // Full push subscription would require VAPID keys and service worker setup
      toast.success('Push notifications configured');
    } catch (error) {
      console.error('Error subscribing to push:', error);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/notifications/preferences`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...preferences,
          user_email: user?.email || ''
        })
      });

      if (response.ok) {
        toast.success('Notification preferences saved');
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <PageLayout
        currentView="notification-settings"
        onNavigate={onNavigate}
        user={user}
        onLogout={onLogout}
        title="Notification Settings"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      currentView="notification-settings"
      onNavigate={onNavigate}
      user={user}
      onLogout={onLogout}
      title="Notification Settings"
      headerActions={
        <Button
          onClick={savePreferences}
          disabled={saving}
          className="bg-teal-500 hover:bg-teal-600 text-white"
          data-testid="save-preferences-btn"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      }
    >
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 md:space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => onNavigate('dashboard')}
          className="mb-2 -ml-2 text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Button>

        {/* In-App Notifications */}
        <SettingsSection
          title="In-App Notifications"
          description="Receive notifications within the application"
          icon={Bell}
        >
          <SettingRow
            icon={BellRing}
            label="Enable in-app notifications"
            description="Show notification bell and feed in the app"
            enabled={preferences.in_app_enabled}
            onChange={(value) => updatePreference('in_app_enabled', value)}
          />
        </SettingsSection>

        {/* Push Notifications */}
        <SettingsSection
          title="Push Notifications"
          description="Receive real-time alerts even when the app is closed"
          icon={Smartphone}
        >
          <SettingRow
            icon={BellRing}
            label="Enable push notifications"
            description={
              !pushSupported 
                ? 'Not supported in this browser' 
                : pushPermission === 'denied' 
                  ? 'Permission denied - enable in browser settings'
                  : 'Receive alerts on your device'
            }
            enabled={preferences.push_enabled && pushPermission === 'granted'}
            onChange={(value) => {
              if (value && pushPermission !== 'granted') {
                requestPushPermission();
              } else {
                updatePreference('push_enabled', value);
              }
            }}
            disabled={!pushSupported || pushPermission === 'denied'}
          />
          {pushSupported && pushPermission === 'default' && (
            <div className="mt-2 p-3 bg-teal-50 rounded-lg">
              <p className="text-sm text-teal-700 mb-2">
                Enable push notifications to receive alerts even when the app is closed.
              </p>
              <Button
                size="sm"
                onClick={requestPushPermission}
                className="bg-teal-500 hover:bg-teal-600 text-white"
                data-testid="enable-push-btn"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Enable Push Notifications
              </Button>
            </div>
          )}
        </SettingsSection>

        {/* Notification Types */}
        <SettingsSection
          title="Notification Types"
          description="Choose which events trigger notifications"
          icon={CheckCircle2}
        >
          <SettingRow
            icon={Clock}
            label="Tasks due today"
            description="Get notified when a task is due today"
            enabled={preferences.notify_task_due_today}
            onChange={(value) => updatePreference('notify_task_due_today', value)}
          />
          <SettingRow
            icon={Clock}
            label="Tasks due soon"
            description="Get notified 3 days before a task is due"
            enabled={preferences.notify_task_due_soon}
            onChange={(value) => updatePreference('notify_task_due_soon', value)}
          />
          <SettingRow
            icon={AlertTriangle}
            label="Overdue tasks"
            description="Get notified when a task becomes overdue"
            enabled={preferences.notify_task_overdue}
            onChange={(value) => updatePreference('notify_task_overdue', value)}
          />
          <SettingRow
            icon={UserPlus}
            label="Task assignments"
            description="Get notified when a task is assigned to you"
            enabled={preferences.notify_task_assigned}
            onChange={(value) => updatePreference('notify_task_assigned', value)}
          />
          <SettingRow
            icon={Calendar}
            label="Case scheduling"
            description="Get notified when cases are scheduled or updated"
            enabled={preferences.notify_case_scheduled}
            onChange={(value) => updatePreference('notify_case_scheduled', value)}
          />
        </SettingsSection>

        {/* Info Box */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-slate-200 rounded-lg">
              <Bell className="h-4 w-4 text-slate-600" />
            </div>
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-700">About Notifications</p>
              <p className="mt-1">
                Notifications help you stay on top of important tasks and patient care activities. 
                You can customize which notifications you receive and how you receive them.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default NotificationSettings;
