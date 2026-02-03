import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
  Mail,
  Calendar,
  Link2,
  Unlink,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Video
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const GoogleIntegration = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/google/status`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setConnectionStatus(data);
    } catch (error) {
      console.error('Failed to check Google status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnectionStatus();
    
    // Check URL params for Google callback result
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      toast.success('Google account connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
      checkConnectionStatus();
    }
    if (params.get('google_error')) {
      toast.error(`Google connection failed: ${params.get('google_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await fetch(`${API_URL}/api/google/auth-url`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error('Failed to get authorization URL');
      }
    } catch (error) {
      toast.error('Failed to connect to Google');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Google account?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/google/disconnect`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        toast.success('Google account disconnected');
        setConnectionStatus({ connected: false });
      } else {
        toast.error('Failed to disconnect');
      }
    } catch (error) {
      toast.error('Failed to disconnect Google account');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <div className={`p-6 rounded-2xl border-2 ${
        connectionStatus?.connected 
          ? 'bg-green-50 border-green-200' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              connectionStatus?.connected ? 'bg-green-500' : 'bg-gray-400'
            }`}>
              {connectionStatus?.connected ? (
                <CheckCircle className="h-7 w-7 text-white" />
              ) : (
                <AlertCircle className="h-7 w-7 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {connectionStatus?.connected ? 'Google Connected' : 'Google Not Connected'}
              </h3>
              {connectionStatus?.connected ? (
                <p className="text-green-700 text-sm">
                  Connected as {connectionStatus.google_email}
                </p>
              ) : (
                <p className="text-gray-600 text-sm">
                  Connect your Google account to enable email and calendar sync
                </p>
              )}
            </div>
          </div>
          
          {connectionStatus?.connected ? (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {connecting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Connect Google
            </Button>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gmail Feature */}
        <div className={`p-5 rounded-xl border ${
          connectionStatus?.connected ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
        }`}>
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Mail className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Gmail</h4>
              <Badge className={connectionStatus?.connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                {connectionStatus?.connected ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• View emails in OProom</li>
            <li>• Search patient emails</li>
            <li>• Auto-detect VSP invites</li>
          </ul>
        </div>

        {/* Calendar Feature */}
        <div className={`p-5 rounded-xl border ${
          connectionStatus?.connected ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
        }`}>
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Calendar</h4>
              <Badge className={connectionStatus?.connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                {connectionStatus?.connected ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Two-way calendar sync</li>
            <li>• OR cases auto-sync</li>
            <li>• Meeting invitations</li>
          </ul>
        </div>

        {/* VSP Feature */}
        <div className={`p-5 rounded-xl border ${
          connectionStatus?.connected ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
        }`}>
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Video className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">VSP Sessions</h4>
              <Badge className={connectionStatus?.connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                {connectionStatus?.connected ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Auto-create events</li>
            <li>• Extract meeting links</li>
            <li>• Send invites</li>
          </ul>
        </div>
      </div>

      {/* Setup Instructions */}
      {!connectionStatus?.connected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h4 className="font-semibold text-blue-900 mb-2">Setup Required</h4>
          <p className="text-blue-700 text-sm mb-3">
            To enable Google integration, you need to provide your Google OAuth credentials.
            Follow these steps:
          </p>
          <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
            <li>Create a project in Google Cloud Console</li>
            <li>Enable Gmail API and Calendar API</li>
            <li>Create OAuth credentials</li>
            <li>Share the Client ID and Secret with your administrator</li>
          </ol>
          <a 
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Open Google Cloud Console
            <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        </div>
      )}
    </div>
  );
};

export default GoogleIntegration;
