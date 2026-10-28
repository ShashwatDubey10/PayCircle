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
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PC } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getDirectSplits, addDirectSplit, requestSettle, confirmSettle, cancelOrRejectSettle, getGroupDebtsWithFriend, updateDirectSplit } from '@/services/directSplit';
import { getFriends } from '@/services/friends';
import { getContacts } from '@/services/contacts';
import UpiQrModal from '@/components/UpiQrModal';
import api from '@/services/api';
import { upsertSplitTag, getSplitTags } from '@/services/splitTag';
import EditSplitSheet, { CAT_ICON_MAP } from '@/components/EditSplitSheet';

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

function Bubble({ split, isMine, friendFirstName, tag, onTagPress, onLongPress }) {
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

      <TouchableOpacity
        onLongPress={onLongPress}
        delayLongPress={350}
        activeOpacity={0.92}>
        <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleFriend]}>

          {/* Row 1: Payer + Amount inline */}
          <View style={s.bubbleMainRow}>
            <Text numberOfLines={1} style={[s.bubblePaidBy, isMine ? s.textMineSecondary : { color: PC.textSecondary }]}>
              {isMine ? 'You paid' : `${friendFirstName} paid`}{'  '}
            </Text>
            <Text numberOfLines={1} style={[s.bubbleAmt, isMine ? s.textMine : s.textFriendAmt]}>
              ₹{amt.toLocaleString('en-IN')}
            </Text>
          </View>

          {/* Row 2: Description (optional) */}
          {split.description ? (
            <Text style={[s.bubbleDesc, isMine ? s.textMineSecondary : { color: PC.textSecondary }]}>
              {split.description}
            </Text>
          ) : null}

          {/* Row 3: Your share */}
          <View style={s.shareRow}>
            <Text style={[s.shareLabel, isMine ? s.textMineSecondary : { color: PC.textMuted }]}>
              your share
            </Text>
            <Text style={[s.bubbleShareAmt, isMine ? s.textMine : s.textFriendShare]}>
              ₹{myShare.toLocaleString('en-IN')}
            </Text>
          </View>

          {/* Row 4: Tag chip */}
          <View style={s.bubbleFooter}>
            <TouchableOpacity onPress={onTagPress} activeOpacity={0.7}>
              {tag ? (
                <View style={[s.tagChip, isMine && s.tagChipMine]}>
                  <Ionicons
                    name={CAT_ICON_MAP[tag] || 'pricetag-outline'}
                    size={10}
                    color={isMine ? 'rgba(6,10,9,0.6)' : PC.accent}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[s.tagChipText, isMine && { color: 'rgba(6,10,9,0.6)' }]}>{tag}</Text>
                </View>
              ) : (
                <View style={[s.tagChipAdd, isMine && s.tagChipAddMine]}>
                  <Ionicons
                    name="pricetag-outline"
                    size={10}
                    color={isMine ? 'rgba(6,10,9,0.4)' : PC.textSecondary}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[s.tagChipEmpty, isMine && { color: 'rgba(6,10,9,0.4)' }]}>Tag</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Row 5: Timestamp */}
          <View style={s.bubbleTimeRow}>
            <Text style={[s.bubbleTime, isMine ? s.textMineMuted : { color: PC.textMuted }]} numberOfLines={1}>
              {split?.date ? formatTime(split.date) : '—'}
            </Text>
          </View>

        </View>
      </TouchableOpacity>
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
  const insets = useSafeAreaInsets();

  // The input bar lives inside a KeyboardAvoidingView, so it only wants the
  // gesture-bar inset while the keyboard is DOWN. Once the keyboard is up the
  // KAV has already lifted the bar clear of it, and adding the inset as well
  // would leave a visible strip of dead space between the bar and the keyboard.
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardUp(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

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

  // ── Split tags ─────────────────────────────────────────────────────────────
  const [tags,      setTags]      = useState({}); // { splitId: category }
  const [editSheet, setEditSheet] = useState(null); // { split, canEditAmount } | null
  const [newSplitCat, setNewSplitCat] = useState('');

  // Initialise custom amount to full balance whenever direct-settle modal opens
  useEffect(() => {
    if (showPayModal && !settleAllMode) {
      setSettleCustomAmt(Math.abs(balance).toFixed(2));
    }
  }, [showPayModal]);

  // ── Load splits + friend info ──────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [data, friends, debtsData, contacts, tagsRes] = await Promise.all([
        getDirectSplits(friendId),
        getFriends(),
        getGroupDebtsWithFriend(friendId).catch(() => ({ groupDebts: [] })),
        getContacts(),
        getSplitTags(),
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

      // Build tag map for direct splits
      const directTagMap = {};
      (tagsRes?.tags || []).filter(t => t.refType === 'direct').forEach(t => {
        directTagMap[t.refId.toString()] = t.category;
      });
      setTags(directTagMap);
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
        // Save category tag if provided
        if (newSplitCat.trim()) {
          upsertSplitTag(data.split._id, 'direct', newSplitCat.trim())
            .then(() => setTags(prev => ({ ...prev, [data.split._id]: newSplitCat.trim() })))
            .catch(() => {});
        }
        setSplits(prev => [...prev, data.split]);
        setBalance(prev => {
          const myHalf = myShare ?? amt / 2;
          const delta = amt - myHalf;
          return Math.round((paidByMe ? prev + delta : prev - delta) * 100) / 100;
        });
        setAmount('');
        setDescription('');
        setMyShare(null);
        setNewSplitCat('');
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      }
    } catch (err) {
      setInputError(err?.message || 'Failed to add split');
    } finally {
      setSending(false);
    }
  }

  // ── Edit split (amount + private category) ────────────────────────────────
  async function handleEditSave({ amount, category }) {
    const { split, canEditAmount } = editSheet;
    const sidStr = split._id?.toString();
    const tasks = [];
    if (canEditAmount && amount != null) {
      tasks.push(updateDirectSplit(friendId, split._id, { amount }).then(() => load()));
    }
    if (category) {
      tasks.push(
        upsertSplitTag(split._id, 'direct', category)
          .then(() => setTags(prev => ({ ...prev, [sidStr]: category })))
      );
    }
    await Promise.all(tasks);
    setEditSheet(null);
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
    // Second line of defence behind the input clamp: the balance may have moved
    // since the sheet opened, and the server now rejects anything above it.
    const balAbs_ = Math.abs(balance);
    const amt = Math.min(overrideAmt ?? balAbs_, balAbs_);
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
          tag={tags[item._id?.toString()]}
          onTagPress={() => setEditSheet({ split: item, canEditAmount: false })}
          onLongPress={() => setEditSheet({ split: item, canEditAmount: isMine })}
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
        behavior="padding">

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
        <View style={[s.inputBar, { paddingBottom: (keyboardUp ? 0 : insets.bottom) + 14 }]}>
          {/* Mint glow line at top edge */}
          <View style={s.inputBarAccentLine} />

          {/* Error */}
          {inputError ? (
            <View style={s.inputErrRow}>
              <Ionicons name="warning-outline" size={11} color={PC.negative} />
              <Text style={s.inputError}>{inputError}</Text>
            </View>
          ) : null}

          {/* Who paid + custom split */}
          <View style={s.paidByRow}>
            <Text style={s.paidByLabel}>PAID BY</Text>
            <View style={s.paidBySegment}>
              <TouchableOpacity
                style={[s.paidByOption, paidByMe && s.paidByOptionActive]}
                onPress={() => setPaidByMe(true)}
                disabled={sending}
                activeOpacity={0.8}>
                <Text style={[s.paidByOptionText, paidByMe && s.paidByOptionTextActive]}>You</Text>
              </TouchableOpacity>
              <View style={s.paidByDivider} />
              <TouchableOpacity
                style={[s.paidByOption, !paidByMe && s.paidByOptionActive]}
                onPress={() => setPaidByMe(false)}
                disabled={sending}
                activeOpacity={0.8}>
                <Text style={[s.paidByOptionText, !paidByMe && s.paidByOptionTextActive]}>
                  {friendFirst}
                </Text>
              </TouchableOpacity>
            </View>
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
                name={myShare !== null ? 'checkmark-circle' : 'git-branch-outline'}
                size={12}
                color={myShare !== null ? PC.accent : PC.textMuted}
              />
              <Text style={[s.customBtnText, myShare !== null && s.customBtnTextActive]}>
                {myShare !== null ? `₹${myShare}` : 'Custom'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount — hero field */}
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
            {myShare !== null && (
              <View style={s.shareTag}>
                <Ionicons name="person-outline" size={9} color={PC.accent} style={{ marginRight: 3 }} />
                <Text style={s.shareTagText}>your ₹{myShare}</Text>
              </View>
            )}
          </View>

          {/* Description + Category + Send */}
          <View style={s.inputRow}>
            <View style={s.textFieldWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={12} color={PC.textMuted} style={s.fieldIcon} />
              <TextInput
                style={s.noteInput}
                placeholder="What for?"
                placeholderTextColor={PC.textMuted}
                value={description}
                onChangeText={setDescription}
                editable={!sending}
              />
            </View>
            <View style={[s.textFieldWrap, { flex: 0.75 }]}>
              <Ionicons name="pricetag-outline" size={12} color={PC.textMuted} style={s.fieldIcon} />
              <TextInput
                style={s.noteInput}
                placeholder="tag"
                placeholderTextColor={PC.textMuted}
                value={newSplitCat}
                onChangeText={setNewSplitCat}
                editable={!sending}
                maxLength={50}
              />
            </View>
            <TouchableOpacity
              style={[s.sendBtn, sending && { opacity: 0.5 }]}
              onPress={handleSend}
              disabled={sending}
              activeOpacity={0.8}>
              {sending
                ? <ActivityIndicator size="small" color="#060A09" />
                : <Ionicons name="arrow-up" size={17} color="#060A09" />
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
      <Modal statusBarTranslucent visible={showPayModal} transparent animationType="slide" onRequestClose={() => { setShowPayModal(false); setSettleAllMode(false); }}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          behavior="padding">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { setShowPayModal(false); setSettleAllMode(false); }} />
          {/* Scrollable because the keyboard shrinks the sheet: with a plain View
              the payment buttons below the amount field become unreachable.
              NOTE: padding goes on contentContainerStyle, never on `style` --
              on a ScrollView that clips the content, so the last paddingBottom
              pixels can never be scrolled into view. maxHeight is required too,
              or the sheet splits the screen with the flex:1 backdrop. Do NOT
              add flexGrow:0 here: ScrollView keeps flexShrink:1, so it would
              shrink for the keyboard and never grow back. */}
          <ScrollView
            style={{ backgroundColor: PC.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, borderColor: PC.border, maxHeight: '85%' }}
            contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}
            bounces={false}
            keyboardShouldPersistTaps="handled">
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
                    onChangeText={v => {
                      // Strip anything the decimal-pad can still produce on some
                      // locales (commas, a second dot), then hold the value at the
                      // outstanding balance. Overpaying does not just overshoot —
                      // it carries the balance past zero and shows the debt as
                      // running the other way.
                      const cleaned = v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                      const n = parseFloat(cleaned);
                      setSettleCustomAmt(!isNaN(n) && n > balAbs ? balAbs.toFixed(2) : cleaned);
                    }}
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
          </ScrollView>
        </KeyboardAvoidingView>
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

      <EditSplitSheet
        visible={editSheet !== null}
        onClose={() => setEditSheet(null)}
        canEditAmount={editSheet?.canEditAmount ?? false}
        initialAmount={editSheet?.split?.amount}
        initialCategory={editSheet ? (tags[editSheet.split._id?.toString()] || '') : ''}
        onSave={handleEditSave}
      />
    </SafeAreaView>
  );
}

