import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  RefreshControl,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PC } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getDirectSplits, addDirectSplit, requestSettle, confirmSettle, cancelOrRejectSettle, getGroupDebtsWithFriend } from '@/services/directSplit';
import { getFriends } from '@/services/friends';
import { getContacts } from '@/services/contacts';
import UpiQrModal from '@/components/UpiQrModal';
import api from '@/services/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

  const [friend,           setFriend]           = useState(null);
  const [isVirtualContact, setIsVirtualContact] = useState(false);
  const [splits,      setSplits]      = useState([]);
  const [balance,     setBalance]     = useState(0);
  const [loading,     setLoading]     = useState(true);

  const [amount,        setAmount]        = useState('');
  const [description,   setDescription]   = useState('');
  const [paidByMe,      setPaidByMe]      = useState(true);
  const [sending,       setSending]       = useState(false);
  const [inputError,    setInputError]    = useState('');
  const [pendingSettle,  setPendingSettle]  = useState(null);
  const [settleLoading,  setSettleLoading]  = useState(false);
  const [cancelLoading,  setCancelLoading]  = useState(false);
  const [showPayModal,   setShowPayModal]   = useState(false);
  const [groupDebts,     setGroupDebts]     = useState([]);
  const [settleAllMode,      setSettleAllMode]      = useState(false);
  const [groupDebtsExpanded, setGroupDebtsExpanded] = useState(false);
  const [settleCustomAmt,    setSettleCustomAmt]    = useState('');
  const [myShare,       setMyShare]       = useState(null);
  const [showSplit,     setShowSplit]     = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [showUpiQr,     setShowUpiQr]     = useState(false);
  const [upiQrData,     setUpiQrData]     = useState(null);

  // Initialise custom amount to full balance whenever direct-settle modal opens
  useEffect(() => {
    if (showPayModal && !settleAllMode) {
      setSettleCustomAmt(Math.abs(balance).toFixed(2));
    }
  }, [showPayModal]);

  // ── Load splits + friend info ──────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [data, friends, debtsData, contacts] = await Promise.all([
        getDirectSplits(friendId),
        getFriends(),
        getGroupDebtsWithFriend(friendId).catch(() => ({ groupDebts: [] })),
        getContacts(),
      ]);
      setSplits(data.splits || []);
      setBalance(data.balance ?? 0);
      setPendingSettle(data.pendingSettle || null);
      setGroupDebts(debtsData.groupDebts || []);

      let f = (friends || []).find(f =>
        String(f._id) === String(friendId) ||
        String(f.id)  === String(friendId)
      );
      let isContact = false;

      // Check personal contacts if not found in friends list
      if (!f) {
        const c = (contacts || []).find(c => String(c._id) === String(friendId));
        if (c) { f = { ...c, isVirtual: true }; isContact = true; }
      }

      // Final fallback: extract info from split data
      if (!f && data.splits?.length > 0) {
        const first = data.splits[0];
        const meId = user?._id?.toString() ?? user?.id?.toString();
        const payerId = first.payerId?._id?.toString() ?? first.payerId?.toString();
        const friendDoc = payerId !== meId ? first.payerId : first.otherUserId;
        if (friendDoc?.name) f = { name: friendDoc.name, username: friendDoc.username };
      }

      setFriend(f || null);
      setIsVirtualContact(isContact);
    } catch (err) {
      // Log so failures are visible in the console; UI shows empty state.
      console.error('[DirectSplitScreen] load failed:', err?.message ?? err);
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  // Reload whenever this screen gains focus — ensures creditor sees pending settle requests
  // Also mark conversation as seen so the navbar badge clears
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

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
  async function handleSettleAll() {
    const meId = user?._id?.toString() ?? user?.id?.toString();
    setSettleLoading(true);
    try {
      // Record a group settlement for every group debt I owe
      await Promise.all(
        groupDebts.filter(gd => gd.iOwe).map(gd =>
          api.post(`/api/groups/${gd.groupId}/settlements`, {
            fromUserId: meId,
            toUserId:   friendId,
            amount:     gd.amount,
            date:       new Date().toISOString(),
            notes:      'Settled via PayCircle',
          })
        )
      );
      // Also send a direct settle request if I owe directly
      if (iAmDebtor && balAbs > 0.01) {
        const data = await requestSettle(friendId, balAbs);
        setPendingSettle(data.pendingSettle);
      }
      await load();
    } catch (err) {
      setInputError(err?.message || 'Failed to settle');
    } finally {
      setSettleLoading(false);
    }
  }

  async function handleRequestSettle(overrideAmt) {
    const amt = overrideAmt ?? Math.abs(balance);
    setSettleLoading(true);
    try {
      const data = await requestSettle(friendId, amt);
      setPendingSettle(data.pendingSettle);
      // Auto-confirmed (personal contact) — reload to refresh balance
      if (!data.pendingSettle) await load();
    } catch (err) {
      setInputError(err?.message || 'Failed to send settle request');
    } finally {
      setSettleLoading(false);
    }
  }

  // Mark a personal contact as having paid me (creditor-side settle)
  async function handleMarkContactSettled() {
    const amt = Math.abs(balance);
    setSettleLoading(true);
    try {
      await requestSettle(friendId, amt, true); // fromContact=true
      await load();
    } catch (err) {
      setInputError(err?.message || 'Failed to mark as settled');
    } finally {
      setSettleLoading(false);
    }
  }

  async function handleCancelOrReject() {
    if (!pendingSettle) return;
    setCancelLoading(true);
    try {
      await cancelOrRejectSettle(friendId, pendingSettle._id);
      setPendingSettle(null);
    } catch (err) {
      setInputError(err?.message || 'Failed');
    } finally {
      setCancelLoading(false);
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

  // ── UPI QR txnId — stable for same friend + same amount ──────────────────
  const directTxnId = useMemo(() => {
    const balAbs_ = Math.abs(balance);
    const iAmDebtor_ = balance <= 0;
    const payAmt = settleAllMode
      ? (iAmDebtor_ ? balAbs_ : 0) + groupDebts.filter(d => d.iOwe).reduce((a, d) => a + d.amount, 0)
      : (parseFloat(settleCustomAmt) || balAbs_);
    return `PC-${String(friendId).slice(-8)}-${Math.round(payAmt * 100)}`;
  }, [friendId, settleCustomAmt, settleAllMode, balance, groupDebts]);

  async function handleQrAndSettle() {
    setShowUpiQr(false);
    setUpiQrData(null);
    const customAmt = parseFloat(settleCustomAmt) || Math.abs(balance);
    if (settleAllMode) { await handleSettleAll(); }
    else               { await handleRequestSettle(customAmt); }
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
          {isVirtualContact ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
              <Ionicons name="person-add-outline" size={10} color={PC.accent} />
              <Text style={{ color: PC.accent, fontSize: 10, fontWeight: '600' }}>Personal Contact</Text>
            </View>
          ) : friend?.username ? (
            <Text style={s.headerUsername}>@{friend.username}</Text>
          ) : null}
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

          {/* Mark Settled — shown to creditor when friend is a personal contact */}
          {youAreOwed && isVirtualContact && (
            <TouchableOpacity
              style={[s.settleChip, settleLoading && { opacity: 0.5 }]}
              onPress={!settleLoading ? handleMarkContactSettled : undefined}
              disabled={settleLoading}
              activeOpacity={0.75}>
              {settleLoading
                ? <ActivityIndicator size="small" color={PC.textMuted} />
                : <Text style={s.settleChipText}>Mark Settled</Text>
              }
            </TouchableOpacity>
          )}

          {/* Settle Up / Cancel chip — shown to debtor */}
          {iAmDebtor && myPendingSettle ? (
            <>
              <View style={[s.settleChip, s.settleChipMuted]}>
                <Text style={[s.settleChipText, s.settleChipTextMuted]}>Pending…</Text>
              </View>
              <TouchableOpacity
                style={s.cancelChip}
                onPress={handleCancelOrReject}
                disabled={cancelLoading}
                activeOpacity={0.75}>
                {cancelLoading
                  ? <ActivityIndicator size="small" color={PC.negative} />
                  : <Ionicons name="close" size={13} color={PC.negative} />
                }
              </TouchableOpacity>
            </>
          ) : iAmDebtor ? (
            <TouchableOpacity
              style={[s.settleChip, settleLoading && { opacity: 0.5 }]}
              onPress={!settleLoading ? () => setShowPayModal(true) : undefined}
              disabled={settleLoading}
              activeOpacity={0.75}>
              {settleLoading
                ? <ActivityIndicator size="small" color={PC.textMuted} />
                : <Text style={s.settleChipText}>Settle Up</Text>
              }
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* ── Group Debts accordion ── */}
      {groupDebts.length > 0 && (
        <View style={s.gdPanel}>
          {/* Header — tap to expand / collapse */}
          <TouchableOpacity
            style={s.gdHeader}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setGroupDebtsExpanded(v => !v);
            }}
            activeOpacity={0.8}>
            <View style={s.gdHeaderLeft}>
              <Ionicons name="layers-outline" size={14} color={PC.accent} />
              <Text style={s.gdHeaderTitle}>Group Debts</Text>
              <View style={s.gdHeaderBadge}>
                <Text style={s.gdHeaderBadgeText}>{groupDebts.length}</Text>
              </View>
            </View>
            <View style={s.gdHeaderRight}>
              {(() => {
                const owe = groupDebts.filter(d => d.iOwe).reduce((a, d) => a + d.amount, 0);
                const owed = groupDebts.filter(d => !d.iOwe).reduce((a, d) => a + d.amount, 0);
                if (owe > 0.01)  return <Text style={[s.gdHeaderNet, { color: PC.negative }]}>−₹{owe.toLocaleString('en-IN')}</Text>;
                if (owed > 0.01) return <Text style={[s.gdHeaderNet, { color: PC.positive }]}>+₹{owed.toLocaleString('en-IN')}</Text>;
                return null;
              })()}
              <Ionicons
                name={groupDebtsExpanded ? 'chevron-up' : 'chevron-down'}
                size={15}
                color={PC.textMuted}
              />
            </View>
          </TouchableOpacity>

          {/* Expanded body */}
          {groupDebtsExpanded && (
            <View style={s.gdBody}>
              {groupDebts.map((item, idx) => (
                <View key={item.groupId} style={[s.gdRow, idx > 0 && s.gdRowBorder]}>
                  <View style={[s.gdRowBar, { backgroundColor: item.iOwe ? PC.negative : PC.positive }]} />
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={s.gdRowName} numberOfLines={1}>{item.groupName}</Text>
                    <Text style={[s.gdRowDir, { color: item.iOwe ? PC.negative : PC.positive }]}>
                      {item.iOwe ? 'you owe' : 'they owe'}
                    </Text>
                  </View>
                  <Text style={[s.gdRowAmt, { color: item.iOwe ? PC.negative : PC.positive }]}>
                    {item.iOwe ? '−' : '+'}₹{item.amount.toLocaleString('en-IN')}
                  </Text>
                  <TouchableOpacity
                    style={s.gdRowNavBtn}
                    onPress={() => router.push(`/groups/${item.groupId}`)}
                    activeOpacity={0.8}>
                    <Ionicons name="arrow-forward" size={13} color={PC.accent} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Settle All footer — when there's combined debt I owe */}
              {(() => {
                const groupIOweTotal = groupDebts.filter(d => d.iOwe).reduce((a, d) => a + d.amount, 0);
                const directOwed = iAmDebtor ? balAbs : 0;
                const combined = groupIOweTotal + directOwed;
                if (combined < 0.01) return null;
                return (
                  <TouchableOpacity
                    style={[s.settleAllBtn, (settleLoading || !!pendingSettle) && { opacity: 0.5 }]}
                    disabled={settleLoading || !!pendingSettle}
                    onPress={() => { setSettleAllMode(true); setShowPayModal(true); }}
                    activeOpacity={0.8}>
                    <Ionicons name="checkmark-done-outline" size={15} color="#060A09" />
                    <Text style={s.settleAllBtnText}>
                      Settle All · ₹{combined.toLocaleString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
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
          <ScrollView
            contentContainerStyle={s.emptyState}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PC.textMuted} />}>
            <View style={s.emptyIcon}>
              <Ionicons name="receipt-outline" size={28} color={PC.textMuted} />
            </View>
            <Text style={s.emptyTitle}>No splits yet</Text>
            <Text style={s.emptyText}>
              Record your first shared expense below.{'\n'}
              Each entry is split 50/50.
            </Text>
          </ScrollView>
        ) : (
          <FlatList
            ref={listRef}
            data={splits}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PC.textMuted} />}
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
              style={[s.settleRejectBtn, (settleLoading || cancelLoading) && { opacity: 0.5 }]}
              onPress={handleCancelOrReject}
              disabled={settleLoading || cancelLoading}
              activeOpacity={0.8}>
              {cancelLoading
                ? <ActivityIndicator size="small" color={PC.negative} />
                : <Text style={s.settleRejectBtnText}>Reject</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.settleConfirmBtn, (settleLoading || cancelLoading) && { opacity: 0.5 }]}
              onPress={handleConfirmSettle}
              disabled={settleLoading || cancelLoading}
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

      {/* ── Payment method modal ── */}
      <Modal visible={showPayModal} transparent animationType="slide" onRequestClose={() => { setShowPayModal(false); setSettleAllMode(false); }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { setShowPayModal(false); setSettleAllMode(false); }} />
          <View style={{ backgroundColor: PC.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, borderColor: PC.border, padding: 24 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: PC.border, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ color: PC.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 6 }}>How are you paying?</Text>
            {settleAllMode ? (() => {
              const groupIOweTotal = groupDebts.filter(d => d.iOwe).reduce((a, d) => a + d.amount, 0);
              const combined = (iAmDebtor ? balAbs : 0) + groupIOweTotal;
              return (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ color: PC.textSecondary, fontSize: 13, marginBottom: 6 }}>
                    Combined total with {friendFirst}
                  </Text>
                  {iAmDebtor && balAbs > 0.01 ? (
                    <Text style={{ color: PC.textMuted, fontSize: 12, marginBottom: 2 }}>
                      Direct: ₹{balAbs.toLocaleString('en-IN')} (pending confirmation)
                    </Text>
                  ) : null}
                  {groupDebts.filter(d => d.iOwe).map(d => (
                    <Text key={d.groupId} style={{ color: PC.textMuted, fontSize: 12, marginBottom: 2 }}>
                      {d.groupName}: ₹{d.amount.toLocaleString('en-IN')} (settled now)
                    </Text>
                  ))}
                  <Text style={{ color: PC.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 4 }}>
                    Total: ₹{combined.toLocaleString('en-IN')}
                  </Text>
                </View>
              );
            })() : (
              /* ── Custom amount selector (direct settle only) ── */
              <View style={s.customAmtBlock}>
                {/* Amount display row */}
                <View style={s.customAmtRow}>
                  <Text style={s.customAmtRupee}>₹</Text>
                  <TextInput
                    style={s.customAmtInput}
                    value={settleCustomAmt}
                    onChangeText={v => setSettleCustomAmt(v)}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    placeholder={balAbs.toFixed(2)}
                    placeholderTextColor={PC.textMuted}
                  />
                  <Text style={s.customAmtOfLabel}>
                    of ₹{balAbs.toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* Preset chips */}
                <View style={s.customAmtPresets}>
                  {[25, 50, 75, 100].map(pct => {
                    const presetVal = pct === 100 ? balAbs : parseFloat((balAbs * pct / 100).toFixed(2));
                    const isActive  = Math.abs((parseFloat(settleCustomAmt) || 0) - presetVal) < 0.01;
                    return (
                      <TouchableOpacity
                        key={pct}
                        style={[s.customAmtPresetBtn, isActive && s.customAmtPresetBtnActive]}
                        onPress={() => setSettleCustomAmt(presetVal.toFixed(2))}
                        activeOpacity={0.75}>
                        <Text style={[s.customAmtPresetText, isActive && s.customAmtPresetTextActive]}>
                          {pct === 100 ? 'Full' : `${pct}%`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Remaining balance hint */}
                {(() => {
                  const custom = parseFloat(settleCustomAmt) || 0;
                  const remaining = Math.round((balAbs - custom) * 100) / 100;
                  if (remaining > 0.01) return (
                    <View style={s.customAmtRemainingRow}>
                      <Ionicons name="time-outline" size={12} color={PC.textMuted} />
                      <Text style={s.customAmtRemainingText}>
                        ₹{remaining.toLocaleString('en-IN')} still owed after this
                      </Text>
                    </View>
                  );
                  return null;
                })()}
              </View>
            )}

            {/* UPI option */}
            {(() => { const friendHasUpi = !!(friend?.upiId); return (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: PC.bgCardElevated, borderRadius: 14, borderWidth: 1, borderColor: PC.border, padding: 16, marginBottom: 10, ...(!friendHasUpi && { opacity: 0.45 }) }}
              disabled={!friendHasUpi}
              onPress={() => {
                const customAmt = parseFloat(settleCustomAmt) || balAbs;
                const payAmt = settleAllMode
                  ? (iAmDebtor ? balAbs : 0) + groupDebts.filter(d => d.iOwe).reduce((a, d) => a + d.amount, 0)
                  : customAmt;
                setShowPayModal(false);
                setUpiQrData({
                  upiId: friend.upiId, name: friendFirst,
                  amount: payAmt, note: 'Settlement via PayCircle',
                  txnId: directTxnId,
                });
                setShowUpiQr(true);
              }}
              activeOpacity={0.8}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,229,190,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="qr-code-outline" size={20} color={PC.positive} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: PC.textPrimary, fontSize: 14, fontWeight: '600' }}>Show Payment QR</Text>
                <Text style={{ color: PC.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {friendHasUpi ? `Scan QR to pay · ${friend.upiId}` : `Ask ${friendFirst} to add their UPI ID in PayCircle profile`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={PC.textMuted} />
            </TouchableOpacity>
            ); })()}

            {/* Outside App option */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: PC.bgCardElevated, borderRadius: 14, borderWidth: 1, borderColor: PC.border, padding: 16, marginBottom: 24 }}
              onPress={async () => {
                setShowPayModal(false);
                const customAmt = parseFloat(settleCustomAmt) || balAbs;
                if (settleAllMode) { await handleSettleAll(); } else { await handleRequestSettle(customAmt); }
              }}
              activeOpacity={0.8}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(148,163,184,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="swap-horizontal-outline" size={20} color={PC.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: PC.textPrimary, fontSize: 14, fontWeight: '600' }}>Paid outside app</Text>
                <Text style={{ color: PC.textSecondary, fontSize: 12, marginTop: 2 }}>Cash, bank transfer, or other</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={PC.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {upiQrData && (
        <UpiQrModal
          visible={showUpiQr}
          onClose={() => { setShowUpiQr(false); setUpiQrData(null); }}
          onPaid={handleQrAndSettle}
          upiId={upiQrData.upiId}
          name={upiQrData.name}
          amount={upiQrData.amount}
          note={upiQrData.note}
          txnId={upiQrData.txnId}
          fromName={user?.name || 'You'}
        />
      )}
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

  // ── Cancel chip (next to Pending chip, for debtor) ──
  cancelChip: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(224,90,90,0.4)',
    backgroundColor: 'rgba(224,90,90,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 4,
  },

  // ── Settle confirmation bar (shown to creditor) ──
  settleConfirmBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(0,229,190,0.25)',
    backgroundColor: 'rgba(0,229,190,0.07)',
    gap: 8,
  },
  settleConfirmTitle: { color: PC.positive, fontSize: 12, fontWeight: '600', marginBottom: 2 },
  settleConfirmSub:   { color: PC.textSecondary, fontSize: 12 },
  settleRejectBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(224,90,90,0.5)',
    backgroundColor: 'rgba(224,90,90,0.08)',
  },
  settleRejectBtnText: { color: PC.negative, fontSize: 12, fontWeight: '600' },
  settleConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: PC.positive,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
  },
  settleConfirmBtnText: { color: '#060A09', fontSize: 12, fontWeight: '600' },

  // ── Group Debts section ──
  groupDebtsSection: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: PC.border,
    backgroundColor: PC.bgCard,
  },
  groupDebtsSectionLabel: {
    color: PC.textSecondary, fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  groupDebtCard: {
    backgroundColor: PC.bgCardElevated, borderRadius: 14,
    borderWidth: 1, borderColor: PC.border,
    paddingHorizontal: 14, paddingVertical: 10,
    minWidth: 140,
  },
  groupDebtName: { color: PC.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  groupDebtAmt:  { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  groupDebtDir:  { fontSize: 11, marginBottom: 8 },
  groupDebtBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    borderColor: PC.accent, backgroundColor: PC.accent10,
  },
  groupDebtBtnText: { color: PC.accent, fontSize: 11, fontWeight: '600' },

  // ── Settle All button ──
  settleAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    margin: 12, marginTop: 10, backgroundColor: PC.accent, borderRadius: 12,
    paddingVertical: 11, paddingHorizontal: 16,
  },
  settleAllBtnText: { color: '#060A09', fontSize: 14, fontWeight: '700' },

  // ── Group Debts accordion panel ──────────────────────────────────────────────
  gdPanel: {
    borderBottomWidth: 1, borderBottomColor: PC.border,
    backgroundColor: PC.bgCard,
  },
  gdHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 11,
  },
  gdHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gdHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gdHeaderTitle: { color: PC.textPrimary, fontSize: 13, fontWeight: '600' },
  gdHeaderBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(0,229,190,0.15)', borderWidth: 1, borderColor: 'rgba(0,229,190,0.30)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  gdHeaderBadgeText: { color: PC.accent, fontSize: 10, fontWeight: '700' },
  gdHeaderNet:       { fontSize: 13, fontWeight: '700' },

  gdBody: {
    borderTopWidth: 1, borderTopColor: PC.border,
  },
  gdRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingRight: 12, paddingVertical: 11,
    position: 'relative',
  },
  gdRowBorder: { borderTopWidth: 1, borderTopColor: PC.border },
  gdRowBar: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: 0 },
  gdRowName:  { color: PC.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  gdRowDir:   { fontSize: 11, fontWeight: '500' },
  gdRowAmt: { fontSize: 14, fontWeight: '700', marginRight: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  gdRowNavBtn: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: 'rgba(0,229,190,0.10)', borderWidth: 1, borderColor: 'rgba(0,229,190,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Custom settle amount block (inside payment modal) ─────────────────────
  customAmtBlock: { marginBottom: 20 },

  customAmtRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1, borderColor: PC.borderLight,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
    marginBottom: 10,
  },
  customAmtRupee: {
    color: PC.accent, fontSize: 22, fontWeight: '700', marginRight: 4,
  },
  customAmtInput: {
    flex: 1, color: PC.textPrimary, fontSize: 26, fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    paddingVertical: 0,
  },
  customAmtOfLabel: {
    color: PC.textMuted, fontSize: 12, alignSelf: 'flex-end', paddingBottom: 2,
  },

  customAmtPresets: {
    flexDirection: 'row', gap: 8, marginBottom: 10,
  },
  customAmtPresetBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: PC.border,
    backgroundColor: PC.bgCardElevated,
    alignItems: 'center',
  },
  customAmtPresetBtnActive: {
    borderColor: PC.accent, backgroundColor: 'rgba(0,229,190,0.12)',
  },
  customAmtPresetText:       { color: PC.textSecondary, fontSize: 13, fontWeight: '600' },
  customAmtPresetTextActive: { color: PC.accent },

  customAmtRemainingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,80,85,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,80,85,0.20)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  customAmtRemainingText: { color: PC.negative, fontSize: 12, fontWeight: '500' },
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
