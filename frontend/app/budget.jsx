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

// ─── Overall Budget Modal ─────────────────────────────────────────────────────

function OverallBudgetModal({ visible, current, onClose, onSaved }) {
  const [input,  setInput]  = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setInput(current > 0 ? String(current) : '');
  }, [visible, current]);

  async function handleSave() {
    const amt = parseFloat(input);
    if (!input.trim() || isNaN(amt) || amt < 1) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (minimum ₹1).');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/users/me/budget', { amount: amt });
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not save budget.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>Overall Monthly Budget</Text>
          <Text style={s.modalSubtitle}>Set your total spending limit for the month</Text>
          <View style={s.modalInputRow}>
            <Text style={s.rupee}>₹</Text>
            <TextInput
              style={s.modalInput}
              placeholder="e.g. 10000"
              placeholderTextColor={PC.textMuted}
              value={input}
              onChangeText={setInput}
              keyboardType="numeric"
              autoFocus
              editable={!saving}
            />
          </View>
          <View style={s.modalBtnRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={PC.bg} />
                : <Text style={s.saveBtnText}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Category Budget Modal ─────────────────────────────────────────────────────
// catModal: null | { mode: 'add' } | { mode: 'edit', item }

function CategoryBudgetModal({ catModal, currentCategories, onClose, onSaved }) {
  const [nameInput, setNameInput] = useState('');
  const [amtInput,  setAmtInput]  = useState('');
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const isEdit = catModal?.mode === 'edit';

  useEffect(() => {
    if (!catModal) return;
    if (isEdit) {
      setNameInput(catModal.item.category);
      setAmtInput(catModal.item.limit > 0 ? String(catModal.item.limit) : '');
    } else {
      setNameInput('');
      setAmtInput('');
    }
  }, [catModal]);

  if (!catModal) return null;

  function buildBase() {
    return (currentCategories || []).map(c => ({ category: c.category, amount: c.limit }));
  }

  async function handleSave() {
    const name = nameInput.trim();
    const amt  = parseFloat(amtInput);

    if (!name) {
      Alert.alert('Name Required', 'Please enter a category name.');
      return;
    }
    if (name.length > 50) {
      Alert.alert('Too Long', 'Category name must be 50 characters or less.');
      return;
    }
    if (isNaN(amt) || amt < 1) {
      Alert.alert('Invalid Amount', 'Please enter a valid limit (minimum ₹1).');
      return;
    }

    setSaving(true);
    try {
      const base = buildBase();
      let updated;

      if (isEdit) {
        const origName  = catModal.item.category;
        const collision = base.some(
          c => c.category.toLowerCase() === name.toLowerCase() && c.category !== origName
        );
        if (collision) {
          Alert.alert('Duplicate', `A category named "${name}" already exists.`);
          setSaving(false);
          return;
        }
        updated = base.map(c => c.category === origName ? { category: name, amount: amt } : c);
      } else {
        const duplicate = base.some(c => c.category.toLowerCase() === name.toLowerCase());
        if (duplicate) {
          Alert.alert('Duplicate', `A category named "${name}" already exists.`);
          setSaving(false);
          return;
        }
        updated = [...base, { category: name, amount: amt }];
      }

      await api.post('/api/users/me/budget/categories', { categories: updated });
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not save category budget.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Remove Category',
      `Remove the "${catModal.item.category}" budget?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const updated = buildBase().filter(c => c.category !== catModal.item.category);
              await api.post('/api/users/me/budget/categories', { categories: updated });
              onSaved();
              onClose();
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not remove category.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  const icon = getCatIcon(nameInput || (isEdit ? catModal.item.category : ''));
  const busy = saving || deleting;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.sheetOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />

          {/* Title row */}
          <View style={s.sheetHeader}>
            <View style={s.sheetIconBox}>
              <Ionicons name={icon} size={20} color={PC.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetCatName}>
                {isEdit ? 'Edit Category' : 'New Category'}
              </Text>
              {isEdit && (
                <Text style={s.sheetSpent}>₹{fmt(catModal.item.spent)} spent this month</Text>
              )}
            </View>
            {isEdit && (
              <TouchableOpacity onPress={handleDelete} disabled={busy} style={s.deleteIconBtn}>
                {deleting
                  ? <ActivityIndicator size="small" color={PC.negative} />
                  : <Ionicons name="trash-outline" size={18} color={PC.negative} />
                }
              </TouchableOpacity>
            )}
          </View>

          {/* Name input */}
          <Text style={s.inputLabel}>Category name</Text>
          <View style={s.modalInputRow}>
            <TextInput
              style={[s.modalInput, { fontSize: 15 }]}
              placeholder="e.g. Rent, Groceries, Netflix…"
              placeholderTextColor={PC.textMuted}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus={!isEdit}
              editable={!busy}
              maxLength={50}
            />
          </View>

          {/* Amount input */}
          <Text style={s.inputLabel}>Monthly limit</Text>
          <View style={s.modalInputRow}>
            <Text style={s.rupee}>₹</Text>
            <TextInput
              style={s.modalInput}
              placeholder="e.g. 5000"
              placeholderTextColor={PC.textMuted}
              value={amtInput}
              onChangeText={setAmtInput}
              keyboardType="numeric"
              autoFocus={isEdit}
              editable={!busy}
            />
          </View>

          <View style={[s.modalBtnRow, { marginTop: 8 }]}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={busy}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, busy && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={busy}>
              {saving
                ? <ActivityIndicator size="small" color={PC.bg} />
                : <Text style={s.saveBtnText}>{isEdit ? 'Update' : 'Add'}</Text>
              }
            </TouchableOpacity>
          </View>
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

  const [overallModal, setOverallModal] = useState(false);
  const [catModal,     setCatModal]     = useState(null);

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
            <TouchableOpacity style={s.editOverallBtn} onPress={() => setOverallModal(true)}>
              <Ionicons name="create-outline" size={15} color={PC.textSecondary} style={{ marginRight: 6 }} />
              <Text style={s.editOverallBtnText}>Edit Overall Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.emptyCard} onPress={() => setOverallModal(true)}>
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
                onPress={() => setCatModal({ mode: 'edit', item })}
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

        <TouchableOpacity style={s.addCatBtn} onPress={() => setCatModal({ mode: 'add' })}>
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

      {/* ── Overall Budget Modal ── */}
      <OverallBudgetModal
        visible={overallModal}
        current={budget?.budget ?? 0}
        onClose={() => setOverallModal(false)}
        onSaved={fetchBudget}
      />

      {/* ── Category Modal (add / edit) ── */}
      <CategoryBudgetModal
        catModal={catModal}
        currentCategories={cats}
        onClose={() => setCatModal(null)}
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
    backgroundColor: PC.textPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: PC.bg, fontSize: 14, fontWeight: '700' },

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
});
