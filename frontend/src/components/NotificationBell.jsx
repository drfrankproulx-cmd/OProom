import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import {
  Bell,
  BellRing,
  X,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  AlertCircle,
  Calendar,
  ListTodo,
  ChevronRight,
  Settings,
  Mail,
  Smartphone
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Notification type icons and colors
const notificationStyles = {
  task_overdue: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    badgeColor: 'bg-red-100 text-red-700'
  },
  task_due_today: {
    icon: Clock,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    iconColor: 'text-orange-500',
    badgeColor: 'bg-orange-100 text-orange-700'
  },
  task_due_soon: {
    icon: Bell,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    badgeColor: 'bg-blue-100 text-blue-700'
  },
  task_assigned: {
    icon: ListTodo,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconColor: 'text-purple-500',
    badgeColor: 'bg-purple-100 text-purple-700'
  },
  case_scheduled: {
    icon: Calendar,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
    badgeColor: 'bg-green-100 text-green-700'
  },
  default: {
    icon: Bell,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    iconColor: 'text-slate-500',
    badgeColor: 'bg-slate-100 text-slate-700'
  }
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const NotificationBell = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const dropdownRef = useRef(null);

  // Fetch notification summary
  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/summary`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to fetch notification summary:', error);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      // First generate any new task notifications
      await fetch(`${API_URL}/api/notifications/generate-task-notifications`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      // Then fetch all notifications
      const response = await fetch(`${API_URL}/api/notifications`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.filter(n => !n.dismissed));
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/preferences`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSummary();
    // Refresh summary every 5 minutes
    const interval = setInterval(fetchSummary, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      fetchPreferences();
    }
  }, [isOpen, fetchNotifications, fetchPreferences]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      fetchSummary();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      fetchSummary();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Dismiss notification
  const dismissNotification = async (notificationId) => {
    try {
      await fetch(`${API_URL}/api/notifications/dismiss/${notificationId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      fetchSummary();
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  // Update preferences
  const updatePreferences = async (newPrefs) => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/preferences`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(newPrefs)
      });
      if (response.ok) {
        setPreferences(newPrefs);
        toast.success('Notification preferences updated');
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    markAsRead(notification._id);
    if (notification.action_url && onNavigate) {
      onNavigate(notification.action_url.replace('/', ''));
    }
    setIsOpen(false);
  };

  const unreadCount = summary?.unread_count || 0;
  const totalActionItems = summary?.total_action_items || 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        data-testid="notification-bell"
      >
        {unreadCount > 0 || totalActionItems > 0 ? (
          <BellRing className="h-5 w-5 text-slate-600 animate-pulse" />
        ) : (
          <Bell className="h-5 w-5 text-slate-600" />
        )}
        
        {/* Badge */}
        {(unreadCount > 0 || totalActionItems > 0) && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {Math.min(unreadCount + totalActionItems, 99)}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              {summary && (
                <p className="text-xs text-slate-500">
                  {summary.overdue_tasks > 0 && <span className="text-red-600 font-medium">{summary.overdue_tasks} overdue</span>}
                  {summary.overdue_tasks > 0 && summary.due_today_tasks > 0 && ' • '}
                  {summary.due_today_tasks > 0 && <span className="text-orange-600 font-medium">{summary.due_today_tasks} due today</span>}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="h-4 w-4 text-slate-500" />
              </button>
              {notifications.some(n => !n.read) && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4 text-slate-500" />
                </button>
              )}
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && preferences && (
            <div className="px-4 py-3 bg-blue-50 border-b space-y-3">
              <h4 className="font-medium text-sm text-slate-900">Notification Settings</h4>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferences.in_app_enabled}
                  onChange={(e) => updatePreferences({ ...preferences, in_app_enabled: e.target.checked })}
                  className="rounded"
                />
                <Bell className="h-4 w-4 text-slate-500" />
                In-app notifications
              </label>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferences.email_digest_enabled}
                  onChange={(e) => updatePreferences({ ...preferences, email_digest_enabled: e.target.checked })}
                  className="rounded"
                />
                <Mail className="h-4 w-4 text-slate-500" />
                Weekly email digest
              </label>
              
              {preferences.email_digest_enabled && (
                <select
                  value={preferences.email_digest_day}
                  onChange={(e) => updatePreferences({ ...preferences, email_digest_day: e.target.value })}
                  className="ml-6 text-sm border rounded px-2 py-1"
                >
                  <option value="monday">Monday morning</option>
                  <option value="friday">Friday afternoon</option>
                  <option value="sunday">Sunday evening</option>
                </select>
              )}
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={preferences.push_enabled}
                  onChange={(e) => updatePreferences({ ...preferences, push_enabled: e.target.checked })}
                  className="rounded"
                />
                <Smartphone className="h-4 w-4 text-slate-500" />
                Push notifications
              </label>
              
              <div className="pt-2 border-t text-xs text-slate-500">
                <p className="font-medium mb-1">Notify me about:</p>
                <div className="grid grid-cols-2 gap-1">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={preferences.notify_task_overdue}
                      onChange={(e) => updatePreferences({ ...preferences, notify_task_overdue: e.target.checked })}
                      className="rounded h-3 w-3"
                    />
                    Overdue tasks
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={preferences.notify_task_due_today}
                      onChange={(e) => updatePreferences({ ...preferences, notify_task_due_today: e.target.checked })}
                      className="rounded h-3 w-3"
                    />
                    Due today
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={preferences.notify_task_due_soon}
                      onChange={(e) => updatePreferences({ ...preferences, notify_task_due_soon: e.target.checked })}
                      className="rounded h-3 w-3"
                    />
                    Due soon (3 days)
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={preferences.notify_task_assigned}
                      onChange={(e) => updatePreferences({ ...preferences, notify_task_assigned: e.target.checked })}
                      className="rounded h-3 w-3"
                    />
                    Assigned to me
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-500">
                <div className="animate-spin h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full mx-auto mb-2"></div>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="font-medium">All caught up!</p>
                <p className="text-xs">No pending notifications</p>
              </div>
            ) : (
              notifications.map(notification => {
                const style = notificationStyles[notification.type] || notificationStyles.default;
                const Icon = style.icon;
                
                return (
                  <div
                    key={notification._id}
                    className={`px-4 py-3 border-b hover:bg-slate-50 transition-colors cursor-pointer ${
                      !notification.read ? style.bgColor : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${style.bgColor}`}>
                        <Icon className={`h-4 w-4 ${style.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium text-slate-900 ${!notification.read ? '' : 'opacity-70'}`}>
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(notification._id);
                            }}
                            className="p-1 hover:bg-slate-200 rounded transition-colors flex-shrink-0"
                          >
                            <X className="h-3 w-3 text-slate-400" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400">
                            {notification.created_at && formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true })}
                          </span>
                          {!notification.read && (
                            <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 border-t">
              <button
                onClick={() => {
                  if (onNavigate) onNavigate('tasks');
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center justify-center gap-1"
              >
                View all tasks
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
