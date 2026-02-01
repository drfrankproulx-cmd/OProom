import React, { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import { AppleDashboard } from './components/AppleDashboard';
import { Toaster } from './components/ui/sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in and validate token
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          // Validate token with backend
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            setIsAuthenticated(true);
            setUser(JSON.parse(storedUser));
          } else {
            // Token is invalid or expired, clear it
            console.log('Token invalid or expired, clearing...');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Token validation error:', error);
          // On network error, still try to use stored credentials
          setIsAuthenticated(true);
          setUser(JSON.parse(storedUser));
        }
      }
      setLoading(false);
    };
    
    validateToken();
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      {!isAuthenticated ? (
        <AuthPage onLogin={handleLogin} />
      ) : (
        <AppleDashboard user={user} onLogout={handleLogout} />
      )}
      <Toaster position="top-right" />
    </>
  );
}

export default App;
