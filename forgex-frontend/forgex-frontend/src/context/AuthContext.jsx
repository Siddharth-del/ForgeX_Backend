import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as authService from '../services/authService';
import { UNAUTHORIZED_EVENT } from '../services/apiClient';
import { clearSession, readSession, saveSession, updateSessionUser } from '../utils/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(() => readSession()?.user ?? null);
  const [checking, setChecking] = useState(() => Boolean(readSession()));

  // Confirm a stored session with the server once on load; roles come from the backend.
  useEffect(() => {
    if (!readSession()) return;
    let cancelled = false;
    authService.getCurrentUser()
      .then((u) => { if (!cancelled) { setUser(u); updateSessionUser(u); } })
      .catch(() => { if (!cancelled) { clearSession(); setUser(null); } })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, []);

  // Any 401 from the API ends the session everywhere.
  useEffect(() => {
    const onUnauthorized = () => { setUser(null); queryClient.removeQueries({ queryKey: ['me'] }); };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [queryClient]);

  const login = useCallback(async (credentials) => {
    const { token, user: u } = await authService.login(credentials);
    saveSession(token, u);
    setUser(u);
    queryClient.removeQueries({ queryKey: ['me'] });
    return u;
  }, [queryClient]);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch { /* clear locally regardless */ }
    clearSession();
    setUser(null);
    queryClient.removeQueries({ queryKey: ['me'] });
  }, [queryClient]);

  const value = useMemo(() => ({
    user,
    checking,
    isAuthenticated: Boolean(user),
    isAdmin: Boolean(user?.isAdmin),
    login,
    logout,
    register: authService.register,
  }), [user, checking, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
