import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PC } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getDirectSplits, addDirectSplit, requestSettle, confirmSettle } from '@/services/directSplit';
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
  const amt        = Number(split?.amount ?? 0);
  const payerShare = split?.payerShare != null ? split.payerShare : amt / 2;
  const otherShare = amt - payerShare;
  const myShare    = isMine ? payerShare : otherShare;

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
            {'  '}₹{amt.toLocaleString('en-IN')}
          </Text>
        </View>

        {/* Description */}
        {split.description ? (
          <Text style={[s.bubbleDesc, isMine ? s.textMineSecondary : { color: PC.textSecondary }]}>
            {split.description}
          </Text>
        ) : null}

        {/* Your Share */}
        <Text style={[s.bubbleShareLine, isMine ? s.textMineSecondary : { color: PC.textSecondary }]}>
          {'Your Share : '}
          <Text style={[s.bubbleShareAmt, isMine ? s.textMine : { color: PC.textPrimary }]}>
            ₹{myShare.toLocaleString('en-IN')}
          </Text>
        </Text>

        {/* Time */}
        <Text style={[s.bubbleTime, isMine ? s.textMineMuted : { color: PC.textMuted }, { marginTop: 4 }]}>
          {split?.date ? formatTime(split.date) : '—'}
        </Text>
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

  const [amount,        setAmount]        = useState('');
  const [description,   setDescription]   = useState('');
  const [paidByMe,      setPaidByMe]      = useState(true);
  const [sending,       setSending]       = useState(false);
  const [inputError,    setInputError]    = useState('');
  const [pendingSettle, setPendingSettle] = useState(null);
  const [settleLoading, setSettleLoading] = useState(false);
  const [myShare,       setMyShare]       = useState(null);
  const [showSplit,     setShowSplit]     = useState(false);

  // ── Load splits + friend info ──────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [data, friends] = await Promise.all([
        getDirectSplits(friendId),
        getFriends(),
      ]);
      setSplits(data.splits || []);
      setBalance(data.balance ?? 0);
      setPendingSettle(data.pendingSettle || null);
      let f = (friends || []).find(f =>
        String(f._id) === String(friendId) ||
        String(f.id)  === String(friendId)
      );
      // Fallback: extract friend info from split data if friends list lookup fails
      if (!f && data.splits?.length > 0) {
        const first = data.splits[0];
        const meId = user?._id?.toString() ?? user?.id?.toString();
        const payerId = first.payerId?._id?.toString() ?? first.payerId?.toString();
        const friendDoc = payerId !== meId ? first.payerId : first.otherUserId;
        if (friendDoc?.name) f = { name: friendDoc.name, username: friendDoc.username };
      }
      setFriend(f || null);
    } catch (err) {
      // Log so failures are visible in the console; UI shows empty state.
      console.error('[DirectSplitScreen] load failed:', err?.message ?? err);
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  // Reload whenever this screen gains focus — ensures creditor sees pending settle requests
  // Also mark conversation as seen so the navbar badge clears
  useFocusEffect(useCallback(() => {
    load();
    AsyncStorage.getItem('directLastViewed').then(raw => {
      const map = raw ? JSON.parse(raw) : {};
      map[String(friendId)] = new Date().toISOString();
      AsyncStorage.setItem('directLastViewed', JSON.stringify(map));
    }).catch(() => {});
  }, [load, friendId]));

  // Scroll to bottom after first load and whenever splits change
  useEffect(() => {
    if (!loading && splits.length > 0) {
      const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 80);
      return () => clearTimeout(timer);
    }
  }, [loading, splits.length]);

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
      const data = await addDirectSplit(friendId, amt, description.trim(), paidByMe, myShare);
      // Guard: only append if the server returned a valid split object
      if (!data?.split?._id) {
        console.error('[DirectSplitScreen] addDirectSplit returned no split:', data);
        setInputError('Split was saved but the response was unexpected. Pull to refresh.');
      } else {
        setSplits(prev => [...prev, data.split]);
        setBalance(prev => {
          const myHalf = myShare ?? amt / 2;
          const delta = amt - myHalf;
          return Math.round((paidByMe ? prev + delta : prev - delta) * 100) / 100;
        });
        setAmount('');
        setDescription('');
        setMyShare(null);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      }
    } catch (err) {
      setInputError(err?.message || 'Failed to add split');
    } finally {
      setSending(false);
    }
  }

  // ── Settle Up ─────────────────────────────────────────────────────────────
  async function handleRequestSettle() {
    setSettleLoading(true);
    try {
      const data = await requestSettle(friendId, Math.abs(balance));
      setPendingSettle(data.pendingSettle);
    } catch (err) {
      setInputError(err?.message || 'Failed to send settle request');
    } finally {
      setSettleLoading(false);
    }
  }

  async function handleConfirmSettle() {
    if (!pendingSettle) return;
    setSettleLoading(true);
    try {
      await confirmSettle(friendId, pendingSettle._id);
      setPendingSettle(null);
      await load();
    } catch (err) {
      setInputError(err?.message || 'Failed to confirm settlement');
    } finally {
      setSettleLoading(false);
    }
  }

  // ── Render bubble with date separator ─────────────────────────────────────
  function renderItem({ item, index }) {
    // user._id might be a string or ObjectId; some auth responses expose id (virtual)
    const meId = user?._id?.toString() ?? user?.id?.toString() ?? null;
    const isMine = meId != null && (
      item.payerId?._id?.toString() === meId ||
      item.payerId?.id?.toString()  === meId ||
      item.payerId?.toString()      === meId   // fallback: unpopulated ObjectId
    );
    const prevItem = index > 0 ? splits[index - 1] : null;
    const showDate = !prevItem || formatDateLabel(item.date) !== formatDateLabel(prevItem.date);

    return (
      <View>
        {showDate && <DateSeparator label={formatDateLabel(item.date)} />}
        <Bubble
          split={item}
          isMine={isMine}
          friendFirstName={friend?.name?.split(' ')[0] || 'Friend'}
        />
      </View>
    );
  }

  if (!user) return null;

  const balAbs    = Math.abs(balance);
  const isSettled = balAbs < 0.01;
  const youAreOwed = balance > 0;
  const friendFirst = friend?.name?.split(' ')[0] || 'Friend';

  const meIdStr         = user?._id?.toString() ?? user?.id?.toString();
  const iAmDebtor       = !youAreOwed && !isSettled;
  const myPendingSettle = pendingSettle && (
    pendingSettle.fromUserId?._id?.toString() === meIdStr ||
    pendingSettle.fromUserId?.id?.toString()  === meIdStr ||
    pendingSettle.fromUserId?.toString()      === meIdStr
  );
  const friendPendingSettle = pendingSettle && !myPendingSettle;

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
          <Text style={[s.balBannerText, { color: youAreOwed ? PC.positive : PC.negative, flex: 1 }]}>
            {youAreOwed
              ? `${friendFirst} owes you ₹${balAbs.toLocaleString('en-IN')}`
              : `You owe ${friendFirst} ₹${balAbs.toLocaleString('en-IN')}`
            }
          </Text>

          {/* Settle Up chip — shown to debtor */}
          {iAmDebtor && (
            <TouchableOpacity
              style={[s.settleChip, myPendingSettle && s.settleChipMuted]}
              onPress={!myPendingSettle && !settleLoading ? handleRequestSettle : undefined}
              disabled={!!myPendingSettle || settleLoading}
              activeOpacity={0.75}>
              {settleLoading && !myPendingSettle
                ? <ActivityIndicator size="small" color={PC.textMuted} />
                : <Text style={[s.settleChipText, myPendingSettle && s.settleChipTextMuted]}>
                    {myPendingSettle ? 'Pending…' : 'Settle Up'}
                  </Text>
              }
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Chat + Input ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

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

        {/* Settle confirmation banner — shown to creditor when friend requested */}
        {friendPendingSettle && (
          <View style={s.settleConfirmBar}>
            <View style={{ flex: 1 }}>
              <Text style={s.settleConfirmTitle}>Settle request</Text>
              <Text style={s.settleConfirmSub}>
                {friendFirst} says they paid ₹{(pendingSettle.amount ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <TouchableOpacity
              style={[s.settleConfirmBtn, settleLoading && { opacity: 0.5 }]}
              onPress={handleConfirmSettle}
              disabled={settleLoading}
              activeOpacity={0.8}>
              {settleLoading
                ? <ActivityIndicator size="small" color="#060A09" />
                : <>
                    <Ionicons name="checkmark" size={14} color="#060A09" />
                    <Text style={s.settleConfirmBtnText}>Confirm</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
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
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[s.customBtn, myShare !== null && s.customBtnActive]}
              onPress={() => {
                if (!amount || isNaN(parseFloat(amount))) {
                  setInputError('Enter amount first');
                  return;
                }
                setShowSplit(true);
              }}
              disabled={sending}
              activeOpacity={0.75}>
              <Ionicons
                name={myShare !== null ? 'checkmark-circle' : 'options-outline'}
                size={13}
                color={myShare !== null ? PC.accent : PC.textMuted}
              />
              <Text style={[s.customBtnText, myShare !== null && s.customBtnTextActive]}>
                {myShare !== null ? `₹${myShare}` : 'Custom'}
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
                onChangeText={v => { setAmount(v); setInputError(''); setMyShare(null); }}
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
                ? <ActivityIndicator size="small" color="#060A09" />
                : <Ionicons name="arrow-up" size={18} color="#060A09" />
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      <TwoPersonSplitModal
        visible={showSplit}
        onClose={() => setShowSplit(false)}
        totalAmount={parseFloat(amount) || 0}
        myName="You"
        friendName={friendFirst}
        onConfirm={(share) => {
          setMyShare(share);
          setShowSplit(false);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Two-Person Split Modal ───────────────────────────────────────────────────

function TwoPersonSplitModal({ visible, onClose, totalAmount, myName, friendName, onConfirm }) {
  const [myAmt,     setMyAmt]     = useState('');
  const [friendAmt, setFriendAmt] = useState('');

  useEffect(() => {
    if (!visible || !totalAmount) return;
    const half = (totalAmount / 2).toFixed(2);
    setMyAmt(half);
    setFriendAmt(half);
  }, [visible, totalAmount]);

  function handleMyAmtChange(v) {
    setMyAmt(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n >= 0 && n <= totalAmount) {
      setFriendAmt((totalAmount - n).toFixed(2));
    }
  }

  function handleFriendAmtChange(v) {
    setFriendAmt(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n >= 0 && n <= totalAmount) {
      setMyAmt((totalAmount - n).toFixed(2));
    }
  }

  const myN     = parseFloat(myAmt) || 0;
  const friendN = parseFloat(friendAmt) || 0;
  const leftover = Math.round((totalAmount - myN - friendN) * 100) / 100;
  const isValid = Math.abs(leftover) <= 0.02 && myN > 0 && friendN > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s2.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={s2.sheet}>
          <View style={s2.handle} />
          <Text style={s2.title}>Custom Split</Text>
          <Text style={s2.subtitle}>Total: ₹{totalAmount.toFixed(2)}</Text>

          <View style={s2.row}>
            <Text style={s2.rowLabel}>{myName}</Text>
            <View style={s2.inputBox}>
              <Text style={s2.rupee}>₹</Text>
              <TextInput
                style={s2.input}
                value={myAmt}
                onChangeText={handleMyAmtChange}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={PC.textMuted}
              />
            </View>
          </View>

          <View style={s2.row}>
            <Text style={s2.rowLabel}>{friendName}</Text>
            <View style={s2.inputBox}>
              <Text style={s2.rupee}>₹</Text>
              <TextInput
                style={s2.input}
                value={friendAmt}
                onChangeText={handleFriendAmtChange}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={PC.textMuted}
              />
            </View>
          </View>

          <View style={s2.remainingRow}>
            <Text style={{ color: PC.textSecondary, fontSize: 13 }}>Remaining</Text>
            <Text style={{ color: isValid ? PC.positive : PC.warning, fontSize: 13, fontWeight: '600' }}>
              ₹{leftover.toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            style={[s2.confirmBtn, !isValid && { opacity: 0.5 }]}
            onPress={() => isValid && onConfirm(myN)}
            disabled={!isValid}
            activeOpacity={0.85}>
            <Text style={s2.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  headerBalPos:     { backgroundColor: 'rgba(0,229,190,0.1)', borderColor: 'rgba(0,229,190,0.3)' },
  headerBalNeg:     { backgroundColor: 'rgba(224,90,90,0.1)', borderColor: 'rgba(224,90,90,0.3)' },
  headerBalText:    { fontSize: 12, fontWeight: '600' },

  // ── Balance banner ──
  balBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1,
  },
  balBannerPos:  { backgroundColor: 'rgba(0,229,190,0.07)',  borderBottomColor: 'rgba(0,229,190,0.15)' },
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
    backgroundColor: PC.accent,
    borderColor: PC.accent,
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

  // Mine text colors — dark text on mint bubble
  textMine:          { color: '#060A09' },
  textMineSecondary: { color: 'rgba(6,10,9,0.65)' },
  textMineMuted:     { color: 'rgba(6,10,9,0.45)' },

  bubbleDesc:   { fontSize: 13, marginTop: 3 },
  bubbleFooter:    { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  bubbleTime:      { fontSize: 10 },
  bubbleSplitNote: { fontSize: 10 },
  bubbleShareLine: { fontSize: 11, marginTop: 6 },
  bubbleShareAmt:  { fontSize: 11, fontWeight: '700' },

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
  paidByChipActive: { borderColor: PC.accent, backgroundColor: PC.accent },
  paidByChipText:       { color: PC.textSecondary, fontSize: 12, fontWeight: '500' },
  paidByChipTextActive: { color: '#060A09', fontWeight: '600' },

  customBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    borderColor: PC.borderLight, backgroundColor: 'transparent',
  },
  customBtnActive: {
    borderColor: PC.accent,
    backgroundColor: PC.accent10,
  },
  customBtnText:       { color: PC.textMuted, fontSize: 12, fontWeight: '500' },
  customBtnTextActive: { color: PC.accent, fontWeight: '700' },

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
    backgroundColor: PC.accent,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Settle Up chip (in balance banner) ──
  settleChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    borderColor: PC.border, backgroundColor: PC.bgCard,
    marginLeft: 8,
  },
  settleChipMuted:     { borderColor: PC.border, backgroundColor: 'transparent' },
  settleChipText:      { color: PC.textPrimary, fontSize: 11, fontWeight: '600' },
  settleChipTextMuted: { color: PC.textMuted },

  // ── Settle confirmation bar (shown to creditor) ──
  settleConfirmBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(0,229,190,0.25)',
    backgroundColor: 'rgba(0,229,190,0.07)',
    gap: 10,
  },
  settleConfirmTitle: { color: PC.positive, fontSize: 12, fontWeight: '600', marginBottom: 2 },
  settleConfirmSub:   { color: PC.textSecondary, fontSize: 12 },
  settleConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: PC.positive,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
  },
  settleConfirmBtnText: { color: '#060A09', fontSize: 12, fontWeight: '600' },
});

const s2 = StyleSheet.create({
  overlay:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:        { backgroundColor: PC.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' },
  handle:       { width: 36, height: 4, backgroundColor: PC.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:        { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  subtitle:     { color: PC.textSecondary, fontSize: 13, marginBottom: 20 },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  rowLabel:     { color: PC.textPrimary, fontSize: 14, fontWeight: '600', flex: 1 },
  inputBox:     { flexDirection: 'row', alignItems: 'center', backgroundColor: PC.bgInput, borderWidth: 1, borderColor: PC.border, borderRadius: 12, paddingHorizontal: 10, height: 44, width: 130 },
  rupee:        { color: PC.textPrimary, fontSize: 15, fontWeight: '700', marginRight: 4 },
  input:        { flex: 1, color: PC.textPrimary, fontSize: 15 },
  remainingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: PC.border, marginBottom: 16 },
  confirmBtn:     { backgroundColor: PC.accent, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { color: '#060A09', fontSize: 15, fontWeight: '700' },
});
