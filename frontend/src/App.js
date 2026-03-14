import React, { useState, useEffect, useCallback } from 'react';
import AuthPage from './components/AuthPage';
import { AppleDashboard } from './components/AppleDashboard';
import SessionTimeout from './components/SessionTimeout';
import { Toaster } from './components/ui/sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Get token from either localStorage or sessionStorage
const getStoredToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const getStoredUser = () => {
  const user = localStorage.getItem('user') || sessionStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

function App() {
  // Start with null to indicate "checking" state - prevents flash
  const [authState, setAuthState] = useState({
    isAuthenticated: null, // null = checking, true = authenticated, false = not authenticated
    user: null,
    loading: true
  });

  // Validate token with backend
  const validateToken = useCallback(async () => {
    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      setAuthState({
        isAuthenticated: false,
        user: null,
        loading: false
      });
      return;
    }

    try {
      // Validate token with backend
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        // Update stored user data with fresh data from server
        if (localStorage.getItem('token')) {
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('user', JSON.stringify(userData));
        }
        
        setAuthState({
          isAuthenticated: true,
          user: userData,
          loading: false
        });
      } else if (response.status === 401) {
        // Token is invalid or expired
        console.log('Token invalid or expired, clearing...');
        clearAuthData();
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false
        });
      } else {
        // Other error - still try to use cached data (might be network issue)
        console.warn('Could not validate token, using cached data');
        setAuthState({
          isAuthenticated: true,
          user: storedUser,
          loading: false
        });
      }
    } catch (error) {
      console.error('Token validation error:', error);
      // On network error, still try to use stored credentials
      // This allows offline usage with PWA
      setAuthState({
        isAuthenticated: true,
        user: storedUser,
        loading: false
      });
    }
  }, []);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  // Clear all auth data from both storages
  const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  };

  const handleLogin = (token, userData) => {
    // Token storage is already handled in AuthPage based on rememberMe
    // Just update the state
    setAuthState({
      isAuthenticated: true,
      user: userData,
      loading: false
    });
  };

  const handleLogout = () => {
    clearAuthData();
    // Also clear webauthn flags on explicit logout
    localStorage.removeItem('webauthn_registered');
    localStorage.removeItem('webauthn_email');
    
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false
    });
  };

  // Loading state - show spinner while checking auth
  if (authState.loading || authState.isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!authState.isAuthenticated ? (
        <AuthPage onLogin={handleLogin} />
      ) : (
        <>
          <SessionTimeout onLogout={handleLogout} />
          <AppleDashboard user={authState.user} onLogout={handleLogout} />
        </>
      )}
      <Toaster position="top-right" />
    </>
  );
}

export default App;
