import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PC } from '@/constants/theme';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const USER = {
  name: 'Arjun Sharma',
  email: 'arjun.sharma@example.com',
  phone: '+91 98765 43210',
  initials: 'AS',
  joinedDate: 'January 2026',
  groupsCount: 4,
  transactionsCount: 24,
  totalSaved: 33800,
};

const SETTINGS = [
  {
    group: 'Account',
    items: [
      { label: 'Edit Profile', icon: 'person-outline' },
      { label: 'Notifications', icon: 'notifications-outline' },
      { label: 'Privacy & Security', icon: 'shield-outline' },
    ],
  },
  {
    group: 'Preferences',
    items: [
      { label: 'Currency (INR)', icon: 'cash-outline' },
      { label: 'Appearance', icon: 'moon-outline' },
      { label: 'Language', icon: 'language-outline' },
    ],
  },
  {
    group: 'Support',
    items: [
      { label: 'Help & FAQ', icon: 'help-circle-outline' },
      { label: 'Send Feedback', icon: 'chatbubble-outline' },
      { label: 'About PayCircle', icon: 'information-circle-outline' },
    ],
  },
  {
    group: '',
    items: [
      { label: 'Sign Out', icon: 'log-out-outline', destructive: true, route: '/auth/login' },
    ],
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();

  function handleItem(item) {
    if (item.route) {
      router.push(item.route);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* ── Avatar + Name ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{USER.initials}</Text>
          </View>
          <Text style={styles.userName}>{USER.name}</Text>
          <Text style={styles.userEmail}>{USER.email}</Text>
          <Text style={styles.userPhone}>{USER.phone}</Text>
          <View style={styles.joinedBadge}>
            <Ionicons name="calendar-outline" size={12} color={PC.textSecondary} />
            <Text style={styles.joinedText}>Joined {USER.joinedDate}</Text>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{USER.groupsCount}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{USER.transactionsCount}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: PC.positive }]}>
              ₹{(USER.totalSaved / 1000).toFixed(0)}k
            </Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
        </View>

        {/* ── Settings Groups ── */}
        {SETTINGS.map((group, gi) => (
          <View key={gi} style={styles.settingsGroup}>
            {group.group ? (
              <Text style={styles.groupLabel}>{group.group}</Text>
            ) : null}
            <View style={styles.settingsCard}>
              {group.items.map((item, ii) => (
                <View key={item.label}>
                  <TouchableOpacity
                    style={styles.settingsRow}
                    activeOpacity={0.7}
                    onPress={() => handleItem(item)}>
                    <View style={styles.settingsIconBox}>
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={item.destructive ? PC.negative : PC.textSecondary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.settingsLabel,
                        item.destructive && { color: PC.negative },
                      ]}>
                      {item.label}
                    </Text>
                    {!item.destructive && (
                      <Ionicons
                        name="chevron-forward"
                        size={15}
                        color={PC.textMuted}
                      />
                    )}
                  </TouchableOpacity>
                  {ii < group.items.length - 1 && (
                    <View style={styles.settingsDivider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.version}>PayCircle v1.0.0 · MVP</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PC.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: { color: PC.textPrimary, fontSize: 22, fontWeight: '700' },

  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    backgroundColor: PC.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PC.border,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PC.bgCardElevated,
    borderWidth: 2,
    borderColor: PC.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { color: PC.textPrimary, fontSize: 24, fontWeight: '700' },
  userName: { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  userEmail: { color: PC.textSecondary, fontSize: 14, marginBottom: 3 },
  userPhone: { color: PC.textSecondary, fontSize: 14, marginBottom: 10 },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: PC.bgCardElevated,
    borderRadius: 20,
  },
  joinedText: { color: PC.textSecondary, fontSize: 12 },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    paddingVertical: 18,
    marginBottom: 24,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: PC.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  statLabel: { color: PC.textSecondary, fontSize: 12 },
  statDivider: { width: 1, backgroundColor: PC.border },

  settingsGroup: { marginBottom: 20 },
  groupLabel: {
    color: PC.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  settingsCard: {
    marginHorizontal: 20,
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  settingsIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PC.bgCardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  settingsLabel: { flex: 1, color: PC.textPrimary, fontSize: 14, fontWeight: '400' },
  settingsDivider: { height: 1, backgroundColor: PC.border, marginHorizontal: 16 },

  version: {
    color: PC.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 8,
  },
});
