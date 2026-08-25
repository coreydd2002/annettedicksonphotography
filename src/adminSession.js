// Shared with Header.jsx (to conditionally show the "Manager" nav link) as
// well as Admin.jsx itself — a single source of truth for the sessionStorage
// key and expiry check, plus a same-tab event so the header can react to a
// login/logout immediately (the native "storage" event only fires in OTHER
// tabs, not the one that made the change).
const SESSION_KEY = "adp_admin_token";
const SESSION_EVENT = "adp-admin-session";

export function readAdminSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.token || !parsed.expiresAt || parsed.expiresAt < Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function writeAdminSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearAdminSession() {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

// Fires on login, logout, and forced-logout (401), in this tab; also on
// storage events from other tabs. Returns an unsubscribe function.
export function onAdminSessionChange(callback) {
  window.addEventListener(SESSION_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SESSION_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
