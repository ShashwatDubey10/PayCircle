import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput } from '@/components/text';
import Touchable from '@/components/Touchable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PC, touchSlop } from '@/constants/theme';
import { fmtINR } from '@/utils/format';
import ErrorBox from '@/components/ErrorBox';
import AppAlert from '@/components/AppAlert';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { getAllDirectSplits, getAllDirectSettlements } from '@/services/directSplit';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS = {
  Food:          'fast-food-outline',
  Travel:        'airplane-outline',
  Utilities:     'flash-outline',
  Entertainment: 'film-outline',
  Health:        'fitness-outline',
  Shopping:      'bag-outline',
  Salary:        'briefcase-outline',
  Freelance:     'laptop-outline',
  Investment:    'trending-up-outline',
  Miscellaneous: 'grid-outline',
};

const INCOME_CATS  = ['Salary', 'Freelance', 'Investment', 'Miscellaneous'];
const EXPENSE_CATS = ['Food', 'Travel', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Miscellaneous'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthLabel(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function shortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function groupByMonth(txns) {
  const map = {};
  for (const tx of txns) {
    const key = monthLabel(tx.date);
    if (!map[key]) map[key] = [];
    map[key].push(tx);
  }
  return map;
}

// Normalize a direct (1-on-1) split into a display-compatible object
// Returns null if the current user is not the payer (non-payer sees nothing)
function normalizeDirectSplit(split, myId) {
  const payerIdStr = (
    split.payerId?._id?.toString() ??
    split.payerId?.id?.toString()  ??
    split.payerId?.toString()
  );
  const isPayer = payerIdStr === myId?.toString();
  if (!isPayer) return null;

  const friendName = split.otherUserId?.name ?? 'Friend';
  const label = split.description
    ? `${split.description} · with ${friendName}`
    : `Split with ${friendName}`;
  return {
    _id:            split._id,
    _isDirectSplit: true,
    type:           'expense',
    amount:         split.amount,
    category:       'Split',
    notes:          label,
    date:           split.date,
  };
}

// Normalize a confirmed direct (1-on-1) settlement into a display-compatible object
function normalizeDirectSettle(settle, myId) {
  const fromId  = settle.fromUserId?._id ?? settle.fromUserId?.id ?? settle.fromUserId;
  const isPayer = fromId?.toString() === myId?.toString();
  const other   = isPayer
    ? (settle.toUserId?.name   ?? 'Someone')
    : (settle.fromUserId?.name ?? 'Someone');
  return {
    _id:             settle._id,
    _isSettlement:   true,
    _isDirectSettle: true,
    _direction:      isPayer ? 'paid' : 'received',
    type:            isPayer ? 'expense' : 'income',
    amount:          settle.amount,
    category:        'Settlement',
    notes:           isPayer ? `Settled with ${other}` : `${other} settled up`,
    date:            settle.confirmedAt ?? settle.createdAt,
  };
}

// Normalize a group settlement into a display-compatible object
function normalizeSettlement(s, myId) {
  const fromId = s.fromUserId?._id ?? s.fromUserId?.id ?? s.fromUserId;
  const isPaid = fromId?.toString() === myId?.toString();
  const counterpart = isPaid
    ? (s.toUserId?.name ?? 'Someone')
    : (s.fromUserId?.name ?? 'Someone');

  // A reversal is stored as a row carrying the same pair and amount as the
  // claim it undoes — that is what lets the ledger cancel the two out. Read
  // literally it would render as an identical second tile and count towards
  // the same total twice, so it is shown as the mirror of the original: the
  // money moves back, the label says so, and the sign is flipped.
  const isReversal = !!s.reversalOf;
  const original   = isPaid ? `You paid ${counterpart}` : `${counterpart} paid you`;

  return {
    _id:           s._id,
    _isSettlement: true,
    _direction:    isPaid ? 'paid' : 'received',
    _groupName:    s.groupName,
    _groupId:      s.groupId?._id ?? s.groupId,
    _isReversal:   isReversal,
    _isReversed:   !!s.isReversed,
    _reversalOf:   s.reversalOf?.toString() ?? null,
    // Only the person recorded as receiving the money is offered the reversal
    // here — they are the one who knows whether it arrived. The API also allows
    // the group admin, which has no entry point on this screen.
    // A reversal row, and one already reversed, cannot be reversed again.
    _canReverse:   !isPaid && !isReversal && !s.isReversed,
    type:          (isReversal ? isPaid : !isPaid) ? 'income' : 'expense',
    amount:        s.amount,
    category:      'Settlement',
    notes:         isReversal ? `Reversed · ${original}` : original,
    date:          s.date,
  };
}

