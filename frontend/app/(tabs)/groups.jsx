import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, TextInput } from '@/components/text';
import Touchable from '@/components/Touchable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PC, touchSlop } from '@/constants/theme';
import ErrorBox from '@/components/ErrorBox';
import { useAuth } from '@/context/AuthContext';
import { useBadge } from '@/context/BadgeContext';
import api from '@/services/api';
import { getFriends, getPendingRequests } from '@/services/friends';
import { getAllDirectSettlements, getAllDirectBalances } from '@/services/directSplit';
import { getContacts } from '@/services/contacts';

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

// ─── Helpers (settlements) ────────────────────────────────────────────────────

function normalizeDirectSettle(settle, myId) {
  const fromId  = settle.fromUserId?._id ?? settle.fromUserId?.id ?? settle.fromUserId;
  const isPayer = fromId?.toString() === myId?.toString();
  const other   = isPayer
    ? (settle.toUserId?.name   ?? 'Someone')
    : (settle.fromUserId?.name ?? 'Someone');
  return {
    _id:             settle._id,
    _isDirectSettle: true,
    amount:          settle.amount,
    notes:           isPayer ? `Settled with ${other}` : `${other} settled up`,
    date:            settle.confirmedAt ?? settle.createdAt,
  };
}

// ─── Settle Row (Not Opened / Open) ───────────────────────────────────────────

function SettleRow({ item, myId, onPress, last }) {
  let icon, title, meta, amountText, amountStyle;

  if (item._groupId) {
    // Not Opened — group debt
    const fromStr = item.from?.id ?? item.from?._id?.toString() ?? item.from?.toString();
    const iOwe    = fromStr === myId?.toString();
    const other   = iOwe ? (item.to?.name ?? 'Someone') : (item.from?.name ?? 'Someone');
    icon        = 'people-outline';
    title       = iOwe ? `You owe ${other}` : `${other} owes you`;
    meta        = `${item._groupName} · group`;
    amountText  = `₹${Number(item.amount ?? 0).toLocaleString('en-IN')}`;
    amountStyle = iOwe ? styles.amtNeg : styles.amtPos;
  } else if (item.status === 'pending') {
    // Open — pending settle request
    const fromStr = item.fromUserId?._id?.toString() ?? item.fromUserId?.toString();
    const iDebtor = fromStr === myId?.toString();
    const other   = iDebtor
      ? (item.toUserId?.name   ?? 'Someone')
      : (item.fromUserId?.name ?? 'Someone');
    icon        = 'time-outline';
    title       = iDebtor ? `Awaiting ${other}'s confirmation` : `${other} wants to settle`;
    meta        = `₹${Number(item.amount ?? 0).toLocaleString('en-IN')} · pending`;
    amountText  = `₹${Number(item.amount ?? 0).toLocaleString('en-IN')}`;
    amountStyle = iDebtor ? styles.amtNeg : styles.amtPos;
  } else {
    // Not Opened — direct balance
    const iOwe  = item.balance < 0;
    const other = item.friend?.name ?? 'Friend';
    icon        = 'swap-horizontal-outline';
    title       = iOwe ? `You owe ${other}` : `${other} owes you`;
    meta        = 'Direct · tap to settle';
    amountText  = `₹${Math.abs(Number(item.balance ?? 0)).toLocaleString('en-IN')}`;
    amountStyle = iOwe ? styles.amtNeg : styles.amtPos;
  }

  return (
    <>
      <Touchable style={styles.settleRow} onPress={onPress}>
        <View style={styles.settleRowIcon}>
          <Ionicons name={icon} size={18} color={PC.textSecondary} />
        </View>
        <View style={styles.settleRowInfo}>
          <Text style={styles.settleRowLabel} numberOfLines={1}>{title}</Text>
          <Text style={styles.settleRowMeta}>{meta}</Text>
        </View>
        <View style={styles.settleRowAmt}>
          <Text style={[styles.settleRowAmtText, amountStyle]}>{amountText}</Text>
          <Ionicons name="chevron-forward" size={14} color={PC.textMuted} style={{ marginTop: 2 }} />
        </View>
      </Touchable>
      {!last && <View style={styles.settleRowDivider} />}
    </>
  );
}

// ─── Friend Card ──────────────────────────────────────────────────────────────

