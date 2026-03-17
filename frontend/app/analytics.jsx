import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PC } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_COLORS = {
  Food:          '#FF8C42',
  Travel:        '#4FC3F7',
  Utilities:     '#FFB020',
  Entertainment: '#CE93D8',
  Health:        '#EF9A9A',
  Shopping:      '#80CBC4',
  Salary:        '#00E5BE',
  Freelance:     '#A5D6A7',
  Investment:    '#00E5BE',
  Miscellaneous: '#637870',
  Others:        '#4A6058',
  Split:         '#CE93D8',
  Settlement:    '#4FC3F7',
};

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_LABELS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLast6Months() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: MONTH_LABELS[d.getMonth()],
    };
  });
}

function isoMonthKey(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toISOString().slice(0, 7); }
  catch { return ''; }
}

function fmt(n) {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(Math.round(n));
}

// ─── Animated bar ─────────────────────────────────────────────────────────────

function AnimBar({ pct, color, height = 7, delay = 0 }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct / 100,
      duration: 900,
      delay,
      useNativeDriver: false,
    }).start();
  }, [pct]);
  return (
    <View style={[ss.barTrack, { height }]}>
      <Animated.View style={[
        ss.barFill,
        { height, backgroundColor: color, width: anim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }) },
      ]} />
    </View>
  );
}

// ─── Donut chart (half-disc rotation technique, no SVG) ───────────────────────

function PieHalf({ sD, swD, color, size }) {
  const r = size / 2;
  return (
    <View style={{
      position: 'absolute', width: size, height: size,
      borderRadius: r, overflow: 'hidden',
      transform: [{ rotate: `${sD}deg` }],
    }}>
      <View style={{
        position: 'absolute', left: r, top: 0,
        width: r, height: size, backgroundColor: color,
        transformOrigin: 'left center',
        transform: [{ rotate: `${swD - 180}deg` }],
      }} />
    </View>
  );
}

function PieSlice({ startDeg, sweepDeg, color, size }) {
  if (sweepDeg <= 0.5) return null;
  if (sweepDeg <= 180) {
    return <PieHalf sD={startDeg} swD={sweepDeg} color={color} size={size} />;
  }
  return (
    <>
      <PieHalf sD={startDeg}       swD={180}            color={color} size={size} />
      <PieHalf sD={startDeg + 180} swD={sweepDeg - 180} color={color} size={size} />
    </>
  );
}

