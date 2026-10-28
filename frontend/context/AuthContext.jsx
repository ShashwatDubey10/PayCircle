import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { setUnauthorizedHandler } from '@/services/api';
import { saveToken, getToken, saveUser, clearAuth } from '@/services/auth';

const AuthContext = createContext(null);

// Guarantee both `_id` and `id` exist on the user object. The API has returned
// `{ id }` from login/register and `{ _id }` from /me, and ~28 screens read
// `user._id` — so a mismatch silently breaks admin checks, "is this mine?"
// comparisons and the direct-split filters for the whole session.
function normalizeUser(u) {
  if (!u) return u;
  const _id = u._id ?? u.id;
  const id  = u.id ?? u._id;
  return { ...u, _id, id };
}

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
        setUser(normalizeUser(data.user));
      } catch {
        // Token expired / invalid — wipe storage silently
        await clearAuth();
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  // Let the axios 401 interceptor drop us back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // ── Auth methods ────────────────────────────────────────────────────────────

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    await saveToken(data.token);
    await saveUser(normalizeUser(data.user));
    setToken(data.token);
    setUser(normalizeUser(data.user));
  };

  const register = async (name, username, email, password) => {
    const { data } = await api.post('/api/auth/register', { name, username, email, password });
    await saveToken(data.token);
    await saveUser(normalizeUser(data.user));
    setToken(data.token);
    setUser(normalizeUser(data.user));
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
      merged = normalizeUser({ ...prev, ...updatedUser });
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
