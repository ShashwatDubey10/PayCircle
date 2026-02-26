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

const GROUPS = [
  {
    id: '1',
    name: 'Hostel Room 204',
    type: 'Roommates',
    members: 4,
    balance: -850,
    lastActivity: '2 hrs ago',
    icon: 'home-outline',
  },
  {
    id: '2',
    name: 'Goa Trip 2024',
    type: 'Trip',
    members: 6,
    balance: 1200,
    lastActivity: 'Yesterday',
    icon: 'airplane-outline',
  },
  {
    id: '3',
    name: 'Mess Group',
    type: 'Mess',
    members: 8,
    balance: 0,
    lastActivity: '3 days ago',
    icon: 'restaurant-outline',
  },
  {
    id: '4',
    name: 'Kullu Trip',
    type: 'Trip',
    members: 5,
    balance: 340,
    lastActivity: '1 week ago',
    icon: 'trail-sign-outline',
  },
];

const SETTLEMENTS = [
  { id: '1', from: 'Rahul', to: 'You', amount: 450, date: 'Feb 20', groupName: 'Hostel Room 204' },
  { id: '2', from: 'You', to: 'Priya', amount: 650, date: 'Feb 15', groupName: 'Goa Trip 2024' },
  { id: '3', from: 'Amit', to: 'You', amount: 300, date: 'Feb 10', groupName: 'Mess Group' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function GroupCard({ group }) {
  const isPositive = group.balance > 0;
  const isSettled = group.balance === 0;

  return (
    <TouchableOpacity style={styles.groupCard} activeOpacity={0.75}>
      <View style={styles.groupIconBox}>
        <Ionicons name={group.icon} size={20} color={PC.textSecondary} />
      </View>

      <View style={styles.groupInfo}>
        <View style={styles.groupNameRow}>
          <Text style={styles.groupName}>{group.name}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{group.type}</Text>
          </View>
        </View>
        <View style={styles.groupMeta}>
          <Ionicons name="people-outline" size={13} color={PC.textMuted} />
          <Text style={styles.groupMetaText}>{group.members} members</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.groupMetaText}>{group.lastActivity}</Text>
        </View>
      </View>

      <View style={styles.groupBalance}>
        {isSettled ? (
          <Text style={styles.balanceSettled}>Settled</Text>
        ) : (
          <>
            <Text
              style={[
                styles.balanceAmount,
                isPositive ? styles.balPos : styles.balNeg,
              ]}>
              {isPositive ? '+' : ''}₹{Math.abs(group.balance).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.balanceLabel}>
              {isPositive ? 'owed to you' : 'you owe'}
            </Text>
          </>
        )}
        <Ionicons name="chevron-forward" size={14} color={PC.textMuted} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GroupsScreen() {
  const [tab, setTab] = useState('groups');

  const youOweTotal = GROUPS.filter((g) => g.balance < 0).reduce(
    (s, g) => s + Math.abs(g.balance),
    0,
  );
  const owedToYouTotal = GROUPS.filter((g) => g.balance > 0).reduce(
    (s, g) => s + g.balance,
    0,
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={22} color={PC.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Summary Pills ── */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryVal}>
            ₹{owedToYouTotal.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.summaryLbl}>Owed to you</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryPill}>
          <Text style={[styles.summaryVal, { color: PC.negative }]}>
            ₹{youOweTotal.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.summaryLbl}>You owe</Text>
        </View>
      </View>

      {/* ── Toggle ── */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, tab === 'groups' && styles.toggleActive]}
          onPress={() => setTab('groups')}>
          <Text style={[styles.toggleText, tab === 'groups' && styles.toggleTextActive]}>
            Groups
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, tab === 'settlements' && styles.toggleActive]}
          onPress={() => setTab('settlements')}>
          <Text
            style={[styles.toggleText, tab === 'settlements' && styles.toggleTextActive]}>
            Settlements
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {tab === 'groups' ? (
          <>
            {GROUPS.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </>
        ) : (
          <>
            {SETTLEMENTS.map((s) => (
              <View key={s.id} style={styles.settlementCard}>
                <View style={styles.settlementLeft}>
                  <Text style={styles.settlementParties}>
                    <Text style={{ color: PC.textPrimary }}>{s.from}</Text>
                    <Text style={{ color: PC.textSecondary }}> → </Text>
                    <Text style={{ color: PC.textPrimary }}>{s.to}</Text>
                  </Text>
                  <Text style={styles.settlementGroup}>{s.groupName}</Text>
                </View>
                <View style={styles.settlementRight}>
                  <Text style={styles.settlementAmount}>
                    ₹{s.amount.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.settlementDate}>{s.date}</Text>
                </View>
              </View>
            ))}
          </>
        )}
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

  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    paddingVertical: 16,
    marginBottom: 16,
  },
  summaryPill: { flex: 1, alignItems: 'center' },
  summaryVal: { color: PC.positive, fontSize: 18, fontWeight: '700', marginBottom: 3 },
  summaryLbl: { color: PC.textSecondary, fontSize: 12 },
  summaryDivider: { width: 1, backgroundColor: PC.border },

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
  toggleBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  toggleActive: { backgroundColor: PC.bgCardElevated },
  toggleText: { color: PC.textMuted, fontSize: 14, fontWeight: '500' },
  toggleTextActive: { color: PC.textPrimary },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },

  // Group card
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 16,
    marginBottom: 10,
  },
  groupIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: PC.bgCardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  groupInfo: { flex: 1 },
  groupNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  groupName: { color: PC.textPrimary, fontSize: 14, fontWeight: '600' },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: PC.bgCardElevated,
    borderRadius: 6,
  },
  typeText: { color: PC.textSecondary, fontSize: 10, fontWeight: '500' },
  groupMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  groupMetaText: { color: PC.textMuted, fontSize: 12 },
  dot: { color: PC.textMuted, fontSize: 12 },

  groupBalance: { alignItems: 'flex-end', minWidth: 72 },
  balanceAmount: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  balanceLabel: { color: PC.textMuted, fontSize: 10 },
  balanceSettled: { color: PC.textMuted, fontSize: 13, fontWeight: '500' },
  balPos: { color: PC.positive },
  balNeg: { color: PC.negative },

  // Settlement card
  settlementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 16,
    marginBottom: 10,
  },
  settlementLeft: { flex: 1 },
  settlementParties: { fontSize: 14, marginBottom: 4 },
  settlementGroup: { color: PC.textMuted, fontSize: 12 },
  settlementRight: { alignItems: 'flex-end' },
  settlementAmount: { color: PC.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  settlementDate: { color: PC.textMuted, fontSize: 12 },
});
