import React, { useState, useEffect, useCallback, useRef } from 'react';

const TIMEOUT_MS = 15 * 60 * 1000;      // 15 minutes
const WARNING_MS = 3 * 60 * 1000;        // 3 minutes before timeout
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'];

export default function SessionTimeout({ onLogout }) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(180); // 3 minutes in seconds
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const countdownRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    // Warning timer: fires at 12 minutes (TIMEOUT - WARNING)
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(180);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, TIMEOUT_MS - WARNING_MS);

    // Logout timer: fires at 15 minutes
    timeoutRef.current = setTimeout(() => {
      clearTimers();
      onLogout();
    }, TIMEOUT_MS);
  }, [clearTimers, onLogout]);

  const handleActivity = useCallback(() => {
    if (!showWarning) {
      startTimers();
    }
  }, [showWarning, startTimers]);

  const handleStayLoggedIn = () => {
    startTimers();
  };

  useEffect(() => {
    startTimers();
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity));
    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
    };
  }, [startTimers, handleActivity, clearTimers]);

  if (!showWarning) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div
      data-testid="session-timeout-modal"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Expiring</h2>
        <p className="text-gray-600 mb-1">
          Your session will expire due to inactivity.
        </p>
        <p className="text-2xl font-mono font-bold text-amber-600 mb-6" data-testid="session-timeout-countdown">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            data-testid="session-timeout-stay-btn"
            onClick={handleStayLoggedIn}
            className="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            Stay Logged In
          </button>
          <button
            data-testid="session-timeout-logout-btn"
            onClick={onLogout}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
