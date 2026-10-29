import axios     from 'axios';
import Constants from 'expo-constants';
import { getToken, clearAuth } from './auth';

// ─── Unauthorized hook ────────────────────────────────────────────────────────
// AuthContext registers a callback here so that a 401 can clear React auth state
// too. Without this the token is wiped but `user` stays set, so RootGuard never
// redirects and the user is stranded on screens whose every request now fails.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// ─── Cold-start handling ─────────────────────────────────────────────────────
// The backend sleeps when idle, and the first request after a quiet spell waits
// on a container boot that routinely takes 30–60s — far past any sane timeout.
// Rather than slow every request down to accommodate that, a request that times
// out is retried once with room for the boot, and anything listening is told, so
// the UI can say what is happening instead of showing a generic failure.
const REQUEST_TIMEOUT = 10000;
const WAKE_TIMEOUT    = 60000;

let onServerWaking = null;
let wakingCount    = 0;
export const setServerWakingHandler = (fn) => { onServerWaking = fn; };

// Counted rather than a boolean: several requests can be in flight when the
// server is cold, and the first retry to finish must not clear a state the
// others are still waiting in.
function markWaking(delta) {
  const was  = wakingCount > 0;
  wakingCount = Math.max(0, wakingCount + delta);
  const now  = wakingCount > 0;
  if (was !== now) onServerWaking?.(now);
}

// ─── Base URL ─────────────────────────────────────────────────────────────────
// In Expo Go, Constants.expoConfig.hostUri is the Metro bundler address
// e.g. "192.168.1.9:8081". We reuse the same IP for our backend (port 5000).
// This automatically adapts to whatever IP your machine has — no manual updates needed.
function getBaseUrl() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0]; // strip Metro port, keep the IP
    return `http://${host}:5000`;
  }
  // Production: deployed backend URL
  return 'https://paycircle-bvzs.onrender.com';
}

export const BASE_URL = getBaseUrl();

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — normalize errors, handle 401 ─────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // A timeout is the only signal available that the server may be asleep
    // rather than the request being genuinely bad, so retry it once with room
    // for a cold boot. The retry passes back through these interceptors, so its
    // own failure arrives already normalised.
    const cfg       = error.config;
    const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';

    if (isTimeout && cfg && !cfg._coldStartRetry) {
      cfg._coldStartRetry = true;
      cfg.timeout = WAKE_TIMEOUT;
      markWaking(1);
      try {
        return await api(cfg);
      } finally {
        markWaking(-1);
      }
    }

    // A 401 from the login/register endpoints means "wrong credentials", not
    // "session expired" — don't wipe storage or bounce the user for those.
    const url = error.config?.url ?? '';
    const isCredentialCheck = url.includes('/api/auth/login') || url.includes('/api/auth/register');

    if (error.response?.status === 401 && !isCredentialCheck) {
      // Token expired or invalid — wipe storage AND notify AuthContext so
      // RootGuard actually redirects to the login screen.
      await clearAuth();
      onUnauthorized?.();
    }
    // Always surface a plain message string, never a raw axios error object
    const message =
      error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