// Keep a reversal next to the claim it withdraws.
//
// A settlement recorded through the group sheet is stored as a date with no
// time, so it sits at midnight; a reversal is stored at the moment it was
// made. Sorted newest-first that puts every reversal above all of the day's
// settlements — including its own original — so it surfaces at the top of the
// list as a row with nothing next to it to explain it, while the struck-out
// original it refers to stays far below.
//
// Rather than flatten the real timestamps, the pair is reassembled for
// display: the reversal is lifted out and re-inserted directly above its
// original, so the two read together wherever that original happens to fall.
function pairReversals(rows) {
  const byOriginal = new Map();
  for (const row of rows) if (row._reversalOf) byOriginal.set(row._reversalOf, row);
  if (byOriginal.size === 0) return rows;

  const present = new Set(rows.map(r => r._id?.toString()));
  const out = [];
  for (const row of rows) {
    // Emitted below, alongside its original — unless that original is not in
    // this list at all, in which case it keeps the place it sorted into.
    if (row._reversalOf && present.has(row._reversalOf)) continue;
    const reversal = byOriginal.get(row._id?.toString());
    if (reversal) out.push(reversal);
    out.push(row);
  }
  return out;
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TxRow({ tx, onLongPress, last }) {
  const isIncome = tx.type === 'income';

  let icon, metaLine;
  if (tx._isSettlement) {
    icon     = tx._isReversal ? 'arrow-undo-outline' : 'swap-horizontal-outline';
    metaLine = tx._groupName
      ? `${tx._groupName} · ${shortDate(tx.date)}`
      : `Direct · ${shortDate(tx.date)}`;
  } else if (tx._isDirectSplit) {
    icon     = 'people-outline';
    metaLine = `Split · ${shortDate(tx.date)}`;
  } else {
    icon     = CATEGORY_ICONS[tx.category] || 'swap-horizontal-outline';
    metaLine = `${tx.category} · ${shortDate(tx.date)}`;
  }

  return (
    <>
      <Touchable
        style={styles.txRow}
        onLongPress={() => (tx._canReverse || (!tx._isSettlement && !tx._isDirectSplit)) && onLongPress(tx)}
        delayLongPress={400}>
        <View style={[styles.txIconBox, (tx._isSettlement || tx._isDirectSplit) && styles.txIconBoxSettlement]}>
          <Ionicons name={icon} size={18} color={PC.textSecondary} />
        </View>
        <View style={styles.txInfo}>
          <Text
            style={[styles.txLabel, tx._isReversed && styles.txVoided]}
            numberOfLines={1}>
            {tx.notes || tx.category}
          </Text>
          <Text style={styles.txMeta}>{metaLine}</Text>
        </View>
        <View style={styles.txAmountCol}>
          <Text
            style={[
              styles.txAmount,
              isIncome ? styles.amtPos : styles.amtNeg,
              // The claim that was withdrawn stays in the list for the record,
              // struck through so it is clearly no longer counted.
              tx._isReversed && styles.txAmountVoided,
            ]}>
            {isIncome ? '+' : '-'}₹{fmtINR(tx.amount)}
          </Text>
          {tx._isSettlement && (
            <Text style={styles.settlementBadge}>
              {tx._isReversal ? 'reversal' : tx._isReversed ? 'reversed' : 'settlement'}
            </Text>
          )}
        </View>
      </Touchable>
      {!last && <View style={styles.txDivider} />}
    </>
  );
}

// ─── Add Transaction Modal ────────────────────────────────────────────────────

function AddTransactionModal({ visible, onClose, onAdded }) {
  const insets = useSafeAreaInsets();
  const [type,     setType]     = useState('expense');
  const [amount,   setAmount]   = useState('');
  const [category, setCategory] = useState('Food');
  const [notes,    setNotes]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  useEffect(() => {
    if (!cats.includes(category)) setCategory(cats[0]);
  }, [type]);

  async function handleSubmit() {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // A full timestamp, not a YYYY-MM-DD date. A date-only string is parsed
      // as UTC midnight, which in IST is 05:30 the same morning — so every row
      // displayed that time, same-day rows had no real order between them, and
      // anything near a month boundary landed in the wrong month.
      const { data } = await api.post('/api/users/me/transactions', {
        type, amount: amt, category, notes: notes.trim(),
        date: new Date().toISOString(),
      });
      onAdded(data.transaction);
      resetAndClose();
    } catch (err) {
      setError(err?.message || 'Failed to add transaction.');
    } finally {
      setLoading(false);
    }
  }

  function resetAndClose() {
    setType('expense');
    setAmount('');
    setCategory('Food');
    setNotes('');
    setError('');
    onClose();
  }

  function handleClose() {
    if (loading) return;
    resetAndClose();
  }

  return (
    <Modal statusBarTranslucent visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior="padding">
        <Pressable style={{ flex: 1 }} onPress={handleClose} />
        <ScrollView
          style={styles.modalSheet}
          contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}
          bounces={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Transaction</Text>

          <ErrorBox message={error} />

          {/* Type toggle */}
          <View style={styles.typeToggle}>
            <Touchable
              style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive]}
              onPress={() => setType('expense')}
              disabled={loading}>
              <Ionicons
                name="arrow-up-outline"
                size={15}
                color={type === 'expense' ? PC.negative : PC.textSecondary}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.typeBtnText, type === 'expense' && { color: PC.negative }]}>
                Expense
              </Text>
            </Touchable>
            <Touchable
              style={[styles.typeBtn, type === 'income' && styles.typeBtnActiveIncome]}
              onPress={() => setType('income')}
              disabled={loading}>
              <Ionicons
                name="arrow-down-outline"
                size={15}
                color={type === 'income' ? PC.positive : PC.textSecondary}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.typeBtnText, type === 'income' && { color: PC.positive }]}>
                Income
              </Text>
            </Touchable>
          </View>

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
          <View style={styles.chipGrid}>
            {cats.map((c) => (
              <Touchable
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c)}
                disabled={loading}
                hitSlop={touchSlop(0, 30)}
                accessibilityRole="button"
                accessibilityState={{ selected: category === c }}>
                <Ionicons
                  name={CATEGORY_ICONS[c] || 'grid-outline'}
                  size={13}
                  color={category === c ? PC.textPrimary : PC.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
              </Touchable>
            ))}
          </View>

          {/* Notes */}
          <Text style={styles.modalLabel}>Notes (optional)</Text>
          <View style={[styles.modalInputBox, { height: 72, alignItems: 'flex-start', paddingTop: 12 }]}>
            <TextInput
              style={[styles.modalInput, { flex: 1, height: '100%' }]}
              placeholder="What was this for?"
              placeholderTextColor={PC.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              // The models cap notes at 200. Without this the field accepted
              // more and the save failed on the server.
              maxLength={200}
              editable={!loading}
            />
          </View>

          <Touchable tone="accent"
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color="#060A09" size="small" />
              : <Text style={styles.submitBtnText}>Add Transaction</Text>
            }
          </Touchable>
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const { user }   = useAuth();

  const [transactions,    setTransactions]    = useState([]);
  const [settlements,     setSettlements]     = useState([]); // normalized group + confirmed direct
  const [directSplits,    setDirectSplits]    = useState([]); // normalized
  const [allDirectSettles, setAllDirectSettles] = useState([]); // confirmed + pending, raw

  const [activeTab,     setActiveTab]     = useState('all');
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState('');
  const [showModal,     setShowModal]     = useState(false);
  // Null, or the confirmation currently on screen.
  const [alertCfg,      setAlertCfg]      = useState(null);

  // ── Fetch personal transactions ──────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    const { data } = await api.get('/api/users/me/transactions');
    setTransactions(data.transactions || []);
  }, []);

  // ── Fetch all direct data (splits + settles + balances) ───────────────────
  const fetchDirectData = useCallback(async () => {
    try {
      const [splitsData, settlesData] = await Promise.all([
        getAllDirectSplits(),
        getAllDirectSettlements(),
      ]);
      setDirectSplits(
        (splitsData.splits || []).map(s => normalizeDirectSplit(s, user?._id)).filter(Boolean)
      );
      setAllDirectSettles(settlesData.settlements || []);
    } catch { /* non-critical */ }
  }, [user?._id]);

  // ── Fetch group settlements + group balances ──────────────────────────────
  // One request for every group's settlements. This used to fetch the group list
  // and then one settlements request per group, on every mount and refresh.
  const fetchSettlements = useCallback(async () => {
    try {
      const { data } = await api.get('/api/users/me/group-settlements');
      setSettlements(
        (data.settlements || []).map(s =>
          normalizeSettlement({ ...s, groupId: s.groupId?._id ?? s.groupId }, user?._id),
        ),
      );
    } catch { /* non-critical */ }
  }, [user?._id]);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        await Promise.all([fetchTransactions(), fetchSettlements(), fetchDirectData()]);
        setError('');
      } catch (err) {
        setError(err?.message || 'Failed to load transactions.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [fetchTransactions, fetchSettlements, fetchDirectData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchTransactions(), fetchSettlements(), fetchDirectData()]);
      setError('');
    } catch { /* keep showing existing data */ }
    finally { setRefreshing(false); }
  }, [fetchTransactions, fetchSettlements, fetchDirectData]);

  // ── Confirmations ─────────────────────────────────────────────────────────
  // AppAlert rather than Alert.alert: the native dialog ignores the app's
  // theme entirely, landing a light-grey system box on a dark screen.
  const dismissAlert = () => setAlertCfg(null);

  function showFailure(title, message) {
    setAlertCfg({
      icon: 'alert-circle-outline',
      iconColor: PC.negative,
      title,
      message,
      buttons: [{ text: 'OK', style: 'primary', onPress: dismissAlert }],
    });
  }

  function confirmRowAction(tx) {
    if (tx._canReverse) return confirmReverse(tx);
    return confirmDelete(tx);
  }

  // Reversing does not delete anything: it writes an offsetting entry, so the
  // original claim and its withdrawal both stay in the history.
  function confirmReverse(tx) {
    setAlertCfg({
      icon: 'arrow-undo-outline',
      iconColor: PC.negative,
      title: 'Reverse this settlement?',
      message: `${tx.notes} — ₹${fmtINR(tx.amount)}.

`
        + 'Use this if the money never reached you. The balance goes back to '
        + 'what it was, and both records stay in your history.',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: dismissAlert },
        {
          text: 'Reverse',
          style: 'destructive',
          onPress: () => { dismissAlert(); handleReverse(tx); },
        },
      ],
    });
  }

  async function handleReverse(tx) {
    try {
      await api.post(`/api/groups/${tx._groupId}/settlements/${tx._id}/reverse`);
      await Promise.all([fetchSettlements(), fetchTransactions()]);
    } catch (err) {
      showFailure('Could not reverse', err?.message || 'Please try again.');
    }
  }

  function confirmDelete(tx) {
    setAlertCfg({
      icon: 'trash-outline',
      iconColor: PC.negative,
      title: 'Delete this transaction?',
      message: `"${tx.notes || tx.category}" of ₹${fmtINR(tx.amount)} will be `
        + 'removed for good. This cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: dismissAlert },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { dismissAlert(); handleDelete(tx._id); },
        },
      ],
    });
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/users/me/transactions/${id}`);
      setTransactions(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      showFailure('Could not delete', err?.message || 'Please try again.');
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const allItems = useMemo(
    () => pairReversals(
      [...transactions, ...settlements, ...directSplits].sort(
        (a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)
      )
    ),
    [transactions, settlements, directSplits],
  );

  // A withdrawn claim and the reversal that withdrew it both stay in the list
  // as a record, but neither is money that moved, so the header counts neither.
  // Letting the pair through would inflate Income and Expense by the same
  // amount: the net would still be right while both headline figures lied.
  const counted = allItems.filter(t => !t._isReversal && !t._isReversed);

  const totalIncome  = counted.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount ?? 0), 0);
  const totalExpense = counted.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount ?? 0), 0);
  const net          = totalIncome - totalExpense;

  // Confirmed direct settles (normalized for Settled tab)
  const closedDirectSettles = useMemo(
    () => allDirectSettles
      .filter(s => s.status === 'confirmed')
      .map(s => normalizeDirectSettle(s, user?._id)),
    [allDirectSettles, user?._id],
  );

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'income':      return transactions.filter(t => t.type === 'income');
      case 'expense':     return [...transactions.filter(t => t.type === 'expense'), ...directSplits]
                            .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
      case 'settlements': return pairReversals(
                            [...closedDirectSettles, ...settlements]
                              .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))
                          );
      default:            return allItems;
    }
  }, [activeTab, transactions, directSplits, closedDirectSettles, settlements, allItems]);

  // One entry per month, which is what the list is virtualized by below.
  const monthSections = useMemo(() => Object.entries(groupByMonth(filtered)), [filtered]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Touchable
          style={styles.addBtn}
          onPress={() => setShowModal(true)}
          hitSlop={touchSlop(38)}
          accessibilityRole="button"
          accessibilityLabel="Add transaction">
          <Ionicons name="add" size={22} color={PC.accent} />
        </Touchable>
      </View>

      {/* ── Summary Card ── */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <View style={styles.summaryDot} />
          <View>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryAmount, { color: PC.positive }]}>
              +₹{totalIncome.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: PC.negative }]} />
          <View>
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={[styles.summaryAmount, { color: PC.negative }]}>
              -₹{totalExpense.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: PC.textSecondary }]} />
          <View>
            <Text style={styles.summaryLabel}>Net</Text>
            <Text style={[styles.summaryAmount, { color: net >= 0 ? PC.positive : PC.negative }]}>
              {net >= 0 ? '+' : ''}₹{Math.abs(net).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Filter Toggle ── */}
      <View style={styles.toggleRow}>
        {[
          { key: 'all',         label: 'All' },
          { key: 'income',      label: 'Income' },
          { key: 'expense',     label: 'Expense' },
          { key: 'settlements', label: 'Settled' },
        ].map(({ key, label }) => (
          <Touchable
            key={key}
            style={[styles.toggleBtn, activeTab === key && styles.toggleActive]}
            onPress={() => setActiveTab(key)}>
            <Text style={[styles.toggleText, activeTab === key && styles.toggleTextActive]}>
              {label}
            </Text>
          </Touchable>
        ))}
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={PC.textPrimary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={36} color={PC.textMuted} />
          <Text style={styles.errorMsg}>Something went wrong. Please try again.</Text>
          <Touchable
            style={styles.retryBtn}
            onPress={async () => {
              setError('');
              setLoading(true);
              try {
                await Promise.all([fetchTransactions(), fetchSettlements(), fetchDirectData()]);
              } catch (err) {
                setError(err?.message || 'Failed to load transactions.');
              } finally {
                setLoading(false);
              }
            }}>
            <Text style={styles.retryText}>Retry</Text>
          </Touchable>
        </View>
      ) : (
        /* Virtualized by month, not by row. A month is the chunk the data already
           comes grouped into (~30-90 rows), so only the months near the viewport
           stay mounted while each month's rows render exactly as before — the
           screen is unchanged visually, it just stops mounting a year of history
           to show the top of it. */
        <FlatList
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PC.textPrimary} />
          }
          data={monthSections}
          keyExtractor={([month]) => month}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={5}
          renderItem={({ item: [month, txns] }) => (
            <View>
              <Text style={styles.dateHeader}>{month}</Text>
              <View style={styles.txCard}>
                {txns.map((tx, i) => (
                  <TxRow
                    key={tx._id}
                    tx={tx}
                    onLongPress={confirmRowAction}
                    last={i === txns.length - 1}
                  />
                ))}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name={activeTab === 'settlements' ? 'swap-horizontal-outline' : 'receipt-outline'}
                  size={28}
                  color={PC.textMuted}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'all'         ? 'No transactions yet'
                 : activeTab === 'settlements' ? 'No settlements yet'
                 : `No ${activeTab} transactions`}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'all'
                  ? 'Tap + to add your first transaction'
                  : activeTab === 'settlements'
                    ? 'Settle up in a group to see history here'
                    : 'Switch to All to see everything'}
              </Text>
            </View>
          }
          ListFooterComponent={
            allItems.length > 0 && activeTab !== 'settlements'
              ? <Text style={styles.hint}>
                  Long-press a personal transaction to delete it, or a settlement you received to reverse it
                </Text>
              : null
          }
        />
      )}

      <AddTransactionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onAdded={(tx) => setTransactions(prev => [tx, ...prev])}
      />

      <AppAlert
        visible={!!alertCfg}
        icon={alertCfg?.icon}
        iconColor={alertCfg?.iconColor}
        title={alertCfg?.title}
        message={alertCfg?.message}
        buttons={alertCfg?.buttons ?? []}
        onRequestClose={dismissAlert}
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
    backgroundColor: PC.accent10,
    borderWidth: 1,
    borderColor: PC.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  summaryItem:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: PC.positive },
  summaryLabel:   { color: PC.textSecondary, fontSize: 11, marginBottom: 3 },
  summaryAmount:  { fontSize: 13, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  summaryDivider: { width: 1, backgroundColor: PC.border, marginHorizontal: 4 },

  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: PC.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 4,
    marginBottom: 12,
  },
  toggleBtn:        { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  toggleActive:     { backgroundColor: PC.accent10 },
  toggleText:       { color: PC.textMuted, fontSize: 12, fontWeight: '500' },
  toggleTextActive: { color: PC.accent, fontWeight: '600' },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },

  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  errorMsg:  { color: PC.textSecondary, fontSize: 14, marginTop: 12, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:  { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PC.bgCard, borderRadius: 10, borderWidth: 1, borderColor: PC.border },
  retryText: { color: PC.textPrimary, fontSize: 14, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { color: PC.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptyText:  { color: PC.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },

  dateHeader: {
    color: PC.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  txCard: {
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: PC.bgCardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  txIconBoxSettlement: {
    borderWidth: 1,
    borderColor: PC.border,
    borderStyle: 'dashed',
  },
  txInfo:      { flex: 1 },
  txLabel:     { color: PC.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 3 },
  txMeta:      { color: PC.textSecondary, fontSize: 12 },
  txAmountCol: { alignItems: 'flex-end' },
  txAmount:    { fontSize: 14, fontWeight: '600' },
  amtPos:      { color: PC.positive },
  amtNeg:      { color: PC.negative },
  txDivider:   { height: 1, backgroundColor: PC.border, marginHorizontal: 16 },

  txVoided: {
    color: PC.textMuted,
  },
  txAmountVoided: {
    color: PC.textMuted,
    textDecorationLine: 'line-through',
  },
  settlementBadge: {
    color: PC.textMuted,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  hint: { color: PC.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 8 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    // padding lives on contentContainerStyle — on style it clips scroll content
  },
  modalHandle: { width: 36, height: 4, backgroundColor: PC.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:  { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 20 },
  modalLabel:  { color: PC.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 8 },

  typeToggle: {
    flexDirection: 'row',
    backgroundColor: PC.bgCardElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    // Held at the same border width as the active state so selecting an option
    // never changes the control's size.
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeBtnActive:       { backgroundColor: 'rgba(255,80,85,0.12)', borderWidth: 1, borderColor: 'rgba(255,80,85,0.30)' },
  typeBtnActiveIncome: { backgroundColor: 'rgba(0,229,190,0.12)', borderWidth: 1, borderColor: 'rgba(0,229,190,0.30)' },
  typeBtnText:         { color: PC.textSecondary, fontSize: 14, fontWeight: '600' },

  modalInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgInput,
    borderWidth: 1,
    borderColor: PC.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 50,
    marginBottom: 20,
  },
  modalInput:  { color: PC.textPrimary, fontSize: 15 },
  rupeePrefix: { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginRight: 8 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PC.border,
    backgroundColor: PC.bgCardElevated,
  },
  chipActive:     { borderColor: PC.accent, backgroundColor: PC.accent10 },
  chipText:       { color: PC.textMuted, fontSize: 12 },
  chipTextActive: { color: PC.accent },

  submitBtn:         { backgroundColor: PC.accent, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText:     { color: '#060A09', fontSize: 15, fontWeight: '700' },

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
