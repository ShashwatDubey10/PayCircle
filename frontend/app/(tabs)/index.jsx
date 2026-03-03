import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PC } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  if (h < 21) return 'Good evening,';
  return 'Good night,';
}

function getInitials(name = '') {
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function formatMonth(monthStr) {
  // "2026-02" → "Feb 2026"
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  if (parts.length < 2) return monthStr;
  const [year, raw] = parts;
  const m = parseInt(raw, 10);
  if (isNaN(m) || m < 1 || m > 12) return monthStr;
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[m - 1]} ${year}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now   = new Date();
  const diffH = (now - d) / 3_600_000;
  if (diffH < 1)  return 'Just now';
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

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

const BAR_COLOR = { healthy: PC.positive, warning: PC.warning, critical: PC.negative, over: PC.negative };

// ─── Sub-components ───────────────────────────────────────────────────────────

function BudgetRing({ percent, status }) {
  const color = BAR_COLOR[status] || PC.textPrimary;
  return (
    <View style={[styles.ring, { borderColor: color }]}>
      <Text style={[styles.ringPercent, { color }]}>{percent}%</Text>
      <Text style={styles.ringLabel}>used</Text>
    </View>
  );
}

function TransactionRow({ item, last }) {
  const isIncome = item.type === 'income';
  const icon     = CATEGORY_ICONS[item.category] || 'swap-horizontal-outline';
  return (
    <>
      <View style={styles.txRow}>
        <View style={styles.txIconBox}>
          <Ionicons name={icon} size={19} color={PC.textSecondary} />
        </View>
        <View style={styles.txMeta}>
          <Text style={styles.txLabel}>{item.category}</Text>
          <Text style={styles.txDate}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, isIncome ? styles.amtPos : styles.amtNeg]}>
            {isIncome ? '+' : '-'}₹{(item.amount ?? 0).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.txCategory}>{item.notes || item.type}</Text>
        </View>
      </View>
      {!last && <View style={styles.txDivider} />}
    </>
  );
}

