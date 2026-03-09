import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { PC } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getDirectSplits, addDirectSplit } from '@/services/directSplit';
import { getFriends } from '@/services/friends';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return words.map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// ─── Date separator ───────────────────────────────────────────────────────────

function DateSeparator({ label }) {
  return (
    <View style={s.dateSep}>
      <View style={s.dateSepLine} />
      <Text style={s.dateSepText}>{label}</Text>
      <View style={s.dateSepLine} />
    </View>
  );
}

// ─── Chat bubble ──────────────────────────────────────────────────────────────

function Bubble({ split, isMine, friendFirstName }) {
  const halfAmt = (split.amount / 2).toLocaleString('en-IN');

  return (
    <View style={[s.bubbleRow, isMine ? s.bubbleRowRight : s.bubbleRowLeft]}>
      {!isMine && (
        <View style={s.bubbleAvatar}>
          <Text style={s.bubbleAvatarText}>{getInitials(friendFirstName)}</Text>
        </View>
      )}

      <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleFriend]}>
        {/* Paid line */}
        <View style={s.bubbleAmtRow}>
          <Text style={[s.bubblePaidBy, isMine ? s.textMineSecondary : { color: PC.textSecondary }]}>
            {isMine ? 'You' : friendFirstName} paid
          </Text>
          <Text style={[s.bubbleAmt, isMine ? s.textMine : { color: PC.textPrimary }]}>
            {'  '}₹{split.amount.toLocaleString('en-IN')}
          </Text>
        </View>

        {/* Description */}
        {split.description ? (
          <Text style={[s.bubbleDesc, isMine ? s.textMineSecondary : { color: PC.textSecondary }]}>
            {split.description}
          </Text>
        ) : null}

        {/* Footer */}
        <View style={s.bubbleFooter}>
          <Text style={[s.bubbleTime, isMine ? s.textMineMuted : { color: PC.textMuted }]}>
            {formatTime(split.date)}
          </Text>
          <Text style={[s.bubbleSplitNote, isMine ? s.textMineMuted : { color: PC.textMuted }]}>
            {' · '}each ₹{halfAmt}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DirectSplitScreen() {
  const { friendId } = useLocalSearchParams();
  const router       = useRouter();
  const { user }     = useAuth();
  const listRef      = useRef(null);

  const [friend,      setFriend]      = useState(null);
  const [splits,      setSplits]      = useState([]);
  const [balance,     setBalance]     = useState(0);
  const [loading,     setLoading]     = useState(true);

  const [amount,      setAmount]      = useState('');
  const [description, setDescription] = useState('');
  const [paidByMe,    setPaidByMe]    = useState(true);
  const [sending,     setSending]     = useState(false);
  const [inputError,  setInputError]  = useState('');

  // ── Load splits + friend info ──────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [data, friends] = await Promise.all([
        getDirectSplits(friendId),
        getFriends(),
      ]);
      setSplits(data.splits || []);
      setBalance(data.balance ?? 0);
      const f = (friends || []).find(f => String(f.id) === String(friendId));
      setFriend(f || null);
    } catch {
      // non-critical — show empty state
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  useEffect(() => { load(); }, [load]);

  // Scroll to bottom after first load
  useEffect(() => {
    if (!loading && splits.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 80);
    }
  }, [loading]);

  // ── Send split ────────────────────────────────────────────────────────────
  async function handleSend() {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setInputError('Enter a valid amount');
      return;
    }
    setSending(true);
    setInputError('');
    try {
      const data = await addDirectSplit(friendId, amt, description.trim(), paidByMe);
      setSplits(prev => [...prev, data.split]);
      setBalance(prev => {
        const delta = amt / 2;
        return Math.round((paidByMe ? prev + delta : prev - delta) * 100) / 100;
      });
      setAmount('');
      setDescription('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err) {
      setInputError(err?.message || 'Failed to add split');
    } finally {
      setSending(false);
    }
  }

  // ── Render bubble with date separator ─────────────────────────────────────
  function renderItem({ item, index }) {
    const meId   = user?._id?.toString() ?? null;
    const isMine = meId != null && (
      item.payerId?._id?.toString() === meId ||
      item.payerId?.toString?.() === meId
    );
    const prevItem = index > 0 ? splits[index - 1] : null;
    const showDate = !prevItem || formatDateLabel(item.date) !== formatDateLabel(prevItem.date);

    return (
      <>
        {showDate && <DateSeparator label={formatDateLabel(item.date)} />}
        <Bubble
          split={item}
          isMine={isMine}
          friendFirstName={friend?.name?.split(' ')[0] || 'Friend'}
        />
      </>
    );
  }

  if (!user) return null;

  const balAbs    = Math.abs(balance);
  const isSettled = balAbs < 0.01;
  const youAreOwed = balance > 0;
  const friendFirst = friend?.name?.split(' ')[0] || 'Friend';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
        </TouchableOpacity>

        <View style={s.headerAvatar}>
          <Text style={s.headerAvatarText}>{getInitials(friend?.name || '?')}</Text>
        </View>

        <View style={s.headerInfo}>
          <Text style={s.headerName} numberOfLines={1}>{friend?.name || '…'}</Text>
          {friend?.username ? <Text style={s.headerUsername}>@{friend.username}</Text> : null}
        </View>

        <View style={[
          s.headerBal,
          isSettled ? s.headerBalSettled : youAreOwed ? s.headerBalPos : s.headerBalNeg,
        ]}>
          <Text style={[
            s.headerBalText,
            isSettled ? { color: PC.textMuted } : youAreOwed ? { color: PC.positive } : { color: PC.negative },
          ]}>
            {isSettled ? 'Settled' : `${youAreOwed ? '+' : '−'}₹${balAbs.toLocaleString('en-IN')}`}
          </Text>
        </View>
      </View>

      {/* ── Balance banner ── */}
      {!isSettled && (
        <View style={[s.balBanner, youAreOwed ? s.balBannerPos : s.balBannerNeg]}>
          <Ionicons
            name={youAreOwed ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
            size={16}
            color={youAreOwed ? PC.positive : PC.negative}
          />
          <Text style={[s.balBannerText, { color: youAreOwed ? PC.positive : PC.negative }]}>
            {youAreOwed
              ? `${friendFirst} owes you ₹${balAbs.toLocaleString('en-IN')}`
              : `You owe ${friendFirst} ₹${balAbs.toLocaleString('en-IN')}`
            }
          </Text>
        </View>
      )}

      {/* ── Chat + Input ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>

        {/* Chat list */}
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator color={PC.textMuted} />
          </View>
        ) : splits.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <Ionicons name="receipt-outline" size={28} color={PC.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No splits yet</Text>
            <Text style={s.emptyText}>
              Record your first shared expense below.{'\n'}
              Each entry is split 50/50.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={splits}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* ── Input bar ── */}
        <View style={s.inputBar}>
          {inputError ? <Text style={s.inputError}>{inputError}</Text> : null}

          {/* Who paid */}
          <View style={s.paidByRow}>
            <Text style={s.paidByLabel}>Paid by</Text>
            <TouchableOpacity
              style={[s.paidByChip, paidByMe && s.paidByChipActive]}
              onPress={() => setPaidByMe(true)}
              disabled={sending}>
              <Text style={[s.paidByChipText, paidByMe && s.paidByChipTextActive]}>You</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.paidByChip, !paidByMe && s.paidByChipActive]}
              onPress={() => setPaidByMe(false)}
              disabled={sending}>
              <Text style={[s.paidByChipText, !paidByMe && s.paidByChipTextActive]}>
                {friendFirst}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount + note + send */}
          <View style={s.inputRow}>
            <View style={s.amtBox}>
              <Text style={s.rupee}>₹</Text>
              <TextInput
                style={s.amtInput}
                placeholder="0.00"
                placeholderTextColor={PC.textMuted}
                value={amount}
                onChangeText={v => { setAmount(v); setInputError(''); }}
                keyboardType="decimal-pad"
                editable={!sending}
              />
            </View>
            <TextInput
              style={s.noteInput}
              placeholder="What for?"
              placeholderTextColor={PC.textMuted}
              value={description}
              onChangeText={setDescription}
              editable={!sending}
            />
            <TouchableOpacity
              style={[s.sendBtn, sending && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={sending}
              activeOpacity={0.8}>
              {sending
                ? <ActivityIndicator size="small" color={PC.bg} />
                : <Ionicons name="arrow-up" size={18} color={PC.bg} />
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BUBBLE_MAX = '78%';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PC.bg },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: PC.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { color: PC.textPrimary, fontSize: 13, fontWeight: '700' },
  headerInfo:       { flex: 1 },
  headerName:       { color: PC.textPrimary, fontSize: 15, fontWeight: '700' },
  headerUsername:   { color: PC.textMuted, fontSize: 12, marginTop: 1 },

  headerBal: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  headerBalSettled: { backgroundColor: PC.bgCard, borderColor: PC.border },
  headerBalPos:     { backgroundColor: 'rgba(92,184,92,0.1)', borderColor: 'rgba(92,184,92,0.3)' },
  headerBalNeg:     { backgroundColor: 'rgba(224,90,90,0.1)', borderColor: 'rgba(224,90,90,0.3)' },
  headerBalText:    { fontSize: 12, fontWeight: '600' },

  // ── Balance banner ──
  balBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1,
  },
  balBannerPos:  { backgroundColor: 'rgba(92,184,92,0.07)',  borderBottomColor: 'rgba(92,184,92,0.15)' },
  balBannerNeg:  { backgroundColor: 'rgba(224,90,90,0.07)', borderBottomColor: 'rgba(224,90,90,0.15)' },
  balBannerText: { fontSize: 13, fontWeight: '500' },

  // ── Chat list ──
  listContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },

  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon:  {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { color: PC.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptyText:  { color: PC.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // ── Date separator ──
  dateSep: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 16, gap: 10,
  },
  dateSepLine: { flex: 1, height: 1, backgroundColor: PC.border },
  dateSepText: { color: PC.textMuted, fontSize: 11, fontWeight: '500' },

  // ── Bubble row ──
  bubbleRow:      { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-end' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubbleRowLeft:  { justifyContent: 'flex-start', gap: 8 },

  bubbleAvatar: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  bubbleAvatarText: { color: PC.textPrimary, fontSize: 10, fontWeight: '700' },

  // My bubble — white background, dark text
  bubble: {
    maxWidth: BUBBLE_MAX,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  bubbleMine: {
    backgroundColor: PC.textPrimary, // white
    borderColor: PC.textPrimary,
    borderBottomRightRadius: 4,
  },
  bubbleFriend: {
    backgroundColor: PC.bgCard,
    borderColor: PC.border,
    borderBottomLeftRadius: 4,
  },

  bubbleAmtRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  bubblePaidBy: { fontSize: 12 },
  bubbleAmt:    { fontSize: 17, fontWeight: '700' },

  // Mine text colors
  textMine:          { color: PC.bg },
  textMineSecondary: { color: 'rgba(10,10,10,0.6)' },
  textMineMuted:     { color: 'rgba(10,10,10,0.45)' },

  bubbleDesc:   { fontSize: 13, marginTop: 3 },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  bubbleTime:       { fontSize: 10 },
  bubbleSplitNote:  { fontSize: 10 },

  // ── Input bar ──
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: PC.border,
    backgroundColor: PC.bgCard,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
  },
  inputError: { color: PC.negative, fontSize: 12, marginBottom: 6 },

  paidByRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  paidByLabel: { color: PC.textSecondary, fontSize: 12, fontWeight: '500' },
  paidByChip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    borderColor: PC.border, backgroundColor: PC.bgCardElevated,
  },
  paidByChipActive: { borderColor: PC.textPrimary, backgroundColor: PC.textPrimary },
  paidByChipText:       { color: PC.textSecondary, fontSize: 12, fontWeight: '500' },
  paidByChipTextActive: { color: PC.bg, fontWeight: '600' },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  amtBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PC.bgInput, borderWidth: 1, borderColor: PC.border,
    borderRadius: 12, paddingHorizontal: 10, height: 44, minWidth: 90,
  },
  rupee:    { color: PC.textPrimary, fontSize: 15, fontWeight: '700', marginRight: 4 },
  amtInput: { flex: 1, color: PC.textPrimary, fontSize: 15, minWidth: 50 },

  noteInput: {
    flex: 1, height: 44,
    backgroundColor: PC.bgInput, borderWidth: 1, borderColor: PC.border,
    borderRadius: 12, paddingHorizontal: 12,
    color: PC.textPrimary, fontSize: 14,
  },

  sendBtn: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: PC.textPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
});
