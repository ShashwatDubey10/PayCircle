import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PC } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { getFriends, setUsername as apiSetUsername } from '@/services/friends';

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
      { id: 'friends',        label: 'Friends',            icon: 'people-outline' },
      { id: 'notifications',  label: 'Notifications',      icon: 'notifications-outline' },
      { id: 'privacy',        label: 'Privacy & Security', icon: 'shield-outline' },
    ],
  },
  {
    group: 'Preferences',
    items: [
      { id: 'currency',   label: 'Currency (INR)', icon: 'cash-outline' },
      { id: 'appearance', label: 'Appearance',     icon: 'moon-outline' },
    ],
  },
  {
    group: 'Support',
    items: [
      { id: 'help',  label: 'Help & FAQ',      icon: 'help-circle-outline' },
      { id: 'about', label: 'About PayCircle', icon: 'information-circle-outline' },
    ],
  },
];

// ─── Modal content ────────────────────────────────────────────────────────────

const MODAL_CONTENT = {
  privacy: {
    title: 'Privacy & Security',
    items: [
      { heading: 'Data Storage', body: 'Your data is stored securely on MongoDB Atlas with encrypted connections.' },
      { heading: 'Passwords',    body: 'Passwords are never stored in plain text — they are hashed using bcrypt before saving.' },
      { heading: 'Authentication', body: 'Sessions use JSON Web Tokens (JWT) that expire after 7 days. Tokens are stored locally on your device.' },
      { heading: 'Data Sharing', body: 'PayCircle does not sell or share your personal data with third parties.' },
    ],
  },
  help: {
    title: 'Help & FAQ',
    items: [
      { heading: 'How do I create a group?', body: 'Go to the Groups tab and tap the + button. Enter a name and select a type (Roommates, Trip, Mess, or Miscellaneous).' },
      { heading: 'How are expenses split?', body: 'Group expenses are split equally among all members by default. Each member\'s share is calculated automatically.' },
      { heading: 'How do I record a settlement?', body: 'Open a group, go to the Balances tab, and use the Settlements section to record who paid whom.' },
      { heading: 'What is Monthly Budget?', body: 'Set a monthly spending limit from the Dashboard. It tracks your group expense shares + personal expenses combined.' },
      { heading: 'How do I track personal spending?', body: 'Use the Transactions tab to add personal income or expenses independently from group activity.' },
      { heading: 'How do I add a member to a group?', body: 'Open the group, go to Members tab, and tap Add Member. The person must already have a PayCircle account.' },
    ],
  },
  about: {
    title: 'About PayCircle',
    items: [
      { heading: 'Version',     body: '1.0.0 (MVP Release)' },
      { heading: 'Description', body: 'PayCircle is a group expense management app designed for college students sharing living expenses.' },
      { heading: 'Tech Stack',  body: 'React Native (Expo) · Node.js · Express · MongoDB Atlas' },
      { heading: 'Currency',    body: 'Indian Rupee (₹) — INR only' },
      { heading: 'Support',     body: 'For issues or feedback, contact your group admin or the development team.' },
    ],
  },
};

// ─── InfoModal ────────────────────────────────────────────────────────────────