function SkeletonBox({ height = 120, mb = 14, radius = 16 }) {
  return <View style={[styles.skeleton, { height, marginBottom: mb, borderRadius: radius }]} />;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router       = useRouter();
  const { user }     = useAuth();

  const [dash,               setDash]               = useState(null);
  const [budget,             setBudget]             = useState(null);
  const [recent,             setRecent]             = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [refreshing,         setRefreshing]         = useState(false);
  const [error,              setError]              = useState('');
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetInput,        setBudgetInput]        = useState('');
  const [budgetSaving,       setBudgetSaving]       = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setError('');
      const [dashRes, budgetRes, txRes] = await Promise.all([
        api.get('/api/users/me/dashboard'),
        api.get('/api/users/me/budget'),
        api.get('/api/users/me/transactions'),
      ]);
      setDash(dashRes.data.data);
      setBudget(budgetRes.data);
      setRecent(txRes.data.transactions.slice(0, 5));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function onRefresh() {
    setRefreshing(true);
    fetchAll();
  }

  function openBudgetModal() {
    setBudgetInput(budget?.budget > 0 ? String(budget.budget) : '');
    setBudgetModalVisible(true);
  }

  async function saveBudget() {
    const amount = parseFloat(budgetInput);
    if (!budgetInput.trim() || isNaN(amount) || amount < 1) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget amount (minimum ₹1).');
      return;
    }
    setBudgetSaving(true);
    try {
      await api.post('/api/users/me/budget', { amount });
      setBudgetModalVisible(false);
      setBudgetInput('');
      fetchAll();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not save budget. Please try again.');
    } finally {
      setBudgetSaving(false);
    }
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const netGroupBalance = dash ? dash.totalToReceive - dash.totalOwed : 0;
  const budgetPct       = budget ? Math.min(Math.round(budget.usagePercentage), 100) : 0;
  const budgetStatus    = budget?.status || 'healthy';
  const currentMonth    = formatMonth(budget?.month);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingHeader}>
          <SkeletonBox height={28} mb={4} radius={8} />
          <SkeletonBox height={44} mb={0} radius={22} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <SkeletonBox height={160} mb={14} radius={20} />
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
            <SkeletonBox height={100} mb={0} radius={16} />
            <SkeletonBox height={100} mb={0} radius={16} />
          </View>
          <SkeletonBox height={110} mb={24} />
          <SkeletonBox height={220} mb={0} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    console.error('[Dashboard] fetch error:', error);
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.errorCenter}>
          <Ionicons name="cloud-offline-outline" size={42} color={PC.textMuted} />
          <Text style={styles.errorMsg}>Something went wrong. Please try again.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchAll}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PC.textSecondary}
          />
        }>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0] ?? 'there'} 👋</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Balance Card ── */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceBadge}>
            <Ionicons name="swap-horizontal-outline" size={14} color={PC.textSecondary} />
            <Text style={styles.balanceBadgeText}>Group Net Balance</Text>
          </View>
          <Text style={[
            styles.balanceAmount,
            { color: netGroupBalance >= 0 ? PC.positive : PC.negative },
          ]}>
            {netGroupBalance >= 0 ? '+' : ''}₹{Math.abs(netGroupBalance).toLocaleString('en-IN')}
          </Text>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceSubLabel}>Owed to you</Text>
              <Text style={[styles.balanceSubAmount, { color: PC.positive }]}>
                +₹{(dash?.totalToReceive ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.balanceSep} />
            <View>
              <Text style={styles.balanceSubLabel}>You owe</Text>
              <Text style={[styles.balanceSubAmount, { color: PC.negative }]}>
                -₹{(dash?.totalOwed ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Quick Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <Ionicons name="arrow-up-outline" size={18} color={PC.negative} />
            </View>
            <Text style={styles.statAmount}>
              ₹{(dash?.totalSpent?.combined ?? 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Spent this month</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconBox}>
              <Ionicons name="arrow-down-outline" size={18} color={PC.positive} />
            </View>
            <Text style={styles.statAmount}>
              ₹{(dash?.personalIncome ?? 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Earned this month</Text>
          </View>
        </View>

        {/* ── Budget Progress ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Monthly Budget</Text>
            {budget?.budget > 0 && (
              <TouchableOpacity onPress={openBudgetModal}>
                <Text style={styles.seeAll}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          {budget?.budget > 0 ? (
            <View style={styles.budgetCard}>
              <View style={styles.budgetInfo}>
                <Text style={styles.budgetPlan}>Plan · {currentMonth}</Text>
                <Text style={styles.budgetNumbers}>
                  ₹{(budget.spent ?? 0).toLocaleString('en-IN')}{' '}
                  <Text style={styles.budgetOf}>
                    / ₹{(budget.budget ?? 0).toLocaleString('en-IN')}
                  </Text>
                </Text>
                <View style={styles.barTrack}>
                  <View style={[
                    styles.barFill,
                    { width: `${budgetPct}%`, backgroundColor: BAR_COLOR[budgetStatus] || PC.textPrimary },
                  ]} />
                </View>
                <Text style={styles.budgetRemaining}>
                  {budget.remaining >= 0
                    ? `₹${budget.remaining.toLocaleString('en-IN')} remaining`
                    : `₹${Math.abs(budget.remaining).toLocaleString('en-IN')} over budget`}
                </Text>
              </View>
              <BudgetRing percent={budgetPct} status={budgetStatus} />
            </View>
          ) : (
            <TouchableOpacity style={styles.budgetEmpty} onPress={openBudgetModal}>
              <Ionicons name="add-circle-outline" size={20} color={PC.textSecondary} />
              <Text style={styles.budgetEmptyText}>Set a monthly budget</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Recent Activity ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {recent.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            <View style={styles.txCard}>
              {recent.map((tx, i) => (
                <TransactionRow key={tx._id} item={tx} last={i === recent.length - 1} />
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* ── Budget Modal ── */}
      <Modal
        visible={budgetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBudgetModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {budget?.budget > 0 ? 'Edit Monthly Budget' : 'Set Monthly Budget'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {formatMonth(budget?.month || new Date().toISOString().slice(0, 7))}
            </Text>
            <View style={styles.modalInputBox}>
              <Text style={styles.modalCurrencySymbol}>₹</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 10000"
                placeholderTextColor={PC.textMuted}
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="numeric"
                autoFocus
                editable={!budgetSaving}
              />
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setBudgetModalVisible(false)}
                disabled={budgetSaving}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, budgetSaving && { opacity: 0.6 }]}
                onPress={saveBudget}
                disabled={budgetSaving}>
                {budgetSaving
                  ? <ActivityIndicator size="small" color={PC.bg} />
                  : <Text style={styles.modalSaveText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },

  // Skeleton
  skeleton: { backgroundColor: PC.bgCard },

  // Loading header row (matches real header layout)
  loadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Error
  errorCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorMsg:    { color: PC.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:    { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PC.bgCard, borderRadius: 10, borderWidth: 1, borderColor: PC.border },
  retryText:   { color: PC.textPrimary, fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: { color: PC.textSecondary, fontSize: 13, marginBottom: 2 },
  userName:  { color: PC.textPrimary,   fontSize: 22, fontWeight: '700' },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: PC.textPrimary, fontSize: 14, fontWeight: '600' },

  // Balance card
  balanceCard: {
    backgroundColor: PC.bgCard,
    borderRadius: 20, borderWidth: 1, borderColor: PC.border,
    padding: 24, marginBottom: 14,
  },
  balanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  balanceBadgeText: { color: PC.textSecondary, fontSize: 13 },
  balanceAmount: { fontSize: 38, fontWeight: '700', letterSpacing: -1, marginBottom: 20 },
  balanceDivider: { height: 1, backgroundColor: PC.border, marginBottom: 16 },
  balanceRow:     { flexDirection: 'row', alignItems: 'center' },
  balanceSep:     { width: 1, height: 32, backgroundColor: PC.border, marginHorizontal: 24 },
  balanceSubLabel:  { color: PC.textSecondary, fontSize: 12, marginBottom: 4 },
  balanceSubAmount: { fontSize: 18, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: PC.bgCard,
    borderRadius: 16, borderWidth: 1, borderColor: PC.border, padding: 16,
  },
  statIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PC.bgCardElevated,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  statAmount: { color: PC.textPrimary, fontSize: 17, fontWeight: '600', marginBottom: 3 },
  statLabel:  { color: PC.textSecondary, fontSize: 11 },

  // Section
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { color: PC.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  seeAll:       { color: PC.textSecondary, fontSize: 13 },

  // Budget
  budgetCard: {
    backgroundColor: PC.bgCard,
    borderRadius: 16, borderWidth: 1, borderColor: PC.border,
    padding: 20, flexDirection: 'row', alignItems: 'center',
  },
  budgetInfo:      { flex: 1 },
  budgetPlan:      { color: PC.textSecondary, fontSize: 12, marginBottom: 6 },
  budgetNumbers:   { color: PC.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  budgetOf:        { color: PC.textSecondary, fontWeight: '400', fontSize: 14 },
  barTrack:        { height: 4, backgroundColor: PC.border, borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  barFill:         { height: '100%', borderRadius: 2 },
  budgetRemaining: { color: PC.textSecondary, fontSize: 11 },
  budgetEmpty: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: PC.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: PC.border, borderStyle: 'dashed', padding: 20,
  },
  budgetEmptyText: { color: PC.textSecondary, fontSize: 14 },

  // Ring
  ring: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 3.5,
    alignItems: 'center', justifyContent: 'center', marginLeft: 20,
  },
  ringPercent: { fontSize: 15, fontWeight: '700' },
  ringLabel:   { color: PC.textSecondary, fontSize: 9, marginTop: 1 },

  // Transactions
  txCard: {
    backgroundColor: PC.bgCard,
    borderRadius: 16, borderWidth: 1, borderColor: PC.border, overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  txIconBox: {
    width: 40, height: 40, borderRadius: 11,
    backgroundColor: PC.bgCardElevated,
    alignItems: 'center', justifyContent: 'center', marginRight: 13,
  },
  txMeta:    { flex: 1 },
  txLabel:   { color: PC.textPrimary,   fontSize: 14, fontWeight: '500', marginBottom: 3 },
  txDate:    { color: PC.textSecondary, fontSize: 12 },
  txRight:   { alignItems: 'flex-end' },
  txAmount:  { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  txCategory:{ color: PC.textMuted, fontSize: 11 },
  amtPos:    { color: PC.positive },
  amtNeg:    { color: PC.negative },
  txDivider: { height: 1, backgroundColor: PC.border, marginHorizontal: 16 },

  // Empty state
  emptyCard: {
    backgroundColor: PC.bgCard,
    borderRadius: 16, borderWidth: 1, borderColor: PC.border,
    padding: 32, alignItems: 'center',
  },
  emptyText: { color: PC.textMuted, fontSize: 14 },

  // Budget modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', backgroundColor: PC.bgCard,
    borderRadius: 20, borderWidth: 1, borderColor: PC.border,
    padding: 24,
  },
  modalTitle:    { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { color: PC.textSecondary, fontSize: 13, marginBottom: 20 },
  modalInputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PC.bgInput, borderRadius: 12,
    borderWidth: 1, borderColor: PC.border,
    paddingHorizontal: 14, height: 52, marginBottom: 20,
  },
  modalCurrencySymbol: { color: PC.textSecondary, fontSize: 18, fontWeight: '600', marginRight: 8 },
  modalInput: { flex: 1, color: PC.textPrimary, fontSize: 18, fontWeight: '500' },
  modalBtnRow: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1, height: 48, borderRadius: 12,
    borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCancelText: { color: PC.textSecondary, fontSize: 14, fontWeight: '500' },
  modalSaveBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: PC.textPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  modalSaveText: { color: PC.bg, fontSize: 14, fontWeight: '700' },
});
