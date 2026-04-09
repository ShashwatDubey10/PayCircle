import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
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
import { getContacts } from '@/services/contacts';
import { getAllDirectBalances } from '@/services/directSplit';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return words.map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function formatBalance(balance) {
  const abs = Math.abs(balance).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return `₹${abs}`;
}

function formatActivity(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 42, isContact = false }) {
  return (
    <View style={[
      av.circle,
      { width: size, height: size, borderRadius: size / 2 },
      isContact && av.contactCircle,
    ]}>
      <Text style={[av.text, { fontSize: size * 0.33 }]}>{getInitials(name)}</Text>
    </View>
  );
}
const av = StyleSheet.create({
  circle:        { backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center' },
  contactCircle: { borderColor: PC.accent, borderWidth: 1.5, backgroundColor: 'rgba(0,229,190,0.06)' },
  text:          { color: PC.textPrimary, fontWeight: '700' },
});

// ─── Balance chip ─────────────────────────────────────────────────────────────

function BalanceChip({ balance }) {
  if (!balance || Math.abs(balance) < 0.01) return null;
  const lent = balance > 0; // positive = they owe you
  return (
    <View style={[bc.pill, lent ? bc.lent : bc.owe]}>
      <Ionicons
        name={lent ? 'arrow-up' : 'arrow-down'}
        size={10}
        color={lent ? PC.positive : PC.negative}
        style={{ marginRight: 2 }}
      />
      <Text style={[bc.text, { color: lent ? PC.positive : PC.negative }]}>
        {formatBalance(balance)}
      </Text>
    </View>
  );
}
const bc = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  lent: { backgroundColor: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.25)' },
  owe:  { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.25)' },
  text: { fontSize: 11, fontWeight: '700' },
});

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {count != null && <View style={s.countBadge}><Text style={s.countText}>{count}</Text></View>}
    </View>
  );
}

// ─── Person row ───────────────────────────────────────────────────────────────

