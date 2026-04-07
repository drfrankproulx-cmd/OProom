/**
 * Centralized auth token management.
 * All token storage/retrieval goes through this module.
 * To upgrade security (e.g., httpOnly cookies), only this file needs to change.
 */

const TOKEN_KEY = 'token';
const WEBAUTHN_EMAIL_KEY = 'webauthn_email';
const WEBAUTHN_REGISTERED_KEY = 'webauthn_registered';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

export function clearAuth() {
  clearToken();
  localStorage.removeItem(WEBAUTHN_EMAIL_KEY);
  localStorage.removeItem(WEBAUTHN_REGISTERED_KEY);
}
