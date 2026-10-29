import React, { useState, useEffect } from 'react';
import {
  Pressable,
  View, Modal, StyleSheet,
  KeyboardAvoidingView, ScrollView, ActivityIndicator,
} from 'react-native';
import { Text, TextInput } from '@/components/text';
import Touchable from '@/components/Touchable';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PC } from '@/constants/theme';

const CATEGORIES = [
  { label: 'Food',      icon: 'restaurant-outline' },
  { label: 'Travel',    icon: 'airplane-outline'   },
  { label: 'Rent',      icon: 'home-outline'       },
  { label: 'Utilities', icon: 'flash-outline'      },
  { label: 'Groceries', icon: 'cart-outline'       },
  { label: 'Fun',       icon: 'happy-outline'      },
  { label: 'Health',    icon: 'medkit-outline'     },
  { label: 'Misc',      icon: 'cube-outline'       },
];

export const CAT_ICON_MAP = Object.fromEntries(CATEGORIES.map(c => [c.label, c.icon]));

export default function EditSplitSheet({
  visible,
  onClose,
  onSave,
  onDelete,
  canEditAmount,
  canDelete,
  initialAmount,
  initialCategory,
}) {
  const insets = useSafeAreaInsets();
  const [amount,   setAmount]   = useState('');
  const [selected, setSelected] = useState('');
  const [custom,   setCustom]   = useState('');
  const [saving,   setSaving]   = useState(false);
  // Null, or the confirmation asking whether to remove the expense.
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAmount(initialAmount != null ? String(initialAmount) : '');
    setSaving(false);
    setConfirming(false);
    const isPredefined = CATEGORIES.some(c => c.label === initialCategory);
    if (isPredefined) {
      setSelected(initialCategory || '');
      setCustom('');
    } else {
      setSelected('');
      setCustom(initialCategory || '');
    }
  }, [visible]);

  const finalCategory = selected || custom.trim();

  async function handleDelete() {
    if (saving) return;
    setSaving(true);
    try {
      await onDelete();
    } finally {
      // The screen closes the sheet on success; on failure it shows the error
      // and leaves it open, so the button has to come back either way.
      setSaving(false);
      setConfirming(false);
    }
  }

  async function handleSave() {
    if (saving) return;
    const data = {};
    if (canEditAmount) {
      const amt = parseFloat(amount);
      if (!isNaN(amt) && amt > 0) data.amount = amt;
    }
    if (finalCategory) data.category = finalCategory;
    if (!data.amount && !data.category) { onClose(); return; }
    setSaving(true);
    try {
      await onSave(data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal statusBarTranslucent visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={sh.overlay}
        behavior="padding">
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <ScrollView
          style={sh.sheet}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
          bounces={false}
          keyboardShouldPersistTaps="handled">
          <View style={sh.handle} />
          <Text style={sh.title}>Edit Split</Text>

          {canEditAmount && (
            <>
              <Text style={sh.fieldLabel}>Amount (₹)</Text>
              <View style={sh.amtBox}>
                <Text style={sh.rupee}>₹</Text>
                <TextInput
                  style={sh.amtInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={PC.textMuted}
                />
              </View>
            </>
          )}

          <View style={sh.catHeaderRow}>
            <Ionicons name="lock-closed-outline" size={11} color={PC.textMuted} />
            <Text style={sh.catLabel}>Your Category</Text>
            <Text style={sh.catPrivate}>· Only you see this</Text>
          </View>

          <View style={sh.chipsWrap}>
            {CATEGORIES.map(c => {
              const active = selected === c.label;
              return (
                <Touchable
                  key={c.label}
                  style={[sh.chip, active && sh.chipActive]}
                  onPress={() => { setSelected(active ? '' : c.label); setCustom(''); }}>
                  <Ionicons
                    name={c.icon}
                    size={12}
                    color={active ? '#060A09' : PC.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[sh.chipText, active && sh.chipTextActive]}>{c.label}</Text>
                </Touchable>
              );
            })}
          </View>

          <View style={sh.customBox}>
            <Ionicons name="pencil-outline" size={13} color={PC.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={sh.customInput}
              placeholder="Custom label…"
              placeholderTextColor={PC.textMuted}
              value={custom}
              onChangeText={v => { setCustom(v); if (v) setSelected(''); }}
              maxLength={50}
            />
          </View>

          <Touchable tone="accent"
            style={[sh.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#060A09" />
              : <Text style={sh.saveBtnText}>Save Changes</Text>}
          </Touchable>

          {/* Removing an expense is the only way out of a charge somebody else
              recorded against you, so it is offered here rather than buried —
              but behind a second tap, since it changes what everyone owes. */}
          {canDelete && (
            confirming ? (
              <View style={sh.confirmBox}>
                <Text style={sh.confirmText}>
                  Remove this expense? Everyone{'’'}s balance in this group changes.
                </Text>
                <View style={sh.confirmRow}>
                  <Touchable
                    style={[sh.confirmBtn, sh.confirmCancel]}
                    onPress={() => setConfirming(false)}
                    disabled={saving}>
                    <Text style={sh.confirmCancelText}>Keep it</Text>
                  </Touchable>
                  <Touchable tone="danger"
                    style={[sh.confirmBtn, sh.confirmGo, saving && { opacity: 0.6 }]}
                    onPress={handleDelete}
                    disabled={saving}>
                    {saving
                      ? <ActivityIndicator size="small" color={PC.negative} />
                      : <Text style={sh.confirmGoText}>Remove</Text>}
                  </Touchable>
                </View>
              </View>
            ) : (
              <Touchable tone="danger"
                style={sh.deleteBtn}
                onPress={() => setConfirming(true)}
                disabled={saving}>
                <Ionicons name="trash-outline" size={14} color={PC.negative} />
                <Text style={sh.deleteBtnText}>Remove expense</Text>
              </Touchable>
            )
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sh = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: PC.border,
    paddingTop: 0, // padding lives on contentContainerStyle
    // Needs an explicit cap, otherwise it splits the screen with the flex:1
    // backdrop and sits at ~75% height. Do NOT add flexGrow:0 — ScrollView keeps
    // flexShrink:1, so it would shrink for the keyboard and never grow back.
    maxHeight: '85%',
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, marginTop: 10, minHeight: 46, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,80,85,0.28)',
  },
  deleteBtnText: { color: PC.negative, fontSize: 13, fontWeight: '600' },
  confirmBox: {
    marginTop: 10, padding: 14, borderRadius: 12,
    backgroundColor: 'rgba(255,80,85,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,80,85,0.28)',
  },
  confirmText: { color: PC.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  confirmRow:  { flexDirection: 'row', gap: 10 },
  confirmBtn:  { flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  confirmCancel:   { backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border },
  confirmCancelText: { color: PC.textSecondary, fontSize: 13, fontWeight: '600' },
  confirmGo:       { borderWidth: 1, borderColor: 'rgba(255,80,85,0.45)' },
  confirmGoText:   { color: PC.negative, fontSize: 13, fontWeight: '700' },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: PC.border, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  title:      { color: PC.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 20 },
  fieldLabel: { color: PC.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  amtBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PC.bgInput, borderRadius: 12,
    borderWidth: 1, borderColor: PC.border,
    paddingHorizontal: 14, marginBottom: 20,
  },
  rupee:    { color: PC.textSecondary, fontSize: 16, marginRight: 4 },
  amtInput: { flex: 1, color: PC.textPrimary, fontSize: 18, fontWeight: '600', paddingVertical: 12 },
  catHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  catLabel:     { color: PC.textSecondary, fontSize: 12, fontWeight: '600' },
  catPrivate:   { color: PC.textMuted, fontSize: 11 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    backgroundColor: PC.bgCardElevated, borderColor: PC.border,
  },
  chipActive:     { backgroundColor: PC.accent, borderColor: PC.accent },
  chipText:       { color: PC.textSecondary, fontSize: 12, fontWeight: '500' },
  chipTextActive: { color: '#060A09', fontWeight: '700' },
  customBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PC.bgInput, borderRadius: 12,
    borderWidth: 1, borderColor: PC.border,
    paddingHorizontal: 14, marginBottom: 20,
  },
  customInput: { flex: 1, color: PC.textPrimary, fontSize: 14, paddingVertical: 10 },
  saveBtn:     { backgroundColor: PC.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#060A09', fontSize: 15, fontWeight: '700' },
});
