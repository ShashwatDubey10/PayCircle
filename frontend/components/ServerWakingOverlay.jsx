import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { PC } from '@/constants/theme';

// Full-screen rather than a banner, on purpose: while the server is asleep every
// screen's data is missing or stale, so letting the user tap into dead screens is
// worse than saying plainly that the app is waiting on something.
//
// It also renders while the session is still being restored, with `waking` false.
// In that case the native splash is still on top, so what shows is just the app
// background — the point is to leave no frame in which a screen is visible before
// RootGuard has decided which one it should be.
export default function ServerWakingOverlay({ waking }) {
  return (
    <View style={s.fill}>
      {waking && (
        <>
          <ActivityIndicator size="large" color={PC.accent} />
          <Text style={s.title}>Waking up the server</Text>
          <Text style={s.body}>
            PayCircle&rsquo;s server sleeps when nobody is using it. This first request
            can take up to a minute.
          </Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PC.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  title: {
    color: PC.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  body: {
    color: PC.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
