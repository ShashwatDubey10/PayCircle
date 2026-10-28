import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PC } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { getFriends, setUsername as apiSetUsername } from '@/services/friends';
import AppAlert from '@/components/AppAlert';
import AppToast, { useToast } from '@/components/AppToast';
import ErrorBox from '@/components/ErrorBox';

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
      { id: 'friends',   label: 'Friends',            icon: 'people-outline' },
      { id: 'contacts',  label: 'Personal Contacts',  icon: 'person-add-outline' },
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
    icon:  'shield-checkmark-outline',
    items: [
      { icon: 'server-outline',       iconColor: PC.accent,      heading: 'Data Storage',    body: 'Your data is stored securely on MongoDB Atlas with encrypted connections and TLS in transit.' },
      { icon: 'lock-closed-outline',  iconColor: PC.positive,    heading: 'Passwords',       body: 'Passwords are never stored in plain text — they are hashed using bcrypt before saving.' },
      { icon: 'key-outline',          iconColor: PC.warning,     heading: 'Authentication',  body: 'Sessions use JSON Web Tokens (JWT) that expire after 7 days. Tokens are stored locally on your device.' },
      { icon: 'eye-off-outline',      iconColor: PC.textSecondary, heading: 'Data Sharing', body: 'PayCircle does not sell or share your personal data with third parties.' },
    ],
  },
  help: {
    title: 'Help & FAQ',
    icon:  'help-circle-outline',
    items: [
      { icon: 'people-outline',       iconColor: PC.accent,      heading: 'How do I create a group?',       body: 'Go to the Groups tab and tap the + button. Enter a name and select a type (Roommates, Trip, Mess, or Miscellaneous).' },
      { icon: 'receipt-outline',      iconColor: PC.positive,    heading: 'How are expenses split?',        body: 'Group expenses are split equally among all members by default. Each member\'s share is calculated automatically.' },
      { icon: 'swap-horizontal-outline', iconColor: PC.accent,   heading: 'How do I record a settlement?', body: 'Open a group, go to the Balances tab, and use the Settlements section to record who paid whom.' },
      { icon: 'wallet-outline',       iconColor: PC.warning,     heading: 'What is Monthly Budget?',        body: 'Set a monthly spending limit from the Dashboard. It tracks your group expense shares + personal expenses combined.' },
      { icon: 'list-outline',         iconColor: PC.textSecondary, heading: 'How do I track personal spending?', body: 'Use the Transactions tab to add personal income or expenses independently from group activity.' },
      { icon: 'person-add-outline',   iconColor: PC.accent,      heading: 'How do I add a member?',         body: 'Open the group, go to Members tab, and tap Add Member. The person must already be your friend in PayCircle.' },
    ],
  },
  about: {
    title: 'About PayCircle',
    icon:  'information-circle-outline',
    items: [
      { icon: 'git-commit-outline',   iconColor: PC.accent,      heading: 'Version',      body: '1.0.0 — MVP Release', badge: 'MVP', badgeColor: PC.accent },
      { icon: 'people-circle-outline', iconColor: PC.positive,   heading: 'Description',  body: 'PayCircle is a group expense management app designed for college students sharing living expenses.' },
      { icon: 'code-slash-outline',   iconColor: PC.textSecondary, heading: 'Tech Stack', body: 'React Native (Expo) · Node.js · Express · MongoDB Atlas' },
      { icon: 'cash-outline',         iconColor: PC.positive,    heading: 'Currency',     body: 'Indian Rupee (₹) — INR only', badge: 'INR', badgeColor: PC.positive },
      { icon: 'chatbubble-outline',   iconColor: PC.textMuted,   heading: 'Support',      body: 'For issues or feedback, contact your group admin or the development team.' },
    ],
  },
  notifications: {
    title: 'Notifications',
    icon:  'notifications-outline',
    items: [
      { icon: 'receipt-outline',          iconColor: PC.positive,    heading: 'Expense Alerts',        body: 'Get notified when a new expense is added to your groups.',                                         badge: 'Planned', badgeColor: PC.warning },
      { icon: 'swap-horizontal-outline',  iconColor: PC.accent,      heading: 'Settlement Reminders',  body: 'Receive reminders when you have outstanding balances to settle.',                                  badge: 'Planned', badgeColor: PC.warning },
      { icon: 'wallet-outline',           iconColor: PC.warning,     heading: 'Budget Warnings',       body: 'Alerts when you\'re approaching or exceeding your monthly budget limit.',                         badge: 'Planned', badgeColor: PC.warning },
      { icon: 'time-outline',             iconColor: PC.textMuted,   heading: 'Coming Soon',           body: 'Push notification preferences will be fully configurable in a future update.' },
    ],
  },
  currency: {
    title: 'Currency',
    icon:  'cash-outline',
    items: [
      { icon: 'logo-usd',                 iconColor: PC.positive,    heading: 'Indian Rupee (₹)',  body: 'All amounts in PayCircle are displayed in Indian Rupees — the only supported currency.',             badge: 'Active', badgeColor: PC.positive },
      { icon: 'people-outline',           iconColor: PC.accent,      heading: 'Why INR?',          body: 'PayCircle is built specifically for Indian college students sharing everyday living expenses.' },
      { icon: 'globe-outline',            iconColor: PC.textMuted,   heading: 'Multi-currency',    body: 'Support for USD, EUR, and other currencies is planned for a future release.',                        badge: 'Planned', badgeColor: PC.warning },
    ],
  },
  appearance: {
    title: 'Appearance',
    icon:  'moon-outline',
    items: [
      { icon: 'moon',                     iconColor: PC.accent,      heading: 'Dark Mode',         body: 'PayCircle uses a refined dark theme (Mint Terminal) — optimised for OLED displays and low-light environments.', badge: 'Active', badgeColor: PC.positive },
      { icon: 'color-palette-outline',    iconColor: '#00E5BE',      heading: 'Accent Colour',     body: 'Electric Mint (#00E5BE) is the primary accent colour across all screens and UI elements.' },
      { icon: 'sunny-outline',            iconColor: PC.warning,     heading: 'Light Mode',        body: 'A light theme and additional colour options are planned for a future update.',                        badge: 'Planned', badgeColor: PC.warning },
    ],
  },
};

