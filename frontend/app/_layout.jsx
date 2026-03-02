import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/context/AuthContext';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// ─── Route guard ──────────────────────────────────────────────────────────────
// Runs on every auth state change and redirects to the right screen.

function RootGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (loading) return; // wait for session restore before redirecting

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      // Not logged in and not already on an auth screen → send to login
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      // Logged in but still on an auth screen → send to app
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

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
        </Stack>
        <RootGuard />
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  );
}
