import React, { useState, useEffect, useCallback } from 'react';
import AuthPage from './components/AuthPage';
import { AppleDashboard } from './components/AppleDashboard';
import SessionTimeout from './components/SessionTimeout';
import { Toaster } from './components/ui/sonner';
import { getToken, getUser, setUser, clearAuth, isPersistentSession } from './utils/auth';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  // Start with null to indicate "checking" state - prevents flash
  const [authState, setAuthState] = useState({
    isAuthenticated: null, // null = checking, true = authenticated, false = not authenticated
    user: null,
    loading: true
  });

  // Validate token with backend
  const validateToken = useCallback(async () => {
    const token = getToken();
    const storedUser = getUser();

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
        // Refresh cached user in the same storage tier (persistent vs session)
        setUser(userData, isPersistentSession());

        setAuthState({
          isAuthenticated: true,
          user: userData,
          loading: false
        });
      } else if (response.status === 401) {
        // Token is invalid or expired
        clearAuth();
        setAuthState({
          isAuthenticated: false,
          user: null,
          loading: false
        });
      } else {
        // Other error - still try to use cached data (might be network issue)
        setAuthState({
          isAuthenticated: true,
          user: storedUser,
          loading: false
        });
      }
    } catch (error) {
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

  const handleLogin = (token, userData) => {
    // Token + user storage is handled in AuthPage based on rememberMe
    setAuthState({
      isAuthenticated: true,
      user: userData,
      loading: false
    });
  };

  const handleLogout = () => {
    clearAuth();
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
