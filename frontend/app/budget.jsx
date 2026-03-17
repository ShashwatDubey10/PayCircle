import React, { useState, useCallback, useEffect } from 'react';
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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PC } from '@/constants/theme';
import api from '@/services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCatIcon(name = '') {
  const n = name.toLowerCase();
  if (n.includes('food') || n.includes('eat') || n.includes('restaurant') || n.includes('dining') || n.includes('groceries') || n.includes('grocery') || n.includes('mess')) return 'fast-food-outline';
  if (n.includes('travel') || n.includes('transport') || n.includes('commute') || n.includes('flight') || n.includes('fuel') || n.includes('petrol') || n.includes('cab') || n.includes('bus') || n.includes('train')) return 'airplane-outline';
  if (n.includes('util') || n.includes('electric') || n.includes('water') || n.includes('internet') || n.includes('wifi') || n.includes('phone') || n.includes('bill') || n.includes('recharge')) return 'flash-outline';
  if (n.includes('entertain') || n.includes('movie') || n.includes('game') || n.includes('netflix') || n.includes('music') || n.includes('subscription') || n.includes('ott')) return 'film-outline';
  if (n.includes('health') || n.includes('medical') || n.includes('medicine') || n.includes('gym') || n.includes('fitness') || n.includes('doctor') || n.includes('pharmacy') || n.includes('hospital')) return 'fitness-outline';
  if (n.includes('shop') || n.includes('cloth') || n.includes('fashion') || n.includes('amazon') || n.includes('flipkart') || n.includes('purchase') || n.includes('buy')) return 'bag-outline';
  if (n.includes('rent') || n.includes('house') || n.includes('home') || n.includes('pg') || n.includes('accommodation') || n.includes('hostel')) return 'home-outline';
  if (n.includes('edu') || n.includes('study') || n.includes('course') || n.includes('book') || n.includes('tuition') || n.includes('college') || n.includes('fee')) return 'book-outline';
  return 'grid-outline';
}

const BAR_COLOR = {
  healthy:  PC.positive,
  warning:  PC.warning,
  critical: PC.negative,
  over:     PC.negative,
};

function formatMonth(monthStr) {
  if (!monthStr) return '';
  const [year, raw] = monthStr.split('-');
  const m = parseInt(raw, 10);
  if (isNaN(m)) return monthStr;
  const names = ['January','February','March','April','May','June',
                 'July','August','September','October','November','December'];
  return `${names[m - 1]} ${year}`;
}

function fmt(n) {
  return (n ?? 0).toLocaleString('en-IN');
}

// ─── Budget Setup Sheet (combined overall + categories) ───────────────────────

