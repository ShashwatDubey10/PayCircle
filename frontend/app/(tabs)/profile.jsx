import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { PC } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function joinedMonthYear(createdAt) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return '';
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatSaved(net) {
  const abs = Math.abs(net);
  if (abs >= 100000) return `₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000)   return `₹${(abs / 1000).toFixed(1)}k`;
  return `₹${abs.toLocaleString('en-IN')}`;
}

// ─── Settings config ──────────────────────────────────────────────────────────

const SETTINGS = [
  {
    group: 'Account',
    items: [
      { label: 'Notifications',      icon: 'notifications-outline' },
      { label: 'Privacy & Security', icon: 'shield-outline' },
    ],
  },
  {
    group: 'Preferences',
    items: [
      { label: 'Currency (INR)', icon: 'cash-outline' },
      { label: 'Appearance',     icon: 'moon-outline' },
    ],
  },
  {
    group: 'Support',
    items: [
      { label: 'Help & FAQ',           icon: 'help-circle-outline' },
      { label: 'About PayCircle',      icon: 'information-circle-outline' },
    ],
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const [groupsCount,  setGroupsCount]  = useState(null);
  const [txCount,      setTxCount]      = useState(null);
  const [netSaved,     setNetSaved]     = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [signingOut,   setSigningOut]   = useState(false);

  // ── Fetch stats ───────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const [groupsRes, txRes] = await Promise.all([
        api.get('/api/groups'),
        api.get('/api/users/me/transactions'),
      ]);

      setGroupsCount(groupsRes.data.groups?.length ?? 0);

      const txns = txRes.data.transactions || [];
      setTxCount(txns.length);

      const income  = txns.filter(t => t.type === 'income').reduce((s, t)  => s + (t.amount ?? 0), 0);
      const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount ?? 0), 0);
      setNetSaved(income - expense);
    } catch {
      // Non-critical — stats just stay null and show '—'
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Sign out ──────────────────────────────────────────────────────────────
  function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await logout();
              // RootGuard in _layout.jsx detects user → null and redirects to /auth/login
            } catch {
              setSigningOut(false);
              Alert.alert('Error', 'Could not sign out. Please try again.');
            }
          },
        },
      ]
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const initials   = getInitials(user?.name);
  const joined     = joinedMonthYear(user?.createdAt);
  const savedLabel = netSaved === null ? '—' : formatSaved(netSaved);
  const savedColor = netSaved === null ? PC.textPrimary : netSaved >= 0 ? PC.positive : PC.negative;

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
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name ?? '—'}</Text>
          <Text style={styles.userEmail}>{user?.email ?? '—'}</Text>
          {user?.phone ? (
            <Text style={styles.userPhone}>{user.phone}</Text>
          ) : null}
          {joined ? (
            <View style={styles.joinedBadge}>
              <Ionicons name="calendar-outline" size={12} color={PC.textSecondary} />
              <Text style={styles.joinedText}>Joined {joined}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            {statsLoading
              ? <ActivityIndicator size="small" color={PC.textMuted} style={{ marginBottom: 4 }} />
              : <Text style={styles.statValue}>{groupsCount ?? '—'}</Text>
            }
            <Text style={styles.statLabel}>Groups</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            {statsLoading
              ? <ActivityIndicator size="small" color={PC.textMuted} style={{ marginBottom: 4 }} />
              : <Text style={styles.statValue}>{txCount ?? '—'}</Text>
            }
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            {statsLoading
              ? <ActivityIndicator size="small" color={PC.textMuted} style={{ marginBottom: 4 }} />
              : <Text style={[styles.statValue, { color: savedColor }]}>{savedLabel}</Text>
            }
            <Text style={styles.statLabel}>Net Saved</Text>
          </View>
        </View>

        {/* ── Settings Groups ── */}
        {SETTINGS.map((group) => (
          <View key={group.group} style={styles.settingsGroup}>
            <Text style={styles.groupLabel}>{group.group}</Text>
            <View style={styles.settingsCard}>
              {group.items.map((item, ii) => (
                <View key={item.label}>
                  <TouchableOpacity style={styles.settingsRow} activeOpacity={0.7}>
                    <View style={styles.settingsIconBox}>
                      <Ionicons name={item.icon} size={18} color={PC.textSecondary} />
                    </View>
                    <Text style={styles.settingsLabel}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={15} color={PC.textMuted} />
                  </TouchableOpacity>
                  {ii < group.items.length - 1 && <View style={styles.settingsDivider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* ── Sign Out ── */}
        <View style={styles.settingsGroup}>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingsRow}
              activeOpacity={0.7}
              onPress={handleSignOut}
              disabled={signingOut}>
              <View style={styles.settingsIconBox}>
                {signingOut
                  ? <ActivityIndicator size="small" color={PC.negative} />
                  : <Ionicons name="log-out-outline" size={18} color={PC.negative} />
                }
              </View>
              <Text style={[styles.settingsLabel, { color: PC.negative }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.version}>PayCircle v1.0.0 · MVP</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: PC.bg },
  scroll:        { flex: 1 },
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
  userName:   { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  userEmail:  { color: PC.textSecondary, fontSize: 14, marginBottom: 3 },
  userPhone:  { color: PC.textSecondary, fontSize: 14, marginBottom: 10 },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: PC.bgCardElevated,
    borderRadius: 20,
    marginTop: 6,
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
  statItem:    { flex: 1, alignItems: 'center' },
  statValue:   { color: PC.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  statLabel:   { color: PC.textSecondary, fontSize: 12 },
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
  settingsLabel:   { flex: 1, color: PC.textPrimary, fontSize: 14, fontWeight: '400' },
  settingsDivider: { height: 1, backgroundColor: PC.border, marginHorizontal: 16 },

  version: {
    color: PC.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 8,
  },
});