function FriendCard({ friend, onPress, directBalance }) {
  const db = directBalance ?? null;
  const hasBalance = db && Math.abs(db.balance ?? 0) > 0.01;
  const isPositive = db && (db.balance ?? 0) > 0;

  return (
    <Touchable style={styles.friendCard} onPress={onPress}>
      <View style={[styles.friendAvatar, hasBalance && styles.friendAvatarActive]}>
        <Text style={styles.friendAvatarText}>{getInitials(friend.name)}</Text>
        {hasBalance && <View style={styles.avatarDot} />}
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName} numberOfLines={1}>{friend.name}</Text>
        <Text style={styles.friendUsername} numberOfLines={1}>@{friend.username || '—'}</Text>
      </View>
      {hasBalance && (
        <Text style={[styles.friendBalance, isPositive ? styles.balPos : styles.balNeg]}>
          {isPositive ? '+' : ''}₹{Math.abs(db.balance).toLocaleString('en-IN')}
        </Text>
      )}
    </Touchable>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({ group, onPress }) {
  const balance    = group.myBalance ?? 0;
  const isPositive = balance > 0;
  const isSettled  = Math.abs(balance) < 0.01;

  return (
    <Touchable style={styles.groupCard} onPress={onPress}>
      <View style={[styles.groupIconBox, { position: 'relative' }]}>
        <Ionicons name="people-outline" size={20} color={PC.textSecondary} />
        {Math.abs(group.myBalance ?? 0) > 0.01 && <View style={styles.groupBadgeDot} />}
      </View>

      <View style={styles.groupInfo}>
        <View style={styles.groupNameRow}>
          <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
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
    </Touchable>
  );
}

// ─── Chat Row (WhatsApp-style) ─────────────────────────────────────────────────

function ChatRow({ item, onPress, last }) {
  const isGroup   = item._type === 'group';
  const isContact = item._type === 'contact';
  const balance   = item.balance ?? 0;
  const settled   = Math.abs(balance) < 0.01;
  const isPos     = balance > 0;

  return (
    <>
      <Touchable style={styles.chatRow} onPress={onPress}>
        {/* Avatar */}
        <View style={[styles.chatAvatar, isGroup && styles.chatAvatarGroup, isContact && styles.chatAvatarContact]}>
          {isGroup
            ? <Ionicons name="people-outline" size={20} color={PC.accent} />
            : <Text style={styles.chatAvatarText}>{getInitials(item.name)}</Text>
          }
          {!settled && <View style={[styles.chatAvatarDot, { backgroundColor: isPos ? PC.positive : PC.negative }]} />}
        </View>

        {/* Info */}
        <View style={styles.chatInfo}>
          <View style={styles.chatTopRow}>
            <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.chatTime}>{timeAgo(item.lastActivity)}</Text>
          </View>
          <View style={styles.chatBottomRow}>
            <Text style={styles.chatSub} numberOfLines={1}>
              {isGroup
                ? `${item.memberCount} member${item.memberCount !== 1 ? 's' : ''}`
                : isContact
                  ? 'Personal contact'
                  : item.username ? `@${item.username}` : 'Direct split'}
            </Text>
            {settled ? (
              <Text style={styles.chatBalSettled}>Settled</Text>
            ) : (
              <Text style={[styles.chatBal, isPos ? styles.amtPos : styles.amtNeg]}>
                {isPos ? '+' : '−'}₹{Math.abs(balance).toLocaleString('en-IN')}
              </Text>
            )}
          </View>
        </View>
      </Touchable>
      {!last && <View style={styles.chatDivider} />}
    </>
  );
}

// ─── Add Group Modal ──────────────────────────────────────────────────────────

