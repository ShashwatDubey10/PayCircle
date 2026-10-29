import React, { useState, useEffect } from 'react';
import {
  View,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, TextInput } from '@/components/text';
import Touchable from '@/components/Touchable';
import { Ionicons } from '@expo/vector-icons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PC, touchSlop } from '@/constants/theme';
import api from '@/services/api';
import ErrorBox from '@/components/ErrorBox';

function getCatIcon(name = '') {
  const n = name.toLowerCase();
  if (n.includes('food') || n.includes('eat') || n.includes('restaurant') || n.includes('dining') || n.includes('groceries') || n.includes('grocery') || n.includes('mess')) return 'fast-food-outline';
  if (n.includes('travel') || n.includes('transport') || n.includes('commute') || n.includes('flight') || n.includes('fuel') || n.includes('petrol') || n.includes('cab') || n.includes('bus') || n.includes('train')) return 'airplane-outline';
  if (n.includes('util') || n.includes('electric') || n.includes('water') || n.includes('internet') || n.includes('wifi') || n.includes('phone') || n.includes('bill') || n.includes('recharge')) return 'flash-outline';
  if (n.includes('entertain') || n.includes('movie') || n.includes('game') || n.includes('netflix') || n.includes('music') || n.includes('subscription') || n.includes('ott')) return 'film-outline';
  if (n.includes('health') || n.includes('medical') || n.includes('medicine') || n.includes('gym') || n.includes('fitness') || n.includes('doctor') || n.includes('pharmacy') || n.includes('hospital')) return 'fitness-outline';
  if (n.includes('shop') || n.includes('cloth') || n.includes('fashion') || n.includes('amazon') || n.includes('flipkart') || n.includes('purchase') || n.includes('buy')) return 'bag-outline';
  if (n.includes('rent') || n.includes('house') || n.includes('home') || n.includes('pg') || n.includes('accommodation') || n.includes('hostel')) return 'home-outline';
  if (n.includes('edu') || n.includes('study') || n.includes('course') || n.includes('book') || n.includes('tuition') || n.includes('college') || n.includes('fee')) return 'book-outline';
  return 'grid-outline';
}

