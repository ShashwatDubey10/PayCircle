import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
  LayoutAnimation,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PC } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { getFriends } from '@/services/friends';
import ErrorBox from '@/components/ErrorBox';
import { getContacts } from '@/services/contacts';
import UpiQrModal from '@/components/UpiQrModal';
import { upsertSplitTag, getSplitTags } from '@/services/splitTag';
import EditSplitSheet, { CAT_ICON_MAP } from '@/components/EditSplitSheet';

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = ['Food', 'Travel', 'Utilities', 'Miscellaneous'];

const CAT_ICONS = {
  Food:          'fast-food-outline',
  Travel:        'airplane-outline',
  Utilities:     'flash-outline',
  Miscellaneous: 'grid-outline',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatExpDateLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatExpTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatShortDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Expense bubble components ────────────────────────────────────────────────

const CAT_EMOJI = { Food: '🍽', Travel: '✈', Utilities: '⚡', Miscellaneous: '📦' };

function ExpDateSeparator({ label }) {
  return (
    <View style={styles.expDateSep}>
      <View style={styles.expDateSepLine} />
      <Text style={styles.expDateSepText}>{label}</Text>
      <View style={styles.expDateSepLine} />
    </View>
  );
}

// ─── Add Expense Modal ────────────────────────────────────────────────────────

function AddExpenseModal({ visible, onClose, group, members, onAdded }) {
  const { user } = useAuth();

  const [amount,    setAmount]    = useState('');
  const [category,  setCategory]  = useState('Food');
  const [notes,     setNotes]     = useState('');
  const [payerId,   setPayerId]   = useState(user?._id ?? '');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [splitType,    setSplitType]    = useState('equal');
  const [customSplits, setCustomSplits] = useState([]);
  const [showCustom,   setShowCustom]   = useState(false);

  async function handleSubmit() {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (splitType === 'exact' && customSplits.length === 0) {
      setError('Configure the custom split first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.post(`/api/groups/${group._id}/expenses`, {
        amount: amt,
        payerId,
        date: today,
        category,
        notes: notes.trim(),
        splitType,
        ...(splitType === 'exact' ? { splits: customSplits } : {}),
      });
      onAdded(data.expense);
      setAmount('');
      setNotes('');
      setPayerId(user?._id ?? '');
      setCategory('Food');
      setSplitType('equal');
      setCustomSplits([]);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setAmount('');
    setNotes('');
    setPayerId(user?._id ?? '');
    setCategory('Food');
    setError('');
    setSplitType('equal');
    setCustomSplits([]);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <ScrollView style={styles.modalSheet} bounces={false} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Expense</Text>

          <ErrorBox message={error} />

          {/* Amount */}
          <Text style={styles.modalLabel}>Amount (₹)</Text>
          <View style={styles.modalInputBox}>
            <Text style={styles.rupeePrefix}>₹</Text>
            <TextInput
              style={[styles.modalInput, { flex: 1 }]}
              placeholder="0.00"
              placeholderTextColor={PC.textMuted}
              value={amount}
              onChangeText={(v) => { setAmount(v); setError(''); setCustomSplits([]); setSplitType('equal'); }}
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>

          {/* Category */}
          <Text style={styles.modalLabel}>Category</Text>
          <View style={styles.chipRow}>
            {EXPENSE_CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c)}
                disabled={loading}>
                <Ionicons
                  name={CAT_ICONS[c]}
                  size={14}
                  color={category === c ? PC.textPrimary : PC.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Who Paid */}
          <Text style={styles.modalLabel}>Paid by</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {members.map((m) => {
              const selected = payerId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.payerChip, selected && styles.payerChipActive]}
                  onPress={() => setPayerId(m.id)}
                  disabled={loading}>
                  <View style={[styles.payerAvatar, selected && styles.payerAvatarActive]}>
                    <Text style={[styles.payerInitials, selected && { color: '#060A09' }]}>
                      {initials(m.name)}
                    </Text>
                  </View>
                  <Text style={[styles.payerName, selected && styles.payerNameActive]}>
                    {m.id === user._id ? 'You' : m.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Notes */}
          <Text style={styles.modalLabel}>Notes (optional)</Text>
          <View style={[styles.modalInputBox, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
            <TextInput
              style={[styles.modalInput, { flex: 1, height: '100%' }]}
              placeholder="What was this for?"
              placeholderTextColor={PC.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              editable={!loading}
            />
          </View>

          {/* Split type toggle */}
          <Text style={styles.modalLabel}>Split</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <TouchableOpacity
              style={[styles.chip, splitType === 'equal' && styles.chipActive]}
              onPress={() => { setSplitType('equal'); setCustomSplits([]); }}
              disabled={loading}>
              <Ionicons name="people-outline" size={14} color={splitType === 'equal' ? PC.textPrimary : PC.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.chipText, splitType === 'equal' && styles.chipTextActive]}>Equal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, splitType === 'exact' && styles.chipActive]}
              onPress={() => {
                if (!amount || isNaN(parseFloat(amount))) {
                  setError('Enter the amount before customising the split.');
                  return;
                }
                setSplitType('exact');
                setShowCustom(true);
              }}
              disabled={loading}>
              <Ionicons name="options-outline" size={14} color={splitType === 'exact' ? PC.textPrimary : PC.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.chipText, splitType === 'exact' && styles.chipTextActive]}>Custom</Text>
            </TouchableOpacity>
          </View>

          {splitType === 'exact' && customSplits.length > 0 && (
            <TouchableOpacity onPress={() => setShowCustom(true)} style={styles.splitPreviewBox}>
              {customSplits.map(s => {
                const member = members.find(m => m.id === s.userId);
                return (
                  <View key={s.userId} style={styles.splitPreviewRow}>
                    <Text style={styles.splitPreviewName}>{member?.name?.split(' ')[0]}</Text>
                    <Text style={styles.splitPreviewAmt}>₹{s.amount.toFixed(2)}</Text>
                  </View>
                );
              })}
              <Text style={styles.splitPreviewEdit}>Tap to edit</Text>
            </TouchableOpacity>
          )}

          {splitType === 'equal' && (
            <Text style={styles.splitNote}>
              <Ionicons name="information-circle-outline" size={13} color={PC.textMuted} />{' '}
              Amount will be split equally among all {members.length} members
            </Text>
          )}

          <TouchableOpacity
            style={[styles.createBtn, loading && styles.createBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#060A09" size="small" />
              : <Text style={styles.createBtnText}>Add Expense</Text>
            }
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </ScrollView>

        <CustomSplitModal
          visible={showCustom}
          onClose={() => setShowCustom(false)}
          members={members}
          payerId={payerId}
          totalAmount={parseFloat(amount) || 0}
          onConfirm={(splits) => {
            setCustomSplits(splits);
            setShowCustom(false);
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Custom Split Modal ───────────────────────────────────────────────────────

function CustomSplitModal({ visible, onClose, members, payerId, totalAmount, onConfirm }) {
  const [amounts,   setAmounts]   = useState({});
  const [lockedIds, setLockedIds] = useState(new Set());

  useEffect(() => {
    if (!visible) return;
    if (!members.length || !totalAmount) return;
    const base = parseFloat((totalAmount / members.length).toFixed(2));
    const distributed = parseFloat((base * (members.length - 1)).toFixed(2));
    const last = parseFloat((totalAmount - distributed).toFixed(2));
    const init = {};
    members.forEach((m, i) => { init[m.id] = String(i === members.length - 1 ? last : base); });
    setAmounts(init);
    setLockedIds(new Set());
  }, [visible]);

  function handleChange(memberId, rawValue) {
    const newLocked = new Set(lockedIds);
    newLocked.add(memberId);

    const newAmounts = { ...amounts, [memberId]: rawValue };

    let sumLocked = 0;
    for (const id of newLocked) {
      sumLocked += parseFloat(newAmounts[id]) || 0;
    }

    const remaining = totalAmount - sumLocked;
    const unlocked = members.filter(m => !newLocked.has(m.id));

    if (unlocked.length > 0) {
      const base = parseFloat((remaining / unlocked.length).toFixed(2));
      const distributed = parseFloat((base * (unlocked.length - 1)).toFixed(2));
      const last = parseFloat((remaining - distributed).toFixed(2));
      unlocked.forEach((m, i) => { newAmounts[m.id] = String(i === unlocked.length - 1 ? last : base); });
    }

    setAmounts(newAmounts);
    setLockedIds(newLocked);
  }

  function resetEqual() {
    if (!members.length || !totalAmount) return;
    const base = parseFloat((totalAmount / members.length).toFixed(2));
    const distributed = parseFloat((base * (members.length - 1)).toFixed(2));
    const last = parseFloat((totalAmount - distributed).toFixed(2));
    const init = {};
    members.forEach((m, i) => { init[m.id] = String(i === members.length - 1 ? last : base); });
    setAmounts(init);
    setLockedIds(new Set());
  }

  function handleAssignAll(memberId) {
    const newAmounts = {};
    members.forEach(m => { newAmounts[m.id] = m.id === memberId ? String(totalAmount) : '0'; });
    setAmounts(newAmounts);
    setLockedIds(new Set(members.map(m => m.id)));
  }

  const totalEntered = members.reduce((sum, m) => sum + (parseFloat(amounts[m.id]) || 0), 0);
  const leftover = Math.round((totalAmount - totalEntered) * 100) / 100;
  const isValid = Math.abs(leftover) <= 0.02;

  function handleConfirm() {
    if (!isValid) return;
    const splits = members.map(m => ({
      userId: m.id,
      amount: parseFloat(amounts[m.id]) || 0,
    }));
    onConfirm(splits);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <ScrollView style={styles.modalSheet} bounces={false} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Custom Split</Text>
          <Text style={[styles.modalLabel, { marginBottom: 10 }]}>Total: ₹{totalAmount.toFixed(2)}</Text>

          <Text style={[styles.modalLabel, { marginBottom: 8 }]}>Assign all to →</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2 }}>
              {members.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.assignAllChip}
                  onPress={() => handleAssignAll(m.id)}>
                  <Text style={styles.assignAllChipText}>{m.name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {members.map(m => {
            const isPayer = m.id === payerId;
            return (
              <View
                key={m.id}
                style={[
                  styles.customSplitRow,
                  isPayer && { backgroundColor: PC.accent10, borderRadius: 10, padding: 8, marginHorizontal: -8 },
                ]}>
                <View style={styles.customSplitMember}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberInitials}>{initials(m.name)}</Text>
                  </View>
                  <Text style={{ color: PC.textPrimary, fontSize: 14, fontWeight: '600' }}>
                    {m.name.split(' ')[0]}{isPayer ? ' (paid)' : ''}
                  </Text>
                </View>
                <View style={styles.customSplitInput}>
                  <Text style={styles.rupeePrefix}>₹</Text>
                  <TextInput
                    style={[styles.modalInput, { flex: 1 }]}
                    value={amounts[m.id] ?? ''}
                    onChangeText={v => handleChange(m.id, v)}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={PC.textMuted}
                  />
                </View>
              </View>
            );
          })}

          <View style={styles.remainingBar}>
            <Text style={{ color: PC.textSecondary, fontSize: 13 }}>Remaining</Text>
            <Text style={{ color: isValid ? PC.positive : PC.warning, fontSize: 13, fontWeight: '600' }}>
              ₹{leftover.toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity onPress={resetEqual} style={{ alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ color: PC.accent, fontSize: 13 }}>Reset to equal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.createBtn, !isValid && styles.createBtnDisabled]}
            onPress={handleConfirm}
            disabled={!isValid}
            activeOpacity={0.85}>
            <Text style={styles.createBtnText}>Confirm Split</Text>
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────

function AddMemberModal({ visible, onClose, groupId, existingMemberIds, onAdded }) {
  const [friends,     setFriends]     = useState([]);
  const [contacts,    setContacts]    = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [addingId,    setAddingId]    = useState(null);
  const [error,       setError]       = useState('');
  const [tab,         setTab]         = useState('friends'); // 'friends' | 'contacts'

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setError('');
    setLoadingList(true);
    setTab('friends');
    Promise.all([getFriends(), getContacts()])
      .then(([frs, cts]) => {
        if (!cancelled) {
          setFriends((frs || []).filter(f => !existingMemberIds.includes((f._id ?? f.id)?.toString())));
          setContacts((cts || []).filter(c => !existingMemberIds.includes(c._id?.toString())));
        }
      })
      .catch(() => { if (!cancelled) setError('Could not load member options.'); })
      .finally(() => { if (!cancelled) setLoadingList(false); });
    return () => { cancelled = true; };
  }, [visible, existingMemberIds]);

  async function handleAdd(userId, isContact) {
    setAddingId(userId);
    setError('');
    try {
      const { data } = await api.post(`/api/groups/${groupId}/members`, { userId });
      onAdded(data.member);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingId(null);
    }
  }

  function handleClose() {
    if (addingId) return;
    setError('');
    onClose();
  }

  const hasAny = friends.length > 0 || contacts.length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <View style={[styles.modalSheet, { maxHeight: '75%' }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Member</Text>

          <ErrorBox message={error} />

          {/* Tab toggle */}
          {!loadingList && hasAny && (
            <View style={{ flexDirection: 'row', backgroundColor: PC.bgCardElevated, borderRadius: 10, padding: 3, marginBottom: 14 }}>
              {[
                { key: 'friends',  label: 'Friends' },
                { key: 'contacts', label: 'Personal Contacts' },
              ].map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' }, tab === t.key && { backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border }]}
                  onPress={() => setTab(t.key)}>
                  <Text style={{ fontSize: 13, fontWeight: tab === t.key ? '600' : '400', color: tab === t.key ? PC.textPrimary : PC.textMuted }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {loadingList ? (
            <ActivityIndicator color={PC.textMuted} style={{ marginVertical: 24 }} />
          ) : tab === 'friends' && friends.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 28 }}>
              <Ionicons name="people-outline" size={32} color={PC.textMuted} style={{ marginBottom: 10 }} />
              <Text style={[styles.splitNote, { textAlign: 'center' }]}>
                No friends available to add.{'\n'}Add friends first from your Profile.
              </Text>
            </View>
          ) : tab === 'contacts' && contacts.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 28 }}>
              <Ionicons name="person-add-outline" size={32} color={PC.textMuted} style={{ marginBottom: 10 }} />
              <Text style={[styles.splitNote, { textAlign: 'center' }]}>
                No personal contacts yet.{'\n'}Add them from Profile → Personal Contacts.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {(tab === 'friends' ? friends : contacts).map((item, i, arr) => {
                const uid  = (item._id ?? item.id)?.toString();
                const isVirtual = tab === 'contacts';
                return (
                  <View key={uid}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 }}>
                      <View style={[styles.memberAvatar, isVirtual && { borderWidth: 1.5, borderColor: PC.accent20 }]}>
                        <Text style={[styles.memberInitials, isVirtual && { color: PC.accent }]}>
                          {initials(item.name)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: PC.textPrimary, fontSize: 14, fontWeight: '600' }}>{item.name}</Text>
                        {item.username
                          ? <Text style={{ color: PC.textMuted, fontSize: 12 }}>@{item.username}</Text>
                          : isVirtual
                            ? <Text style={{ color: PC.accent, fontSize: 11 }}>Personal Contact</Text>
                            : null
                        }
                      </View>
                      <TouchableOpacity
                        style={[styles.createBtn, { paddingHorizontal: 16, height: 36, borderRadius: 10, width: 'auto' }, addingId === uid && styles.createBtnDisabled]}
                        onPress={() => handleAdd(uid, isVirtual)}
                        disabled={!!addingId}
                        activeOpacity={0.85}>
                        {addingId === uid
                          ? <ActivityIndicator color="#060A09" size="small" />
                          : <Text style={styles.createBtnText}>Add</Text>
                        }
                      </TouchableOpacity>
                    </View>
                    {i < arr.length - 1 && <View style={{ height: 1, backgroundColor: PC.border }} />}
                  </View>
                );
              })}
              <View style={{ height: 16 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Record Settlement Modal ──────────────────────────────────────────────────

function RecordSettlementModal({ visible, onClose, groupId, members, currentUserId, onRecorded }) {
  const [fromId,        setFromId]        = useState(currentUserId ?? '');
  const [toId,          setToId]          = useState('');
  const [amount,        setAmount]        = useState('');
  const [notes,         setNotes]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [paymentMethod, setPaymentMethod] = useState(null); // null | 'upi' | 'outside'
  const [qrData,        setQrData]        = useState(null);
  const [showQr,        setShowQr]        = useState(false);

  // Auto-reset toId if it collides with fromId
  function handleFromChange(id) {
    setFromId(id);
    if (toId === id) setToId('');
  }
  function handleToChange(id) {
    setToId(id);
    if (fromId === id) setFromId('');
  }

  async function handleSubmit() {
    if (!fromId)       { setError('Select who is paying.');    return; }
    if (!toId)         { setError('Select who is receiving.'); return; }
    if (fromId === toId) { setError('Payer and receiver must be different.'); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }

    setLoading(true);
    setError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.post(`/api/groups/${groupId}/settlements`, {
        fromUserId: fromId, toUserId: toId, amount: amt,
        date: today, notes: notes.trim(),
      });

      const receiver = members.find(m => m.id === toId || m.id?.toString() === toId);
      const isUpiQr = paymentMethod === 'upi' && receiver?.upiId && !isNaN(amt) && amt > 0;

      onRecorded(data.settlement);

      if (isUpiQr) {
        setQrData({
          upiId: receiver.upiId, name: receiver.name, amount: amt,
          note: notes.trim() || 'Group settlement',
          txnId: 'PC' + data.settlement._id,
        });
        setShowQr(true);
      } else {
        resetAndClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to record settlement.');
    } finally {
      setLoading(false);
    }
  }

  function resetAndClose() {
    setFromId(currentUserId ?? '');
    setToId('');
    setAmount('');
    setNotes('');
    setError('');
    setPaymentMethod(null);
    setQrData(null);
    setShowQr(false);
    onClose();
  }

  function handleClose() { if (!loading) resetAndClose(); }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <ScrollView style={styles.modalSheet} bounces={false} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Record Settlement</Text>

          <ErrorBox message={error} />

          {/* Who paid */}
          <Text style={styles.modalLabel}>Who paid</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {members.map((m) => {
              const selected = fromId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.payerChip, selected && styles.payerChipActive]}
                  onPress={() => handleFromChange(m.id)}
                  disabled={loading}>
                  <View style={[styles.payerAvatar, selected && styles.payerAvatarActive]}>
                    <Text style={[styles.payerInitials, selected && { color: '#060A09' }]}>
                      {initials(m.name)}
                    </Text>
                  </View>
                  <Text style={[styles.payerName, selected && styles.payerNameActive]}>
                    {m.id === currentUserId ? 'You' : m.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Who received */}
          <Text style={styles.modalLabel}>Paid to</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            {members.filter(m => m.id !== fromId).map((m) => {
              const selected = toId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.payerChip, selected && styles.payerChipActive]}
                  onPress={() => handleToChange(m.id)}
                  disabled={loading}>
                  <View style={[styles.payerAvatar, selected && styles.payerAvatarActive]}>
                    <Text style={[styles.payerInitials, selected && { color: '#060A09' }]}>
                      {initials(m.name)}
                    </Text>
                  </View>
                  <Text style={[styles.payerName, selected && styles.payerNameActive]}>
                    {m.id === currentUserId ? 'You' : m.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Amount */}
          <Text style={styles.modalLabel}>Amount (₹)</Text>
          <View style={styles.modalInputBox}>
            <Text style={styles.rupeePrefix}>₹</Text>
            <TextInput
              style={[styles.modalInput, { flex: 1 }]}
              placeholder="0.00"
              placeholderTextColor={PC.textMuted}
              value={amount}
              onChangeText={(v) => { setAmount(v); setError(''); }}
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>

          {/* Payment method */}
          <Text style={styles.modalLabel}>How was it paid?</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <TouchableOpacity
              style={[styles.payerChip, paymentMethod === 'upi' && styles.payerChipActive, { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingVertical: 10 }]}
              onPress={() => setPaymentMethod('upi')}
              disabled={loading}>
              <Ionicons name="qr-code-outline" size={15} color={paymentMethod === 'upi' ? '#060A09' : PC.textSecondary} />
              <Text style={[styles.payerName, paymentMethod === 'upi' && styles.payerNameActive]}>UPI</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.payerChip, paymentMethod === 'outside' && styles.payerChipActive, { flexDirection: 'row', gap: 6, paddingHorizontal: 14, paddingVertical: 10 }]}
              onPress={() => setPaymentMethod('outside')}
              disabled={loading}>
              <Ionicons name="swap-horizontal-outline" size={15} color={paymentMethod === 'outside' ? '#060A09' : PC.textSecondary} />
              <Text style={[styles.payerName, paymentMethod === 'outside' && styles.payerNameActive]}>Outside App</Text>
            </TouchableOpacity>
          </View>

          {/* UPI QR info — shown when UPI selected */}
          {paymentMethod === 'upi' && toId && (() => {
            const receiver = members.find(m => m.id === toId || m.id?.toString() === toId);
            const amt = parseFloat(amount);
            if (receiver?.upiId && !isNaN(amt) && amt > 0) {
              return (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: PC.textMuted, fontSize: 12 }}>
                    A QR code will appear after recording. Show it to the payer to scan.
                  </Text>
                </View>
              );
            }
            if (!receiver?.upiId) {
              return (
                <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="information-circle-outline" size={14} color={PC.textMuted} />
                  <Text style={{ color: PC.textMuted, fontSize: 12, flex: 1 }}>
                    {receiver?.name?.split(' ')[0] || 'Receiver'} hasn't set a UPI ID yet.
                  </Text>
                </View>
              );
            }
            return null;
          })()}

          {/* Notes */}
          <Text style={styles.modalLabel}>Notes (optional)</Text>
          <View style={[styles.modalInputBox, { height: 72, alignItems: 'flex-start', paddingTop: 12 }]}>
            <TextInput
              style={[styles.modalInput, { flex: 1, height: '100%' }]}
              placeholder="e.g. Paid via UPI"
              placeholderTextColor={PC.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              editable={!loading}
            />
          </View>

          {(() => {
            const canUpiQr = paymentMethod === 'upi'
              && !!members.find(m => m.id === toId || m.id?.toString() === toId)?.upiId
              && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;
            return (
              <TouchableOpacity
                style={[styles.createBtn, loading && styles.createBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}>
                {loading
                  ? <ActivityIndicator color="#060A09" size="small" />
                  : <Text style={styles.createBtnText}>{canUpiQr ? 'Generate QR & Record' : 'Record Settlement'}</Text>
                }
              </TouchableOpacity>
            );
          })()}
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {qrData && (
        <UpiQrModal
          visible={showQr}
          onClose={() => { setShowQr(false); setQrData(null); resetAndClose(); }}
          upiId={qrData.upiId}
          name={qrData.name}
          amount={qrData.amount}
          note={qrData.note}
          txnId={qrData.txnId}
          fromName={members.find(m => m.id === fromId)?.name || 'You'}
        />
      )}
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GroupDetailScreen() {
  const { id }     = useLocalSearchParams();
  const router     = useRouter();
  const { user }   = useAuth();

  const [group,      setGroup]      = useState(null);
  const [members,    setMembers]    = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [balances,   setBalances]   = useState({ members: [], debts: [] });
  const [tab,        setTab]        = useState('expenses');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const [showAddExpense,    setShowAddExpense]    = useState(false);
  const [showAddMember,     setShowAddMember]     = useState(false);
  const [showSettlement,    setShowSettlement]    = useState(false);
  const [expandedExpId,     setExpandedExpId]     = useState(null);

  // ── Split tags (per-user private category) ──────────────────────────────
  const [myTags,    setMyTags]    = useState({}); // { expenseId: category }
  const [editSheet, setEditSheet] = useState(null); // { exp, canEditAmount } | null

  // ── Fetch all group data ──────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [groupRes, expRes, balRes, tagsRes] = await Promise.all([
        api.get(`/api/groups/${id}`),
        api.get(`/api/groups/${id}/expenses`),
        api.get(`/api/groups/${id}/balances`),
        getSplitTags(),
      ]);

      const g = groupRes.data.group;
      setGroup(g);
      setMembers(
        (g.members || []).map(m => ({
          id:        m._id,
          name:      m.name,
          email:     m.email,
          upiId:     m.upiId || '',
          isVirtual: m.isVirtual || false,
          role:      m._id === g.adminId?._id || m._id === g.adminId ? 'Admin' : 'Member',
        }))
      );
      setExpenses(expRes.data.expenses || []);
      setBalances(balRes.data);

      // Build tag map for group expenses
      const groupTagMap = {};
      (tagsRes?.tags || []).filter(t => t.refType === 'group').forEach(t => {
        groupTagMap[t.refId.toString()] = t.category;
      });
      setMyTags(groupTagMap);

      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchAll();
      setLoading(false);
    }
    init();
  }, [fetchAll]);

  // Mark this group as viewed so navbar badge clears
  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('groupLastViewed').then(raw => {
      const map = raw ? JSON.parse(raw) : {};
      map[String(id)] = new Date().toISOString();
      AsyncStorage.setItem('groupLastViewed', JSON.stringify(map));
    }).catch(() => {});
  }, [id]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // Guard: auth still restoring — RootGuard will redirect if truly unauthenticated
  if (!user) return null;

  const isAdmin = group?.adminId?._id === user._id ||
                  group?.adminId?.toString?.() === user._id ||
                  group?.adminId === user._id;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleExpenseAdded(expense) {
    setExpenses(prev => [expense, ...prev]);
  }

  function handleMemberAdded(member) {
    setMembers(prev => [...prev, member]);
    // Refresh balances since member count changed
    api.get(`/api/groups/${id}/balances`).then(r => setBalances(r.data)).catch(() => {});
  }

  function handleSettlementRecorded() {
    // Refresh balances after a settlement
    api.get(`/api/groups/${id}/balances`).then(r => setBalances(r.data)).catch(() => {});
  }

  async function handleEditSave({ amount, category }) {
    const { exp, canEditAmount } = editSheet;
    const tasks = [];
    if (canEditAmount && amount != null) {
      tasks.push(
        api.patch(`/api/groups/${id}/expenses/${exp._id}`, { amount })
          .then(r => setExpenses(prev => prev.map(e => e._id === exp._id ? r.data.expense : e)))
      );
    }
    if (category) {
      tasks.push(
        upsertSplitTag(exp._id, 'group', category)
          .then(() => setMyTags(prev => ({ ...prev, [exp._id]: category })))
      );
    }
    await Promise.all(tasks);
    setEditSheet(null);
  }

  // ── My balance in this group ──────────────────────────────────────────────
  const myBalance = balances.members?.find(m => m.user.id === user._id?.toString());

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={PC.textPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !group) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={36} color={PC.textMuted} />
          <Text style={styles.errorMsg}>{error || 'Group not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchAll().then(() => setLoading(false)); }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.groupTitle} numberOfLines={1}>{group.name}</Text>
        </View>
        {isAdmin ? (
          <TouchableOpacity style={styles.addMemberBtn} onPress={() => setShowAddMember(true)}>
            <Ionicons name="person-add-outline" size={18} color={PC.textPrimary} />
          </TouchableOpacity>
        ) : <View style={{ width: 38 }} />}
      </View>

      {/* ── My balance card ── */}
      {myBalance && (
        <View style={styles.balanceCard}>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>You paid</Text>
            <Text style={styles.balanceStatVal}>₹{myBalance.totalPaid.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Your share</Text>
            <Text style={styles.balanceStatVal}>₹{myBalance.totalOwed.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Net</Text>
            <Text style={[
              styles.balanceStatVal,
              myBalance.netBalance > 0 ? { color: PC.positive } : myBalance.netBalance < 0 ? { color: PC.negative } : {},
            ]}>
              {myBalance.netBalance > 0 ? '+' : ''}₹{myBalance.netBalance.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      )}

      {/* ── Tabs ── */}
      <View style={styles.tabRow}>
        {['expenses', 'balances', 'members'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PC.textPrimary} />}>

        {/* ── Expenses Tab ── */}
        {tab === 'expenses' && (
          expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={28} color={PC.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptyText}>Add the first expense to get started</Text>
            </View>
          ) : (
            expenses.map((exp, idx) => {
              const meId = user._id?.toString();
              const paidByMe = exp.payerId?._id?.toString() === meId || exp.payerId?.id?.toString() === meId;
              const myShare = exp.splits?.find(s =>
                s.userId?._id?.toString() === meId || s.userId?.id?.toString() === meId
              );
              const isExpanded = expandedExpId === exp._id;
              const prevExp = idx > 0 ? expenses[idx - 1] : null;
              const showDate = !prevExp || formatExpDateLabel(exp.date) !== formatExpDateLabel(prevExp.date);
              const payerFirstName = (exp.payerId?.name ?? 'Unknown').split(' ')[0];

              return (
                <View key={exp._id}>
                  {showDate && <ExpDateSeparator label={formatExpDateLabel(exp.date)} />}
                  <View style={[styles.expBubbleRow, paidByMe ? styles.expBubbleRowRight : styles.expBubbleRowLeft]}>
                    {!paidByMe && (
                      <View style={styles.expBubbleAvatar}>
                        <Text style={styles.expBubbleAvatarText}>{initials(payerFirstName)}</Text>
                      </View>
                    )}
                    <View style={{ maxWidth: '78%' }}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setExpandedExpId(isExpanded ? null : exp._id);
                        }}
                        onLongPress={() => setEditSheet({ exp, canEditAmount: paidByMe })}
                        delayLongPress={350}
                        style={[styles.expBubble, paidByMe ? styles.expBubbleMine : styles.expBubbleFriend]}>

                        {/* Paid line */}
                        <View style={styles.expBubbleAmtRow}>
                          <Text style={[styles.expBubblePaidBy, paidByMe ? styles.expTMineSecondary : { color: PC.textSecondary }]}>
                            {paidByMe ? 'You' : payerFirstName} paid
                          </Text>
                          <Text style={[styles.expBubbleAmt, paidByMe ? styles.expTMine : { color: PC.textPrimary }]}>
                            {'  '}₹{exp.amount.toLocaleString('en-IN')}
                          </Text>
                        </View>

                        {/* Notes */}
                        {exp.notes ? (
                          <Text style={[styles.expBubbleDesc, paidByMe ? styles.expTMineSecondary : { color: PC.textSecondary }]}>
                            {exp.notes}
                          </Text>
                        ) : null}

                        {/* Your Share */}
                        {myShare ? (
                          <Text style={[styles.expBubbleShareLine, paidByMe ? styles.expTMineSecondary : { color: PC.textSecondary }]}>
                            {'Your Share : '}
                            <Text style={[styles.expBubbleShareAmt, paidByMe ? styles.expTMine : { color: PC.textPrimary }]}>
                              ₹{myShare.amount.toLocaleString('en-IN')}
                            </Text>
                          </Text>
                        ) : null}

                        {/* Time */}
                        <Text style={[styles.expBubbleTime, paidByMe ? styles.expTMineMuted : { color: PC.textMuted }, { marginTop: 4 }]}>
                          {formatExpTime(exp.date)}
                        </Text>
                      </TouchableOpacity>

                      {/* Expanded receipt-style split breakdown */}
                      {isExpanded && (
                        <View style={[styles.splitCard, paidByMe ? styles.splitCardMine : styles.splitCardFriend]}>

                          {/* Header */}
                          <View style={[styles.splitCardHeader, paidByMe ? styles.splitCardHeaderMine : styles.splitCardHeaderFriend]}>
                            <Ionicons name="receipt-outline" size={10} color={PC.textMuted} />
                            <Text style={styles.splitCardHeaderLabel}>SPLIT BREAKDOWN</Text>
                            <Text style={styles.splitCardHeaderCount}>{exp.splits?.length} people</Text>
                          </View>

                          {/* Member rows */}
                          {exp.splits?.map((s, si) => {
                            const memberId = s.userId?._id?.toString() ?? s.userId?.toString();
                            const memberName = members.find(m => m.id === memberId)?.name ?? s.userId?.name ?? 'Unknown';
                            const isMe = memberId === meId;
                            const isPayer = exp.payerId?._id?.toString() === memberId || exp.payerId?.toString() === memberId;
                            return (
                              <React.Fragment key={memberId ?? si}>
                                {si > 0 && <View style={[styles.splitRowDivider, paidByMe ? styles.splitRowDividerMine : styles.splitRowDividerFriend]} />}
                                <View style={styles.splitRow}>
                                  {isPayer && <View style={styles.splitPayerBar} />}
                                  <View style={[styles.splitAvatar, isPayer ? styles.splitAvatarPayer : isMe ? styles.splitAvatarMe : {}]}>
                                    <Text style={[styles.splitAvatarText, isPayer && { color: '#060A09' }]}>
                                      {initials(memberName)}
                                    </Text>
                                  </View>
                                  <Text style={[styles.splitName, isPayer ? styles.splitNamePayer : isMe ? styles.splitNameMe : {}]}>
                                    {isMe ? 'You' : memberName.split(' ')[0]}
                                  </Text>
                                  {isPayer && (
                                    <View style={styles.splitPaidBadge}>
                                      <Text style={styles.splitPaidBadgeText}>PAID</Text>
                                    </View>
                                  )}
                                  <View style={styles.splitLeader}>
                                    {[...Array(10)].map((_, di) => <View key={di} style={styles.splitLeaderDot} />)}
                                  </View>
                                  <Text style={[styles.splitAmt, isPayer ? styles.splitAmtPayer : isMe ? styles.splitAmtMe : styles.splitAmtOwer]}>
                                    {isPayer ? '+' : '−'}₹{s.amount.toFixed(2)}
                                  </Text>
                                </View>
                              </React.Fragment>
                            );
                          })}

                          {/* Total footer */}
                          <View style={[styles.splitTotalRow, paidByMe ? styles.splitTotalRowMine : styles.splitTotalRowFriend]}>
                            <Text style={styles.splitTotalLabel}>TOTAL</Text>
                            <View style={styles.splitLeader}>
                              {[...Array(10)].map((_, di) => <View key={di} style={styles.splitLeaderDot} />)}
                            </View>
                            <Text style={[styles.splitTotalAmt, paidByMe ? { color: PC.positive } : { color: PC.textPrimary }]}>
                              ₹{exp.amount.toLocaleString('en-IN')}
                            </Text>
                          </View>

                          {/* Private category tag — always shown for current user */}
                          <TouchableOpacity
                            style={styles.tagChipRow}
                            onPress={() => setEditSheet({ exp, canEditAmount: false })}
                            activeOpacity={0.7}>
                            {myTags[exp._id] ? (
                              <View style={styles.tagChip}>
                                <Ionicons name={CAT_ICON_MAP[myTags[exp._id]] || 'pricetag-outline'} size={11} color={PC.accent} style={{ marginRight: 4 }} />
                                <Text style={styles.tagChipText}>{myTags[exp._id]}</Text>
                              </View>
                            ) : (
                              <View style={styles.tagChipAdd}>
                                <Ionicons name="pricetag-outline" size={11} color={PC.textSecondary} style={{ marginRight: 4 }} />
                                <Text style={styles.tagChipEmpty}>Tag</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )
        )}

        {/* ── Balances Tab ── */}
        {tab === 'balances' && (
          <>
            <TouchableOpacity
              style={styles.settleBtn}
              onPress={() => setShowSettlement(true)}
              activeOpacity={0.85}>
              <Ionicons name="checkmark-done-outline" size={17} color={PC.accent} style={{ marginRight: 7 }} />
              <Text style={styles.settleBtnText}>Record Settlement</Text>
            </TouchableOpacity>

            {balances.debts?.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Simplified Debts</Text>
                {balances.debts.map((d, i) => {
                  const fromMe = d.from.id === user._id?.toString();
                  const toMe   = d.to.id   === user._id?.toString();
                  return (
                    <View key={i} style={styles.debtCard}>
                      <View style={styles.debtAvatarGroup}>
                        <View style={[styles.memberAvatar, styles.memberAvatarSm]}>
                          <Text style={styles.memberInitials}>{initials(d.from.name)}</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={14} color={PC.textMuted} style={{ marginHorizontal: 6 }} />
                        <View style={[styles.memberAvatar, styles.memberAvatarSm]}>
                          <Text style={styles.memberInitials}>{initials(d.to.name)}</Text>
                        </View>
                      </View>
                      <View style={styles.debtInfo}>
                        <Text style={styles.debtLabel}>
                          <Text style={{ color: fromMe ? PC.negative : PC.textPrimary }}>
                            {fromMe ? 'You' : d.from.name}
                          </Text>
                          <Text style={{ color: PC.textSecondary }}> owes </Text>
                          <Text style={{ color: toMe ? PC.positive : PC.textPrimary }}>
                            {toMe ? 'You' : d.to.name}
                          </Text>
                        </Text>
                      </View>
                      <Text style={[styles.debtAmount, fromMe ? { color: PC.negative } : toMe ? { color: PC.positive } : {}]}>
                        ₹{d.amount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="checkmark-circle-outline" size={28} color={PC.positive} />
                </View>
                <Text style={styles.emptyTitle}>All settled up!</Text>
                <Text style={styles.emptyText}>No outstanding balances in this group</Text>
              </View>
            )}

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Member Balances</Text>
            {balances.members?.map((m) => (
              <View key={m.user.id} style={styles.memberBalCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitials}>{initials(m.user.name)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.memberName}>
                    {m.user.id === user._id?.toString() ? 'You' : m.user.name}
                  </Text>
                  <Text style={styles.memberEmail}>{m.user.email}</Text>
                </View>
                <Text style={[
                  styles.memberNetBal,
                  m.netBalance > 0 ? { color: PC.positive } : m.netBalance < 0 ? { color: PC.negative } : { color: PC.textMuted },
                ]}>
                  {m.netBalance > 0 ? '+' : ''}₹{m.netBalance.toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* ── Members Tab ── */}
        {tab === 'members' && (
          members.map((m) => (
            <View key={m.id} style={styles.memberBalCard}>
              <View style={[styles.memberAvatar, m.isVirtual && { borderWidth: 1.5, borderColor: PC.accent20 }]}>
                <Text style={[styles.memberInitials, m.isVirtual && { color: PC.accent }]}>{initials(m.name)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.memberName}>
                  {m.id === user._id ? `You (${m.name})` : m.name}
                </Text>
                {m.isVirtual
                  ? <Text style={{ color: PC.accent, fontSize: 11 }}>Personal Contact</Text>
                  : <Text style={styles.memberEmail}>{m.email}</Text>
                }
              </View>
              <View style={[styles.roleBadge, m.role === 'Admin' && styles.roleBadgeAdmin]}>
                <Text style={[styles.roleText, m.role === 'Admin' && styles.roleTextAdmin]}>
                  {m.role}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Add Expense FAB ── */}
      {tab === 'expenses' && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddExpense(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={24} color="#060A09" />
          <Text style={styles.fabText}>Add Expense</Text>
        </TouchableOpacity>
      )}

      <AddExpenseModal
        visible={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        group={group}
        members={members}
        onAdded={handleExpenseAdded}
      />
      <AddMemberModal
        visible={showAddMember}
        onClose={() => setShowAddMember(false)}
        groupId={id}
        existingMemberIds={members.map(m => m.id)}
        onAdded={handleMemberAdded}
      />
      <RecordSettlementModal
        visible={showSettlement}
        onClose={() => setShowSettlement(false)}
        groupId={id}
        members={members}
        currentUserId={user._id}
        onRecorded={handleSettlementRecorded}
      />

      <EditSplitSheet
        visible={editSheet !== null}
        onClose={() => setEditSheet(null)}
        canEditAmount={editSheet?.canEditAmount ?? false}
        initialAmount={editSheet?.exp?.amount}
        initialCategory={editSheet ? (myTags[editSheet.exp._id] || '') : ''}
        onSave={handleEditSave}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PC.bg },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PC.bgCard,
    borderWidth: 1,
    borderColor: PC.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupTitle:   { color: PC.textPrimary, fontSize: 18, fontWeight: '700', flexShrink: 1 },
  typePill:     { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: PC.bgCard, borderRadius: 8, borderWidth: 1, borderColor: PC.border },
  typePillText: { color: PC.textSecondary, fontSize: 11, fontWeight: '500' },
  addMemberBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center' },

  // Balance summary card
  balanceCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    paddingVertical: 14,
    marginBottom: 16,
  },
  balanceStat:      { flex: 1, alignItems: 'center' },
  balanceStatLabel: { color: PC.textSecondary, fontSize: 11, marginBottom: 4 },
  balanceStatVal:   { color: PC.textPrimary, fontSize: 16, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  balanceDivider:   { width: 1, backgroundColor: PC.border },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: PC.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn:        { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  tabActive:     { backgroundColor: PC.accent10 },
  tabText:       { color: PC.textMuted, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: PC.accent, fontWeight: '600' },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  errorMsg:  { color: PC.textSecondary, fontSize: 14, marginTop: 12, textAlign: 'center' },
  retryBtn:  { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PC.bgCard, borderRadius: 10, borderWidth: 1, borderColor: PC.border },
  retryText: { color: PC.textPrimary, fontSize: 14, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: 48 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { color: PC.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptyText:  { color: PC.textMuted, fontSize: 13 },

  sectionLabel: { color: PC.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PC.accent10,
    borderWidth: 1,
    borderColor: PC.accent,
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 20,
  },
  settleBtnText: { color: PC.accent, fontSize: 14, fontWeight: '700' },

  // Expense card
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 14,
    marginBottom: 10,
  },
  expCatIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: PC.bgCardElevated, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  expInfo:    { flex: 1 },
  expTitle:   { color: PC.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  expMeta:    { color: PC.textMuted, fontSize: 12 },
  expAmounts: { alignItems: 'flex-end' },
  expTotal:   { color: PC.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  expShare:   { fontSize: 11 },

  // Debt card
  debtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  debtAvatarGroup: { flexDirection: 'row', alignItems: 'center' },
  debtInfo:        { flex: 1 },
  debtLabel:       { fontSize: 13 },
  debtAmount:      { color: PC.textPrimary, fontSize: 15, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },

  // Member balance card
  memberBalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PC.border,
    padding: 14,
    marginBottom: 10,
  },
  memberAvatar:    { width: 40, height: 40, borderRadius: 12, backgroundColor: PC.bgCardElevated, alignItems: 'center', justifyContent: 'center' },
  memberAvatarSm:  { width: 30, height: 30, borderRadius: 9 },
  memberInitials:  { color: PC.textPrimary, fontSize: 13, fontWeight: '700' },
  memberName:      { color: PC.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  memberEmail:     { color: PC.textMuted, fontSize: 12 },
  memberNetBal:    { fontSize: 15, fontWeight: '700' },

  roleBadge:      { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: PC.bgCardElevated, borderRadius: 8, borderWidth: 1, borderColor: PC.border },
  roleBadgeAdmin: { borderColor: PC.accent, backgroundColor: PC.accent10 },
  roleText:       { color: PC.textMuted, fontSize: 11, fontWeight: '500' },
  roleTextAdmin:  { color: PC.accent },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.accent,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 6,
    elevation: 6,
    shadowColor: PC.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabText: { color: '#060A09', fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHandle:  { width: 36, height: 4, backgroundColor: PC.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle:   { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 20 },
  modalLabel:   { color: PC.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 8 },
  modalInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PC.bgInput,
    borderWidth: 1,
    borderColor: PC.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 20,
  },
  modalInput:   { color: PC.textPrimary, fontSize: 15 },
  rupeePrefix:  { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginRight: 8 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: PC.border, backgroundColor: PC.bgCardElevated },
  chipActive:     { borderColor: PC.accent, backgroundColor: PC.accent10 },
  chipText:       { color: PC.textMuted, fontSize: 13 },
  chipTextActive: { color: PC.accent },

  payerChip:        { alignItems: 'center', marginRight: 14 },
  payerChipActive:  {},
  payerAvatar:      { width: 44, height: 44, borderRadius: 14, backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  payerAvatarActive: { backgroundColor: PC.accent, borderColor: PC.accent },
  payerInitials:    { color: PC.textPrimary, fontSize: 14, fontWeight: '700' },
  payerName:        { color: PC.textMuted, fontSize: 12 },
  payerNameActive:  { color: PC.textPrimary, fontWeight: '600' },

  splitNote: { color: PC.textMuted, fontSize: 12, marginBottom: 24, lineHeight: 18 },

  createBtn:         { backgroundColor: PC.accent, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText:     { color: '#060A09', fontSize: 15, fontWeight: '700' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(224,90,90,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(224,90,90,0.30)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: { flex: 1, color: PC.negative, fontSize: 13 },

  expenseCardExpanded: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 },
  expSplitList: {
    backgroundColor: PC.bgCard,
    borderRadius: 14,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: PC.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  expSplitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: PC.border,
  },
  expSplitHeaderText: { color: PC.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  expSplitRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  expSplitRowPayer:   { backgroundColor: PC.accent10, borderLeftWidth: 3, borderLeftColor: PC.accent },
  expSplitDivider:    { height: 1, backgroundColor: PC.border },
  expSplitName: { flex: 1, color: PC.textSecondary, fontSize: 13 },
  expSplitAmt:  { fontSize: 13, fontWeight: '700' },
  payerTag:     { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: PC.accent, borderRadius: 6 },
  payerTagText: { color: '#060A09', fontSize: 10, fontWeight: '700' },

  splitPreviewBox:   { borderWidth: 1, borderColor: PC.borderLight, borderRadius: 10, padding: 12, marginBottom: 16 },
  splitPreviewRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  splitPreviewName:  { color: PC.textSecondary, fontSize: 13 },
  splitPreviewAmt:   { color: PC.textPrimary, fontSize: 13, fontWeight: '600' },
  splitPreviewEdit:  { color: PC.accent, fontSize: 11, textAlign: 'right', marginTop: 6 },
  customSplitRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  customSplitMember: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  customSplitInput:  { flexDirection: 'row', alignItems: 'center', backgroundColor: PC.bgInput, borderWidth: 1, borderColor: PC.border, borderRadius: 12, paddingHorizontal: 10, height: 44, width: 110 },
  assignAllChip:     { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border, borderRadius: 20 },
  assignAllChipText: { color: PC.textPrimary, fontSize: 13, fontWeight: '600' },
  remainingBar:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: PC.border },

  // ── Expense chat-bubble styles ──────────────────────────────────────────────
  expDateSep:     { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 10 },
  expDateSepLine: { flex: 1, height: 1, backgroundColor: PC.border },
  expDateSepText: { color: PC.textMuted, fontSize: 11, fontWeight: '500' },

  expBubbleRow:      { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-end' },
  expBubbleRowRight: { justifyContent: 'flex-end' },
  expBubbleRowLeft:  { justifyContent: 'flex-start', gap: 8 },

  expBubbleAvatar: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  expBubbleAvatarText: { color: PC.textPrimary, fontSize: 10, fontWeight: '700' },

  expBubble: {
    maxWidth: '100%', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1,
  },
  expBubbleMine:   { backgroundColor: PC.accent, borderColor: PC.accent, borderBottomRightRadius: 4 },
  expBubbleFriend: { backgroundColor: PC.bgCard,  borderColor: PC.border, borderBottomLeftRadius: 4 },

  // Content inside expense bubble — mirrors direct screen Bubble structure exactly
  expBubbleAmtRow:   { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  expBubblePaidBy:   { fontSize: 12 },
  expBubbleAmt:      { fontSize: 17, fontWeight: '700' },
  expBubbleDesc:     { fontSize: 13, marginTop: 3 },
  expBubbleShareLine:{ fontSize: 11, marginTop: 6 },
  expBubbleShareAmt: { fontSize: 11, fontWeight: '700' },
  expBubbleTime:     { fontSize: 10 },

  // dark text on mint bubble
  expTMine:          { color: '#060A09' },
  expTMineSecondary: { color: 'rgba(6,10,9,0.65)' },
  expTMineMuted:     { color: 'rgba(6,10,9,0.45)' },

  expBubbleSplits: {
    borderRadius: 14, borderTopLeftRadius: 0, borderTopRightRadius: 0,
    borderWidth: 1, borderTopWidth: 0, overflow: 'hidden', marginBottom: 10,
  },
  expBubbleSplitsMine:   { backgroundColor: 'rgba(0,229,190,0.08)', borderColor: PC.accent },
  expBubbleSplitsFriend: { backgroundColor: PC.bgCard, borderColor: PC.border },

  // ── Receipt-style split card ─────────────────────────────────────────────────
  splitCard: {
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
    overflow: 'hidden', marginBottom: 10,
    borderWidth: 1, borderTopWidth: 0,
  },
  splitCardFriend: { backgroundColor: '#0A110E', borderColor: PC.border },
  splitCardMine:   { backgroundColor: 'rgba(0,229,190,0.04)', borderColor: 'rgba(0,229,190,0.28)' },

  splitCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1,
  },
  splitCardHeaderFriend: { borderBottomColor: PC.border },
  splitCardHeaderMine:   { borderBottomColor: 'rgba(0,229,190,0.16)' },
  splitCardHeaderLabel:  { flex: 1, color: PC.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
  splitCardHeaderCount:  { color: PC.textMuted, fontSize: 9, fontWeight: '500' },

  splitRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 9,
    position: 'relative',
  },
  splitRowDivider:       { height: 1, marginLeft: 52 },
  splitRowDividerFriend: { backgroundColor: PC.border },
  splitRowDividerMine:   { backgroundColor: 'rgba(0,229,190,0.10)' },

  splitPayerBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: PC.accent,
  },

  splitAvatar: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  splitAvatarPayer: { backgroundColor: PC.accent, borderColor: PC.accent },
  splitAvatarMe:    { borderColor: PC.borderLight, backgroundColor: 'rgba(239,249,246,0.08)' },
  splitAvatarText:  { color: PC.textPrimary, fontSize: 10, fontWeight: '700' },

  splitName:      { color: PC.textSecondary, fontSize: 13, fontWeight: '500' },
  splitNamePayer: { color: PC.accent, fontWeight: '700' },
  splitNameMe:    { color: PC.textPrimary, fontWeight: '600' },

  splitPaidBadge: {
    marginLeft: 7,
    paddingHorizontal: 5, paddingVertical: 2,
    backgroundColor: 'rgba(0,229,190,0.12)',
    borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,229,190,0.30)',
  },
  splitPaidBadgeText: { color: PC.accent, fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },

  splitLeader: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 3,
    paddingHorizontal: 8, overflow: 'hidden',
  },
  splitLeaderDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: PC.border },

  splitAmt: {
    fontSize: 12, fontWeight: '700', minWidth: 66, textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  splitAmtPayer: { color: PC.positive },
  splitAmtMe:    { color: PC.negative },
  splitAmtOwer:  { color: PC.textSecondary },

  splitTotalRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 9,
    borderTopWidth: 1,
  },
  splitTotalRowFriend: { borderTopColor: PC.borderLight },
  splitTotalRowMine:   { borderTopColor: 'rgba(0,229,190,0.16)' },
  splitTotalLabel:     { color: PC.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1.4 },
  splitTotalAmt: {
    fontSize: 13, fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },

  // Tag chip
  tagChipRow:   { paddingHorizontal: 12, paddingVertical: 8 },
  tagChip:      { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(0,229,190,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(0,229,190,0.30)' },
  tagChipText:  { color: PC.accent, fontSize: 11, fontWeight: '600' },
  tagChipAdd:   { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: PC.bgCardElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: PC.borderLight },
  tagChipEmpty: { color: PC.textSecondary, fontSize: 11 },
});
