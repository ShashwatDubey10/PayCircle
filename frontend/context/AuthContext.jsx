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

  const register = async (name, email, password) => {
    const { data } = await api.post('/api/auth/register', { name, email, password });
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

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
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
