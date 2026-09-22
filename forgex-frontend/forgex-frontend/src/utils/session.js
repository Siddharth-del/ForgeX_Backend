// Central token handling. The backend issues a JWT in the sign-in response body
// (and also as a non-HttpOnly cookie). We send it as a Bearer header, which the
// backend's AuthTokenFilter accepts, and keep it only in this module.
const KEY = 'forgex.session.v1';

function decodeExp(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function readSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.token) return null;
    if (s.expiresAt && Date.now() >= s.expiresAt) { clearSession(); return null; }
    return s;
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  const session = { token, user, expiresAt: decodeExp(token) };
  try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* storage unavailable */ }
  return session;
}

export function updateSessionUser(user) {
  const s = readSession();
  if (s) saveSession(s.token, user);
}

export function clearSession() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export const getToken = () => readSession()?.token ?? null;
