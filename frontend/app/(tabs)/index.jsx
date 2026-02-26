import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { PC } from '@/constants/theme';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const USER = { name: 'Arjun', initials: 'AS' };

const BALANCE = {
  total: 45230,
  owedToYou: 1800,
  youOwe: 2300,
};

const BUDGET = { monthly: 20000, spent: 12450 };

const QUICK_STATS = [
  { label: 'Spent', amount: 12450, icon: 'arrow-up-outline', positive: false },
  { label: 'Earned', amount: 25000, icon: 'arrow-down-outline', positive: true },
];

const TRANSACTIONS = [
  { id: '1', label: 'Grocery', amount: -1250, date: 'Just Now', icon: 'basket-outline', category: 'Group' },
  { id: '2', label: 'Salary', amount: 25000, date: 'Feb 1, 09:00', icon: 'briefcase-outline', category: 'Personal' },
  { id: '3', label: 'Gym', amount: -2000, date: 'Jan 23, 10:00', icon: 'fitness-outline', category: 'Personal' },
  { id: '4', label: 'Laundry', amount: -200, date: 'Jan 21, 10:00', icon: 'shirt-outline', category: 'Group' },
  { id: '5', label: 'Goa Trip', amount: -3200, date: 'Jan 15, 14:00', icon: 'airplane-outline', category: 'Group' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function BudgetRing({ percent }) {
  return (
    <View style={styles.ring}>
      <Text style={styles.ringPercent}>{percent}%</Text>
      <Text style={styles.ringLabel}>used</Text>
    </View>
  );
}

function TransactionRow({ item }) {
  const isPositive = item.amount > 0;
  return (
    <View style={styles.txRow}>
      <View style={styles.txIconBox}>
        <Ionicons name={item.icon} size={19} color={PC.textSecondary} />
      </View>
      <View style={styles.txMeta}>
        <Text style={styles.txLabel}>{item.label}</Text>
        <Text style={styles.txDate}>{item.date}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, isPositive ? styles.amtPos : styles.amtNeg]}>
          {isPositive ? '+' : ''}₹{Math.abs(item.amount).toLocaleString('en-IN')}
        </Text>
        <Text style={styles.txCategory}>{item.category}</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const budgetPct = Math.round((BUDGET.spent / BUDGET.monthly) * 100);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>{USER.name} 👋</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn}>
            <Text style={styles.avatarText}>{USER.initials}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Balance Card ── */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceBadge}>
            <Ionicons name="wallet-outline" size={14} color={PC.textSecondary} />
            <Text style={styles.balanceBadgeText}>Total Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>
            ₹{BALANCE.total.toLocaleString('en-IN')}
          </Text>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceSubLabel}>Owed to you</Text>
              <Text style={[styles.balanceSubAmount, { color: PC.positive }]}>
                +₹{BALANCE.owedToYou.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.balanceSep} />
            <View>
              <Text style={styles.balanceSubLabel}>You owe</Text>
              <Text style={[styles.balanceSubAmount, { color: PC.negative }]}>
                -₹{BALANCE.youOwe.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Quick Stats ── */}
        <View style={styles.statsRow}>
          {QUICK_STATS.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={styles.statIconBox}>
                <Ionicons
                  name={s.icon}
                  size={18}
                  color={s.positive ? PC.positive : PC.negative}
                />
              </View>
              <Text style={styles.statAmount}>₹{s.amount.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>{s.label} this month</Text>
            </View>
          ))}
        </View>

        {/* ── Budget Progress ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Budget</Text>
          <View style={styles.budgetCard}>
            <View style={styles.budgetInfo}>
              <Text style={styles.budgetPlan}>Plan · Feb 2026</Text>
              <Text style={styles.budgetNumbers}>
                ₹{BUDGET.spent.toLocaleString('en-IN')}{' '}
                <Text style={styles.budgetOf}>/ ₹{BUDGET.monthly.toLocaleString('en-IN')}</Text>
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${budgetPct}%` }]} />
              </View>
              <Text style={styles.budgetRemaining}>
                ₹{(BUDGET.monthly - BUDGET.spent).toLocaleString('en-IN')} remaining
              </Text>
            </View>
            <BudgetRing percent={budgetPct} />
          </View>
        </View>

        {/* ── Recent Activity ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.txCard}>
            {TRANSACTIONS.map((tx, i) => (
              <View key={tx.id}>
                <TransactionRow item={tx} />
                {i < TRANSACTIONS.length - 1 && <View style={styles.txDivider} />}
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PC.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: { color: PC.textSecondary, fontSize: 13, marginBottom: 2 },
  userName: { color: PC.textPrimary, fontSize: 22, fontWeight: '700' },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1,
    borderColor: PC.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: PC.textPrimary, fontSize: 14, fontWeight: '600' },

  // Balance card
  balanceCard: {
    backgroundColor: PC.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 24,
    marginBottom: 14,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  balanceBadgeText: { color: PC.textSecondary, fontSize: 13 },
  balanceAmount: {
    color: PC.textPrimary,
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -1,
    marginBottom: 20,
  },
  balanceDivider: { height: 1, backgroundColor: PC.border, marginBottom: 16 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceSep: {
    width: 1,
    height: 32,
    backgroundColor: PC.border,
    marginHorizontal: 24,
  },
  balanceSubLabel: { color: PC.textSecondary, fontSize: 12, marginBottom: 4 },
  balanceSubAmount: { fontSize: 18, fontWeight: '600' },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 16,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PC.bgCardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statAmount: {
    color: PC.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 3,
  },
  statLabel: { color: PC.textSecondary, fontSize: 11 },

  // Section
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: PC.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  seeAll: { color: PC.textSecondary, fontSize: 13 },

  // Budget card
  budgetCard: {
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetInfo: { flex: 1 },
  budgetPlan: { color: PC.textSecondary, fontSize: 12, marginBottom: 6 },
  budgetNumbers: {
    color: PC.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  budgetOf: { color: PC.textSecondary, fontWeight: '400', fontSize: 14 },
  barTrack: {
    height: 4,
    backgroundColor: PC.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: { height: '100%', backgroundColor: PC.textPrimary, borderRadius: 2 },
  budgetRemaining: { color: PC.textSecondary, fontSize: 11 },

  // Ring
  ring: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3.5,
    borderColor: PC.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 20,
  },
  ringPercent: { color: PC.textPrimary, fontSize: 15, fontWeight: '700' },
  ringLabel: { color: PC.textSecondary, fontSize: 9, marginTop: 1 },

  // Transaction card
  txCard: {
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: PC.bgCardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  txMeta: { flex: 1 },
  txLabel: { color: PC.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 3 },
  txDate: { color: PC.textSecondary, fontSize: 12 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  txCategory: { color: PC.textMuted, fontSize: 11 },
  amtPos: { color: PC.positive },
  amtNeg: { color: PC.textPrimary },
  txDivider: { height: 1, backgroundColor: PC.border, marginHorizontal: 16 },
});
