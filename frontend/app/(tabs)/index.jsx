import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PC } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 40 - 32; // screen - padding - card padding

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function getInitials(name = '') {
  return name.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function formatMonth(monthStr) {
  if (!monthStr) return '';
  const [year, raw] = monthStr.split('-');
  const m = parseInt(raw, 10);
  if (isNaN(m) || m < 1 || m > 12) return monthStr;
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${year}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffH = (now - d) / 3_600_000;
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  if (diffH < 48) return 'Yesterday';
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getDate()}`;
}

function shortDay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return ['S','M','T','W','T','F','S'][d.getDay()];
}

const CATEGORY_ICONS = {
  Food: 'fast-food-outline', Travel: 'airplane-outline', Utilities: 'flash-outline',
  Entertainment: 'film-outline', Health: 'fitness-outline', Shopping: 'bag-outline',
  Salary: 'briefcase-outline', Freelance: 'laptop-outline', Investment: 'trending-up-outline',
  Miscellaneous: 'grid-outline', Settlement: 'swap-horizontal-outline', Split: 'people-outline',
};

const CATEGORY_COLORS = {
  Food: '#FF8C42', Travel: '#4FC3F7', Utilities: '#FFB020', Entertainment: '#CE93D8',
  Health: '#EF9A9A', Shopping: '#80CBC4', Salary: '#00E5BE', Freelance: '#A5D6A7',
  Investment: '#00E5BE', Miscellaneous: '#637870', Settlement: '#4FC3F7', Split: '#CE93D8',
};

const STATUS_COLOR = { healthy: PC.positive, warning: PC.warning, critical: PC.negative, over: PC.negative };

// ─── Animated progress bar ────────────────────────────────────────────────────

function AnimatedBar({ pct, color, height = 5, delay = 0 }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct / 100,
      duration: 900,
      delay,
      useNativeDriver: false,
    }).start();
  }, [pct, delay]);
  return (
    <View style={[styles.barTrack, { height }]}>
      <Animated.View
        style={[
          styles.barFill,
          { height, backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
    </View>
  );
}

// ─── Budget Hero Card ─────────────────────────────────────────────────────────

function BudgetHero({ budget, onEdit, onManage }) {
  const hasData = budget?.budget > 0;
  const pct = hasData ? Math.min(Math.round(budget.usagePercentage ?? 0), 100) : 0;
  const status = budget?.status || 'healthy';
  const barColor = STATUS_COLOR[status];
  const month = formatMonth(budget?.month);
  const remaining = budget?.remaining ?? 0;

  if (!hasData) {
    return (
      <TouchableOpacity style={styles.budgetHeroEmpty} onPress={onEdit} activeOpacity={0.8}>
        <View style={styles.budgetHeroEmptyInner}>
          <View style={styles.budgetEmptyIcon}>
            <Ionicons name="wallet-outline" size={24} color={PC.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.budgetEmptyTitle}>No budget set</Text>
            <Text style={styles.budgetEmptyHint}>Tap to set a monthly spending limit</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={PC.textMuted} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.budgetHero} activeOpacity={0.9} onPress={onManage}>
      {/* Top row */}
      <View style={styles.budgetHeroTop}>
        <View>
          <Text style={styles.budgetHeroLabel}>Monthly Budget · {month}</Text>
          <Text style={styles.budgetHeroAmount}>
            ₹{(budget.spent ?? 0).toLocaleString('en-IN')}
            <Text style={styles.budgetHeroOf}> / ₹{(budget.budget ?? 0).toLocaleString('en-IN')}</Text>
          </Text>
        </View>
        <View style={[styles.budgetPctBadge, { borderColor: barColor + '60' }]}>
          <Text style={[styles.budgetPctText, { color: barColor }]}>{pct}%</Text>
        </View>
      </View>

      {/* Progress bar */}
      <AnimatedBar pct={pct} color={barColor} height={8} />

      {/* Bottom row */}
      <View style={styles.budgetHeroBottom}>
        <View style={styles.budgetHeroStat}>
          <View style={[styles.budgetDot, { backgroundColor: barColor }]} />
          <Text style={styles.budgetHeroStatText}>
            {remaining >= 0
              ? `₹${remaining.toLocaleString('en-IN')} left`
              : `₹${Math.abs(remaining).toLocaleString('en-IN')} over`}
          </Text>
        </View>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.budgetEditLink}>Edit budget</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Category bar chart ───────────────────────────────────────────────────────

function CategoryChart({ breakdown }) {
  if (!breakdown?.length) return null;
  const max = Math.max(...breakdown.map(b => b.amount), 1);
  return (
    <View style={styles.categoryChart}>
      {breakdown.slice(0, 5).map(({ category, amount }, i) => {
        const pct   = Math.round((amount / max) * 100);
        const color = CATEGORY_COLORS[category] || PC.textSecondary;
        return (
          <View key={category} style={styles.catRow}>
            <View style={styles.catLeft}>
              <View style={[styles.catDot, { backgroundColor: color }]} />
              <Text style={styles.catLabel}>{category}</Text>
            </View>
            <View style={styles.catBarWrap}>
              <AnimatedBar pct={pct} color={color} height={6} delay={i * 80} />
            </View>
            <Text style={styles.catAmt}>₹{amount.toLocaleString('en-IN')}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── 7-day sparkline ──────────────────────────────────────────────────────────

function SpendingSparkline({ transactions }) {
  // Build last-7-days buckets
  const today = new Date();
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return { label: shortDay(d.toISOString()), date: d.toISOString().slice(0, 10), amount: 0 };
  });

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const txDate = new Date(tx.date).toISOString().slice(0, 10);
    const bucket = buckets.find(b => b.date === txDate);
    if (bucket) bucket.amount += tx.amount ?? 0;
  }

  const max = Math.max(...buckets.map(b => b.amount), 1);
  const barW = Math.floor((CHART_W - 60) / 7 - 6);

  return (
    <View style={styles.sparkline}>
      <View style={styles.sparkBars}>
        {buckets.map((b, i) => {
          const h = Math.max(Math.round((b.amount / max) * 72), 3);
          const isToday = i === 6;
          return (
            <View key={i} style={styles.sparkCol}>
              <View style={styles.sparkBarWrap}>
                <View
                  style={[
                    styles.sparkBar,
                    {
                      height: h,
                      width: barW,
                      backgroundColor: isToday ? PC.accent : (b.amount > 0 ? PC.accent + '55' : PC.border),
                      borderRadius: 4,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.sparkLabel, isToday && { color: PC.accent }]}>{b.label}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.sparkLegend}>
        <Text style={styles.sparkLegendText}>Last 7 days</Text>
        <Text style={styles.sparkLegendAmt}>
          ₹{buckets.reduce((s, b) => s + b.amount, 0).toLocaleString('en-IN')} total
        </Text>
      </View>
    </View>
  );
}

// ─── Rich Transaction Row ─────────────────────────────────────────────────────

function ActivityRow({ item, last }) {
  // Support both old personal-transaction shape and new unified recentActivities shape
  const isNewShape = item.type === 'personal' || item.type === 'group_expense' || item.type === 'direct_split';

  let icon, color, label, catLabel, isPositive;

  if (isNewShape) {
    if (item.type === 'group_expense') {
      icon  = 'people-outline';
      color = PC.textSecondary;
      catLabel = 'Group';
    } else if (item.type === 'direct_split') {
      icon  = 'git-branch-outline';
      color = '#CE93D8';
      catLabel = 'Direct Split';
    } else {
      // personal
      icon     = CATEGORY_ICONS[item.description] || 'swap-horizontal-outline';
      color    = CATEGORY_COLORS[item.description] || PC.textSecondary;
      catLabel = item.description;
    }
    label      = item.description;
    isPositive = item.sign === 1;
  } else {
    // Legacy personal transaction shape
    isPositive = item.type === 'income';
    icon       = CATEGORY_ICONS[item.category] || 'swap-horizontal-outline';
    color      = CATEGORY_COLORS[item.category] || PC.textSecondary;
    label      = item.notes || item.category;
    catLabel   = item.category;
  }

  const isSettlement = !isNewShape && (item.category === 'Settlement' || item.category === 'Split');

  return (
    <>
      <View style={styles.actRow}>
        <View style={[styles.actIconBox, { backgroundColor: color + '18', borderColor: color + '35' }]}>
          <Ionicons name={icon} size={17} color={color} />
        </View>
        <View style={styles.actInfo}>
          <Text style={styles.actLabel} numberOfLines={1}>{label}</Text>
          <View style={styles.actMetaRow}>
            <View style={[styles.actCatPill, { backgroundColor: color + '18' }]}>
              <Text style={[styles.actCatText, { color }]}>{catLabel}</Text>
            </View>
            <Text style={styles.actDate}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <View style={styles.actRight}>
          <Text style={[styles.actAmount, isPositive ? styles.amtPos : styles.amtNeg]}>
            {isPositive ? '+' : '−'}₹{(item.amount ?? 0).toLocaleString('en-IN')}
          </Text>
          {isSettlement && (
            <View style={styles.actSettleBadge}>
              <Text style={styles.actSettleText}>settled</Text>
            </View>
          )}
        </View>
      </View>
      {!last && <View style={styles.actDivider} />}
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ h = 100, r = 16, mb = 12 }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.9, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{ height: h, borderRadius: r, marginBottom: mb, backgroundColor: PC.bgCard, opacity: anim }} />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router   = useRouter();
  const { user } = useAuth();

  const [dash,         setDash]         = useState(null);
  const [budget,       setBudget]       = useState(null);
  const [recent,       setRecent]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [budgetInput,  setBudgetInput]  = useState('');
  const [budgetSaving, setBudgetSaving] = useState(false);

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
      setRecent(txRes.data.transactions || []);
    } catch (err) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function onRefresh() { setRefreshing(true); fetchAll(); }

  function openModal() {
    setBudgetInput(budget?.budget > 0 ? String(budget.budget) : '');
    setModalVisible(true);
  }

  async function saveBudget() {
    const amount = parseFloat(budgetInput);
    if (!budgetInput.trim() || isNaN(amount) || amount < 1) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (minimum ₹1).');
      return;
    }
    setBudgetSaving(true);
    try {
      await api.post('/api/users/me/budget', { amount });
      setModalVisible(false);
      setBudgetInput('');
      fetchAll();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not save budget.');
    } finally {
      setBudgetSaving(false);
    }
  }

  // Derived
  const netGroupBalance  = dash ? dash.totalToReceive - dash.totalOwed : 0;
  const recentSlice      = recent.slice(0, 8);
  const activityFeed     = dash?.recentActivities ?? [];

  const combinedExpenses = useMemo(() => {
    const personal = recent.filter(t => t.type === 'expense');
    const fromActivities = (dash?.recentActivities || [])
      .filter(a => a.sign === -1 && a.type !== 'personal')
      .map(a => ({ type: 'expense', amount: a.amount, date: a.date, category: 'Split' }));
    return [...personal, ...fromActivities];
  }, [recent, dash]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingHeader}>
          <Skeleton h={22} r={8} mb={6} />
          <Skeleton h={38} r={10} mb={0} />
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Skeleton h={110} r={20} mb={12} />
          <Skeleton h={140} r={20} mb={12} />
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}><Skeleton h={96} r={16} mb={0} /></View>
            <View style={{ flex: 1 }}><Skeleton h={96} r={16} mb={0} /></View>
          </View>
          <Skeleton h={160} r={16} mb={12} />
          <Skeleton h={240} r={16} mb={0} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={42} color={PC.textMuted} />
          <Text style={styles.errorMsg}>Something went wrong.</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PC.accent} />
        }>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0] ?? 'there'}</Text>
          </View>
          <TouchableOpacity style={[styles.avatarBtn, { marginRight: 10 }]} onPress={() => router.push('/friends')}>
            <Ionicons name="people-outline" size={20} color={PC.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.avatarBtn, styles.scanBtn, { marginRight: 10 }]} onPress={() => router.push('/qr-scanner')}>
            <Ionicons name="scan-outline" size={20} color={PC.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </TouchableOpacity>
        </View>

        {/* ══ 1. BUDGET HERO ══ */}
        <BudgetHero
          budget={budget}
          onEdit={openModal}
          onManage={() => router.push('/budget')}
        />

        {/* ══ 2. BALANCE CARD ══ */}
        <View style={styles.balanceCard}>
          {/* Net */}
          <View style={styles.balanceNetRow}>
            <View>
              <Text style={styles.balanceNetLabel}>Group net balance</Text>
              <Text style={[
                styles.balanceNetAmt,
                { color: netGroupBalance >= 0 ? PC.positive : PC.negative },
              ]}>
                {netGroupBalance >= 0 ? '+' : ''}₹{Math.abs(netGroupBalance).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={[
              styles.netBadge,
              { backgroundColor: (netGroupBalance >= 0 ? PC.positive : PC.negative) + '18' },
            ]}>
              <Ionicons
                name={netGroupBalance >= 0 ? 'trending-up-outline' : 'trending-down-outline'}
                size={18}
                color={netGroupBalance >= 0 ? PC.positive : PC.negative}
              />
            </View>
          </View>

          <View style={styles.balanceDivider} />

          {/* Owed row */}
          <View style={styles.balanceSubRow}>
            <View style={styles.balanceSubItem}>
              <View style={styles.balanceSubIconRow}>
                <View style={[styles.balanceSubDot, { backgroundColor: PC.positive }]} />
                <Text style={styles.balanceSubLabel}>Owed to you</Text>
              </View>
              <Text style={[styles.balanceSubAmt, { color: PC.positive }]}>
                +₹{(dash?.totalToReceive ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.balanceSubSep} />
            <View style={styles.balanceSubItem}>
              <View style={styles.balanceSubIconRow}>
                <View style={[styles.balanceSubDot, { backgroundColor: PC.negative }]} />
                <Text style={styles.balanceSubLabel}>You owe</Text>
              </View>
              <Text style={[styles.balanceSubAmt, { color: PC.negative }]}>
                −₹{(dash?.totalOwed ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* ══ 3. QUICK STATS ══ */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: PC.negative + '18' }]}>
              <Ionicons name="arrow-up-outline" size={16} color={PC.negative} />
            </View>
            <Text style={styles.statAmt}>₹{(dash?.totalSpent?.combined ?? 0).toLocaleString('en-IN')}</Text>
            <Text style={styles.statLabel}>Spent this month</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: PC.positive + '18' }]}>
              <Ionicons name="arrow-down-outline" size={16} color={PC.positive} />
            </View>
            <Text style={styles.statAmt}>₹{(dash?.personalIncome ?? 0).toLocaleString('en-IN')}</Text>
            <Text style={styles.statLabel}>Earned this month</Text>
          </View>
        </View>

        {/* ══ 4. ANALYTICS ══ */}
        {(recent.some(t => t.type === 'expense') || (dash?.categoryBreakdown?.length ?? 0) > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Analytics</Text>
              <TouchableOpacity onPress={() => router.push('/analytics')}>
                <Text style={styles.seeAll}>View more →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.analyticsCard}>
              {/* 7-day sparkline */}
              <Text style={styles.analyticsSubhead}>Daily spending · last 7 days</Text>
              <SpendingSparkline transactions={combinedExpenses} />

              <View style={styles.analyticsDivider} />

              {/* Category breakdown */}
              <Text style={styles.analyticsSubhead}>Top categories · this month</Text>
              <CategoryChart breakdown={dash?.categoryBreakdown} />
            </View>
          </View>
        )}

        {/* ══ 5. RECENT ACTIVITY ══ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {activityFeed.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={28} color={PC.textMuted} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyHint}>Tap + on the Transactions tab to get started</Text>
            </View>
          ) : (
            <View style={styles.actCard}>
              {activityFeed.map((item, i) => (
                <ActivityRow key={item._id ?? `activity-${i}`} item={item} last={i === activityFeed.length - 1} />
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* ── Budget Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>
                  {budget?.budget > 0 ? 'Edit Budget' : 'Set Budget'}
                </Text>
                <Text style={styles.modalSub}>
                  {formatMonth(budget?.month || new Date().toISOString().slice(0, 7))}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color={PC.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalInputBox}>
              <Text style={styles.modalRupee}>₹</Text>
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
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={budgetSaving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, budgetSaving && { opacity: 0.6 }]}
                onPress={saveBudget}
                disabled={budgetSaving}>
                {budgetSaving
                  ? <ActivityIndicator size="small" color="#060A09" />
                  : <Text style={styles.saveText}>Save</Text>}
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorMsg:      { color: PC.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:      { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PC.bgCard, borderRadius: 10, borderWidth: 1, borderColor: PC.border },
  retryText:     { color: PC.textPrimary, fontSize: 14 },

  loadingHeader: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', gap: 12,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 20,
  },
  greeting: { color: PC.textSecondary, fontSize: 12, letterSpacing: 0.4, marginBottom: 2 },
  userName:  { color: PC.textPrimary, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  avatarBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1.5, borderColor: PC.accent + '80',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: PC.accent, fontSize: 14, fontWeight: '700' },
  scanBtn: { borderColor: PC.accent + 'AA', backgroundColor: PC.accent + '14' },

  // ── Budget Hero
  budgetHero: {
    backgroundColor: PC.bgCard,
    borderRadius: 20, borderWidth: 1, borderColor: PC.border,
    padding: 20, marginBottom: 12,
  },
  budgetHeroEmpty: {
    backgroundColor: PC.bgCard,
    borderRadius: 20, borderWidth: 1, borderColor: PC.border,
    borderStyle: 'dashed', marginBottom: 12,
  },
  budgetHeroEmptyInner: {
    flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14,
  },
  budgetEmptyIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: PC.accent10,
    alignItems: 'center', justifyContent: 'center',
  },
  budgetEmptyTitle: { color: PC.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  budgetEmptyHint:  { color: PC.textMuted, fontSize: 12 },

  budgetHeroTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14,
  },
  budgetHeroLabel:  { color: PC.textSecondary, fontSize: 11, letterSpacing: 0.4, marginBottom: 5, textTransform: 'uppercase' },
  budgetHeroAmount: {
    color: PC.textPrimary, fontSize: 26, fontWeight: '700', letterSpacing: -1,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  budgetHeroOf: { color: PC.textSecondary, fontWeight: '400', fontSize: 15 },
  budgetPctBadge: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    backgroundColor: PC.bgCardElevated,
  },
  budgetPctText: { fontSize: 14, fontWeight: '700' },
  budgetHeroBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10,
  },
  budgetHeroStat:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  budgetDot:          { width: 7, height: 7, borderRadius: 4 },
  budgetHeroStatText: { color: PC.textSecondary, fontSize: 12 },
  budgetEditLink:     { color: PC.accent, fontSize: 12, fontWeight: '500' },

  barTrack: { backgroundColor: PC.border, borderRadius: 6, overflow: 'hidden', width: '100%' },
  barFill:  { borderRadius: 6 },

  // ── Balance card
  balanceCard: {
    backgroundColor: PC.bgCard,
    borderRadius: 20, borderWidth: 1, borderColor: PC.border,
    padding: 20, marginBottom: 12,
  },
  balanceNetRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  balanceNetLabel: { color: PC.textSecondary, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 5 },
  balanceNetAmt: {
    fontSize: 32, fontWeight: '700', letterSpacing: -1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  netBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  balanceDivider: { height: 1, backgroundColor: PC.border, marginBottom: 16 },
  balanceSubRow: { flexDirection: 'row', alignItems: 'center' },
  balanceSubItem: { flex: 1 },
  balanceSubSep:  { width: 1, height: 36, backgroundColor: PC.border, marginHorizontal: 16 },
  balanceSubIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  balanceSubDot: { width: 6, height: 6, borderRadius: 3 },
  balanceSubLabel: { color: PC.textSecondary, fontSize: 11 },
  balanceSubAmt: {
    fontSize: 18, fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // ── Quick stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: PC.bgCard,
    borderRadius: 16, borderWidth: 1, borderColor: PC.border, padding: 16,
  },
  statIconBox: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  statAmt: {
    color: PC.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 3,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  statLabel: { color: PC.textSecondary, fontSize: 11 },

  // ── Section wrapper
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  sectionTitle: { color: PC.textPrimary, fontSize: 15, fontWeight: '600' },
  seeAll:       { color: PC.textSecondary, fontSize: 13 },

  // ── Analytics card
  analyticsCard: {
    backgroundColor: PC.bgCard,
    borderRadius: 16, borderWidth: 1, borderColor: PC.border,
    padding: 16,
  },
  analyticsSubhead: {
    color: PC.textSecondary, fontSize: 11, fontWeight: '500',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12,
  },
  analyticsDivider: { height: 1, backgroundColor: PC.border, marginVertical: 16 },

  // Sparkline
  sparkline: {},
  sparkBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 8 },
  sparkCol:  { alignItems: 'center', flex: 1 },
  sparkBarWrap: { height: 72, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  sparkBar:  {},
  sparkLabel: { color: PC.textMuted, fontSize: 10, marginTop: 5 },
  sparkLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  sparkLegendText: { color: PC.textMuted, fontSize: 11 },
  sparkLegendAmt:  { color: PC.textSecondary, fontSize: 11, fontWeight: '500' },

  // Category chart
  categoryChart: { gap: 10 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 90 },
  catDot:  { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  catLabel: { color: PC.textSecondary, fontSize: 11, flexShrink: 1 },
  catBarWrap: { flex: 1 },
  catAmt: { color: PC.textSecondary, fontSize: 11, width: 70, textAlign: 'right' },

  // ── Activity
  actCard: {
    backgroundColor: PC.bgCard,
    borderRadius: 16, borderWidth: 1, borderColor: PC.border, overflow: 'hidden',
  },
  actRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
  },
  actIconBox: {
    width: 38, height: 38, borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
    flexShrink: 0,
  },
  actInfo:    { flex: 1, marginRight: 8 },
  actLabel:   { color: PC.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 5 },
  actMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  actCatPill: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  actCatText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  actDate:    { color: PC.textMuted, fontSize: 11 },
  actRight:   { alignItems: 'flex-end', flexShrink: 0 },
  actAmount:  { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  amtPos:     { color: PC.positive },
  amtNeg:     { color: PC.negative },
  actSettleBadge: {
    backgroundColor: PC.white05,
    borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2,
  },
  actSettleText: { color: PC.textMuted, fontSize: 9, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },
  actDivider: { height: 1, backgroundColor: PC.border, marginHorizontal: 16 },

  // Empty
  emptyCard: {
    backgroundColor: PC.bgCard,
    borderRadius: 16, borderWidth: 1, borderColor: PC.border,
    padding: 36, alignItems: 'center',
  },
  emptyTitle: { color: PC.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 5 },
  emptyHint:  { color: PC.textMuted, fontSize: 13, textAlign: 'center' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', backgroundColor: PC.bgCard,
    borderRadius: 20, borderWidth: 1, borderColor: PC.border, padding: 24,
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle:     { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 3 },
  modalSub:       { color: PC.textSecondary, fontSize: 13 },
  modalCloseBtn:  {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },
  modalInputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PC.bgInput, borderWidth: 1, borderColor: PC.border,
    borderRadius: 12, paddingHorizontal: 14, height: 52, marginBottom: 20,
  },
  modalRupee: { color: PC.textSecondary, fontSize: 20, fontWeight: '600', marginRight: 8 },
  modalInput: { flex: 1, color: PC.textPrimary, fontSize: 20, fontWeight: '500' },
  modalBtnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 12,
    borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { color: PC.textSecondary, fontSize: 14, fontWeight: '500' },
  saveBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: PC.accent, alignItems: 'center', justifyContent: 'center',
  },
  saveText: { color: '#060A09', fontSize: 14, fontWeight: '700' },
});
