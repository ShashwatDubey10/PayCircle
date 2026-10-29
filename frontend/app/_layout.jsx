import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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

import { View, StyleSheet, Platform } from 'react-native';

import { PC } from '@/constants/theme';
import { Text } from '@/components/text';
import Touchable from '@/components/Touchable';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BadgeProvider } from '@/context/BadgeContext';
import { updatePushToken } from '@/services/friends';
import { setServerWakingHandler } from '@/services/api';
import ServerWakingOverlay from '@/components/ServerWakingOverlay';

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

// ─── Error boundary ───────────────────────────────────────────────────────────
// expo-router renders this in place of the tree when a descendant throws during
// render. Without it a single bad value took the whole app down — a red screen
// in development, a blank white one in production with no way out but a
// force-quit. `retry` remounts the subtree, which recovers anything caused by a
// transient value rather than a persistent one.
//
// The copy follows the product's own rule that a failure is stated plainly
// rather than dressed up: it says what happened, what it did not affect, and
// what to do next.

export function ErrorBoundary({ error, retry }) {
  return (
    <View style={eb.screen}>
      <View style={eb.card}>
        <Text style={eb.title}>This screen stopped working</Text>
        <Text style={eb.body}>
          Something went wrong while drawing this screen. Nothing you have recorded is
          affected — your expenses, splits and balances are all still saved.
        </Text>
        {!!error?.message && <Text style={eb.detail} numberOfLines={4}>{error.message}</Text>}
        <Touchable tone="accent" style={eb.button} onPress={retry}
          accessibilityRole="button" accessibilityLabel="Try loading this screen again">
          <Text style={eb.buttonText}>Try again</Text>
        </Touchable>
      </View>
    </View>
  );
}

const eb = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PC.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: PC.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PC.borderLight,
    padding: 24,
  },
  title: { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  body:  { color: PC.textSecondary, fontSize: 14, fontWeight: '500', lineHeight: 21 },
  detail: {
    color: PC.textMuted,
    fontSize: 12,
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1,
    borderColor: PC.border,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  button: {
    marginTop: 20,
    backgroundColor: PC.accent,
    borderRadius: 14,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: PC.bg, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});

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

  // Set by services/api.js when a request times out and is being retried against
  // a server that is probably still booting.
  const [waking, setWaking] = useState(false);
  useEffect(() => {
    setServerWakingHandler(setWaking);
    return () => setServerWakingHandler(null);
  }, []);

  // Hide the splash once the session restore has settled, so the user never sees
  // a flash of the dashboard before being redirected to login (or vice versa) —
  // or early if the server turns out to be asleep, because otherwise the splash
  // sits there looking frozen for a minute with nothing explaining why.
  useEffect(() => {
    if (!loading || waking) SplashScreen.hideAsync().catch(() => {});
  }, [loading, waking]);

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

  // Covers the app while the server is waking, and until the session restore
  // settles, so the early splash hide above cannot expose a screen before the
  // redirect below has chosen one.
  if (waking || loading) return <ServerWakingOverlay waking={waking} />;

  return null;
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <BadgeProvider>
      <ThemeProvider value={DarkTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: PC.bg },
            animation: 'slide_from_right',
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/register" />
          <Stack.Screen name="groups/[id]" />
          <Stack.Screen name="budget" />
          <Stack.Screen name="friends" />
          <Stack.Screen name="direct/[friendId]" />
          <Stack.Screen name="qr-scanner" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        </Stack>
        <RootGuard />
        <StatusBar style="light" />
      </ThemeProvider>
      </BadgeProvider>
    </AuthProvider>
  );
}
