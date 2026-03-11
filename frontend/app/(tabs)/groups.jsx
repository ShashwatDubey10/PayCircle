import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PC } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { getFriends } from '@/services/friends';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GROUP_TYPES = ['Roommates', 'Trip', 'Mess', 'Miscellaneous'];

function groupIcon(type) {
  switch (type) {
    case 'Roommates':    return 'home-outline';
    case 'Trip':         return 'airplane-outline';
    case 'Mess':         return 'restaurant-outline';
    default:             return 'grid-outline';
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return '';
  const diff  = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  === 1) return 'Yesterday';
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// ─── Friend Card ──────────────────────────────────────────────────────────────

function FriendCard({ friend, onPress }) {
  return (
    <TouchableOpacity style={styles.groupCard} activeOpacity={0.75} onPress={onPress}>
      <View style={styles.friendAvatar}>
        <Text style={styles.friendAvatarText}>{getInitials(friend.name)}</Text>
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{friend.name}</Text>
        <Text style={styles.groupMetaText}>@{friend.username || '—'}</Text>
      </View>
      <View style={styles.groupBalance}>
        <Text style={styles.balanceLabel}>View splits</Text>
        <Ionicons name="chevron-forward" size={14} color={PC.textMuted} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({ group, onPress }) {
  const balance    = group.myBalance ?? 0;
  const isPositive = balance > 0;
  const isSettled  = Math.abs(balance) < 0.01;

  return (
    <TouchableOpacity style={styles.groupCard} activeOpacity={0.75} onPress={onPress}>
      <View style={styles.groupIconBox}>
        <Ionicons name={groupIcon(group.type)} size={20} color={PC.textSecondary} />
      </View>

      <View style={styles.groupInfo}>
        <View style={styles.groupNameRow}>
          <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{group.type}</Text>
          </View>
        </View>
        <View style={styles.groupMeta}>
          <Ionicons name="people-outline" size={13} color={PC.textMuted} />
          <Text style={styles.groupMetaText}>{group.members?.length ?? 0} members</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.groupMetaText}>{timeAgo(group.updatedAt || group.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.groupBalance}>
        {group.loadingBalance ? (
          <ActivityIndicator size="small" color={PC.textMuted} />
        ) : isSettled ? (
          <Text style={styles.balanceSettled}>Settled</Text>
        ) : (
          <>
            <Text style={[styles.balanceAmount, isPositive ? styles.balPos : styles.balNeg]}>
              {isPositive ? '+' : ''}₹{Math.abs(balance).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.balanceLabel}>{isPositive ? 'owed to you' : 'you owe'}</Text>
          </>
        )}
        <Ionicons name="chevron-forward" size={14} color={PC.textMuted} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Add Group Modal ──────────────────────────────────────────────────────────

function AddGroupModal({ visible, onClose, onCreated }) {
  const [name,    setName]    = useState('');
  const [type,    setType]    = useState('Roommates');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleCreate() {
    if (!name.trim() || name.trim().length < 3) {
      setError('Group name must be at least 3 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/groups', { name: name.trim(), type });
      onCreated(data.group);
      setName('');
      setType('Roommates');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setName('');
    setType('Roommates');
    setError('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Create Group</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={PC.negative} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.modalLabel}>Group Name</Text>
          <View style={styles.modalInputBox}>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Hostel Room 204"
              placeholderTextColor={PC.textMuted}
              value={name}
              onChangeText={(v) => { setName(v); setError(''); }}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

          <Text style={styles.modalLabel}>Type</Text>
          <View style={styles.typeGrid}>
            {GROUP_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, type === t && styles.typeChipActive]}
                onPress={() => setType(t)}
                disabled={loading}>
                <Ionicons
                  name={groupIcon(t)}
                  size={15}
                  color={type === t ? PC.textPrimary : PC.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.createBtn, loading && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color={PC.bg} size="small" />
              : <Text style={styles.createBtnText}>Create Group</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GroupsScreen() {
  const router     = useRouter();
  const { user }   = useAuth();

  const [groups,             setGroups]             = useState([]);
  const [settlements,        setSettlements]        = useState([]);
  const [friends,            setFriends]            = useState([]);
  const [tab,                setTab]                = useState('friends');
  const [loading,            setLoading]            = useState(true);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [friendsLoading,     setFriendsLoading]     = useState(false);
  const [settlementsFetched, setSettlementsFetched] = useState(false);
  const [friendsFetched,     setFriendsFetched]     = useState(false);
  const [refreshing,         setRefreshing]         = useState(false);
  const [error,              setError]              = useState('');
  const [showGroupModal,     setShowGroupModal]     = useState(false);
  const [showActionSheet,    setShowActionSheet]    = useState(false);

  // ── Fetch groups enriched with each group's balance in one request ──────────
  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await api.get('/api/groups?includeBalances=true');
      const enriched = (data.groups || []).map(g => ({
        ...g,
        myBalance:      g.myBalance ?? 0,
        loadingBalance: false,
      }));
      setGroups(enriched);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // ── Fetch settlements across all groups (lazy) ───────────────────────────
  const fetchSettlements = useCallback(async (groupList) => {
    if (!groupList.length) return;
    setLoadingSettlements(true);
    try {
      const allResults = await Promise.all(
        groupList.map(async (g) => {
          const { data } = await api.get(`/api/groups/${g._id}/settlements`);
          return (data.settlements || []).map(s => ({ ...s, groupName: g.name }));
        })
      );
      const flat = allResults.flat().sort((a, b) => new Date(b.date) - new Date(a.date));
      setSettlements(flat);
    } catch {
      // non-critical — keep empty
    } finally {
      setLoadingSettlements(false);
    }
  }, []);

  // ── Fetch friends (lazy) ─────────────────────────────────────────────────
  const fetchFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const list = await getFriends();
      setFriends(list || []);
    } catch {
      // non-critical
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  // Initial load — fetch groups and friends in parallel (friends is default tab)
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchGroups(), fetchFriends()]);
      setFriendsFetched(true);
      setLoading(false);
    }
    init();
  }, [fetchGroups, fetchFriends]);

  // Lazy-load settlements when tab switches and not already loaded
  useEffect(() => {
    if (tab === 'settlements' && groups.length > 0 && !settlementsFetched) {
      setSettlementsFetched(true);
      fetchSettlements(groups);
    }
  }, [tab, groups, settlementsFetched, fetchSettlements]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSettlements([]);
    setSettlementsFetched(false);
    await Promise.all([fetchGroups(), fetchFriends()]);
    setRefreshing(false);
  }, [fetchGroups, fetchFriends]);

  function handleGroupCreated(newGroup) {
    setGroups(prev => [{ ...newGroup, myBalance: 0, loadingBalance: false }, ...prev]);
  }

  // ── Summary totals ───────────────────────────────────────────────────────
  const youOweTotal    = groups.filter(g => g.myBalance < 0).reduce((s, g) => s + Math.abs(g.myBalance), 0);
  const owedToYouTotal = groups.filter(g => g.myBalance > 0).reduce((s, g) => s + g.myBalance, 0);

  // ── Settlement display helpers ───────────────────────────────────────────
  function settlementFromLabel(s) {
    const fromId = s.fromUserId?._id ?? s.fromUserId?.id ?? s.fromUserId;
    return fromId?.toString() === user?._id ? 'You' : s.fromUserId?.name ?? 'Unknown';
  }
  function settlementToLabel(s) {
    const toId = s.toUserId?._id ?? s.toUserId?.id ?? s.toUserId;
    return toId?.toString() === user?._id ? 'You' : s.toUserId?.name ?? 'Unknown';
  }
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Split</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowActionSheet(true)}>
          <Ionicons name="add" size={22} color={PC.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Summary Pills ── */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryVal}>₹{owedToYouTotal.toLocaleString('en-IN')}</Text>
          <Text style={styles.summaryLbl}>Owed to you</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryPill}>
          <Text style={[styles.summaryVal, { color: PC.negative }]}>
            ₹{youOweTotal.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.summaryLbl}>You owe</Text>
        </View>
      </View>

      {/* ── Toggle ── */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, tab === 'friends' && styles.toggleActive]}
          onPress={() => setTab('friends')}>
          <Text style={[styles.toggleText, tab === 'friends' && styles.toggleTextActive]}>Friends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, tab === 'groups' && styles.toggleActive]}
          onPress={() => setTab('groups')}>
          <Text style={[styles.toggleText, tab === 'groups' && styles.toggleTextActive]}>Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, tab === 'settlements' && styles.toggleActive]}
          onPress={() => setTab('settlements')}>
          <Text style={[styles.toggleText, tab === 'settlements' && styles.toggleTextActive]}>Settlements</Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={PC.textPrimary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={36} color={PC.textMuted} />
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setLoading(true); fetchGroups().finally(() => setLoading(false)); }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PC.textPrimary} />
          }>
          {tab === 'groups' && (
            groups.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="people-outline" size={28} color={PC.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No groups yet</Text>
                <Text style={styles.emptyText}>Tap + to create your first group</Text>
              </View>
            ) : (
              groups.map((g) => (
                <GroupCard
                  key={g._id}
                  group={g}
                  onPress={() => router.push(`/groups/${g._id}`)}
                />
              ))
            )
          )}

          {tab === 'friends' && (
            friendsLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={PC.textPrimary} />
              </View>
            ) : friends.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="person-outline" size={28} color={PC.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No friends yet</Text>
                <Text style={styles.emptyText}>Go to Profile → Friends to add people</Text>
              </View>
            ) : (
              friends.map((f) => {
                const fid = f._id ?? f.id;
                if (!fid) return null;
                return (
                  <FriendCard
                    key={fid}
                    friend={f}
                    onPress={() => router.push(`/direct/${fid}`)}
                  />
                );
              }}
              ))
            )
          )}

          {tab === 'settlements' && (
            loadingSettlements ? (
              <View style={styles.centered}>
                <ActivityIndicator color={PC.textPrimary} />
              </View>
            ) : settlements.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="swap-horizontal-outline" size={28} color={PC.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No settlements yet</Text>
                <Text style={styles.emptyText}>Settle up from a group to see history here</Text>
              </View>
            ) : (
              settlements.map((s) => (
                <View key={s._id} style={styles.settlementCard}>
                  <View style={styles.settlementLeft}>
                    <Text style={styles.settlementParties}>
                      <Text style={{ color: PC.textPrimary }}>{settlementFromLabel(s)}</Text>
                      <Text style={{ color: PC.textSecondary }}> → </Text>
                      <Text style={{ color: PC.textPrimary }}>{settlementToLabel(s)}</Text>
                    </Text>
                    <Text style={styles.settlementGroup}>{s.groupName}</Text>
                  </View>
                  <View style={styles.settlementRight}>
                    <Text style={styles.settlementAmount}>₹{(s.amount ?? 0).toLocaleString('en-IN')}</Text>
                    <Text style={styles.settlementDate}>{formatDate(s.date)}</Text>
                  </View>
                </View>
              ))
            )
          )}
        </ScrollView>
      )}

      {/* ── Action Sheet Modal ── */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}>
        <TouchableOpacity
          style={styles.actionOverlay}
          activeOpacity={1}
          onPress={() => setShowActionSheet(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.actionSheet}>
              <View style={styles.actionHandle} />

              <TouchableOpacity
                style={styles.actionRow}
                activeOpacity={0.75}
                onPress={() => { setShowActionSheet(false); setShowGroupModal(true); }}>
                <View style={styles.actionIconBox}>
                  <Ionicons name="people-outline" size={22} color={PC.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>New Group</Text>
                  <Text style={styles.actionSub}>Track shared group expenses</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={PC.textMuted} />
              </TouchableOpacity>

              <View style={styles.actionDivider} />

              <TouchableOpacity
                style={styles.actionRow}
                activeOpacity={0.75}
                onPress={() => { setShowActionSheet(false); router.push('/friends'); }}>
                <View style={styles.actionIconBox}>
                  <Ionicons name="git-branch-outline" size={22} color={PC.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Split with Friend</Text>
                  <Text style={styles.actionSub}>Track 1-on-1 expenses</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={PC.textMuted} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <AddGroupModal
        visible={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onCreated={handleGroupCreated}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PC.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title:  { color: PC.textPrimary, fontSize: 22, fontWeight: '700' },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PC.bgCard,
    borderWidth: 1,
    borderColor: PC.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    paddingVertical: 16,
    marginBottom: 16,
  },
  summaryPill:    { flex: 1, alignItems: 'center' },
  summaryVal:     { color: PC.positive, fontSize: 18, fontWeight: '700', marginBottom: 3 },
  summaryLbl:     { color: PC.textSecondary, fontSize: 12 },
  summaryDivider: { width: 1, backgroundColor: PC.border },

  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: PC.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn:        { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  toggleActive:     { backgroundColor: PC.bgCardElevated },
  toggleText:       { color: PC.textMuted, fontSize: 13, fontWeight: '500' },
  toggleTextActive: { color: PC.textPrimary },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  errorMsg:  { color: PC.textSecondary, fontSize: 14, marginTop: 12, textAlign: 'center' },
  retryBtn:  { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PC.bgCard, borderRadius: 10, borderWidth: 1, borderColor: PC.border },
  retryText: { color: PC.textPrimary, fontSize: 14, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { color: PC.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptyText:  { color: PC.textMuted, fontSize: 13 },

  // Friend card
  friendAvatar:     { width: 44, height: 44, borderRadius: 13, backgroundColor: PC.bgCardElevated, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  friendAvatarText: { color: PC.textPrimary, fontSize: 16, fontWeight: '700' },

  // Group card
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 16,
    marginBottom: 10,
  },
  groupIconBox:  { width: 44, height: 44, borderRadius: 13, backgroundColor: PC.bgCardElevated, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  groupInfo:     { flex: 1 },
  groupNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  groupName:     { color: PC.textPrimary, fontSize: 14, fontWeight: '600', flex: 1 },
  typeBadge:     { paddingHorizontal: 7, paddingVertical: 2, backgroundColor: PC.bgCardElevated, borderRadius: 6 },
  typeText:      { color: PC.textSecondary, fontSize: 10, fontWeight: '500' },
  groupMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  groupMetaText: { color: PC.textMuted, fontSize: 12 },
  dot:           { color: PC.textMuted, fontSize: 12 },

  groupBalance:   { alignItems: 'flex-end', minWidth: 72 },
  balanceAmount:  { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  balanceLabel:   { color: PC.textMuted, fontSize: 10 },
  balanceSettled: { color: PC.textMuted, fontSize: 13, fontWeight: '500' },
  balPos:         { color: PC.positive },
  balNeg:         { color: PC.negative },

  // Settlement card
  settlementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 16,
    marginBottom: 10,
  },
  settlementLeft:    { flex: 1 },
  settlementParties: { fontSize: 14, marginBottom: 4 },
  settlementGroup:   { color: PC.textMuted, fontSize: 12 },
  settlementRight:   { alignItems: 'flex-end' },
  settlementAmount:  { color: PC.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  settlementDate:    { color: PC.textMuted, fontSize: 12 },

  // Add Group Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: PC.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:  { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 20 },
  modalLabel:  { color: PC.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 8 },
  modalInputBox: {
    backgroundColor: PC.bgInput,
    borderWidth: 1,
    borderColor: PC.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalInput: { color: PC.textPrimary, fontSize: 15 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PC.border,
    backgroundColor: PC.bgCardElevated,
  },
  typeChipActive:     { borderColor: PC.textPrimary, backgroundColor: 'rgba(255,255,255,0.07)' },
  typeChipText:       { color: PC.textMuted, fontSize: 13, fontWeight: '500' },
  typeChipTextActive: { color: PC.textPrimary },

  createBtn:         { backgroundColor: PC.textPrimary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText:     { color: PC.bg, fontSize: 15, fontWeight: '700' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(224,90,90,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(224,90,90,0.30)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: { flex: 1, color: PC.negative, fontSize: 13 },

  // Action sheet
  actionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  actionSheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: PC.border,
    padding: 24,
    paddingBottom: 40,
  },
  actionHandle:  { width: 36, height: 4, backgroundColor: PC.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  actionRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  actionIconBox: { width: 44, height: 44, borderRadius: 13, backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center' },
  actionTitle:   { color: PC.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  actionSub:     { color: PC.textSecondary, fontSize: 12 },
  actionDivider: { height: 1, backgroundColor: PC.border, marginVertical: 4 },
});