function AddGroupModal({ visible, onClose, onCreated }) {
  const insets = useSafeAreaInsets();
  const [name,    setName]    = useState('');
  const [type,    setType]    = useState('Miscellaneous');
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
      // `type` is required by the API — omitting it rejected every create.
      const { data } = await api.post('/api/groups', { name: name.trim(), type });
      onCreated(data.group);
      setName('');
      setType('Miscellaneous');
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
    setType('Miscellaneous');
    setError('');
    onClose();
  }

  return (
    <Modal statusBarTranslucent visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior="padding">
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 40 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Create Group</Text>

          <ErrorBox message={error} />

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

          <Text style={styles.modalLabel}>Group Type</Text>
          <View style={styles.typeGrid}>
            {GROUP_TYPES.map((t) => {
              const active = type === t;
              return (
                <Touchable
                  key={t}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => setType(t)}
                  disabled={loading}>
                  <Ionicons
                    name={groupIcon(t)}
                    size={14}
                    color={active ? PC.accent : PC.textMuted}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{t}</Text>
                </Touchable>
              );
            })}
          </View>

          <Touchable tone="accent"
            style={[styles.createBtn, loading && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color="#060A09" size="small" />
              : <Text style={styles.createBtnText}>Create Group</Text>
            }
          </Touchable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const router     = useRouter();
  const { user }   = useAuth();

  const { setSplitBadge } = useBadge();

  const [groups,             setGroups]             = useState([]);
  const [settlements,        setSettlements]        = useState([]);
  const [friends,            setFriends]            = useState([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [showSettlements,    setShowSettlements]    = useState(false);
  const [settleFilter,       setSettleFilter]       = useState('not_opened');
  const [splitFilter,        setSplitFilter]        = useState('all');
  const [showFilterSheet,    setShowFilterSheet]    = useState(false);
  const [contacts,           setContacts]           = useState([]);
  const [allDirectSettles,   setAllDirectSettles]   = useState([]);
  const [directBalances,     setDirectBalances]     = useState([]);
  const [groupBalanceMaps,   setGroupBalanceMaps]   = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [friendsLoading,     setFriendsLoading]     = useState(false);
  const [settlementsFetched, setSettlementsFetched] = useState(false);
  const [refreshing,         setRefreshing]         = useState(false);
  const [error,              setError]              = useState('');
  const [showGroupModal,     setShowGroupModal]     = useState(false);
  const [showActionSheet,    setShowActionSheet]    = useState(false);
  const [showContactPicker,  setShowContactPicker]  = useState(false);
  const [pickerContacts,     setPickerContacts]     = useState([]);
  const [pickerLoading,      setPickerLoading]      = useState(false);
  const [unseenCount,        setUnseenCount]        = useState(0);

  // ── Compute unseen direct-split conversations + unseen groups ────────────
  const computeUnseen = useCallback(async (friendsList, groupsList) => {
    try {
      const [rawDirect, rawGroup] = await Promise.all([
        AsyncStorage.getItem('directLastViewed'),
        AsyncStorage.getItem('groupLastViewed'),
      ]);
      const directMap = rawDirect ? JSON.parse(rawDirect) : {};
      const groupMap  = rawGroup  ? JSON.parse(rawGroup)  : {};

      let count = 0;
      for (const f of (friendsList || [])) {
        const fid = (f._id ?? f.id)?.toString();
        const lastViewed   = directMap[fid] ? new Date(directMap[fid]) : new Date(0);
        const lastActivity = f.lastActivity  ? new Date(f.lastActivity) : new Date(0);
        if (lastActivity > lastViewed) count++;
      }
      for (const g of (groupsList || [])) {
        const gid = g._id?.toString();
        const lastViewed   = groupMap[gid] ? new Date(groupMap[gid]) : new Date(0);
        const lastActivity = g.updatedAt   ? new Date(g.updatedAt)   : new Date(0);
        if (lastActivity > lastViewed) count++;
      }
      setUnseenCount(count);
    } catch { /* non-critical */ }
  }, []);

  // ── Fetch groups enriched with each group's balance in one request ──────────
  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await api.get('/api/groups?includeBalances=true&includeDebts=true');
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

  // ── Fetch settlements + balance maps across all groups (lazy) ───────────────
  const fetchSettlements = useCallback(async (groupList) => {
    if (!groupList.length) return;
    setLoadingSettlements(true);
    try {
      // Settlements come back for every group in one request, and each group's
      // simplified debts already arrived with the group list, so this no longer
      // costs two requests per group.
      const { data } = await api.get('/api/users/me/group-settlements');
      const flat = (data.settlements || [])
        .map(s => ({ ...s, groupName: s.groupName ?? '' }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setSettlements(flat);
      setGroupBalanceMaps(
        groupList.map(g => ({ groupId: g._id, groupName: g.name, debts: g.debts || [] })),
      );
    } catch {
      // non-critical — keep empty
    } finally {
      setLoadingSettlements(false);
    }
  }, []);

  // ── Fetch direct settle data ──────────────────────────────────────────────
  const fetchDirectData = useCallback(async () => {
    try {
      const [settlesData, balancesData] = await Promise.all([
        getAllDirectSettlements(),
        getAllDirectBalances(),
      ]);
      setAllDirectSettles(settlesData.settlements || []);
      setDirectBalances(balancesData.balances || []);
    } catch { /* non-critical */ }
  }, []);

  // ── Fetch personal contacts ───────────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    try {
      const list = await getContacts();
      setContacts(list || []);
    } catch { /* non-critical */ }
  }, []);

  // ── Fetch friends (lazy) ─────────────────────────────────────────────────
  const fetchFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const [list, requests] = await Promise.all([getFriends(), getPendingRequests()]);
      setFriends(list || []);
      setPendingRequestCount((requests || []).length);
      await computeUnseen(list || [], groups);
    } catch {
      // non-critical
    } finally {
      setFriendsLoading(false);
    }
  }, [computeUnseen]);

  // Initial load — fetch groups, friends, direct data, and personal expenses in parallel
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchGroups(), fetchFriends(), fetchDirectData(), fetchContacts()]);
      setLoading(false);
    }
    init();
  }, [fetchGroups, fetchFriends, fetchDirectData, fetchContacts]);

  // Lazy-load settlements when panel opens and not already loaded.
  useEffect(() => {
    if (!showSettlements || settlementsFetched) return;
    if (groups.length > 0) {
      fetchSettlements(groups);
      setSettlementsFetched(true);
    }
  }, [showSettlements, groups, settlementsFetched, fetchSettlements]);

  // Re-compute unseen count when screen gains focus (after returning from a chat or group)
  useFocusEffect(useCallback(() => {
    computeUnseen(friends, groups);
  }, [computeUnseen, friends, groups]));

  // Sync navbar Split badge with unseen conversation count
  useEffect(() => {
    setSplitBadge(unseenCount);
  }, [unseenCount, setSplitBadge]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSettlements([]);
    setAllDirectSettles([]);
    setDirectBalances([]);
    setGroupBalanceMaps([]);
    setSettlementsFetched(false);
    await Promise.all([fetchGroups(), fetchFriends(), fetchDirectData(), fetchContacts()]);
    setRefreshing(false);
  }, [fetchGroups, fetchFriends, fetchDirectData, fetchContacts]);

  function handleGroupCreated(newGroup) {
    setGroups(prev => [{ ...newGroup, myBalance: 0, loadingBalance: false }, ...prev]);
  }

  async function openContactPicker() {
    setShowActionSheet(false);
    setPickerLoading(true);
    setShowContactPicker(true);
    try {
      const list = await getContacts();
      setPickerContacts(list);
    } catch {
      setPickerContacts([]);
    } finally {
      setPickerLoading(false);
    }
  }

  // ── Summary totals ───────────────────────────────────────────────────────
  const youOweTotal    = groups.filter(g => g.myBalance < 0).reduce((s, g) => s + Math.abs(g.myBalance), 0)
                       + directBalances.filter(b => b.balance < 0).reduce((s, b) => s + Math.abs(b.balance), 0);
  const owedToYouTotal = groups.filter(g => g.myBalance > 0).reduce((s, g) => s + g.myBalance, 0)
                       + directBalances.filter(b => b.balance > 0).reduce((s, b) => s + b.balance, 0);

  // ── Settlement Hub derived values ────────────────────────────────────────
  const meIdStr = user?._id?.toString();

  const openSettles = allDirectSettles.filter(s => s.status === 'pending');

  const closedDirectSettles = allDirectSettles
    .filter(s => s.status === 'confirmed')
    .map(s => normalizeDirectSettle(s, user?._id));

  const notOpenedDirect = directBalances.filter(b => !b.hasPendingSettle);

  const notOpenedGroup = groupBalanceMaps.flatMap(gm =>
    (gm.debts || [])
      .filter(d => {
        const fromStr = d.from?.id ?? d.from?._id?.toString() ?? d.from?.toString();
        const toStr   = d.to?.id   ?? d.to?._id?.toString()   ?? d.to?.toString();
        return fromStr === meIdStr || toStr === meIdStr;
      })
      .map(d => ({ ...d, _groupId: gm.groupId, _groupName: gm.groupName }))
  );

  const closedItems = [...closedDirectSettles, ...settlements.map(s => {
    const fromId = s.fromUserId?._id ?? s.fromUserId?.id ?? s.fromUserId;
    const isPaid = fromId?.toString() === user?._id?.toString();
    return { ...s, _isGroupSettle: true, _isPaid: isPaid };
  })].sort((a, b) => {
    const ta = Date.parse(a.date) || 0;
    const tb = Date.parse(b.date) || 0;
    return tb - ta;
  });

  // ── Unified chat list: friends + contacts + groups sorted by last activity ─
  const combinedList = useMemo(() => {
    const items = [];
    friends.forEach(f => {
      const fid = (f._id ?? f.id)?.toString();
      if (!fid) return;
      const db = directBalances.find(b => b.friendId === fid);
      if (!db) return; // only show friends that have at least one direct split
      items.push({ _type: 'friend', _id: fid, name: f.name, username: f.username, balance: db?.balance ?? 0, lastActivity: f.lastActivity });
    });
    contacts.forEach(c => {
      const cid = c._id?.toString();
      if (!cid) return;
      const db = directBalances.find(b => b.friendId === cid);
      if (!db) return; // only show contacts that have had at least one split
      items.push({ _type: 'contact', _id: cid, name: c.name, balance: db.balance ?? 0, lastActivity: c.updatedAt || c.createdAt });
    });
    groups.forEach(g => {
      items.push({ _type: 'group', _id: g._id, name: g.name, type: g.type, memberCount: g.members?.length ?? 0, balance: g.myBalance ?? 0, lastActivity: g.updatedAt || g.createdAt });
    });
    return items.sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0));
  }, [friends, contacts, groups, directBalances]);

  // ── Filtered chat list ────────────────────────────────────────────────────
  const filteredList = useMemo(() => {
    if (splitFilter === 'all') return combinedList;
    if (splitFilter === 'group')   return combinedList.filter(i => i._type === 'group');
    if (splitFilter === 'friend')  return combinedList.filter(i => i._type === 'friend');
    if (splitFilter === 'contact') return combinedList.filter(i => i._type === 'contact');
    return combinedList;
  }, [combinedList, splitFilter]);

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
        <Text style={styles.title}>Splits</Text>
        <View style={styles.headerActions}>
          <Touchable
            style={[styles.headerBtn, { position: 'relative' }]}
            onPress={() => setShowSettlements(true)}>
            <Text style={styles.headerBtnText}>Settlements</Text>
            {openSettles.length > 0 && <View style={styles.headerBtnDot} />}
          </Touchable>
          <Touchable
            style={styles.addBtn}
            onPress={() => setShowActionSheet(true)}
            hitSlop={touchSlop(38)}
            accessibilityRole="button"
            accessibilityLabel="New group or split">
            <Ionicons name="add" size={22} color={PC.accent} />
          </Touchable>
        </View>
      </View>

      {/* ── Balance Summary ── */}
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


      {/* ── Chat List ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={PC.textPrimary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={36} color={PC.textMuted} />
          <Text style={styles.errorMsg}>{error}</Text>
          <Touchable style={styles.retryBtn}
            onPress={() => { setLoading(true); fetchGroups().finally(() => setLoading(false)); }}>
            <Text style={styles.retryText}>Retry</Text>
          </Touchable>
        </View>
      ) : filteredList.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={40} color={PC.textMuted} />
          <Text style={styles.emptyTitle}>{splitFilter === 'all' ? 'No splits yet' : 'Nothing here'}</Text>
          <Text style={styles.emptyText}>{splitFilter === 'all' ? 'Add a friend or create a group to get started' : 'No items match the selected filter'}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PC.textPrimary} />}>
          <View style={styles.chatList}>
            {filteredList.map((item, i) => (
              <ChatRow
                key={`${item._type}-${item._id}`}
                item={item}
                last={i === filteredList.length - 1}
                onPress={() => router.push(item._type === 'friend' || item._type === 'contact' ? `/direct/${item._id}` : `/groups/${item._id}`)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── Filter FAB ── */}
      <Touchable tone="accent"
        style={[styles.fab, splitFilter !== 'all' && styles.fabActive]}
        onPress={() => setShowFilterSheet(true)}
        accessibilityRole="button"
        accessibilityLabel="Filter splits"
        accessibilityState={{ selected: splitFilter !== 'all' }}
      >
        <Ionicons name="options-outline" size={22} color={PC.bg} />
      </Touchable>

      {/* ── Settlements Modal ── */}
      <Modal statusBarTranslucent visible={showSettlements} animationType="slide" onRequestClose={() => setShowSettlements(false)}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.settleModalHeader}>
            <Touchable
              onPress={() => setShowSettlements(false)}
              style={styles.settleBackBtn}
              hitSlop={touchSlop(38)}
              accessibilityRole="button"
              accessibilityLabel="Close settlements">
              <Ionicons name="chevron-back" size={22} color={PC.textPrimary} />
            </Touchable>
            <Text style={styles.settleModalTitle}>Settlements</Text>
            <View style={{ width: 38 }} />
          </View>

          <View style={styles.settleFilterRow}>
            {[{ key: 'not_opened', label: 'Settle' }, { key: 'open', label: 'Open' }, { key: 'closed', label: 'Closed' }]
              .map(({ key, label }) => (
                <Touchable key={key}
                  style={[styles.settleFilterBtn, settleFilter === key && styles.settleFilterActive]}
                  onPress={() => setSettleFilter(key)}>
                  <Text style={[styles.settleFilterText, settleFilter === key && styles.settleFilterTextActive]}>{label}</Text>
                </Touchable>
              ))}
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {loadingSettlements ? (
              <View style={styles.centered}>
                <ActivityIndicator color={PC.textPrimary} />
              </View>
            ) : settleFilter === 'not_opened' ? (
              [...notOpenedDirect, ...notOpenedGroup].length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}><Ionicons name="checkmark-circle-outline" size={28} color={PC.textMuted} /></View>
                  <Text style={styles.emptyTitle}>No outstanding balances</Text>
                  <Text style={styles.emptyText}>All balances are settled or have open requests</Text>
                </View>
              ) : (
                <View style={styles.settleListCard}>
                  {[...notOpenedDirect, ...notOpenedGroup].map((item, i, arr) => {
                    const key = item.friendId ?? `${item._groupId}-${i}`;
                    const onPress = () => { setShowSettlements(false); item._groupId ? router.push(`/groups/${item._groupId}`) : router.push(`/direct/${item.friendId}`); };
                    return <SettleRow key={key} item={item} myId={user?._id} onPress={onPress} last={i === arr.length - 1} />;
                  })}
                </View>
              )
            ) : settleFilter === 'open' ? (
              openSettles.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}><Ionicons name="time-outline" size={28} color={PC.textMuted} /></View>
                  <Text style={styles.emptyTitle}>No pending requests</Text>
                  <Text style={styles.emptyText}>No settle requests awaiting confirmation</Text>
                </View>
              ) : (
                <View style={styles.settleListCard}>
                  {openSettles.map((item, i) => {
                    const fromStr  = item.fromUserId?._id?.toString() ?? item.fromUserId?.toString();
                    const friendId = fromStr === meIdStr ? (item.toUserId?._id?.toString() ?? item.toUserId?.toString()) : fromStr;
                    return <SettleRow key={item._id} item={item} myId={user?._id} onPress={friendId ? () => { setShowSettlements(false); router.push(`/direct/${friendId}`); } : undefined} last={i === openSettles.length - 1} />;
                  })}
                </View>
              )
            ) : (
              closedItems.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}><Ionicons name="swap-horizontal-outline" size={28} color={PC.textMuted} /></View>
                  <Text style={styles.emptyTitle}>No settlements yet</Text>
                  <Text style={styles.emptyText}>Settle up to see history here</Text>
                </View>
              ) : (
                closedItems.map((s) => (
                  <View key={s._id} style={styles.settlementCard}>
                    <View style={styles.settlementLeft}>
                      {s._isDirectSettle ? (
                        <Text style={styles.settlementParties}><Text style={{ color: PC.textPrimary }}>{s.notes}</Text></Text>
                      ) : (
                        <Text style={styles.settlementParties}>
                          <Text style={{ color: PC.textPrimary }}>{settlementFromLabel(s)}</Text>
                          <Text style={{ color: PC.textSecondary }}> → </Text>
                          <Text style={{ color: PC.textPrimary }}>{settlementToLabel(s)}</Text>
                        </Text>
                      )}
                      <Text style={styles.settlementGroup}>{s._isDirectSettle ? 'Direct' : s.groupName}</Text>
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
        </SafeAreaView>
      </Modal>

      {/* ── Action Sheet Modal ── */}
      <Modal statusBarTranslucent
        visible={showActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}>
        <Touchable
          style={styles.actionOverlay}
          onPress={() => setShowActionSheet(false)}>
          <Touchable onPress={() => {}}>
            <View style={[styles.actionSheet, { paddingBottom: insets.bottom + 40 }]}>
              <View style={styles.actionHandle} />

              <Touchable
                style={styles.actionRow}
                onPress={() => { setShowActionSheet(false); setShowGroupModal(true); }}>
                <View style={styles.actionIconBox}>
                  <Ionicons name="people-outline" size={22} color={PC.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>New Group</Text>
                  <Text style={styles.actionSub}>Track shared group expenses</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={PC.textMuted} />
              </Touchable>

              <View style={styles.actionDivider} />

              <Touchable
                style={styles.actionRow}
                onPress={() => { setShowActionSheet(false); router.push('/friends'); }}>
                <View style={styles.actionIconBox}>
                  <Ionicons name="git-branch-outline" size={22} color={PC.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Split with Friend</Text>
                  <Text style={styles.actionSub}>Track 1-on-1 expenses</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={PC.textMuted} />
              </Touchable>

              <View style={styles.actionDivider} />

              <Touchable
                style={styles.actionRow}
                onPress={openContactPicker}>
                <View style={[styles.actionIconBox, { borderColor: PC.accent20, backgroundColor: PC.accent10 }]}>
                  <Ionicons name="person-add-outline" size={22} color={PC.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>Split with Personal Contact</Text>
                  <Text style={styles.actionSub}>Someone not on PayCircle</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={PC.textMuted} />
              </Touchable>
            </View>
          </Touchable>
        </Touchable>
      </Modal>

      {/* ── Contact Picker Modal ── */}
      <Modal statusBarTranslucent
        visible={showContactPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactPicker(false)}>
        <View style={styles.actionOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowContactPicker(false)} />
          <View style={[styles.actionSheet, { paddingBottom: insets.bottom + 36 }]}>
            <View style={styles.actionHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { marginBottom: 0, flex: 1 }]}>Personal Contacts</Text>
              <Touchable
                onPress={() => { setShowContactPicker(false); router.push('/contacts'); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="settings-outline" size={15} color={PC.accent} />
                <Text style={{ color: PC.accent, fontSize: 13 }}>Manage</Text>
              </Touchable>
            </View>

            {pickerLoading ? (
              <ActivityIndicator color={PC.textPrimary} style={{ marginVertical: 32 }} />
            ) : pickerContacts.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 28 }}>
                <Ionicons name="person-add-outline" size={36} color={PC.textMuted} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { fontSize: 15 }]}>No personal contacts yet</Text>
                <Text style={[styles.emptyText, { textAlign: 'center', marginBottom: 20 }]}>
                  Add someone by name to split expenses without a PayCircle account.
                </Text>
                <Touchable tone="accent"
                  style={[styles.createBtn, { paddingHorizontal: 20, width: 'auto', height: 44 }]}
                  onPress={() => { setShowContactPicker(false); router.push('/contacts'); }}>
                  <Text style={styles.createBtnText}>Add New Contact</Text>
                </Touchable>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {pickerContacts.map((c, i) => (
                  <View key={c._id}>
                    <Touchable
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 }}
                      onPress={() => { setShowContactPicker(false); router.push(`/direct/${c._id}`); }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: PC.accent10, borderWidth: 1.5, borderColor: PC.accent20, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: PC.accent, fontSize: 14, fontWeight: '700' }}>
                          {getInitials(c.name)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: PC.textPrimary, fontSize: 14, fontWeight: '600' }}>{c.name}</Text>
                        <Text style={{ color: PC.textMuted, fontSize: 11, marginTop: 1 }}>Personal Contact</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={PC.textMuted} />
                    </Touchable>
                    {i < pickerContacts.length - 1 && <View style={{ height: 1, backgroundColor: PC.border }} />}
                  </View>
                ))}
                <View style={{ height: 8 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <AddGroupModal
        visible={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onCreated={handleGroupCreated}
      />

      {/* ── Filter Sheet Modal ── */}
      <Modal statusBarTranslucent visible={showFilterSheet} transparent animationType="slide" onRequestClose={() => setShowFilterSheet(false)}>
        <Pressable style={styles.filterOverlay} onPress={() => setShowFilterSheet(false)} />
        <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 36 }]}>
          <Text style={styles.pickerTitle}>Show</Text>
          {[
            { key: 'all',     label: 'All',              icon: 'apps-outline' },
            { key: 'group',   label: 'Groups',            icon: 'people-outline' },
            { key: 'friend',  label: 'Direct Splits',     icon: 'person-outline' },
            { key: 'contact', label: 'Personal Contacts', icon: 'person-add-outline' },
          ].map(opt => (
            <Touchable
              key={opt.key}
              style={[styles.pickerRow, splitFilter === opt.key && styles.pickerRowActive]}
              onPress={() => { setSplitFilter(opt.key); setShowFilterSheet(false); }}
            >
              <Ionicons name={opt.icon} size={20} color={splitFilter === opt.key ? PC.accent : PC.textMuted} />
              <Text style={[styles.pickerName, splitFilter === opt.key && { color: PC.accent }]}>{opt.label}</Text>
              {splitFilter === opt.key && (
                <Ionicons name="checkmark" size={18} color={PC.accent} style={{ marginLeft: 'auto' }} />
              )}
            </Touchable>
          ))}
        </View>
      </Modal>
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
    backgroundColor: PC.accent10,
    borderWidth: 1,
    borderColor: PC.accent,
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
  toggleActive:     { backgroundColor: PC.accent10 },
  toggleText:       { color: PC.textMuted, fontSize: 13, fontWeight: '500' },
  toggleTextActive: { color: PC.accent, fontWeight: '600' },

  badge:     { backgroundColor: PC.negative, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, marginLeft: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  groupBadgeDot: { position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: PC.accent },
  settleDot:     { position: 'absolute', top: 4, right: 6, width: 7, height: 7, borderRadius: 3.5, backgroundColor: PC.negative },
  avatarDot:     { position: 'absolute', top: 1, right: 1, width: 8, height: 8, borderRadius: 4, backgroundColor: PC.accent, borderWidth: 1.5, borderColor: PC.bgCard },

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
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  friendAvatar:       { width: 42, height: 42, borderRadius: 13, backgroundColor: PC.bgCardElevated, alignItems: 'center', justifyContent: 'center', marginRight: 12, position: 'relative' },
  friendAvatarActive: { borderWidth: 1.5, borderColor: PC.accent20 },
  friendAvatarText:   { color: PC.textPrimary, fontSize: 15, fontWeight: '700' },
  friendInfo:         { flex: 1 },
  friendName:         { color: PC.textPrimary, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  friendUsername:     { color: PC.textMuted, fontSize: 11, lineHeight: 14, marginTop: 2 },
  friendBalance:      { fontSize: 13, fontWeight: '600' },

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

  // Settlement hub filter bar
  settleFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  settleFilterBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PC.border,
    backgroundColor: PC.bgCard,
  },
  settleFilterActive:     { borderColor: PC.accent, backgroundColor: PC.accent10 },
  settleFilterText:       { color: PC.textMuted, fontSize: 12, fontWeight: '500' },
  settleFilterTextActive: { color: PC.accent, fontWeight: '600' },

  // Settle list card (Not Opened / Open)
  settleListCard: {
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  settleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  settleRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1,
    borderColor: PC.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  settleRowInfo:      { flex: 1 },
  settleRowLabel:     { color: PC.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 3 },
  settleRowMeta:      { color: PC.textSecondary, fontSize: 12 },
  settleRowAmt:       { alignItems: 'flex-end' },
  settleRowAmtText:   { fontVariant: ['tabular-nums'], fontSize: 14, fontWeight: '600' },
  amtPos:             { color: PC.positive },
  amtNeg:             { color: PC.negative },
  settleRowDivider:   { height: 1, backgroundColor: PC.border, marginHorizontal: 16 },

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
    minHeight: 50,
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
  typeChipActive:     { borderColor: PC.accent, backgroundColor: PC.accent10 },
  typeChipText:       { color: PC.textMuted, fontSize: 13, fontWeight: '500' },
  typeChipTextActive: { color: PC.accent },

  createBtn:         { backgroundColor: PC.accent, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText:     { color: '#060A09', fontSize: 15, fontWeight: '700' },

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

  // Header action buttons
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1, borderColor: PC.border, backgroundColor: PC.bgCard,
  },
  headerBtnText: { color: PC.textSecondary, fontSize: 13, fontWeight: '500' },
  headerBtnDot: {
    position: 'absolute', top: -3, right: -3,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: PC.negative, borderWidth: 1.5, borderColor: PC.bg,
  },

  // Settlements modal header
  settleModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  settleBackBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: PC.bgCard,
    borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center',
  },
  settleModalTitle: { color: PC.textPrimary, fontSize: 18, fontWeight: '700' },

  // Chat list
  chatList: { backgroundColor: PC.bgCard, marginHorizontal: 0 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 14 },
  chatAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: PC.bgCardElevated, borderWidth: 1.5, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  chatAvatarGroup:   { borderColor: PC.accent + '60', backgroundColor: PC.accent10 },
  chatAvatarContact: { borderColor: PC.border, backgroundColor: PC.bgCardElevated },
  chatAvatarText: { color: PC.textPrimary, fontSize: 16, fontWeight: '700' },
  chatAvatarDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: PC.bg,
  },
  chatInfo:      { flex: 1 },
  chatTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName:      { color: PC.textPrimary, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  chatTime:      { color: PC.textMuted, fontSize: 11, flexShrink: 0 },
  chatBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatSub:       { color: PC.textSecondary, fontSize: 13, flex: 1, marginRight: 8 },
  chatBal:       { fontVariant: ['tabular-nums'], fontSize: 13, fontWeight: '600', flexShrink: 0 },
  chatBalSettled:{ color: PC.textMuted, fontSize: 12, flexShrink: 0 },
  chatDivider:   { height: 1, backgroundColor: PC.border, marginLeft: 82 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PC.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabActive: { borderWidth: 2, borderColor: '#fff' },

  // Filter sheet
  // NOTE: must not be called `modalOverlay` — that key already exists above for
  // the Add Group sheet, and the duplicate silently overrode it (dropping
  // `justifyContent: 'flex-end'`, which rendered that sheet at the top).
  filterOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  pickerSheet:     { backgroundColor: PC.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  pickerTitle:     { color: PC.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  pickerRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14, borderRadius: 10, paddingHorizontal: 8, marginBottom: 2 },
  pickerRowActive: { backgroundColor: PC.accent10 ?? (PC.accent + '14') },
  pickerName:      { color: PC.textPrimary, fontSize: 15, fontWeight: '500', flex: 1 },

});
