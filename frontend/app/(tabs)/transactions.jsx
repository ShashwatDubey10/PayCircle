import React, { useState } from 'react';
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

const ALL_TRANSACTIONS = [
  // Feb 2026
  { id: '1', label: 'Salary', amount: 25000, type: 'income', category: 'Salary', date: 'Feb 25', dateGroup: 'Feb 2026', icon: 'briefcase-outline' },
  { id: '2', label: 'Grocery', amount: 1250, type: 'expense', category: 'Food', date: 'Feb 24', dateGroup: 'Feb 2026', icon: 'basket-outline' },
  { id: '3', label: 'Gym', amount: 2000, type: 'expense', category: 'Health', date: 'Feb 23', dateGroup: 'Feb 2026', icon: 'fitness-outline' },
  { id: '4', label: 'Freelance', amount: 8000, type: 'income', category: 'Freelance', date: 'Feb 20', dateGroup: 'Feb 2026', icon: 'laptop-outline' },
  { id: '5', label: 'Laundry', amount: 200, type: 'expense', category: 'Misc', date: 'Feb 18', dateGroup: 'Feb 2026', icon: 'shirt-outline' },
  { id: '6', label: 'Transport', amount: 450, type: 'expense', category: 'Travel', date: 'Feb 15', dateGroup: 'Feb 2026', icon: 'train-outline' },
  // Jan 2026
  { id: '7', label: 'Salary', amount: 25000, type: 'income', category: 'Salary', date: 'Jan 31', dateGroup: 'Jan 2026', icon: 'briefcase-outline' },
  { id: '8', label: 'Goa Trip', amount: 3200, type: 'expense', category: 'Travel', date: 'Jan 15', dateGroup: 'Jan 2026', icon: 'airplane-outline' },
  { id: '9', label: 'Books', amount: 680, type: 'expense', category: 'Education', date: 'Jan 8', dateGroup: 'Jan 2026', icon: 'book-outline' },
  { id: '10', label: 'Investment', amount: 5000, type: 'income', category: 'Investment', date: 'Jan 5', dateGroup: 'Jan 2026', icon: 'trending-up-outline' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TxRow({ tx }) {
  const isIncome = tx.type === 'income';
  return (
    <View style={styles.txRow}>
      <View style={styles.txIconBox}>
        <Ionicons name={tx.icon} size={18} color={PC.textSecondary} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txLabel}>{tx.label}</Text>
        <Text style={styles.txMeta}>
          {tx.category} · {tx.date}
        </Text>
      </View>
      <Text style={[styles.txAmount, isIncome ? styles.amtPos : styles.amtNeg]}>
        {isIncome ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
      </Text>
    </View>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.dateHeader}>{title}</Text>;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const [activeTab, setActiveTab] = useState('all');

  const filtered =
    activeTab === 'all'
      ? ALL_TRANSACTIONS
      : ALL_TRANSACTIONS.filter((t) => t.type === activeTab);

  const totalIncome = filtered
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);

  const totalExpense = filtered
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  // Group by dateGroup
  const groups = {};
  for (const tx of filtered) {
    if (!groups[tx.dateGroup]) groups[tx.dateGroup] = [];
    groups[tx.dateGroup].push(tx);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={19} color={PC.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Summary ── */}
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
            <Text
              style={[
                styles.summaryAmount,
                { color: totalIncome - totalExpense >= 0 ? PC.positive : PC.negative },
              ]}>
              {totalIncome - totalExpense >= 0 ? '+' : ''}₹
              {Math.abs(totalIncome - totalExpense).toLocaleString('en-IN')}
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
            <Text
              style={[styles.toggleText, activeTab === t && styles.toggleTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {Object.entries(groups).map(([group, txs]) => (
          <View key={group}>
            <SectionHeader title={group} />
            <View style={styles.txCard}>
              {txs.map((tx, i) => (
                <View key={tx.id}>
                  <TxRow tx={tx} />
                  {i < txs.length - 1 && <View style={styles.txDivider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Add transaction CTA */}
        <TouchableOpacity style={styles.addCard}>
          <Ionicons name="add-circle-outline" size={22} color={PC.textSecondary} />
          <Text style={styles.addCardText}>Add Transaction</Text>
        </TouchableOpacity>
      </ScrollView>
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
  title: { color: PC.textPrimary, fontSize: 22, fontWeight: '700' },
  filterBtn: {
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
  summaryItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PC.positive,
  },
  summaryLabel: { color: PC.textSecondary, fontSize: 11, marginBottom: 3 },
  summaryAmount: { fontSize: 13, fontWeight: '600' },
  summaryDivider: { width: 1, backgroundColor: PC.border, marginHorizontal: 4 },

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
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  toggleActive: { backgroundColor: PC.bgCardElevated },
  toggleText: { color: PC.textMuted, fontSize: 13, fontWeight: '500' },
  toggleTextActive: { color: PC.textPrimary },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },

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
  txInfo: { flex: 1 },
  txLabel: { color: PC.textPrimary, fontSize: 14, fontWeight: '500', marginBottom: 3 },
  txMeta: { color: PC.textSecondary, fontSize: 12 },
  txAmount: { fontSize: 14, fontWeight: '600' },
  amtPos: { color: PC.positive },
  amtNeg: { color: PC.negative },
  txDivider: { height: 1, backgroundColor: PC.border, marginHorizontal: 16 },

  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    borderStyle: 'dashed',
    padding: 18,
    marginBottom: 8,
  },
  addCardText: { color: PC.textSecondary, fontSize: 14, fontWeight: '500' },
});
