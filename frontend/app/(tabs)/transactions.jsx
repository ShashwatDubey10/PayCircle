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

import { PC } from '@/constants/theme';
import api from '@/services/api';

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

// Group a flat transaction list into { "Feb 2026": [...], ... } ordered by recency
function groupByMonth(txns) {
  const map = {};
  for (const tx of txns) {
    const key = monthLabel(tx.date);
    if (!map[key]) map[key] = [];
    map[key].push(tx);
  }
  return map;
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TxRow({ tx, onLongPress, last }) {
  const isIncome = tx.type === 'income';
  const icon     = CATEGORY_ICONS[tx.category] || 'swap-horizontal-outline';
  return (
    <>
      <TouchableOpacity
        style={styles.txRow}
        onLongPress={() => onLongPress(tx)}
        delayLongPress={400}
        activeOpacity={0.7}>
        <View style={styles.txIconBox}>
          <Ionicons name={icon} size={18} color={PC.textSecondary} />
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txLabel} numberOfLines={1}>
            {tx.notes || tx.category}
          </Text>
          <Text style={styles.txMeta}>{tx.category} · {shortDate(tx.date)}</Text>
        </View>
        <Text style={[styles.txAmount, isIncome ? styles.amtPos : styles.amtNeg]}>
          {isIncome ? '+' : '-'}₹{(tx.amount ?? 0).toLocaleString('en-IN')}
        </Text>
      </TouchableOpacity>
      {!last && <View style={styles.txDivider} />}
    </>
  );
}

// ─── Add Transaction Modal ────────────────────────────────────────────────────