function DonutChart({ segments, size = 178, thickness = 34, centerLabel, centerSub }) {
  const r     = size / 2;
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  let offset = -90;

  return (
    <View style={{ width: size, height: size }}>
      {/* Base disc */}
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: r, backgroundColor: PC.bgCardElevated }} />
      {segments.map((seg, i) => {
        const sweep = (seg.value / total) * 360;
        const start = offset;
        offset += sweep;
        return <PieSlice key={i} startDeg={start} sweepDeg={sweep} color={seg.color} size={size} />;
      })}
      {/* Hole */}
      <View style={{
        position: 'absolute',
        top: thickness, left: thickness,
        width: size - thickness * 2, height: size - thickness * 2,
        borderRadius: (size - thickness * 2) / 2,
        backgroundColor: PC.bgCard,
        alignItems: 'center', justifyContent: 'center',
      }}>
        {centerLabel ? (
          <>
            <Text style={ss.donutCenterLabel}>{centerLabel}</Text>
            {centerSub ? <Text style={ss.donutCenterSub}>{centerSub}</Text> : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, sub, children }) {
  return (
    <View style={ss.section}>
      <View style={ss.sectionHead}>
        <Text style={ss.sectionTitle}>{title}</Text>
        {sub ? <Text style={ss.sectionSub}>{sub}</Text> : null}
      </View>
      <View style={ss.card}>{children}</View>
    </View>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skel({ h = 140 }) {
  const a = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 0.85, duration: 750, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.4,  duration: 750, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={{ height: h, borderRadius: 20, backgroundColor: PC.bgCard, opacity: a, marginBottom: 16 }} />;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const router = useRouter();

  const [transactions, setTransactions] = useState([]);
  const [dash,         setDash]         = useState(null);
  const [budget,       setBudget]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState('');

  const fetchAll = useCallback(async () => {
    try {
      setError('');
      const [txRes, dashRes, budgetRes] = await Promise.all([
        api.get('/api/users/me/transactions'),
        api.get('/api/users/me/dashboard'),
        api.get('/api/users/me/budget'),
      ]);
      setTransactions(txRes.data.transactions || []);
      setDash(dashRes.data.data);
      setBudget(budgetRes.data);
    } catch (err) {
      setError(err.message ?? 'Failed to load analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  function onRefresh() { setRefreshing(true); fetchAll(); }

  // ── Derived data ──────────────────────────────────────────────────────────

  // 1. Category donut — dashboard breakdown
  const catSegments = (dash?.categoryBreakdown ?? [])
    .filter(c => c.amount > 0)
    .map(c => ({
      label: c.category,
      value: c.amount,
      pct:   c.percentage,
      color: CAT_COLORS[c.category] || PC.textSecondary,
    }));

  // 2. Monthly income + expense — last 6 months from personal transactions
  const months = getLast6Months();
  const mExp = {}, mInc = {};
  for (const tx of transactions) {
    const key = isoMonthKey(tx.date);
    if (tx.type === 'expense') mExp[key] = (mExp[key] || 0) + tx.amount;
    else if (tx.type === 'income') mInc[key] = (mInc[key] || 0) + tx.amount;
  }
  const monthData = months.map(m => ({
    label:   m.label,
    expense: mExp[m.key] || 0,
    income:  mInc[m.key] || 0,
  }));
  const maxMonthly = Math.max(...monthData.map(m => Math.max(m.expense, m.income)), 1);

  // 3. Spending sources — group / personal / direct
  const sourceData = dash ? [
    { label: 'Group',    value: dash.totalSpent?.group    || 0, color: '#4FC3F7' },
    { label: 'Personal', value: dash.totalSpent?.personal || 0, color: PC.positive },
    { label: 'Direct',   value: dash.totalSpent?.direct   || 0, color: '#CE93D8' },
  ].filter(src => src.value > 0) : [];
  const srcTotal = sourceData.reduce((s, src) => s + src.value, 0);

  // 4. Day-of-week spending — personal expenses
  const dowSpend = [0, 0, 0, 0, 0, 0, 0];
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const dow = new Date(tx.date).getDay();
    if (!isNaN(dow)) dowSpend[dow] += tx.amount;
  }
  const maxDow = Math.max(...dowSpend, 1);

  // 5. Budget
  const budgetPct = budget?.budget > 0
    ? Math.min(Math.round(((budget.spent || 0) / budget.budget) * 100), 100)
    : 0;
  const budgetColor = budgetPct >= 90 ? PC.negative : budgetPct >= 70 ? PC.warning : PC.positive;

  // ── Render ────────────────────────────────────────────────────────────────

  const Header = () => (
    <View style={ss.header}>
      <TouchableOpacity style={ss.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
      </TouchableOpacity>
      <Text style={ss.headerTitle}>Analytics</Text>
      <View style={{ width: 38 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={ss.safe} edges={['top']}>
        <Header />
        <ScrollView contentContainerStyle={ss.scrollContent}>
          <Skel h={240} /><Skel h={200} /><Skel h={160} /><Skel h={140} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={ss.safe} edges={['top']}>
        <Header />
        <View style={ss.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={PC.textMuted} />
          <Text style={ss.errTxt}>Failed to load analytics</Text>
          <TouchableOpacity style={ss.retryBtn} onPress={fetchAll}>
            <Text style={ss.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={ss.safe} edges={['top']}>
      <Header />

      <ScrollView
        contentContainerStyle={ss.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PC.accent} />}>

        {/* ══ 1. SPENDING BY CATEGORY ══ */}
        {catSegments.length > 0 ? (
          <Section title="Spending by Category" sub="this month">
            <View style={ss.donutRow}>
              <DonutChart
                segments={catSegments}
                size={170}
                thickness={33}
                centerLabel={`₹${fmt(dash?.totalSpent?.combined || 0)}`}
                centerSub="total spent"
              />
              <View style={ss.legend}>
                {catSegments.map((seg, i) => (
                  <View key={i} style={ss.legendRow}>
                    <View style={[ss.legendDot, { backgroundColor: seg.color }]} />
                    <Text style={ss.legendLabel} numberOfLines={1}>{seg.label}</Text>
                    <Text style={[ss.legendPct, { color: seg.color }]}>{seg.pct}%</Text>
                  </View>
                ))}
              </View>
            </View>
          </Section>
        ) : null}

        {/* ══ 2. MONTHLY INCOME VS EXPENSE ══ */}
        <Section title="Monthly Overview" sub="last 6 months">
          {monthData.every(m => m.expense === 0 && m.income === 0) ? (
            <Text style={ss.empty}>No transaction data yet</Text>
          ) : (
            <>
              {/* Grouped bar chart */}
              <View style={ss.monthChart}>
                {monthData.map((m, i) => {
                  const expH = Math.max(Math.round((m.expense / maxMonthly) * 80), m.expense > 0 ? 3 : 0);
                  const incH = Math.max(Math.round((m.income  / maxMonthly) * 80), m.income  > 0 ? 3 : 0);
                  const isCurrent = i === 5;
                  return (
                    <View key={i} style={ss.monthCol}>
                      {/* Amount label on top of the tallest bar */}
                      <Text style={ss.monthAmt}>
                        {m.expense > 0 ? fmt(m.expense) : ''}
                      </Text>
                      <View style={ss.monthBars}>
                        <View style={[ss.bar, {
                          height: incH,
                          backgroundColor: isCurrent ? PC.positive : PC.positive + '55',
                          width: 7,
                        }]} />
                        <View style={[ss.bar, {
                          height: expH,
                          backgroundColor: isCurrent ? PC.negative : PC.negative + '77',
                          width: 7,
                        }]} />
                      </View>
                      <Text style={[ss.monthLabel, isCurrent && { color: PC.accent, fontWeight: '600' }]}>
                        {m.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {/* Legend */}
              <View style={ss.chartLegend}>
                <View style={ss.chartLegendItem}>
                  <View style={[ss.chartLegendDot, { backgroundColor: PC.positive }]} />
                  <Text style={ss.chartLegendText}>Income</Text>
                </View>
                <View style={ss.chartLegendItem}>
                  <View style={[ss.chartLegendDot, { backgroundColor: PC.negative }]} />
                  <Text style={ss.chartLegendText}>Expense</Text>
                </View>
              </View>
              {/* Monthly totals row */}
              <View style={ss.mSummaryRow}>
                {[
                  { label: 'Avg. expense', value: monthData.filter(m => m.expense > 0).length > 0 ? Math.round(monthData.reduce((s, m) => s + m.expense, 0) / Math.max(monthData.filter(m => m.expense > 0).length, 1)) : 0, color: PC.negative },
                  { label: 'Avg. income',  value: monthData.filter(m => m.income  > 0).length > 0 ? Math.round(monthData.reduce((s, m) => s + m.income,  0) / Math.max(monthData.filter(m => m.income  > 0).length, 1)) : 0, color: PC.positive },
                ].map((item, i) => (
                  <View key={i} style={ss.mSummaryItem}>
                    <Text style={ss.mSummaryLabel}>{item.label}</Text>
                    <Text style={[ss.mSummaryAmt, { color: item.color }]}>₹{item.value.toLocaleString('en-IN')}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </Section>

        {/* ══ 3. SPENDING SOURCES ══ */}
        {sourceData.length > 0 ? (
          <Section title="Spending Sources" sub="this month">
            {/* Stacked horizontal bar */}
            <View style={ss.stackedWrap}>
              {sourceData.map((src, i) => {
                const pct = srcTotal > 0 ? (src.value / srcTotal) * 100 : 0;
                return (
                  <View key={i} style={[ss.stackedSeg, {
                    width: `${pct}%`,
                    backgroundColor: src.color,
                    borderTopLeftRadius:     i === 0 ? 7 : 0,
                    borderBottomLeftRadius:  i === 0 ? 7 : 0,
                    borderTopRightRadius:    i === sourceData.length - 1 ? 7 : 0,
                    borderBottomRightRadius: i === sourceData.length - 1 ? 7 : 0,
                  }]} />
                );
              })}
            </View>
            {/* Source breakdown rows */}
            <View style={ss.srcList}>
              {sourceData.map((src, i) => {
                const pct = srcTotal > 0 ? Math.round((src.value / srcTotal) * 100) : 0;
                return (
                  <View key={i} style={ss.srcRow}>
                    <View style={ss.srcLeft}>
                      <View style={[ss.srcDot, { backgroundColor: src.color }]} />
                      <Text style={ss.srcLabel}>{src.label}</Text>
                    </View>
                    <View style={ss.srcRight}>
                      <AnimBar pct={pct} color={src.color} height={5} delay={i * 100} />
                      <Text style={[ss.srcAmt, { color: src.color }]}>₹{src.value.toLocaleString('en-IN')}</Text>
                      <Text style={ss.srcPct}>{pct}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Section>
        ) : null}

        {/* ══ 4. BUDGET STATUS ══ */}
        {budget?.budget > 0 ? (
          <Section title="Budget Status" sub={budget.month}>
            <View style={ss.budgetTriple}>
              {[
                { label: 'Budget',    value: budget.budget,            color: PC.textSecondary },
                { label: 'Spent',     value: budget.spent    || 0,     color: PC.negative      },
                { label: 'Remaining', value: Math.max(budget.remaining || 0, 0), color: PC.positive },
              ].map((item, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <View style={ss.triDivider} />}
                  <View style={ss.triItem}>
                    <Text style={ss.triLabel}>{item.label}</Text>
                    <Text style={[ss.triAmt, { color: item.color }]}>
                      ₹{item.value.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
            <View style={{ marginTop: 16 }}>
              <View style={ss.budgetBarHead}>
                <Text style={ss.budgetBarLabel}>Usage this month</Text>
                <Text style={[ss.budgetBarPct, { color: budgetColor }]}>{budgetPct}%</Text>
              </View>
              <AnimBar pct={budgetPct} color={budgetColor} height={10} />
              {budgetPct >= 90 && (
                <View style={ss.budgetWarnRow}>
                  <Ionicons name="warning-outline" size={12} color={PC.negative} />
                  <Text style={ss.budgetWarnText}>
                    {budgetPct >= 100 ? 'Budget exceeded' : 'Almost at limit'}
                  </Text>
                </View>
              )}
            </View>
          </Section>
        ) : null}

        {/* ══ 5. WEEKLY SPENDING PATTERN ══ */}
        {dowSpend.some(d => d > 0) ? (
          <Section title="Spending by Day" sub="personal expenses, all time">
            <View style={ss.dowChart}>
              {DOW_LABELS.map((label, i) => {
                const pct = (dowSpend[i] / maxDow) * 100;
                const h   = Math.max(Math.round(pct * 0.72), dowSpend[i] > 0 ? 4 : 0);
                const isWeekend = i === 0 || i === 6;
                const color = isWeekend ? '#CE93D8' : PC.accent;
                const isMax = dowSpend[i] === maxDow && maxDow > 0;
                return (
                  <View key={i} style={ss.dowCol}>
                    {isMax ? (
                      <Text style={[ss.dowPeak, { color }]}>↑</Text>
                    ) : (
                      <View style={{ height: 14 }} />
                    )}
                    <View style={ss.dowBarWrap}>
                      <View style={{
                        width: '72%',
                        height: h,
                        backgroundColor: dowSpend[i] > 0 ? color : PC.border,
                        borderRadius: 4,
                        alignSelf: 'flex-end',
                      }} />
                    </View>
                    {dowSpend[i] > 0 && (
                      <Text style={[ss.dowAmt, { color: isWeekend ? '#CE93D8' : PC.textSecondary }]}>
                        {fmt(dowSpend[i])}
                      </Text>
                    )}
                    <Text style={[ss.dowLabel, isWeekend && { color: '#CE93D8' }]}>{label}</Text>
                  </View>
                );
              })}
            </View>
            <View style={ss.dowLegend}>
              <View style={ss.chartLegendItem}>
                <View style={[ss.chartLegendDot, { backgroundColor: PC.accent }]} />
                <Text style={ss.chartLegendText}>Weekday</Text>
              </View>
              <View style={ss.chartLegendItem}>
                <View style={[ss.chartLegendDot, { backgroundColor: '#CE93D8' }]} />
                <Text style={ss.chartLegendText}>Weekend</Text>
              </View>
            </View>
          </Section>
        ) : null}

        {/* Empty state */}
        {catSegments.length === 0 && monthData.every(m => m.expense === 0 && m.income === 0) && (
          <View style={ss.fullEmpty}>
            <View style={ss.fullEmptyIcon}>
              <Ionicons name="bar-chart-outline" size={32} color={PC.textMuted} />
            </View>
            <Text style={ss.fullEmptyTitle}>No data yet</Text>
            <Text style={ss.fullEmptyHint}>Add transactions to see your spending analytics here</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const ss = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: PC.bg },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: PC.textPrimary, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },

  errTxt:   { color: PC.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PC.bgCard, borderRadius: 10, borderWidth: 1, borderColor: PC.border },
  retryTxt: { color: PC.textPrimary, fontSize: 14 },

  // Section
  section:      { marginBottom: 18 },
  sectionHead:  { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginBottom: 10 },
  sectionTitle: { color: PC.textPrimary, fontSize: 14, fontWeight: '700' },
  sectionSub:   { color: PC.textMuted, fontSize: 11 },
  card: {
    backgroundColor: PC.bgCard,
    borderRadius: 20, borderWidth: 1, borderColor: PC.border,
    padding: 16,
  },

  // Donut
  donutRow:        { flexDirection: 'row', alignItems: 'center', gap: 18 },
  donutCenterLabel:{ color: PC.textPrimary, fontSize: 13, fontWeight: '700', fontFamily: MONO, textAlign: 'center' },
  donutCenterSub:  { color: PC.textMuted, fontSize: 9, marginTop: 1, textAlign: 'center' },
  legend:          { flex: 1, gap: 9 },
  legendRow:       { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot:       { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  legendLabel:     { flex: 1, color: PC.textSecondary, fontSize: 11 },
  legendPct:       { fontSize: 11, fontWeight: '600', width: 30, textAlign: 'right' },

  // Monthly bar chart
  monthChart:  { flexDirection: 'row', alignItems: 'flex-end', height: 110, paddingBottom: 2, gap: 0 },
  monthCol:    { flex: 1, alignItems: 'center' },
  monthAmt:    { color: PC.textMuted, fontSize: 8, marginBottom: 2, fontWeight: '500', height: 12 },
  monthBars:   { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 80, justifyContent: 'center' },
  bar:         { borderRadius: 4, alignSelf: 'flex-end' },
  monthLabel:  { color: PC.textMuted, fontSize: 9, marginTop: 6, fontWeight: '500' },
  chartLegend:     { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 12 },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chartLegendDot:  { width: 7, height: 7, borderRadius: 4 },
  chartLegendText: { color: PC.textMuted, fontSize: 11 },

  mSummaryRow:  { flexDirection: 'row', marginTop: 14, gap: 0 },
  mSummaryItem: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: PC.bgCardElevated, borderRadius: 10, borderWidth: 1, borderColor: PC.border, marginHorizontal: 4 },
  mSummaryLabel:{ color: PC.textMuted, fontSize: 10, marginBottom: 3 },
  mSummaryAmt:  { fontSize: 13, fontWeight: '600', fontFamily: MONO },

  // Sources
  stackedWrap: { height: 12, flexDirection: 'row', borderRadius: 7, overflow: 'hidden', backgroundColor: PC.bgCardElevated, marginBottom: 16 },
  stackedSeg:  { height: '100%' },
  srcList:     { gap: 10 },
  srcRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  srcLeft:     { flexDirection: 'row', alignItems: 'center', gap: 8, width: 80 },
  srcRight:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  srcDot:      { width: 8, height: 8, borderRadius: 4 },
  srcLabel:    { color: PC.textSecondary, fontSize: 12 },
  srcAmt:      { fontSize: 11, fontWeight: '600', width: 70, textAlign: 'right' },
  srcPct:      { color: PC.textMuted, fontSize: 10, width: 26, textAlign: 'right' },

  // Budget
  budgetTriple: { flexDirection: 'row', alignItems: 'center' },
  triItem:      { flex: 1, alignItems: 'center' },
  triDivider:   { width: 1, height: 36, backgroundColor: PC.border },
  triLabel:     { color: PC.textMuted, fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  triAmt:       { fontSize: 14, fontWeight: '700', fontFamily: MONO },
  budgetBarHead:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  budgetBarLabel: { color: PC.textSecondary, fontSize: 12 },
  budgetBarPct:   { fontSize: 12, fontWeight: '600' },
  budgetWarnRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  budgetWarnText: { color: PC.negative, fontSize: 11 },

  // Day of week
  dowChart:   { flexDirection: 'row', alignItems: 'flex-end', height: 108 },
  dowCol:     { flex: 1, alignItems: 'center' },
  dowPeak:    { fontSize: 9, fontWeight: '700', lineHeight: 14 },
  dowBarWrap: { width: '100%', height: 72, justifyContent: 'flex-end', alignItems: 'center' },
  dowAmt:     { fontSize: 8, fontWeight: '500', marginTop: 3, height: 11 },
  dowLabel:   { color: PC.textMuted, fontSize: 9, marginTop: 2, fontWeight: '500' },
  dowLegend:  { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 },

  // Animated bar
  barTrack: { backgroundColor: PC.border, borderRadius: 6, overflow: 'hidden', width: '100%' },
  barFill:  { borderRadius: 6 },

  // Empty
  empty:          { color: PC.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  fullEmpty:      { alignItems: 'center', paddingTop: 60, paddingBottom: 20 },
  fullEmptyIcon:  { width: 72, height: 72, borderRadius: 22, backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  fullEmptyTitle: { color: PC.textPrimary, fontSize: 17, fontWeight: '600', marginBottom: 8 },
  fullEmptyHint:  { color: PC.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
});