// Props:
//   visible      — boolean
//   onClose      — () => void
//   onSaved      — () => void  (called after successful save)
//   budgetData   — { budget: number, categories: [{ category, limit?, amount? }] }
//                  (also accepts currentBudget/currentCategories for backwards compat)
export default function BudgetSetupSheet({ visible, onClose, onSaved, budgetData, currentBudget, currentCategories }) {
  const insets = useSafeAreaInsets();
  const [overallInput, setOverallInput] = useState('');
  const [catRows,      setCatRows]      = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  const initialBudget = budgetData?.budget ?? currentBudget ?? 0;
  const initialCats   = budgetData?.categories ?? currentCategories ?? [];

  const currentMonth = (() => {
    const now = new Date();
    const names = ['January','February','March','April','May','June',
                   'July','August','September','October','November','December'];
    return `${names[now.getMonth()]} ${now.getFullYear()}`;
  })();

  useEffect(() => {
    if (!visible) return;
    setOverallInput(initialBudget > 0 ? String(initialBudget) : '');
    setCatRows(initialCats.map(c => ({
      category: c.category,
      // support both 'limit' (from getBudget response) and 'amount' (raw budget model)
      amount:   (c.limit ?? c.amount ?? 0) > 0 ? String(c.limit ?? c.amount) : '',
      id:       Math.random().toString(36).slice(2),
    })));
  }, [visible]);

  function addRow() {
    setCatRows(prev => [...prev, { category: '', amount: '', id: Math.random().toString(36).slice(2) }]);
  }

  function removeRow(id) {
    setCatRows(prev => prev.filter(r => r.id !== id));
  }

  function updateRow(id, field, value) {
    setCatRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  async function handleSave() {
    setError('');
    const overallAmt = parseFloat(overallInput);
    const hasOverall = overallInput.trim().length > 0;

    if (hasOverall && (isNaN(overallAmt) || overallAmt < 1)) {
      setError('Overall budget must be at least ₹1.');
      return;
    }
    for (const row of catRows) {
      const trimmed = row.category.trim();
      if (!trimmed) { setError('Each category must have a name.'); return; }
      const amtStr = row.amount.trim();
      if (amtStr !== '') {
        const amt = parseFloat(amtStr);
        if (isNaN(amt) || amt < 1) {
          setError(`"${trimmed}" limit must be at least ₹1 (or leave empty for no limit).`);
          return;
        }
      }
    }
    const names = catRows.map(r => r.category.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      setError('Category names must be unique.');
      return;
    }
    if (hasOverall) {
      const catTotal = parseFloat(catRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0).toFixed(2));
      if (catTotal > overallAmt) {
        setError(`Category totals (₹${catTotal.toFixed(2)}) cannot exceed your monthly budget of ₹${overallAmt.toFixed(2)}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const calls = [];
      if (hasOverall) calls.push(api.post('/api/users/me/budget', { amount: overallAmt }));
      const mapped = catRows.map(r => ({
        category: r.category.trim(),
        amount:   r.amount.trim() !== '' ? parseFloat(r.amount) : 0,
      }));
      calls.push(api.post('/api/users/me/budget/categories', { categories: mapped }));
      await Promise.all(calls);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save budget. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal statusBarTranslucent visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.sheetOverlay}
        behavior="padding">
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[s.setupSheet, { paddingBottom: insets.bottom + 32 }]}>
          <View style={s.sheetHandle} />

          {/* Header */}
          <View style={s.setupSheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.setupSheetTitle}>Set Monthly Budget</Text>
              <Text style={s.setupSheetMonth}>{currentMonth}</Text>
            </View>
            <Touchable
              style={s.setupSheetClose}
              onPress={onClose}
              disabled={saving}
              hitSlop={touchSlop(34)}
              accessibilityRole="button"
              accessibilityLabel="Close budget setup">
              <Ionicons name="close" size={20} color={PC.textPrimary} />
            </Touchable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <ErrorBox message={error} />
            {/* Overall limit */}
            <Text style={s.setupSectionLabel}>Overall Limit</Text>
            <View style={s.modalInputRow}>
              <Text style={s.rupee}>₹</Text>
              <TextInput
                style={s.modalInput}
                placeholder="e.g. 10000"
                placeholderTextColor={PC.textMuted}
                value={overallInput}
                onChangeText={setOverallInput}
                keyboardType="numeric"
                editable={!saving}
              />
            </View>

            {/* Category limits */}
            <Text style={[s.setupSectionLabel, { marginTop: 20 }]}>Category Limits</Text>
            <View style={s.setupCatList}>
              {catRows.map(row => (
                <View key={row.id} style={s.setupCatRow}>
                  <View style={s.setupCatIconBox}>
                    <Ionicons name={getCatIcon(row.category)} size={17} color={PC.textSecondary} />
                  </View>
                  <TextInput
                    style={s.setupCatNameInput}
                    placeholder="Category name"
                    placeholderTextColor={PC.textMuted}
                    value={row.category}
                    onChangeText={v => updateRow(row.id, 'category', v)}
                    editable={!saving}
                    maxLength={50}
                  />
                  <Text style={s.setupCatRupee}>₹</Text>
                  <TextInput
                    style={s.setupCatAmtInput}
                    placeholder="No limit"
                    placeholderTextColor={PC.textMuted}
                    value={row.amount}
                    onChangeText={v => updateRow(row.id, 'amount', v)}
                    keyboardType="numeric"
                    editable={!saving}
                  />
                  <Touchable
                    style={s.setupCatDelete}
                    onPress={() => removeRow(row.id)}
                    disabled={saving}
                    hitSlop={touchSlop(30)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove this category">
                    <Ionicons name="trash-outline" size={15} color={PC.negative} />
                  </Touchable>
                </View>
              ))}
              <Touchable style={s.setupAddCatRow} onPress={addRow} disabled={saving}>
                <Ionicons name="add-circle-outline" size={18} color={PC.accent} />
                <Text style={s.setupAddCatText}>Add Category</Text>
              </Touchable>
            </View>

            {/* Save */}
            <Touchable tone="accent"
              style={[s.saveBtn, saving && { opacity: 0.6 }, { marginTop: 24, marginBottom: 8 }]}
              onPress={handleSave}
              disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#060A09" />
                : <Text style={s.saveBtnText}>Save All</Text>
              }
            </Touchable>
            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  setupSheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: PC.border,
    padding: 24, paddingBottom: 32,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: PC.border, alignSelf: 'center', marginBottom: 20,
  },
  setupSheetHeader:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  setupSheetTitle:   { color: PC.textPrimary, fontSize: 18, fontWeight: '700' },
  setupSheetMonth:   { color: PC.textSecondary, fontSize: 12, marginTop: 3 },
  setupSheetClose: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PC.bgCardElevated, borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  setupSectionLabel: {
    color: PC.textSecondary, fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  modalInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PC.bgInput, borderRadius: 12,
    borderWidth: 1, borderColor: PC.border,
    paddingHorizontal: 14, minHeight: 52, marginBottom: 12,
  },
  rupee:      { color: PC.textSecondary, fontSize: 18, fontWeight: '600', marginRight: 8 },
  modalInput: { flex: 1, color: PC.textPrimary, fontSize: 18, fontWeight: '500' },
  setupCatList:    { gap: 8, marginBottom: 4 },
  setupCatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: PC.bgCardElevated, borderRadius: 12,
    borderWidth: 1, borderColor: PC.border,
    paddingHorizontal: 10, paddingVertical: 10,
  },
  setupCatIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: PC.bgCard, borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
  },
  setupCatNameInput: { flex: 1, color: PC.textPrimary, fontSize: 14 },
  setupCatRupee:     { color: PC.textSecondary, fontSize: 15, fontWeight: '600' },
  setupCatAmtInput:  { width: 70, color: PC.textPrimary, fontSize: 14, textAlign: 'right' },
  setupCatDelete: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  setupAddCatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 4,
    borderTopWidth: 1, borderTopColor: PC.border, marginTop: 4,
  },
  setupAddCatText: { color: PC.accent, fontSize: 14, fontWeight: '600' },
  saveBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: PC.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#060A09', fontSize: 14, fontWeight: '700' },
});