// ─── InfoModal ────────────────────────────────────────────────────────────────

function InfoModal({ content, onClose }) {
  const insets = useSafeAreaInsets();
  if (!content) return null;
  return (
    <Modal statusBarTranslucent visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { paddingBottom: insets.bottom + 28 }]}>
          {/* Accent strip */}
          <View style={modalStyles.accentStrip} />
          <View style={modalStyles.handle} />

          {/* Header */}
          <View style={modalStyles.headerRow}>
            {content.icon ? (
              <View style={modalStyles.titleIconBox}>
                <Ionicons name={content.icon} size={17} color={PC.accent} />
              </View>
            ) : null}
            <Text style={modalStyles.title}>{content.title}</Text>
          </View>

          {/* No `flex: 0` here — in RN that means flexShrink: 0, so the list kept
              its full content height, overflowed the sheet's maxHeight and the
              `overflow: hidden` clipped the Close button away. */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {content.items.map((item, i) => (
              <View key={i} style={modalStyles.item}>
                {item.icon ? (
                  <View style={[modalStyles.itemIconWrap, { backgroundColor: (item.iconColor || PC.accent) + '18' }]}>
                    <Ionicons name={item.icon} size={15} color={item.iconColor || PC.accent} />
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  <View style={modalStyles.itemHeadingRow}>
                    <Text style={modalStyles.itemHeading}>{item.heading}</Text>
                    {item.badge ? (
                      <View style={[modalStyles.badge, { backgroundColor: (item.badgeColor || PC.textMuted) + '1A', borderColor: (item.badgeColor || PC.textMuted) + '40' }]}>
                        <Text style={[modalStyles.badgeText, { color: item.badgeColor || PC.textMuted }]}>{item.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={modalStyles.itemBody}>{item.body}</Text>
                </View>
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
    backgroundColor: 'rgba(0,0,0,0.60)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: PC.borderLight,
    paddingHorizontal: 24,
    paddingBottom: 28,
    maxHeight: '82%',
    overflow: 'hidden',
  },
  accentStrip: {
    height: 2,
    backgroundColor: PC.accent,
    borderRadius: 2,
    marginHorizontal: 40,
    marginTop: 10,
    marginBottom: 14,
    opacity: 0.55,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: PC.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  titleIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PC.accent10,
    borderWidth: 1, borderColor: PC.accent + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: PC.textPrimary, fontSize: 17, fontWeight: '700' },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: PC.bgCardElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 13,
    marginBottom: 8,
  },
  itemIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  itemHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  itemHeading: { color: PC.textPrimary, fontSize: 13, fontWeight: '600' },
  itemBody:    { color: PC.textSecondary, fontSize: 13, lineHeight: 19 },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
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
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();

  const { toast, showToast } = useToast();

  const [groupsCount,  setGroupsCount]  = useState(null);
  const [txCount,      setTxCount]      = useState(null);
  const [netSaved,     setNetSaved]     = useState(null);
  const [friendCount,  setFriendCount]  = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [signingOut,   setSigningOut]   = useState(false);
  const [activeModal,  setActiveModal]  = useState(null);
  const [showSignOutAlert, setShowSignOutAlert] = useState(false);

  // Username banner modal
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameInput,     setUsernameInput]     = useState('');
  const [usernameLoading,   setUsernameLoading]   = useState(false);
  const [usernameError,     setUsernameError]     = useState('');

  // UPI ID modal
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiInput,     setUpiInput]     = useState('');
  const [upiLoading,   setUpiLoading]   = useState(false);
  const [upiError,     setUpiError]     = useState('');

  // Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword,  setDeletePassword]  = useState('');
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [deleteError,     setDeleteError]     = useState('');

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
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchStats(); }, [fetchStats]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Set UPI ID ────────────────────────────────────────────────────────────
  async function handleSetUpiId() {
    setUpiError('');
    const cleaned = upiInput.trim();
    if (cleaned && !/^[\w.\-]+@[\w]+$/.test(cleaned)) {
      setUpiError('Enter a valid UPI ID (e.g. name@bank)');
      return;
    }
    setUpiLoading(true);
    try {
      const { data } = await api.patch('/api/auth/me', { upiId: cleaned });
      await updateUser(data?.user ?? { upiId: cleaned });
      setShowUpiModal(false);
      setUpiInput('');
      showToast(cleaned ? `UPI ID saved: ${cleaned}` : 'UPI ID cleared.', 'success');
    } catch (err) {
      setUpiError(err?.message || 'Failed to save UPI ID');
    } finally {
      setUpiLoading(false);
    }
  }

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
      showToast(`Username set to @${cleaned}`, 'success');
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
      case 'contacts':
        router.push('/contacts');
        break;
      case 'notifications':
        setActiveModal('notifications');
        break;
      case 'privacy':
        setActiveModal('privacy');
        break;
      case 'currency':
        setActiveModal('currency');
        break;
      case 'appearance':
        setActiveModal('appearance');
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
    setShowSignOutAlert(true);
  }

  // Account deletion is irreversible, so the password is re-entered here rather
  // than trusting an unlocked phone. The screen unmounts on success (RootGuard
  // sees user -> null), so the loading flag is only cleared on failure.
  async function handleDeleteAccount() {
    if (!deletePassword) { setDeleteError('Enter your password to confirm.'); return; }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete('/api/auth/me', { data: { password: deletePassword } });
      setShowDeleteModal(false);
      setDeletePassword('');
      await logout();
    } catch (err) {
      setDeleteError(err.message || 'Could not delete your account. Please try again.');
      setDeleteLoading(false);
    }
  }

  function closeDeleteModal() {
    if (deleteLoading) return;
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteError('');
  }

  async function confirmSignOut() {
    setShowSignOutAlert(false);
    setSigningOut(true);
    try {
      await logout();
      // RootGuard in _layout.jsx detects user → null and redirects to /auth/login
    } catch {
      setSigningOut(false);
      showToast('Could not sign out. Please try again.', 'error');
    }
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
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PC.textPrimary} />}>

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

          {/* UPI ID — always visible, tappable to set/change */}
          <TouchableOpacity
            style={[styles.usernameRow, { marginTop: 6, borderColor: user?.upiId ? PC.positive : PC.border }]}
            onPress={() => { setUpiInput(user?.upiId || ''); setShowUpiModal(true); }}
            activeOpacity={0.7}>
            <Ionicons name="qr-code-outline" size={13} color={user?.upiId ? PC.positive : PC.textMuted} />
            <Text style={[styles.usernameDisplay, { color: user?.upiId ? PC.positive : PC.textMuted }, !user?.upiId && styles.usernameUnset]}>
              {user?.upiId ? user.upiId : 'Add UPI ID'}
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

        {/* ── Delete Account ── */}
        <View style={styles.settingsGroup}>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingsRow}
              activeOpacity={0.7}
              onPress={() => setShowDeleteModal(true)}
              disabled={signingOut}>
              <View style={styles.settingsIconBox}>
                <Ionicons name="trash-outline" size={18} color={PC.negative} />
              </View>
              <Text style={[styles.settingsLabel, { color: PC.negative }]}>Delete Account</Text>
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

      {/* ── Sign-out confirmation ── */}
      <AppAlert
        visible={showSignOutAlert}
        icon="log-out-outline"
        iconColor={PC.negative}
        title="Sign Out"
        message="Are you sure you want to sign out of PayCircle?"
        onRequestClose={() => setShowSignOutAlert(false)}
        buttons={[
          { text: 'Cancel',   style: 'cancel',      onPress: () => setShowSignOutAlert(false) },
          { text: 'Sign Out', style: 'destructive',  onPress: confirmSignOut },
        ]}
      />

      {/* ── Toast ── */}
      <AppToast toast={toast} />

      {/* ── Set Username Modal ── */}
      <Modal statusBarTranslucent visible={showUsernameModal} transparent animationType="slide" onRequestClose={() => { setShowUsernameModal(false); setUsernameError(''); }}>
        <KeyboardAvoidingView style={modalStyles.overlay} behavior="padding">
          <View style={[modalStyles.sheet, { paddingBottom: insets.bottom + 28 }]}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>{user?.username ? 'Change Username' : 'Set Username'}</Text>
            <Text style={[modalStyles.itemBody, { marginBottom: 16 }]}>
              {user?.username
                ? `Current: @${user.username}. Choose a new unique username.`
                : 'Choose a unique username so friends can find you.'
              }{' '}3–20 chars: lowercase letters, numbers, underscores.
            </Text>
            <ErrorBox message={usernameError} />
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
        </KeyboardAvoidingView>
      </Modal>
      {/* ── Set UPI ID Modal ── */}
      <Modal statusBarTranslucent visible={showUpiModal} transparent animationType="slide" onRequestClose={() => { setShowUpiModal(false); setUpiError(''); }}>
        <KeyboardAvoidingView style={modalStyles.overlay} behavior="padding">
          <View style={[modalStyles.sheet, { paddingBottom: insets.bottom + 28 }]}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>{user?.upiId ? 'Change UPI ID' : 'Add UPI ID'}</Text>
            <Text style={[modalStyles.itemBody, { marginBottom: 16 }]}>
              {user?.upiId
                ? `Current: ${user.upiId}. Update or clear your UPI ID.`
                : 'Your UPI ID lets friends pay you directly via UPI apps like GPay or PhonePe.'
              }
            </Text>
            <ErrorBox message={upiError} />
            <View style={styles.usernameInputBox}>
              <Ionicons name="qr-code-outline" size={17} color={PC.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.usernameInput}
                placeholder="yourname@bank"
                placeholderTextColor={PC.textMuted}
                value={upiInput}
                onChangeText={(v) => { setUpiInput(v); setUpiError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!upiLoading}
              />
            </View>
            <TouchableOpacity
              style={[modalStyles.closeBtn, upiLoading && { opacity: 0.6 }]}
              onPress={handleSetUpiId}
              disabled={upiLoading}
              activeOpacity={0.85}>
              {upiLoading
                ? <ActivityIndicator color="#060A09" size="small" />
                : <Text style={modalStyles.closeBtnText}>Save UPI ID</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowUpiModal(false); setUpiError(''); }} disabled={upiLoading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* ── Delete Account Modal ── */}
      <Modal statusBarTranslucent visible={showDeleteModal} transparent animationType="slide" onRequestClose={closeDeleteModal}>
        <KeyboardAvoidingView style={modalStyles.overlay} behavior="padding">
          <View style={[modalStyles.sheet, { paddingBottom: insets.bottom + 28 }]}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>Delete Account</Text>
            <Text style={[modalStyles.itemBody, { marginBottom: 10 }]}>
              This cannot be undone. Your personal transactions, budgets, private
              categories and friend connections are deleted permanently.
            </Text>
            <Text style={[modalStyles.itemBody, { marginBottom: 16 }]}>
              Shared records stay: expenses, settlements and splits you took part in
              remain in other people’ groups so their balances still add up, but your
              name and details are removed from them.
            </Text>
            <ErrorBox message={deleteError} />
            <View style={styles.usernameInputBox}>
              <Ionicons name="lock-closed-outline" size={17} color={PC.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.usernameInput}
                placeholder="Confirm your password"
                placeholderTextColor={PC.textMuted}
                value={deletePassword}
                onChangeText={(v) => { setDeletePassword(v); setDeleteError(''); }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!deleteLoading}
              />
            </View>
            <TouchableOpacity
              style={[modalStyles.closeBtn, { backgroundColor: PC.negative }, deleteLoading && { opacity: 0.6 }]}
              onPress={handleDeleteAccount}
              disabled={deleteLoading}
              activeOpacity={0.85}>
              {deleteLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[modalStyles.closeBtnText, { color: '#fff' }]}>Delete My Account</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={closeDeleteModal} disabled={deleteLoading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
