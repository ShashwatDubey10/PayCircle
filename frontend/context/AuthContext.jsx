import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '@/services/api';
import { saveToken, getToken, saveUser, getUser, clearAuth } from '@/services/auth';

const AuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true); // true until session restore completes

  // On app launch: restore session from AsyncStorage
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await getToken();
        if (!storedToken) return; // no token → stay logged out

        // Verify the token is still valid against the server
        const { data } = await api.get('/api/auth/me');
        setToken(storedToken);
        setUser(data.user);
      } catch {
        // Token expired / invalid — wipe storage silently
        await clearAuth();
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  // ── Auth methods ────────────────────────────────────────────────────────────

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    await saveToken(data.token);
    await saveUser(data.user);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (name, username, email, password) => {
    const { data } = await api.post('/api/auth/register', { name, username, email, password });
    await saveToken(data.token);
    await saveUser(data.user);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    await clearAuth();
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updatedUser) => {
    // Use functional updater so the merge is atomic relative to React state and
    // we capture the exact pre-update snapshot without an extra render.
    let prevSnapshot = null;
    let merged = null;
    setUser(prev => {
      if (!prev) return prev; // no-op when not logged in
      prevSnapshot = prev;
      merged = { ...prev, ...updatedUser };
      return merged;
    });
    if (!merged) return; // was not logged in — nothing to persist
    try {
      // merged is set synchronously by the updater above (React calls it immediately
      // in the same tick when state is not batched across async boundaries).
      await saveUser(merged);
    } catch (err) {
      // Rollback only if the state hasn't been changed by another update in the
      // meantime — avoids clobbering a racing updateUser call.
      setUser(curr => (curr === merged ? prevSnapshot : curr));
      throw err; // re-throw so callers can observe the failure
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
