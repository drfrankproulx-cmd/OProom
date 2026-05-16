/**
 * Centralized auth token management.
 * - Persistent ("Remember me") tokens live in localStorage and survive PWA restarts
 * - Session-only tokens live in sessionStorage and clear when the tab/PWA closes
 * - Reads always check localStorage first, falling back to sessionStorage
 */

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const WEBAUTHN_EMAIL_KEY = 'webauthn_email';
const WEBAUTHN_REGISTERED_KEY = 'webauthn_registered';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
}

/**
 * Store the JWT.
 * @param {string} token
 * @param {boolean} persistent - true → localStorage (survives PWA close), false → sessionStorage only
 */
export function setToken(token, persistent = true) {
  // Always clear any token in the *other* storage so we have a single source of truth
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (persistent) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function setUser(user, persistent = true) {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
  const value = JSON.stringify(user);
  if (persistent) {
    localStorage.setItem(USER_KEY, value);
  } else {
    sessionStorage.setItem(USER_KEY, value);
  }
}

export function isPersistentSession() {
  return !!localStorage.getItem(TOKEN_KEY);
}

export function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── WebAuthn helpers (always in localStorage — should survive PWA restarts) ──
export function getWebAuthnEmail() {
  return localStorage.getItem(WEBAUTHN_EMAIL_KEY) || '';
}

export function setWebAuthnEmail(email) {
  localStorage.setItem(WEBAUTHN_EMAIL_KEY, email);
}

export function getWebAuthnRegistered() {
  return localStorage.getItem(WEBAUTHN_REGISTERED_KEY) === 'true';
}

export function setWebAuthnRegistered(value) {
  localStorage.setItem(WEBAUTHN_REGISTERED_KEY, String(value));
}

/**
 * Clear the user's auth session but keep WebAuthn enrollment so Face ID still works
 * for the next sign-in.
 */
export function clearAuth() {
  clearToken();
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
}