// ─── Two-Person Split Modal ───────────────────────────────────────────────────

function TwoPersonSplitModal({ visible, onClose, totalAmount, myName, friendName, onConfirm }) {
  const insets = useSafeAreaInsets();
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
    <Modal statusBarTranslucent visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s2.overlay}
        behavior="padding">
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[s2.sheet, { paddingBottom: insets.bottom + 24 }]}>
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

const BUBBLE_MAX = '92%';

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
  bubbleRow:      { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end', paddingHorizontal: 12 },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubbleRowLeft:  { justifyContent: 'flex-start', gap: 10 },

  bubbleAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1, borderColor: 'rgba(0,229,190,0.28)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  bubbleAvatarText: { color: PC.accent, fontSize: 11, fontWeight: '700' },

  bubble: {
    maxWidth: BUBBLE_MAX,
    borderRadius: 18,
    paddingLeft: 14,
    paddingRight: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderWidth: 1,
  },
  bubbleMine: {
    backgroundColor: PC.accent,
    borderColor: 'rgba(0,229,190,0.5)',
    borderBottomRightRadius: 4,
  },
  bubbleFriend: {
    backgroundColor: '#0D1512',
    borderColor: PC.borderLight,
    borderBottomLeftRadius: 4,
  },

  // Row 1: payer + amount inline
  bubbleMainRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  bubblePaidBy:  { fontSize: 12, fontWeight: '500' },

  // Amount
  bubbleAmt: {
    fontSize: 18, fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  textMine:          { color: '#060A09' },
  textFriendAmt:     { color: PC.textPrimary },
  textMineSecondary: { color: 'rgba(6,10,9,0.62)' },
  textMineMuted:     { color: 'rgba(6,10,9,0.42)' },

  bubbleDesc: { fontSize: 13, marginBottom: 4, fontStyle: 'italic' },

  // Share row
  shareRow:      { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6, marginBottom: 2 },
  shareLabel:    { fontSize: 10, fontWeight: '500' },
  bubbleShareAmt: { fontSize: 14, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  textFriendShare: { color: PC.positive },

  bubbleFooter:  { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  bubbleTimeRow: { alignItems: 'flex-end', marginTop: 3, alignSelf: 'stretch' },
  bubbleTime:    { fontSize: 9, fontWeight: '500' },

  // ── Input bar ──
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: PC.border,
    backgroundColor: '#080E0C',
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
  },
  inputBarAccentLine: {
    height: 1,
    backgroundColor: 'rgba(0,229,190,0.20)',
    marginBottom: 12,
  },
  inputErrRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: 8,
  },
  inputError: { color: PC.negative, fontSize: 12 },

  // Paid by — segmented control
  paidByRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  paidByLabel: {
    color: PC.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1.4,
  },
  paidBySegment: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PC.bgCardElevated,
    borderRadius: 10, borderWidth: 1, borderColor: PC.border,
    overflow: 'hidden',
  },
  paidByOption: { paddingHorizontal: 13, paddingVertical: 6 },
  paidByOptionActive: { backgroundColor: PC.accent },
  paidByOptionText:       { color: PC.textSecondary, fontSize: 12, fontWeight: '600' },
  paidByOptionTextActive: { color: '#060A09', fontWeight: '700' },
  paidByDivider: { width: 1, height: 18, backgroundColor: PC.border },

  customBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    borderColor: PC.borderLight, backgroundColor: 'transparent',
  },
  customBtnActive:     { borderColor: PC.accent, backgroundColor: PC.accent10 },
  customBtnText:       { color: PC.textMuted, fontSize: 12, fontWeight: '500' },
  customBtnTextActive: { color: PC.accent, fontWeight: '700' },

  // Amount — hero
  amtBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PC.bgInput,
    borderWidth: 1, borderColor: PC.borderLight,
    borderLeftWidth: 3, borderLeftColor: PC.accent,
    borderRadius: 12,
    paddingLeft: 14, paddingRight: 12,
    height: 56,
    marginBottom: 10,
  },
  rupee: {
    color: PC.accent, fontSize: 22, fontWeight: '700', marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  amtInput: {
    flex: 1, color: PC.textPrimary,
    fontSize: 26, fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  shareTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PC.accent10,
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,229,190,0.22)',
    paddingHorizontal: 7, paddingVertical: 3,
  },
  shareTagText: { color: PC.accent, fontSize: 10, fontWeight: '600' },

  // Description + category row
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  textFieldWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    height: 42,
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1, borderColor: PC.border,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  fieldIcon: { marginRight: 6 },
  noteInput: {
    flex: 1, color: PC.textPrimary, fontSize: 13,
  },

  sendBtn: {
    width: 42, height: 42, borderRadius: 12,
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

  // Tag chip (on bubbles)
  tagChip:        { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(0,229,190,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(0,229,190,0.28)' },
  tagChipMine:    { backgroundColor: 'rgba(6,10,9,0.12)', borderColor: 'rgba(6,10,9,0.18)' },
  tagChipText:    { color: PC.accent, fontSize: 10, fontWeight: '600' },
  tagChipAdd:     { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'transparent', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: PC.borderLight },
  tagChipAddMine: { borderColor: 'rgba(6,10,9,0.2)' },
  tagChipEmpty:   { color: PC.textSecondary, fontSize: 10 },

  // Tag sheet modal
  tagSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  tagSheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: PC.border,
    padding: 24, paddingBottom: 36,
  },
  tagSheetHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: PC.border, alignSelf: 'center', marginBottom: 20 },
  tagSheetTitle:   { color: PC.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 14 },
  tagInputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PC.bgInput, borderRadius: 12,
    borderWidth: 1, borderColor: PC.border,
    paddingHorizontal: 14, height: 48, marginBottom: 12,
  },
  tagInputField:         { flex: 1, color: PC.textPrimary, fontSize: 15 },
  tagSuggestion:         { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: PC.border, backgroundColor: PC.bgCardElevated, marginRight: 8 },
  tagSuggestionActive:   { borderColor: PC.accent, backgroundColor: PC.accent10 },
  tagSuggestionText:     { color: PC.textMuted, fontSize: 13 },
  tagSuggestionTextActive: { color: PC.accent },
  tagSaveBtn:     { backgroundColor: PC.accent, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  tagSaveBtnText: { color: '#060A09', fontSize: 14, fontWeight: '700' },
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