function InfoModal({ content, onClose }) {
  if (!content) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>{content.title}</Text>
          <ScrollView style={modalStyles.body} showsVerticalScrollIndicator={false}>
            {content.items.map((item, i) => (
              <View key={i} style={modalStyles.item}>
                <Text style={modalStyles.itemHeading}>{item.heading}</Text>
                <Text style={modalStyles.itemBody}>{item.body}</Text>
              </View>
            ))}
            <View style={{ height: 24 }} />
          </ScrollView>
          <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={modalStyles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: PC.border,
    padding: 24,
    maxHeight: '80%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: PC.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 20 },
  body:  { flex: 0 },
  item: {
    backgroundColor: PC.bgCardElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  itemHeading: { color: PC.textPrimary,    fontSize: 13, fontWeight: '600', marginBottom: 4 },
  itemBody:    { color: PC.textSecondary,  fontSize: 13, lineHeight: 19 },
  closeBtn: {
    marginTop: 16,
    backgroundColor: PC.accent,
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#060A09', fontSize: 15, fontWeight: '700' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();

  const [groupsCount,  setGroupsCount]  = useState(null);
  const [txCount,      setTxCount]      = useState(null);
  const [netSaved,     setNetSaved]     = useState(null);
  const [friendCount,  setFriendCount]  = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [signingOut,   setSigningOut]   = useState(false);
  const [activeModal,  setActiveModal]  = useState(null); // 'privacy' | 'help' | 'about'

  // Username banner modal
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameInput,     setUsernameInput]     = useState('');
  const [usernameLoading,   setUsernameLoading]   = useState(false);
  const [usernameError,     setUsernameError]     = useState('');

  // ── Fetch stats ───────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const [groupsRes, txRes, friends] = await Promise.all([
        api.get('/api/groups'),
        api.get('/api/users/me/transactions'),
        getFriends(),
      ]);

      setGroupsCount(groupsRes.data.groups?.length ?? 0);
      setFriendCount(friends?.length ?? 0);

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

  // ── Set username ──────────────────────────────────────────────────────────
  async function handleSetUsername() {
    setUsernameError('');
    const cleaned = usernameInput.trim().toLowerCase();
    if (!USERNAME_RE.test(cleaned)) {
      setUsernameError('3–20 chars: lowercase letters, numbers, underscore only.');
      return;
    }
    setUsernameLoading(true);
    try {
      const result = await apiSetUsername(cleaned);
      // Prefer the full server-side user object; fall back to an optimistic patch
      // so the auth context is never stale even when result.user is missing.
      await updateUser(result?.user ?? { username: cleaned });
      setShowUsernameModal(false);
      setUsernameInput('');
      Alert.alert('Username set!', `Your username is now @${cleaned}`);
    } catch (err) {
      setUsernameError(err?.message || 'Failed to set username');
    } finally {
      setUsernameLoading(false);
    }
  }

  // ── Settings press handler ────────────────────────────────────────────────
  function handleSettingsPress(id) {
    switch (id) {
      case 'friends':
        router.push('/friends');
        break;
      case 'notifications':
        Alert.alert(
          'Notifications',
          'Push notification preferences will be available in a future update.\n\nYou\'ll be able to get alerts for new expenses, settlement reminders, and budget warnings.',
          [{ text: 'OK' }]
        );
        break;
      case 'privacy':
        setActiveModal('privacy');
        break;
      case 'currency':
        Alert.alert(
          'Currency',
          'PayCircle uses Indian Rupee (₹) as the default currency.\n\nMulti-currency support is planned for a future release.',
          [{ text: 'Got it' }]
        );
        break;
      case 'appearance':
        Alert.alert(
          'Appearance',
          'PayCircle currently uses Dark mode.\n\nLight mode and custom themes are planned for a future update.',
          [{ text: 'OK' }]
        );
        break;
      case 'help':
        setActiveModal('help');
        break;
      case 'about':
        setActiveModal('about');
        break;
    }
  }

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

          {/* Username — always visible, always tappable */}
          <TouchableOpacity
            style={styles.usernameRow}
            onPress={() => { setUsernameInput(user?.username || ''); setShowUsernameModal(true); }}
            activeOpacity={0.7}>
            <Ionicons name="at" size={13} color={user?.username ? PC.accent : PC.warning} />
            <Text style={[styles.usernameDisplay, !user?.username && styles.usernameUnset]}>
              {user?.username ? user.username : 'Set username'}
            </Text>
            <Ionicons name="pencil-outline" size={12} color={PC.textMuted} />
          </TouchableOpacity>

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
              : <Text style={styles.statValue}>{friendCount ?? '—'}</Text>
            }
            <Text style={styles.statLabel}>Friends</Text>
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
                <View key={item.id}>
                  <TouchableOpacity
                    style={styles.settingsRow}
                    activeOpacity={0.7}
                    onPress={() => handleSettingsPress(item.id)}>
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

      {/* ── Info Modal ── */}
      <InfoModal
        content={activeModal ? MODAL_CONTENT[activeModal] : null}
        onClose={() => setActiveModal(null)}
      />

      {/* ── Set Username Modal ── */}
      <Modal visible={showUsernameModal} transparent animationType="slide" onRequestClose={() => { setShowUsernameModal(false); setUsernameError(''); }}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>{user?.username ? 'Change Username' : 'Set Username'}</Text>
            <Text style={[modalStyles.itemBody, { marginBottom: 16 }]}>
              {user?.username
                ? `Current: @${user.username}. Choose a new unique username.`
                : 'Choose a unique username so friends can find you.'
              }{' '}3–20 chars: lowercase letters, numbers, underscores.
            </Text>
            {usernameError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={14} color={PC.negative} />
                <Text style={styles.errorText}>{usernameError}</Text>
              </View>
            ) : null}
            <View style={styles.usernameInputBox}>
              <Ionicons name="at-outline" size={17} color={PC.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.usernameInput}
                placeholder="your_username"
                placeholderTextColor={PC.textMuted}
                value={usernameInput}
                onChangeText={(v) => { setUsernameInput(v.toLowerCase()); setUsernameError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!usernameLoading}
              />
            </View>
            <TouchableOpacity
              style={[modalStyles.closeBtn, usernameLoading && { opacity: 0.6 }]}
              onPress={handleSetUsername}
              disabled={usernameLoading}
              activeOpacity={0.85}>
              {usernameLoading
                ? <ActivityIndicator color="#060A09" size="small" />
                : <Text style={modalStyles.closeBtnText}>Save Username</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowUsernameModal(false); setUsernameError(''); }} disabled={usernameLoading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    borderColor: PC.accent,
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
  statValue:   { color: PC.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 4, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
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

  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: PC.accent10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PC.accent,
  },
  usernameDisplay: { color: PC.accent, fontSize: 13, fontWeight: '500' },
  usernameUnset:   { color: PC.warning, fontStyle: 'italic' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(224,90,90,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(224,90,90,0.30)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorText: { flex: 1, color: PC.negative, fontSize: 13 },

  usernameInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgInput,
    borderWidth: 1,
    borderColor: PC.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 16,
  },
  usernameInput: { flex: 1, color: PC.textPrimary, fontSize: 15 },

  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: PC.textSecondary, fontSize: 14 },
});