function PersonRow({ item, isContact, balanceMap, onPress, isLast }) {
  const id = (item._id ?? item.id)?.toString();
  const bal = balanceMap[id];
  const activity = formatActivity(item.lastActivity ?? bal?.lastActivity ?? null);

  return (
    <>
      <TouchableOpacity style={s.personRow} activeOpacity={0.7} onPress={onPress}>
        <Avatar name={item.name} isContact={isContact} />
        <View style={s.personInfo}>
          <View style={s.personNameRow}>
            <Text style={s.personName} numberOfLines={1}>{item.name}</Text>
            {isContact && (
              <View style={s.contactTag}>
                <Text style={s.contactTagText}>contact</Text>
              </View>
            )}
          </View>
          <Text style={s.personSub} numberOfLines={1}>
            {isContact
              ? (activity ? `Last split · ${activity}` : 'No splits yet')
              : (item.username ? `@${item.username}` : '') + (activity ? `  ·  ${activity}` : '')
            }
          </Text>
        </View>
        {bal?.balance != null && Math.abs(bal.balance) >= 0.01
          ? <BalanceChip balance={bal.balance} />
          : <View style={s.splitPill}>
              <Ionicons name="swap-horizontal-outline" size={12} color={PC.textSecondary} />
              <Text style={s.splitPillText}>Split</Text>
            </View>
        }
        <Ionicons name="chevron-forward" size={14} color={PC.textMuted} style={{ marginLeft: 6 }} />
      </TouchableOpacity>
      {!isLast && <View style={s.divider} />}
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FriendsScreen() {
  const router = useRouter();

  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [sent,      setSent]      = useState({});
  const [sending,   setSending]   = useState({});

  const [requests,    setRequests]    = useState([]);
  const [reqLoading,  setReqLoading]  = useState(true);
  const [responding,  setResponding]  = useState({});

  const [friends,       setFriends]       = useState([]);
  const [contacts,      setContacts]      = useState([]);
  const [balanceMap,    setBalanceMap]    = useState({}); // { userId: { balance, lastActivity } }
  const [listLoading,   setListLoading]   = useState(true);

  // ── Load everything ───────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [reqs, frs, cts, balData] = await Promise.all([
        getPendingRequests(),
        getFriends(),
        getContacts(),
        getAllDirectBalances(),
      ]);
      setRequests(reqs || []);
      setFriends(frs || []);
      setContacts(cts || []);

      // Build balance map keyed by userId
      const map = {};
      for (const b of (balData?.balances || [])) {
        if (b.friendId) {
          map[b.friendId] = { balance: b.balance, lastActivity: b.lastActivity ?? null };
        }
      }
      setBalanceMap(map);
    } catch {
      // non-critical
    } finally {
      setReqLoading(false);
      setListLoading(false);
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
        <View style={{ flex: 1 }}>
          <Text style={s.title}>People</Text>
          <Text style={s.subtitle}>Friends & contacts</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Search ── */}
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={PC.textMuted} style={{ marginRight: 10 }} />
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
                    <View style={s.sentBadge}><Text style={s.sentText}>Sent</Text></View>
                  ) : sending[u._id] ? (
                    <ActivityIndicator size="small" color={PC.textMuted} />
                  ) : (
                    <TouchableOpacity style={s.addBtn} onPress={() => handleSend(u._id)} activeOpacity={0.8}>
                      <Ionicons name="person-add-outline" size={14} color="#060A09" />
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
        {(reqLoading || requests.length > 0) && (
          <>
            <SectionHeader title="Friend Requests" count={requests.length || undefined} />
            {reqLoading ? (
              <ActivityIndicator color={PC.textMuted} style={{ marginVertical: 16 }} />
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
                            ? <ActivityIndicator size="small" color="#060A09" />
                            : <Ionicons name="checkmark" size={16} color="#060A09" />}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.rejectBtn}
                          onPress={() => handleRespond(r._id, 'reject')}
                          disabled={!!responding[r._id]}
                          activeOpacity={0.8}>
                          {responding[r._id] === 'reject'
                            ? <ActivityIndicator size="small" color={PC.textMuted} />
                            : <Ionicons name="close" size={16} color={PC.textMuted} />}
                        </TouchableOpacity>
                      </View>
                    </View>
                    {i < requests.length - 1 && <View style={s.divider} />}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Friends ── */}
        <SectionHeader title="Friends" count={friends.length || undefined} />
        {listLoading ? (
          <ActivityIndicator color={PC.textMuted} style={{ marginVertical: 16 }} />
        ) : friends.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <Ionicons name="people-outline" size={26} color={PC.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No friends yet</Text>
            <Text style={s.emptyText}>Search by username above to add people</Text>
          </View>
        ) : (
          <View style={s.card}>
            {friends.map((f, i) => (
              <PersonRow
                key={f._id ?? f.id}
                item={f}
                isContact={false}
                balanceMap={balanceMap}
                onPress={() => router.push(`/direct/${f._id ?? f.id}`)}
                isLast={i === friends.length - 1}
              />
            ))}
          </View>
        )}

        {/* ── Personal Contacts ── */}
        <SectionHeader title="Personal Contacts" count={contacts.length || undefined} />
        {listLoading ? (
          <ActivityIndicator color={PC.textMuted} style={{ marginVertical: 16 }} />
        ) : contacts.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <Ionicons name="person-add-outline" size={26} color={PC.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No personal contacts</Text>
            <Text style={s.emptyText}>Add contacts from Profile to track expenses with people not on PayCircle</Text>
          </View>
        ) : (
          <View style={[s.card, s.contactCard]}>
            {contacts.map((c, i) => (
              <PersonRow
                key={c._id}
                item={c}
                isContact={true}
                balanceMap={balanceMap}
                onPress={() => router.push(`/direct/${c._id}`)}
                isLast={i === contacts.length - 1}
              />
            ))}
          </View>
        )}

        <View style={{ height: 48 }} />
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
    paddingTop: 14,
    paddingBottom: 14,
    gap: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { color: PC.textPrimary, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  subtitle: { color: PC.textMuted, fontSize: 12, marginTop: 1 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: { color: PC.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  countBadge:   { backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  countText:    { color: PC.textPrimary, fontSize: 11, fontWeight: '700' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: PC.bgInput,
    borderWidth: 1,
    borderColor: PC.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
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
  contactCard: {
    borderColor: 'rgba(0,229,190,0.2)',
  },

  row:     { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowInfo: { flex: 1 },
  rowName: { color: PC.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  rowSub:  { color: PC.textSecondary, fontSize: 12 },
  divider: { height: 1, backgroundColor: PC.border, marginLeft: 66 },

  // Person row
  personRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 12 },
  personInfo:    { flex: 1, minWidth: 0 },
  personNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  personName:    { color: PC.textPrimary, fontSize: 14, fontWeight: '600', flexShrink: 1 },
  personSub:     { color: PC.textMuted, fontSize: 11 },
  contactTag: {
    paddingHorizontal: 6, paddingVertical: 2,
    backgroundColor: 'rgba(0,229,190,0.12)',
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,229,190,0.25)',
  },
  contactTagText: { color: PC.accent, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  splitPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    backgroundColor: PC.bgCardElevated,
    borderRadius: 20, borderWidth: 1, borderColor: PC.border,
  },
  splitPillText: { color: PC.textSecondary, fontSize: 11, fontWeight: '500' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: PC.accent, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  addBtnText: { color: '#060A09', fontSize: 13, fontWeight: '600' },
  sentBadge:  { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: PC.bgCardElevated, borderRadius: 10, borderWidth: 1, borderColor: PC.border },
  sentText:   { color: PC.textMuted, fontSize: 12 },

  actionPair: { flexDirection: 'row', gap: 8 },
  acceptBtn:  { width: 34, height: 34, borderRadius: 10, backgroundColor: PC.positive, alignItems: 'center', justifyContent: 'center' },
  rejectBtn:  { width: 34, height: 34, borderRadius: 10, backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center' },

  emptySmall:     { marginHorizontal: 20, marginBottom: 4 },
  emptySmallText: { color: PC.textMuted, fontSize: 13 },

  emptyState: { alignItems: 'center', paddingTop: 28, paddingBottom: 8, marginHorizontal: 20 },
  emptyIcon:  { width: 56, height: 56, borderRadius: 18, backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { color: PC.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 5 },
  emptyText:  { color: PC.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