function BudgetSetupSheet({ visible, currentBudget, currentCategories, onClose, onSaved }) {
  const [overallInput, setOverallInput] = useState('');
  const [catRows,      setCatRows]      = useState([]);
  const [saving,       setSaving]       = useState(false);

  const currentMonth = (() => {
    const now = new Date();
    const names = ['January','February','March','April','May','June',
                   'July','August','September','October','November','December'];
    return `${names[now.getMonth()]} ${now.getFullYear()}`;
  })();

  useEffect(() => {
    if (!visible) return;
    setOverallInput(currentBudget > 0 ? String(currentBudget) : '');
    setCatRows((currentCategories || []).map(c => ({
      category: c.category,
      amount:   c.limit > 0 ? String(c.limit) : '',
      id:       Math.random().toString(36).slice(2),
    })));
  }, [visible]);

  function addRow() {
    setCatRows(prev => [...prev, { category: '', amount: '', id: Math.random().toString(36).slice(2) }]);
  }

  function removeRow(id) {
    setCatRows(prev => prev.filter(r => r.id !== id));
  }

  function updateRow(id, field, value) {
    setCatRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  async function handleSave() {
    const overallAmt = parseFloat(overallInput);
    const hasOverall = overallInput.trim().length > 0;

    if (hasOverall && (isNaN(overallAmt) || overallAmt < 1)) {
      Alert.alert('Invalid Amount', 'Overall budget must be at least ₹1.');
      return;
    }
    for (const row of catRows) {
      const trimmed = row.category.trim();
      if (!trimmed) { Alert.alert('Name Required', 'Each category must have a name.'); return; }
      const amt = parseFloat(row.amount);
      if (isNaN(amt) || amt < 1) { Alert.alert('Invalid Amount', `"${trimmed}" needs a limit of at least ₹1.`); return; }
    }
    const names = catRows.map(r => r.category.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      Alert.alert('Duplicate', 'Category names must be unique.');
      return;
    }

    setSaving(true);
    try {
      const calls = [];
      if (hasOverall) calls.push(api.post('/api/users/me/budget', { amount: overallAmt }));
      const mapped = catRows.map(r => ({ category: r.category.trim(), amount: parseFloat(r.amount) }));
      calls.push(api.post('/api/users/me/budget/categories', { categories: mapped }));
      await Promise.all(calls);
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not save budget.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.sheetOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={s.setupSheet}>
          <View style={s.sheetHandle} />

          {/* Header */}
          <View style={s.setupSheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.setupSheetTitle}>Set Monthly Budget</Text>
              <Text style={s.setupSheetMonth}>{currentMonth}</Text>
            </View>
            <TouchableOpacity style={s.setupSheetClose} onPress={onClose} disabled={saving}>
              <Ionicons name="close" size={20} color={PC.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Overall limit */}
            <Text style={s.setupSectionLabel}>Overall Limit</Text>
            <View style={s.modalInputRow}>
              <Text style={s.rupee}>₹</Text>
              <TextInput
                style={s.modalInput}
                placeholder="e.g. 10000"
                placeholderTextColor={PC.textMuted}
                value={overallInput}
                onChangeText={setOverallInput}
                keyboardType="numeric"
                editable={!saving}
              />
            </View>

            {/* Category limits */}
            <Text style={[s.setupSectionLabel, { marginTop: 20 }]}>Category Limits</Text>
            <View style={s.setupCatList}>
              {catRows.map(row => (
                <View key={row.id} style={s.setupCatRow}>
                  <View style={s.setupCatIconBox}>
                    <Ionicons name={getCatIcon(row.category)} size={17} color={PC.textSecondary} />
                  </View>
                  <TextInput
                    style={s.setupCatNameInput}
                    placeholder="Category name"
                    placeholderTextColor={PC.textMuted}
                    value={row.category}
                    onChangeText={v => updateRow(row.id, 'category', v)}
                    editable={!saving}
                    maxLength={50}
                  />
                  <Text style={s.setupCatRupee}>₹</Text>
                  <TextInput
                    style={s.setupCatAmtInput}
                    placeholder="0"
                    placeholderTextColor={PC.textMuted}
                    value={row.amount}
                    onChangeText={v => updateRow(row.id, 'amount', v)}
                    keyboardType="numeric"
                    editable={!saving}
                  />
                  <TouchableOpacity style={s.setupCatDelete} onPress={() => removeRow(row.id)} disabled={saving}>
                    <Ionicons name="trash-outline" size={15} color={PC.negative} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={s.setupAddCatRow} onPress={addRow} disabled={saving}>
                <Ionicons name="add-circle-outline" size={18} color={PC.accent} />
                <Text style={s.setupAddCatText}>Add Category</Text>
              </TouchableOpacity>
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }, { marginTop: 24, marginBottom: 8 }]}
              onPress={handleSave}
              disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#060A09" />
                : <Text style={s.saveBtnText}>Save All</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, status, height = 5 }) {
  const color = BAR_COLOR[status] || PC.textMuted;
  const fill  = Math.min(Math.round(pct ?? 0), 100);
  return (
    <View style={[s.barTrack, { height }]}>
      <View style={[s.barFill, { width: `${fill}%`, backgroundColor: color, height }]} />
    </View>
  );
}

// ─── Category Row ─────────────────────────────────────────────────────────────

function CategoryRow({ item, onPress, last }) {
  const barColor = BAR_COLOR[item.status] || PC.textMuted;
  const pct      = Math.min(Math.round(item.usagePercentage ?? 0), 100);
  const icon     = getCatIcon(item.category);

  return (
    <>
      <TouchableOpacity style={s.catRow} onPress={onPress} activeOpacity={0.7}>
        <View style={s.catIconBox}>
          <Ionicons name={icon} size={18} color={PC.textSecondary} />
        </View>
        <View style={s.catInfo}>
          <View style={s.catTopRow}>
            <Text style={s.catName}>{item.category}</Text>
            <Text style={[s.catLimitText, { color: barColor }]}>{pct}%</Text>
          </View>
          <ProgressBar pct={pct} status={item.status} />
          <View style={s.catBottomRow}>
            <Text style={s.catSpentText}>₹{fmt(item.spent)} spent</Text>
            <Text style={s.catRemainingText}>
              {item.remaining >= 0
                ? `₹${fmt(item.remaining)} left of ₹${fmt(item.limit)}`
                : `₹${fmt(Math.abs(item.remaining))} over ₹${fmt(item.limit)}`
              }
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={15} color={PC.textMuted} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
      {!last && <View style={s.rowDivider} />}
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BudgetScreen() {
  const router = useRouter();

  const [budget,     setBudgetData] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const [setupSheet, setSetupSheet] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchBudget = useCallback(async () => {
    try {
      setError('');
      const { data } = await api.get('/api/users/me/budget');
      setBudgetData(data);
    } catch (err) {
      setError(err.message || 'Failed to load budget.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBudget(); }, [fetchBudget]);

  function onRefresh() {
    setRefreshing(true);
    fetchBudget();
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const hasOverall     = (budget?.budget ?? 0) > 0;
  const overallPct     = hasOverall ? Math.min(Math.round(budget.usagePercentage ?? 0), 100) : 0;
  const overallColor   = BAR_COLOR[budget?.status] || PC.textMuted;
  const monthLabel     = formatMonth(budget?.month);
  const cats           = budget?.categories || [];
  const allocatedTotal = cats.reduce((s, c) => s + c.limit, 0);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Monthly Budget</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={s.centered}>
          <ActivityIndicator color={PC.textPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Monthly Budget</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={s.centered}>
          <Ionicons name="cloud-offline-outline" size={36} color={PC.textMuted} />
          <Text style={s.errorMsg}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => { setLoading(true); fetchBudget(); }}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.headerRow}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Monthly Budget</Text>
        {monthLabel ? (
          <View style={s.monthBadge}>
            <Text style={s.monthBadgeText}>{monthLabel}</Text>
          </View>
        ) : <View style={{ width: 38 }} />}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PC.textSecondary} />
        }>

        {/* ── Overall Budget ── */}
        <Text style={s.sectionLabel}>Overall</Text>

        {hasOverall ? (
          <View style={s.overallCard}>
            <View style={s.overallTop}>
              <View style={s.overallLeft}>
                <Text style={s.overallSpent}>
                  ₹{fmt(budget.spent)}
                  <Text style={s.overallOf}> / ₹{fmt(budget.budget)}</Text>
                </Text>
                <ProgressBar pct={overallPct} status={budget.status} height={6} />
                <Text style={[s.overallRemaining, budget.remaining < 0 && { color: PC.negative }]}>
                  {budget.remaining >= 0
                    ? `₹${fmt(budget.remaining)} remaining`
                    : `₹${fmt(Math.abs(budget.remaining))} over budget`
                  }
                </Text>
                {allocatedTotal > 0 && (
                  <Text style={s.allocNote}>
                    ₹{fmt(allocatedTotal)} allocated across categories
                  </Text>
                )}
              </View>
              <View style={[s.overallRing, { borderColor: overallColor }]}>
                <Text style={[s.ringPct, { color: overallColor }]}>{overallPct}%</Text>
                <Text style={s.ringUsed}>used</Text>
              </View>
            </View>
            <TouchableOpacity style={s.editOverallBtn} onPress={() => setSetupSheet(true)}>
              <Ionicons name="create-outline" size={15} color={PC.textSecondary} style={{ marginRight: 6 }} />
              <Text style={s.editOverallBtnText}>Edit Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.emptyCard} onPress={() => setSetupSheet(true)}>
            <Ionicons name="add-circle-outline" size={22} color={PC.textSecondary} />
            <Text style={s.emptyCardText}>Set an overall monthly budget</Text>
            <Text style={s.emptyCardSub}>Track total spending across all categories</Text>
          </TouchableOpacity>
        )}

        {/* ── Category Budgets ── */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionLabel}>By Category</Text>
          {cats.length > 0 && (
            <Text style={s.sectionNote}>
              {cats.length} {cats.length === 1 ? 'category' : 'categories'}
            </Text>
          )}
        </View>

        {cats.length > 0 ? (
          <View style={s.catCard}>
            {cats.map((item, i) => (
              <CategoryRow
                key={item.category}
                item={item}
                last={i === cats.length - 1}
                onPress={() => setSetupSheet(true)}
              />
            ))}
          </View>
        ) : (
          <View style={s.emptyCatCard}>
            <Ionicons name="layers-outline" size={28} color={PC.textMuted} />
            <Text style={s.emptyCatText}>No category budgets yet</Text>
            <Text style={s.emptyCatSub}>Add custom categories to track specific spending areas</Text>
          </View>
        )}

        <TouchableOpacity style={s.addCatBtn} onPress={() => setSetupSheet(true)}>
          <Ionicons name="add" size={16} color={PC.textPrimary} style={{ marginRight: 6 }} />
          <Text style={s.addCatBtnText}>Add Category</Text>
        </TouchableOpacity>

        {/* ── Footer note ── */}
        <View style={s.footerNote}>
          <Ionicons name="information-circle-outline" size={14} color={PC.textMuted} style={{ marginRight: 6 }} />
          <Text style={s.footerNoteText}>
            Spend includes your share of group expenses and personal expenses for this month.
          </Text>
        </View>

      </ScrollView>

      {/* ── Budget Setup Sheet ── */}
      <BudgetSetupSheet
        visible={setupSheet}
        currentBudget={budget?.budget ?? 0}
        currentCategories={cats}
        onClose={() => setSetupSheet(false)}
        onSaved={fetchBudget}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: PC.bg },
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorMsg:  { color: PC.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:  { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PC.bgCard, borderRadius: 10, borderWidth: 1, borderColor: PC.border },
  retryText: { color: PC.textPrimary, fontSize: 14 },

  // Header
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle:    { flex: 1, color: PC.textPrimary, fontSize: 18, fontWeight: '700' },
  monthBadge:     { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: PC.bgCard, borderRadius: 10, borderWidth: 1, borderColor: PC.border },
  monthBadgeText: { color: PC.textSecondary, fontSize: 11, fontWeight: '500' },

  // Section labels
  sectionLabel: {
    color: PC.textSecondary, fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 10, marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10, marginTop: 8,
  },
  sectionNote: { color: PC.textMuted, fontSize: 12 },

  // Overall budget card
  overallCard: {
    backgroundColor: PC.bgCard, borderRadius: 20,
    borderWidth: 1, borderColor: PC.border,
    padding: 20, marginBottom: 24,
  },
  overallTop:       { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  overallLeft:      { flex: 1, marginRight: 16 },
  overallSpent:     { color: PC.textPrimary, fontSize: 26, fontWeight: '700', marginBottom: 12 },
  overallOf:        { color: PC.textSecondary, fontSize: 16, fontWeight: '400' },
  overallRemaining: { color: PC.textSecondary, fontSize: 13, marginTop: 8 },
  allocNote:        { color: PC.textMuted, fontSize: 11, marginTop: 4 },

  overallRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 4, alignItems: 'center', justifyContent: 'center',
  },
  ringPct:  { fontSize: 17, fontWeight: '700' },
  ringUsed: { color: PC.textSecondary, fontSize: 9, marginTop: 1 },

  editOverallBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: PC.border,
  },
  editOverallBtnText: { color: PC.textSecondary, fontSize: 13 },

  // Empty overall card
  emptyCard: {
    backgroundColor: PC.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: PC.border, borderStyle: 'dashed',
    padding: 28, alignItems: 'center', gap: 6, marginBottom: 24,
  },
  emptyCardText: { color: PC.textSecondary, fontSize: 15, fontWeight: '600' },
  emptyCardSub:  { color: PC.textMuted, fontSize: 12, textAlign: 'center' },

  // Bar
  barTrack: { backgroundColor: PC.border, borderRadius: 3, overflow: 'hidden', marginVertical: 2 },
  barFill:  { borderRadius: 3 },

  // Category list card
  catCard: {
    backgroundColor: PC.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: PC.border, overflow: 'hidden',
    marginBottom: 12,
  },
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  catIconBox: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: PC.bgCardElevated,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  catInfo:          { flex: 1 },
  catTopRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  catName:          { color: PC.textPrimary, fontSize: 14, fontWeight: '500' },
  catLimitText:     { fontSize: 12, fontWeight: '600' },
  catBottomRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  catSpentText:     { color: PC.textMuted, fontSize: 11, flex: 1 },
  catRemainingText: { color: PC.textSecondary, fontSize: 11 },
  rowDivider:       { height: 1, backgroundColor: PC.border, marginHorizontal: 16 },

  // Empty category card
  emptyCatCard: {
    backgroundColor: PC.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: PC.border, borderStyle: 'dashed',
    padding: 28, alignItems: 'center', gap: 6, marginBottom: 12,
  },
  emptyCatText: { color: PC.textSecondary, fontSize: 14, fontWeight: '600' },
  emptyCatSub:  { color: PC.textMuted, fontSize: 12, textAlign: 'center' },

  // Add Category button
  addCatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, borderWidth: 1, borderColor: PC.border,
    paddingVertical: 12, marginBottom: 24,
    backgroundColor: PC.bgCard,
  },
  addCatBtnText: { color: PC.textPrimary, fontSize: 14, fontWeight: '600' },

  // Footer note
  footerNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: PC.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: PC.border,
    padding: 12, marginTop: 4,
  },
  footerNoteText: { flex: 1, color: PC.textMuted, fontSize: 12, lineHeight: 17 },

  // Overall budget modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', backgroundColor: PC.bgCard,
    borderRadius: 20, borderWidth: 1, borderColor: PC.border, padding: 24,
  },
  modalTitle:    { color: PC.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { color: PC.textSecondary, fontSize: 13, marginBottom: 18 },
  inputLabel:    { color: PC.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 },
  modalInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PC.bgInput, borderRadius: 12,
    borderWidth: 1, borderColor: PC.border,
    paddingHorizontal: 14, height: 52, marginBottom: 12,
  },
  rupee:      { color: PC.textSecondary, fontSize: 18, fontWeight: '600', marginRight: 8 },
  modalInput: { flex: 1, color: PC.textPrimary, fontSize: 18, fontWeight: '500' },
  modalBtnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 12,
    borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { color: PC.textSecondary, fontSize: 14, fontWeight: '500' },
  saveBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: PC.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#060A09', fontSize: 14, fontWeight: '700' },

  // Category bottom sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: PC.border,
    padding: 24, paddingBottom: 32,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: PC.border, alignSelf: 'center', marginBottom: 20,
  },
  sheetHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  sheetIconBox: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetCatName: { color: PC.textPrimary, fontSize: 16, fontWeight: '700' },
  sheetSpent:   { color: PC.textSecondary, fontSize: 12, marginTop: 2 },
  deleteIconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Budget Setup Sheet (combined)
  setupSheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: PC.border,
    padding: 24, paddingBottom: 32,
    maxHeight: '88%',
  },
  setupSheetHeader:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  setupSheetTitle:   { color: PC.textPrimary, fontSize: 18, fontWeight: '700' },
  setupSheetMonth:   { color: PC.textSecondary, fontSize: 12, marginTop: 3 },
  setupSheetClose: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  setupSectionLabel: {
    color: PC.textSecondary, fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  setupCatList:    { gap: 8, marginBottom: 4 },
  setupCatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: PC.bgCardElevated, borderRadius: 12,
    borderWidth: 1, borderColor: PC.border,
    paddingHorizontal: 10, paddingVertical: 10,
  },
  setupCatIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },
  setupCatNameInput: { flex: 1, color: PC.textPrimary, fontSize: 14 },
  setupCatRupee:     { color: PC.textSecondary, fontSize: 15, fontWeight: '600' },
  setupCatAmtInput:  { width: 70, color: PC.textPrimary, fontSize: 14, textAlign: 'right' },
  setupCatDelete: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  setupAddCatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 4,
    borderTopWidth: 1, borderTopColor: PC.border, marginTop: 4,
  },
  setupAddCatText: { color: PC.accent, fontSize: 14, fontWeight: '600' },
});
