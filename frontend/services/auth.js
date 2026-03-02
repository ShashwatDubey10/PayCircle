import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'paycircle_token';
const USER_KEY  = 'paycircle_user';

// ─── Token ────────────────────────────────────────────────────────────────────
export const saveToken   = (token) => AsyncStorage.setItem(TOKEN_KEY, token);
export const getToken    = ()      => AsyncStorage.getItem(TOKEN_KEY);
export const removeToken = ()      => AsyncStorage.removeItem(TOKEN_KEY);

// ─── User ─────────────────────────────────────────────────────────────────────
export const saveUser = (user) =>
  AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

export const getUser = async () => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('[auth] getUser: malformed stored data, clearing.', err);
    await AsyncStorage.removeItem(USER_KEY);
    return null;
  }
};

export const removeUser = () => AsyncStorage.removeItem(USER_KEY);

// ─── Clear both at once (logout) ──────────────────────────────────────────────
export const clearAuth = () =>
  Promise.all([removeToken(), removeUser()]);
