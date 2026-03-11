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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { PC } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { getFriends } from '@/services/friends';

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = ['Food', 'Travel', 'Utilities', 'Miscellaneous'];

const CAT_ICONS = {
  Food:          'fast-food-outline',
  Travel:        'airplane-outline',
  Utilities:     'flash-outline',
  Miscellaneous: 'grid-outline',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatShortDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Add Expense Modal ────────────────────────────────────────────────────────

function AddExpenseModal({ visible, onClose, group, members, onAdded }) {
  const { user } = useAuth();

  const [amount,    setAmount]    = useState('');
  const [category,  setCategory]  = useState('Food');
  const [notes,     setNotes]     = useState('');
  const [payerId,   setPayerId]   = useState(user?._id ?? '');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  async function handleSubmit() {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.post(`/api/groups/${group._id}/expenses`, {
        amount: amt,
        payerId,
        date: today,
        category,
        notes: notes.trim(),
        splitType: 'equal',
      });
      onAdded(data.expense);
      setAmount('');
      setNotes('');
      setPayerId(user?._id ?? '');
      setCategory('Food');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setAmount('');
    setNotes('');
    setPayerId(user?._id ?? '');
    setCategory('Food');
    setError('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <ScrollView style={styles.modalSheet} bounces={false} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Expense</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={PC.negative} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Amount */}
          <Text style={styles.modalLabel}>Amount (₹)</Text>
          <View style={styles.modalInputBox}>
            <Text style={styles.rupeePrefix}>₹</Text>
            <TextInput
              style={[styles.modalInput, { flex: 1 }]}
              placeholder="0.00"
              placeholderTextColor={PC.textMuted}
              value={amount}
              onChangeText={(v) => { setAmount(v); setError(''); }}
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>

          {/* Category */}
          <Text style={styles.modalLabel}>Category</Text>
          <View style={styles.chipRow}>
            {EXPENSE_CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c)}
                disabled={loading}>
                <Ionicons
                  name={CAT_ICONS[c]}
                  size={14}
                  color={category === c ? PC.textPrimary : PC.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Who Paid */}
          <Text style={styles.modalLabel}>Paid by</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {members.map((m) => {
              const selected = payerId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.payerChip, selected && styles.payerChipActive]}
                  onPress={() => setPayerId(m.id)}
                  disabled={loading}>
                  <View style={[styles.payerAvatar, selected && styles.payerAvatarActive]}>
                    <Text style={[styles.payerInitials, selected && { color: PC.bg }]}>
                      {initials(m.name)}
                    </Text>
                  </View>
                  <Text style={[styles.payerName, selected && styles.payerNameActive]}>
                    {m.id === user._id ? 'You' : m.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Notes */}
          <Text style={styles.modalLabel}>Notes (optional)</Text>
          <View style={[styles.modalInputBox, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
            <TextInput
              style={[styles.modalInput, { flex: 1, height: '100%' }]}
              placeholder="What was this for?"
              placeholderTextColor={PC.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              editable={!loading}
            />
          </View>

          <Text style={styles.splitNote}>
            <Ionicons name="information-circle-outline" size={13} color={PC.textMuted} />{' '}
            Amount will be split equally among all {members.length} members
          </Text>

          <TouchableOpacity
            style={[styles.createBtn, loading && styles.createBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color={PC.bg} size="small" />
              : <Text style={styles.createBtnText}>Add Expense</Text>
            }
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────

function AddMemberModal({ visible, onClose, groupId, existingMemberIds, onAdded }) {
  const [friends,     setFriends]     = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [addingId,    setAddingId]    = useState(null);
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setError('');
    setLoadingList(true);
    getFriends()
      .then(frs => {
        if (!cancelled)
          setFriends((frs || []).filter(f => !existingMemberIds.includes(f.id)));
      })
      .catch(() => { if (!cancelled) setError('Could not load friends list.'); })
      .finally(() => { if (!cancelled) setLoadingList(false); });
    return () => { cancelled = true; };
  }, [visible, existingMemberIds]);

  async function handleAdd(friend) {
    setAddingId(friend.id);
    setError('');
    try {
      const { data } = await api.post(`/api/groups/${groupId}/members`, { userId: friend.id });
      onAdded(data.member);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingId(null);
    }
  }

  function handleClose() {
    if (addingId) return;
    setError('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <View style={[styles.modalSheet, { maxHeight: '70%' }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Member</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={PC.negative} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {loadingList ? (
            <ActivityIndicator color={PC.textMuted} style={{ marginVertical: 24 }} />
          ) : friends.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 28 }}>
              <Ionicons name="people-outline" size={32} color={PC.textMuted} style={{ marginBottom: 10 }} />
              <Text style={[styles.splitNote, { textAlign: 'center' }]}>
                No friends available to add.{'\n'}Add friends first from your Profile.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {friends.map((f, i) => (
                <View key={f.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 }}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberInitials}>{initials(f.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: PC.textPrimary, fontSize: 14, fontWeight: '600' }}>{f.name}</Text>
                      {f.username ? <Text style={{ color: PC.textMuted, fontSize: 12 }}>@{f.username}</Text> : null}
                    </View>
                    <TouchableOpacity
                      style={[styles.createBtn, { paddingHorizontal: 16, height: 36, borderRadius: 10, width: 'auto' }, addingId === f.id && styles.createBtnDisabled]}
                      onPress={() => handleAdd(f)}
                      disabled={!!addingId}
                      activeOpacity={0.85}>
                      {addingId === f.id
                        ? <ActivityIndicator color={PC.bg} size="small" />
                        : <Text style={styles.createBtnText}>Add</Text>
                      }
                    </TouchableOpacity>
                  </View>
                  {i < friends.length - 1 && <View style={{ height: 1, backgroundColor: PC.border }} />}
                </View>
              ))}
              <View style={{ height: 16 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Record Settlement Modal ──────────────────────────────────────────────────

function RecordSettlementModal({ visible, onClose, groupId, members, currentUserId, onRecorded }) {
  const [fromId,  setFromId]  = useState(currentUserId ?? '');
  const [toId,    setToId]    = useState('');
  const [amount,  setAmount]  = useState('');
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Auto-reset toId if it collides with fromId
  function handleFromChange(id) {
    setFromId(id);
    if (toId === id) setToId('');
  }
  function handleToChange(id) {
    setToId(id);
    if (fromId === id) setFromId('');
  }

  async function handleSubmit() {
    if (!fromId)       { setError('Select who is paying.');    return; }
    if (!toId)         { setError('Select who is receiving.'); return; }
    if (fromId === toId) { setError('Payer and receiver must be different.'); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }

    setLoading(true);
    setError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.post(`/api/groups/${groupId}/settlements`, {
        fromUserId: fromId, toUserId: toId, amount: amt,
        date: today, notes: notes.trim(),
      });
      onRecorded(data.settlement);
      resetAndClose();
    } catch (err) {
      setError(err.message || 'Failed to record settlement.');
    } finally {
      setLoading(false);
    }
  }

  function resetAndClose() {
    setFromId(currentUserId ?? '');
    setToId('');
    setAmount('');
    setNotes('');
    setError('');
    onClose();
  }

  function handleClose() { if (!loading) resetAndClose(); }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <ScrollView style={styles.modalSheet} bounces={false} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Record Settlement</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={PC.negative} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Who paid */}
          <Text style={styles.modalLabel}>Who paid</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {members.map((m) => {
              const selected = fromId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.payerChip, selected && styles.payerChipActive]}
                  onPress={() => handleFromChange(m.id)}
                  disabled={loading}>
                  <View style={[styles.payerAvatar, selected && styles.payerAvatarActive]}>
                    <Text style={[styles.payerInitials, selected && { color: PC.bg }]}>
                      {initials(m.name)}
                    </Text>
                  </View>
                  <Text style={[styles.payerName, selected && styles.payerNameActive]}>
                    {m.id === currentUserId ? 'You' : m.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Who received */}
          <Text style={styles.modalLabel}>Paid to</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {members.filter(m => m.id !== fromId).map((m) => {
              const selected = toId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.payerChip, selected && styles.payerChipActive]}
                  onPress={() => handleToChange(m.id)}
                  disabled={loading}>
                  <View style={[styles.payerAvatar, selected && styles.payerAvatarActive]}>
                    <Text style={[styles.payerInitials, selected && { color: PC.bg }]}>
                      {initials(m.name)}
                    </Text>
                  </View>
                  <Text style={[styles.payerName, selected && styles.payerNameActive]}>
                    {m.id === currentUserId ? 'You' : m.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Amount */}
          <Text style={styles.modalLabel}>Amount (₹)</Text>
          <View style={styles.modalInputBox}>
            <Text style={styles.rupeePrefix}>₹</Text>
            <TextInput
              style={[styles.modalInput, { flex: 1 }]}
              placeholder="0.00"
              placeholderTextColor={PC.textMuted}
              value={amount}
              onChangeText={(v) => { setAmount(v); setError(''); }}
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>

          {/* Notes */}
          <Text style={styles.modalLabel}>Notes (optional)</Text>
          <View style={[styles.modalInputBox, { height: 72, alignItems: 'flex-start', paddingTop: 12 }]}>
            <TextInput
              style={[styles.modalInput, { flex: 1, height: '100%' }]}
              placeholder="e.g. Paid via UPI"
              placeholderTextColor={PC.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.createBtn, loading && styles.createBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color={PC.bg} size="small" />
              : <Text style={styles.createBtnText}>Record Settlement</Text>
            }
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GroupDetailScreen() {
  const { id }     = useLocalSearchParams();
  const router     = useRouter();
  const { user }   = useAuth();

  const [group,      setGroup]      = useState(null);
  const [members,    setMembers]    = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [balances,   setBalances]   = useState({ members: [], debts: [] });
  const [tab,        setTab]        = useState('expenses');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const [showAddExpense,    setShowAddExpense]    = useState(false);
  const [showAddMember,     setShowAddMember]     = useState(false);
  const [showSettlement,    setShowSettlement]    = useState(false);

  // ── Fetch all group data ──────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [groupRes, expRes, balRes] = await Promise.all([
        api.get(`/api/groups/${id}`),
        api.get(`/api/groups/${id}/expenses`),
        api.get(`/api/groups/${id}/balances`),
      ]);

      const g = groupRes.data.group;
      setGroup(g);
      setMembers(
        (g.members || []).map(m => ({
          id:    m._id,
          name:  m.name,
          email: m.email,
          role:  m._id === g.adminId?._id || m._id === g.adminId ? 'Admin' : 'Member',
        }))
      );
      setExpenses(expRes.data.expenses || []);
      setBalances(balRes.data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchAll();
      setLoading(false);
    }
    init();
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // Guard: auth still restoring — RootGuard will redirect if truly unauthenticated
  if (!user) return null;

  const isAdmin = group?.adminId?._id === user._id ||
                  group?.adminId?.toString?.() === user._id ||
                  group?.adminId === user._id;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleExpenseAdded(expense) {
    setExpenses(prev => [expense, ...prev]);
  }

  function handleMemberAdded(member) {
    setMembers(prev => [...prev, member]);
    // Refresh balances since member count changed
    api.get(`/api/groups/${id}/balances`).then(r => setBalances(r.data)).catch(() => {});
  }

  function handleSettlementRecorded() {
    // Refresh balances after a settlement
    api.get(`/api/groups/${id}/balances`).then(r => setBalances(r.data)).catch(() => {});
  }

  // ── My balance in this group ──────────────────────────────────────────────
  const myBalance = balances.members?.find(m => m.user.id === user._id);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={PC.textPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !group) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={36} color={PC.textMuted} />
          <Text style={styles.errorMsg}>{error || 'Group not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchAll().then(() => setLoading(false)); }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.groupTitle} numberOfLines={1}>{group.name}</Text>
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{group.type}</Text>
          </View>
        </View>
        {isAdmin ? (
          <TouchableOpacity style={styles.addMemberBtn} onPress={() => setShowAddMember(true)}>
            <Ionicons name="person-add-outline" size={18} color={PC.textPrimary} />
          </TouchableOpacity>
        ) : <View style={{ width: 38 }} />}
      </View>

      {/* ── My balance card ── */}
      {myBalance && (
        <View style={styles.balanceCard}>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>You paid</Text>
            <Text style={styles.balanceStatVal}>₹{myBalance.totalPaid.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Your share</Text>
            <Text style={styles.balanceStatVal}>₹{myBalance.totalOwed.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Net</Text>
            <Text style={[
              styles.balanceStatVal,
              myBalance.netBalance > 0 ? { color: PC.positive } : myBalance.netBalance < 0 ? { color: PC.negative } : {},
            ]}>
              {myBalance.netBalance > 0 ? '+' : ''}₹{myBalance.netBalance.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      )}

      {/* ── Tabs ── */}
      <View style={styles.tabRow}>
        {['expenses', 'balances', 'members'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PC.textPrimary} />}>

        {/* ── Expenses Tab ── */}
        {tab === 'expenses' && (
          expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={28} color={PC.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptyText}>Add the first expense to get started</Text>
            </View>
          ) : (
            expenses.map((exp) => {
              const myShare = exp.splits?.find(s => s.userId?._id === user._id || s.userId?.id === user._id);
              const paidByMe = exp.payerId?._id === user._id || exp.payerId?.id === user._id;
              return (
                <View key={exp._id} style={styles.expenseCard}>
                  <View style={styles.expCatIcon}>
                    <Ionicons name={CAT_ICONS[exp.category] || 'grid-outline'} size={18} color={PC.textSecondary} />
                  </View>
                  <View style={styles.expInfo}>
                    <Text style={styles.expTitle}>{exp.notes || exp.category}</Text>
                    <Text style={styles.expMeta}>
                      Paid by {paidByMe ? 'You' : exp.payerId?.name ?? 'Unknown'} · {formatShortDate(exp.date)}
                    </Text>
                  </View>
                  <View style={styles.expAmounts}>
                    <Text style={styles.expTotal}>₹{exp.amount.toLocaleString('en-IN')}</Text>
                    {myShare ? (
                      <Text style={[
                        styles.expShare,
                        paidByMe ? { color: PC.positive } : { color: PC.negative },
                      ]}>
                        {paidByMe ? 'lent' : 'owe'} ₹{myShare.amount.toLocaleString('en-IN')}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )
        )}

        {/* ── Balances Tab ── */}
        {tab === 'balances' && (
          <>
            <TouchableOpacity
              style={styles.settleBtn}
              onPress={() => setShowSettlement(true)}
              activeOpacity={0.85}>
              <Ionicons name="checkmark-done-outline" size={17} color={PC.bg} style={{ marginRight: 7 }} />
              <Text style={styles.settleBtnText}>Record Settlement</Text>
            </TouchableOpacity>

            {balances.debts?.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Simplified Debts</Text>
                {balances.debts.map((d, i) => {
                  const fromMe = d.from.id === user._id;
                  const toMe   = d.to.id   === user._id;
                  return (
                    <View key={i} style={styles.debtCard}>
                      <View style={styles.debtAvatarGroup}>
                        <View style={[styles.memberAvatar, styles.memberAvatarSm]}>
                          <Text style={styles.memberInitials}>{initials(d.from.name)}</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={14} color={PC.textMuted} style={{ marginHorizontal: 6 }} />
                        <View style={[styles.memberAvatar, styles.memberAvatarSm]}>
                          <Text style={styles.memberInitials}>{initials(d.to.name)}</Text>
                        </View>
                      </View>
                      <View style={styles.debtInfo}>
                        <Text style={styles.debtLabel}>
                          <Text style={{ color: fromMe ? PC.negative : PC.textPrimary }}>
                            {fromMe ? 'You' : d.from.name}
                          </Text>
                          <Text style={{ color: PC.textSecondary }}> owes </Text>
                          <Text style={{ color: toMe ? PC.positive : PC.textPrimary }}>
                            {toMe ? 'You' : d.to.name}
                          </Text>
                        </Text>
                      </View>
                      <Text style={[styles.debtAmount, fromMe ? { color: PC.negative } : toMe ? { color: PC.positive } : {}]}>
                        ₹{d.amount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="checkmark-circle-outline" size={28} color={PC.positive} />
                </View>
                <Text style={styles.emptyTitle}>All settled up!</Text>
                <Text style={styles.emptyText}>No outstanding balances in this group</Text>
              </View>
            )}

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Member Balances</Text>
            {balances.members?.map((m) => (
              <View key={m.user.id} style={styles.memberBalCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitials}>{initials(m.user.name)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.memberName}>
                    {m.user.id === user._id ? 'You' : m.user.name}
                  </Text>
                  <Text style={styles.memberEmail}>{m.user.email}</Text>
                </View>
                <Text style={[
                  styles.memberNetBal,
                  m.netBalance > 0 ? { color: PC.positive } : m.netBalance < 0 ? { color: PC.negative } : { color: PC.textMuted },
                ]}>
                  {m.netBalance > 0 ? '+' : ''}₹{m.netBalance.toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* ── Members Tab ── */}
        {tab === 'members' && (
          members.map((m) => (
            <View key={m.id} style={styles.memberBalCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitials}>{initials(m.name)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.memberName}>
                  {m.id === user._id ? `You (${m.name})` : m.name}
                </Text>
                <Text style={styles.memberEmail}>{m.email}</Text>
              </View>
              <View style={[styles.roleBadge, m.role === 'Admin' && styles.roleBadgeAdmin]}>
                <Text style={[styles.roleText, m.role === 'Admin' && styles.roleTextAdmin]}>
                  {m.role}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Add Expense FAB ── */}
      {tab === 'expenses' && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddExpense(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={24} color={PC.bg} />
          <Text style={styles.fabText}>Add Expense</Text>
        </TouchableOpacity>
      )}

      <AddExpenseModal
        visible={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        group={group}
        members={members}
        onAdded={handleExpenseAdded}
      />
      <AddMemberModal
        visible={showAddMember}
        onClose={() => setShowAddMember(false)}
        groupId={id}
        existingMemberIds={members.map(m => m.id)}
        onAdded={handleMemberAdded}
      />
      <RecordSettlementModal
        visible={showSettlement}
        onClose={() => setShowSettlement(false)}
        groupId={id}
        members={members}
        currentUserId={user._id}
        onRecorded={handleSettlementRecorded}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PC.bg },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PC.bgCard,
    borderWidth: 1,
    borderColor: PC.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupTitle:   { color: PC.textPrimary, fontSize: 18, fontWeight: '700', flexShrink: 1 },
  typePill:     { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: PC.bgCard, borderRadius: 8, borderWidth: 1, borderColor: PC.border },
  typePillText: { color: PC.textSecondary, fontSize: 11, fontWeight: '500' },
  addMemberBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center' },

  // Balance summary card
  balanceCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    paddingVertical: 14,
    marginBottom: 16,
  },
  balanceStat:      { flex: 1, alignItems: 'center' },
  balanceStatLabel: { color: PC.textSecondary, fontSize: 11, marginBottom: 4 },
  balanceStatVal:   { color: PC.textPrimary, fontSize: 16, fontWeight: '700' },
  balanceDivider:   { width: 1, backgroundColor: PC.border },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: PC.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn:        { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  tabActive:     { backgroundColor: PC.bgCardElevated },
  tabText:       { color: PC.textMuted, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: PC.textPrimary },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  errorMsg:  { color: PC.textSecondary, fontSize: 14, marginTop: 12, textAlign: 'center' },
  retryBtn:  { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PC.bgCard, borderRadius: 10, borderWidth: 1, borderColor: PC.border },
  retryText: { color: PC.textPrimary, fontSize: 14, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 48 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { color: PC.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptyText:  { color: PC.textMuted, fontSize: 13 },

  sectionLabel: { color: PC.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PC.textPrimary,
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 20,
  },
  settleBtnText: { color: PC.bg, fontSize: 14, fontWeight: '700' },

  // Expense card
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 14,
    marginBottom: 10,
  },
  expCatIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: PC.bgCardElevated, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  expInfo:    { flex: 1 },
  expTitle:   { color: PC.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  expMeta:    { color: PC.textMuted, fontSize: 12 },
  expAmounts: { alignItems: 'flex-end' },
  expTotal:   { color: PC.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  expShare:   { fontSize: 11 },

  // Debt card
  debtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  debtAvatarGroup: { flexDirection: 'row', alignItems: 'center' },
  debtInfo:        { flex: 1 },
  debtLabel:       { fontSize: 13 },
  debtAmount:      { color: PC.textPrimary, fontSize: 15, fontWeight: '600' },

  // Member balance card
  memberBalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 14,
    marginBottom: 10,
  },
  memberAvatar:    { width: 40, height: 40, borderRadius: 12, backgroundColor: PC.bgCardElevated, alignItems: 'center', justifyContent: 'center' },
  memberAvatarSm:  { width: 30, height: 30, borderRadius: 9 },
  memberInitials:  { color: PC.textPrimary, fontSize: 13, fontWeight: '700' },
  memberName:      { color: PC.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  memberEmail:     { color: PC.textMuted, fontSize: 12 },
  memberNetBal:    { fontSize: 15, fontWeight: '700' },

  roleBadge:      { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: PC.bgCardElevated, borderRadius: 8, borderWidth: 1, borderColor: PC.border },
  roleBadgeAdmin: { borderColor: PC.textPrimary, backgroundColor: 'rgba(255,255,255,0.05)' },
  roleText:       { color: PC.textMuted, fontSize: 11, fontWeight: '500' },
  roleTextAdmin:  { color: PC.textPrimary },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: { color: PC.bg, fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHandle:  { width: 36, height: 4, backgroundColor: PC.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:   { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 20 },
  modalLabel:   { color: PC.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 8 },
  modalInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgInput,
    borderWidth: 1,
    borderColor: PC.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 20,
  },
  modalInput:   { color: PC.textPrimary, fontSize: 15 },
  rupeePrefix:  { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginRight: 8 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: PC.border, backgroundColor: PC.bgCardElevated },
  chipActive:     { borderColor: PC.textPrimary, backgroundColor: 'rgba(255,255,255,0.07)' },
  chipText:       { color: PC.textMuted, fontSize: 13 },
  chipTextActive: { color: PC.textPrimary },

  payerChip:        { alignItems: 'center', marginRight: 14 },
  payerChipActive:  {},
  payerAvatar:      { width: 44, height: 44, borderRadius: 14, backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  payerAvatarActive: { backgroundColor: PC.textPrimary, borderColor: PC.textPrimary },
  payerInitials:    { color: PC.textPrimary, fontSize: 14, fontWeight: '700' },
  payerName:        { color: PC.textMuted, fontSize: 12 },
  payerNameActive:  { color: PC.textPrimary, fontWeight: '600' },

  splitNote: { color: PC.textMuted, fontSize: 12, marginBottom: 24, lineHeight: 18 },

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
});
