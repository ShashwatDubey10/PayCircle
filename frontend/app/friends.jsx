import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PC } from '@/constants/theme';
import {
  searchUsers,
  sendFriendRequest,
  getPendingRequests,
  respondToRequest,
  getFriends,
} from '@/services/friends';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return words.map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Avatar chip ──────────────────────────────────────────────────────────────

function Avatar({ name, size = 40 }) {
  return (
    <View style={[avatarStyles.circle, { width: size, height: size, borderRadius: size / 2.5 }]}>
      <Text style={[avatarStyles.text, { fontSize: size * 0.35 }]}>{getInitials(name)}</Text>
    </View>
  );
}
const avatarStyles = StyleSheet.create({
  circle: { backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center' },
  text:   { color: PC.textPrimary, fontWeight: '700' },
});

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {count != null && <Text style={s.sectionCount}>{count}</Text>}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FriendsScreen() {
  const router = useRouter();

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [searching, setSearching] = useState(false);
  const [sent,     setSent]     = useState({}); // { userId: true }
  const [sending,  setSending]  = useState({}); // { userId: true } while request in flight

  const [requests, setRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(true);
  const [responding, setResponding] = useState({}); // { requestId: 'accept'|'reject' }

  const [friends,  setFriends]  = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // ── Load requests + friends on mount ──────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [reqs, frs] = await Promise.all([getPendingRequests(), getFriends()]);
      setRequests(reqs || []);
      setFriends(frs || []);
    } catch {
      // non-critical
    } finally {
      setReqLoading(false);
      setFriendsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Search ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const users = await searchUsers(query.trim());
        setResults(users || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // ── Send request ──────────────────────────────────────────────────────────
  async function handleSend(userId) {
    setSending(prev => ({ ...prev, [userId]: true }));
    try {
      await sendFriendRequest(userId);
      setSent(prev => ({ ...prev, [userId]: true }));
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to send request');
    } finally {
      setSending(prev => { const n = { ...prev }; delete n[userId]; return n; });
    }
  }

  // ── Respond to request ────────────────────────────────────────────────────
  async function handleRespond(requestId, action) {
    setResponding(prev => ({ ...prev, [requestId]: action }));
    try {
      await respondToRequest(requestId, action);
      setRequests(prev => prev.filter(r => r._id !== requestId));
      if (action === 'accept') {
        // Refresh friends list
        const frs = await getFriends();
        setFriends(frs || []);
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to respond');
    } finally {
      setResponding(prev => { const n = { ...prev }; delete n[requestId]; return n; });
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Friends</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Search ── */}
        <SectionHeader title="Find People" />
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={17} color={PC.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by username…"
            placeholderTextColor={PC.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching && <ActivityIndicator size="small" color={PC.textMuted} />}
        </View>

        {results.length > 0 && (
          <View style={s.card}>
            {results.map((u, i) => (
              <View key={u._id}>
                <View style={s.row}>
                  <Avatar name={u.name} />
                  <View style={s.rowInfo}>
                    <Text style={s.rowName}>{u.name}</Text>
                    <Text style={s.rowSub}>@{u.username}</Text>
                  </View>
                  {sent[u._id] ? (
                    <View style={s.sentBadge}>
                      <Text style={s.sentText}>Sent</Text>
                    </View>
                  ) : sending[u._id] ? (
                    <ActivityIndicator size="small" color={PC.textMuted} />
                  ) : (
                    <TouchableOpacity style={s.addBtn} onPress={() => handleSend(u._id)} activeOpacity={0.8}>
                      <Ionicons name="person-add-outline" size={15} color={PC.bg} />
                      <Text style={s.addBtnText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {i < results.length - 1 && <View style={s.divider} />}
              </View>
            ))}
          </View>
        )}

        {query.trim().length >= 2 && !searching && results.length === 0 && (
          <View style={s.emptySmall}>
            <Text style={s.emptySmallText}>No users found for "{query}"</Text>
          </View>
        )}

        {/* ── Pending requests ── */}
        <SectionHeader title="Friend Requests" count={requests.length || undefined} />
        {reqLoading ? (
          <ActivityIndicator color={PC.textMuted} style={{ marginVertical: 16 }} />
        ) : requests.length === 0 ? (
          <View style={s.emptySmall}>
            <Text style={s.emptySmallText}>No pending requests</Text>
          </View>
        ) : (
          <View style={s.card}>
            {requests.map((r, i) => (
              <View key={r._id}>
                <View style={s.row}>
                  <Avatar name={r.requester?.name} />
                  <View style={s.rowInfo}>
                    <Text style={s.rowName}>{r.requester?.name}</Text>
                    <Text style={s.rowSub}>@{r.requester?.username}</Text>
                  </View>
                  <View style={s.actionPair}>
                    <TouchableOpacity
                      style={s.acceptBtn}
                      onPress={() => handleRespond(r._id, 'accept')}
                      disabled={!!responding[r._id]}
                      activeOpacity={0.8}>
                      {responding[r._id] === 'accept'
                        ? <ActivityIndicator size="small" color={PC.bg} />
                        : <Ionicons name="checkmark" size={16} color={PC.bg} />
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.rejectBtn}
                      onPress={() => handleRespond(r._id, 'reject')}
                      disabled={!!responding[r._id]}
                      activeOpacity={0.8}>
                      {responding[r._id] === 'reject'
                        ? <ActivityIndicator size="small" color={PC.textMuted} />
                        : <Ionicons name="close" size={16} color={PC.textMuted} />
                      }
                    </TouchableOpacity>
                  </View>
                </View>
                {i < requests.length - 1 && <View style={s.divider} />}
              </View>
            ))}
          </View>
        )}

        {/* ── Friends list ── */}
        <SectionHeader title="My Friends" count={friends.length || undefined} />
        {friendsLoading ? (
          <ActivityIndicator color={PC.textMuted} style={{ marginVertical: 16 }} />
        ) : friends.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <Ionicons name="people-outline" size={28} color={PC.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No friends yet</Text>
            <Text style={s.emptyText}>Search for people by username to add them</Text>
          </View>
        ) : (
          <>
            <Text style={s.friendsHint}>Tap a friend to track shared expenses 1-on-1</Text>
            <View style={s.card}>
              {friends.map((f, i) => (
                <View key={f.id}>
                  <TouchableOpacity
                    style={s.row}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/direct/${f.id}`)}>
                    <Avatar name={f.name} />
                    <View style={s.rowInfo}>
                      <Text style={s.rowName}>{f.name}</Text>
                      <Text style={s.rowSub}>@{f.username}</Text>
                    </View>
                    <View style={s.splitPill}>
                      <Ionicons name="swap-horizontal-outline" size={13} color={PC.textSecondary} />
                      <Text style={s.splitPillText}>Split</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={PC.textMuted} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                  {i < friends.length - 1 && <View style={s.divider} />}
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: PC.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: PC.textPrimary, fontSize: 22, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: { color: PC.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionCount: {
    color: PC.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1,
    borderColor: PC.border,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: PC.bgInput,
    borderWidth: 1,
    borderColor: PC.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: PC.textPrimary, fontSize: 15 },

  card: {
    marginHorizontal: 20,
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    overflow: 'hidden',
    marginBottom: 4,
  },
  row:     { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowInfo: { flex: 1 },
  rowName: { color: PC.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  rowSub:  { color: PC.textSecondary, fontSize: 12 },
  divider: { height: 1, backgroundColor: PC.border, marginHorizontal: 14 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: PC.textPrimary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtnText: { color: PC.bg, fontSize: 13, fontWeight: '600' },
  sentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: PC.bgCardElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PC.border,
  },
  sentText: { color: PC.textMuted, fontSize: 12 },

  actionPair:  { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PC.positive,
    alignItems: 'center', justifyContent: 'center',
  },
  rejectBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },

  emptySmall: { marginHorizontal: 20, marginBottom: 4 },
  emptySmallText: { color: PC.textMuted, fontSize: 13 },

  emptyState: { alignItems: 'center', paddingTop: 32, marginHorizontal: 20 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { color: PC.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 6 },
  emptyText:  { color: PC.textMuted, fontSize: 13, textAlign: 'center' },

  friendsHint: {
    color: PC.textMuted, fontSize: 12,
    paddingHorizontal: 20, marginBottom: 8, marginTop: -4,
  },
  splitPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    backgroundColor: PC.bgCardElevated,
    borderRadius: 20, borderWidth: 1, borderColor: PC.border,
  },
  splitPillText: { color: PC.textSecondary, fontSize: 11, fontWeight: '500' },
});