function AddTransactionModal({ visible, onClose, onAdded }) {
  const [type,     setType]     = useState('expense');
  const [amount,   setAmount]   = useState('');
  const [category, setCategory] = useState('Food');
  const [notes,    setNotes]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  // Reset category when type changes if current category isn't valid
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
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.post('/api/users/me/transactions', {
        type, amount: amt, category, notes: notes.trim(), date: today,
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <ScrollView style={styles.modalSheet} bounces={false} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Transaction</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={PC.negative} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Type toggle */}
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive]}
              onPress={() => setType('expense')}
              disabled={loading}>
              <Ionicons
                name="arrow-up-outline"
                size={15}
                color={type === 'expense' ? PC.negative : PC.textMuted}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.typeBtnText, type === 'expense' && { color: PC.negative }]}>
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'income' && styles.typeBtnActiveIncome]}
              onPress={() => setType('income')}
              disabled={loading}>
              <Ionicons
                name="arrow-down-outline"
                size={15}
                color={type === 'income' ? PC.positive : PC.textMuted}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.typeBtnText, type === 'income' && { color: PC.positive }]}>
                Income
              </Text>
            </TouchableOpacity>
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
              <TouchableOpacity
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c)}
                disabled={loading}>
                <Ionicons
                  name={CATEGORY_ICONS[c] || 'grid-outline'}
                  size={13}
                  color={category === c ? PC.textPrimary : PC.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
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
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color={PC.bg} size="small" />
              : <Text style={styles.submitBtnText}>Add Transaction</Text>
            }
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [activeTab,    setActiveTab]    = useState('all');
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState('');
  const [showModal,    setShowModal]    = useState(false);

  // ── Fetch (always fetch all, filter client-side) ─────────────────────────
  const fetchTransactions = useCallback(async () => {
    try {
      const { data } = await api.get('/api/users/me/transactions');
      setTransactions(data.transactions || []);
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load transactions.');
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchTransactions();
      setLoading(false);
    }
    init();
  }, [fetchTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, [fetchTransactions]);

  // ── Delete ───────────────────────────────────────────────────────────────
  function confirmDelete(tx) {
    Alert.alert(
      'Delete Transaction',
      `Delete "${tx.notes || tx.category}" of ₹${(tx.amount ?? 0).toLocaleString('en-IN')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(tx._id),
        },
      ]
    );
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/users/me/transactions/${id}`);
      setTransactions(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not delete transaction.');
    }
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const filtered = activeTab === 'all'
    ? transactions
    : transactions.filter(t => t.type === activeTab);

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount ?? 0), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount ?? 0), 0);
  const net          = totalIncome - totalExpense;

  const grouped = groupByMonth(filtered);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={22} color={PC.textPrimary} />
        </TouchableOpacity>
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
        {['all', 'income', 'expense'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.toggleBtn, activeTab === t && styles.toggleActive]}
            onPress={() => setActiveTab(t)}>
            <Text style={[styles.toggleText, activeTab === t && styles.toggleTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
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
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setLoading(true); fetchTransactions().finally(() => setLoading(false)); }}>
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
          {Object.keys(grouped).length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={28} color={PC.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'all' ? 'No transactions yet' : `No ${activeTab} transactions`}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'all' ? 'Tap + to add your first transaction' : `Switch to All to see everything`}
              </Text>
            </View>
          ) : (
            Object.entries(grouped).map(([month, txns]) => (
              <View key={month}>
                <Text style={styles.dateHeader}>{month}</Text>
                <View style={styles.txCard}>
                  {txns.map((tx, i) => (
                    <TxRow
                      key={tx._id}
                      tx={tx}
                      onLongPress={confirmDelete}
                      last={i === txns.length - 1}
                    />
                  ))}
                </View>
              </View>
            ))
          )}

          {transactions.length > 0 && (
            <Text style={styles.hint}>Long-press a transaction to delete it</Text>
          )}
        </ScrollView>
      )}

      <AddTransactionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onAdded={(tx) => setTransactions(prev => [tx, ...prev])}
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
  summaryItem:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: PC.positive },
  summaryLabel:  { color: PC.textSecondary, fontSize: 11, marginBottom: 3 },
  summaryAmount: { fontSize: 13, fontWeight: '600' },
  summaryDivider:{ width: 1, backgroundColor: PC.border, marginHorizontal: 4 },

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
  toggleBtn:        { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  toggleActive:     { backgroundColor: PC.bgCardElevated },
  toggleText:       { color: PC.textMuted, fontSize: 13, fontWeight: '500' },
  toggleTextActive: { color: PC.textPrimary },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },

  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  errorMsg:  { color: PC.textSecondary, fontSize: 14, marginTop: 12, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:  { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PC.bgCard, borderRadius: 10, borderWidth: 1, borderColor: PC.border },
  retryText: { color: PC.textPrimary, fontSize: 14, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { color: PC.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptyText:  { color: PC.textMuted, fontSize: 13 },

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
  txInfo:   { flex: 1 },
  txLabel:  { color: PC.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 3 },
  txMeta:   { color: PC.textSecondary, fontSize: 12 },
  txAmount: { fontSize: 14, fontWeight: '600' },
  amtPos:   { color: PC.positive },
  amtNeg:   { color: PC.negative },
  txDivider:{ height: 1, backgroundColor: PC.border, marginHorizontal: 16 },

  hint: { color: PC.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 8 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '92%',
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
  },
  typeBtnActive:       { backgroundColor: 'rgba(224,90,90,0.12)', borderWidth: 1, borderColor: 'rgba(224,90,90,0.30)' },
  typeBtnActiveIncome: { backgroundColor: 'rgba(92,184,92,0.12)', borderWidth: 1, borderColor: 'rgba(92,184,92,0.30)' },
  typeBtnText:         { color: PC.textMuted, fontSize: 14, fontWeight: '600' },

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
  chipActive:     { borderColor: PC.textPrimary, backgroundColor: 'rgba(255,255,255,0.07)' },
  chipText:       { color: PC.textMuted, fontSize: 12 },
  chipTextActive: { color: PC.textPrimary },

  submitBtn:         { backgroundColor: PC.textPrimary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText:     { color: PC.bg, fontSize: 15, fontWeight: '700' },

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
