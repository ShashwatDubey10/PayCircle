import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { updatePushToken } from '@/services/friends';

// Push notifications don't work in Expo Go (SDK 53+) — only in dev/production builds.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// Only set the foreground handler when push notifications are supported
if (!IS_EXPO_GO) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// ─── Route guard ──────────────────────────────────────────────────────────────
// Runs on every auth state change and redirects to the right screen.

function RootGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router   = useRouter();
  const pushRegistered = useRef(false);

  // Redirect based on auth state
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  // Register for push notifications once after login (skipped in Expo Go)
  useEffect(() => {
    if (!user || pushRegistered.current || IS_EXPO_GO) return;
    pushRegistered.current = true;

    (async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) return;
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        await updatePushToken(tokenData.data);
      } catch {
        // Push notifications are optional — silently ignore errors
      }
    })();
  }, [user]);

  return null;
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={DarkTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0A0A0A' },
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/register" />
          <Stack.Screen name="groups/[id]" />
          <Stack.Screen name="budget" />
          <Stack.Screen name="friends" />
          <Stack.Screen name="direct/[friendId]" />
        </Stack>
        <RootGuard />
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  );
}
