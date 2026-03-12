import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Text, TextInput } from 'react-native';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import {
  useFonts,
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { updatePushToken } from '@/services/friends';

SplashScreen.preventAutoHideAsync();

// Push notifications don't work in Expo Go (SDK 53+) — only in dev/production builds.
// executionEnvironment is 'storeClient' in Expo Go, 'standalone' or 'bare' in real builds.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

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
  // Track the last user ID for which we registered a push token so that:
  // • Registration is skipped for the same user (prevents duplicate calls).
  // • Registration re-runs when a different user logs in after a sign-out.
  const lastRegisteredUserId = useRef(null);

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

  // Register for push notifications once per user after login (skipped in Expo Go)
  useEffect(() => {
    const userId = user?._id ?? user?.id ?? null;
    if (!userId || lastRegisteredUserId.current === userId || IS_EXPO_GO) return;
    lastRegisteredUserId.current = userId;

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
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Apply Roboto globally — iOS will now match Android's default font
      Text.defaultProps = Text.defaultProps ?? {};
      Text.defaultProps.style = { fontFamily: 'Roboto_400Regular' };
      TextInput.defaultProps = TextInput.defaultProps ?? {};
      TextInput.defaultProps.style = { fontFamily: 'Roboto_400Regular' };

      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
