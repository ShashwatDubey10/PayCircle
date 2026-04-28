import axios     from 'axios';
import Constants from 'expo-constants';
import { getToken, removeToken } from './auth';

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
  timeout: 10000,
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
    if (error.response?.status === 401) {
      // Token expired or invalid — wipe it so AuthContext redirects to login
      await removeToken();
    }
    // Always surface a plain message string, never a raw axios error object
    const message =
      error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
