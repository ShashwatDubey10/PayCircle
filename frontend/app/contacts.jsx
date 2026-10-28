import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

import { PC } from '@/constants/theme';
import { getContacts, createContact, updateContact, deleteContact } from '@/services/contacts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

function ContactCard({ contact, onEdit, onDelete, onPress }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={onPress}>
      <View style={styles.cardAvatar}>
        <Text style={styles.cardAvatarText}>{getInitials(contact.name)}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{contact.name}</Text>
        <View style={styles.virtualBadge}>
          <Ionicons name="person-add-outline" size={10} color={PC.accent} />
          <Text style={styles.virtualBadgeText}>Personal Contact</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.cardActionBtn}
          onPress={() => onEdit(contact)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="pencil-outline" size={17} color={PC.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cardActionBtn, { marginLeft: 8 }]}
          onPress={() => onDelete(contact)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={17} color={PC.negative} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function ContactModal({ visible, editTarget, onClose, onSaved }) {
  const insets = useSafeAreaInsets();
  const [name,    setName]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Pre-fill when editing
  React.useEffect(() => {
    if (visible) {
      setName(editTarget?.name ?? '');
      setError('');
    }
  }, [visible, editTarget]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Name is required.'); return; }
    setLoading(true);
    setError('');
    try {
      let saved;
      if (editTarget) {
        saved = await updateContact(editTarget._id, trimmed);
      } else {
        saved = await createContact(trimmed);
      }
      onSaved(saved, !!editTarget);
      onClose();
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    onClose();
  }

  return (
    <Modal statusBarTranslucent visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior="padding">
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 36 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>
            {editTarget ? 'Edit Contact' : 'New Personal Contact'}
          </Text>
          <Text style={styles.modalSubtitle}>
            {editTarget
              ? 'Update the contact name.'
              : 'Add someone not on PayCircle so you can split expenses with them.'}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color={PC.negative} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.modalLabel}>Name</Text>
          <View style={styles.inputBox}>
            <Ionicons name="person-outline" size={16} color={PC.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={PC.textMuted}
              value={name}
              onChangeText={(v) => { setName(v); setError(''); }}
              autoCapitalize="words"
              autoFocus
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#060A09" size="small" />
              : <Text style={styles.saveBtnText}>{editTarget ? 'Save Changes' : 'Add Contact'}</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ContactsScreen() {
  const router = useRouter();

  const [contacts,   setContacts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await getContacts();
      setContacts(list);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  function handleEdit(contact) {
    setEditTarget(contact);
    setShowModal(true);
  }

  function handleDelete(contact) {
    Alert.alert(
      'Remove Contact',
      `Remove ${contact.name}? Their split history will be kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContact(contact._id);
              setContacts(prev => prev.filter(c => c._id !== contact._id));
            } catch (err) {
              Alert.alert('Error', err?.message || 'Could not remove contact.');
            }
          },
        },
      ]
    );
  }

  function handleSaved(saved, isEdit) {
    if (isEdit) {
      setContacts(prev => prev.map(c => c._id === saved._id ? { ...c, name: saved.name } : c));
    } else {
      setContacts(prev => [saved, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
    }
  }

  function openAdd() {
    setEditTarget(null);
    setShowModal(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={PC.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Personal Contacts</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color={PC.accent} />
        </TouchableOpacity>
      </View>

      {/* ── Info banner ── */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={15} color={PC.accent} style={{ marginRight: 8 }} />
        <Text style={styles.infoText}>
          Track expenses with people who aren't on PayCircle yet.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={PC.textPrimary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PC.textPrimary} />}>

          {contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="person-add-outline" size={32} color={PC.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No personal contacts yet</Text>
              <Text style={styles.emptyText}>
                Add someone by name to start splitting expenses with them — no PayCircle account needed.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={openAdd} activeOpacity={0.85}>
                <Ionicons name="add" size={16} color="#060A09" style={{ marginRight: 6 }} />
                <Text style={styles.emptyBtnText}>Add First Contact</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.list}>
              {contacts.map((c, i) => (
                <View key={c._id}>
                  <ContactCard
                    contact={c}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onPress={() => router.push(`/direct/${c._id}`)}
                  />
                  {i < contacts.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <ContactModal
        visible={showModal}
        editTarget={editTarget}
        onClose={() => setShowModal(false)}
        onSaved={handleSaved}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: PC.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 8 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PC.bgCard,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  title:  { flex: 1, color: PC.textPrimary, fontSize: 20, fontWeight: '700' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: PC.accent10,
    borderWidth: 1, borderColor: PC.accent20,
    alignItems: 'center', justifyContent: 'center',
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: PC.accent10,
    borderWidth: 1,
    borderColor: PC.accent20,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  infoText: { flex: 1, color: PC.textSecondary, fontSize: 13, lineHeight: 18 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: {
    marginHorizontal: 16,
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: PC.border, marginLeft: 72 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1.5, borderColor: PC.accent20,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  cardAvatarText: { color: PC.accent, fontSize: 15, fontWeight: '700' },
  cardInfo:   { flex: 1 },
  cardName:   { color: PC.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  virtualBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: PC.accent10,
    borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  virtualBadgeText: { color: PC.accent, fontSize: 10, fontWeight: '600' },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  cardActionBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: PC.bgCardElevated,
    alignItems: 'center', justifyContent: 'center',
  },

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: PC.bgCard,
    borderWidth: 1, borderColor: PC.border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText:  { color: PC.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PC.accent, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  emptyBtnText: { color: '#060A09', fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: PC.border,
    padding: 24, paddingBottom: 36,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: PC.border, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle:    { color: PC.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  modalSubtitle: { color: PC.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 20 },
  modalLabel:    { color: PC.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(224,90,90,0.10)',
    borderWidth: 1, borderColor: 'rgba(224,90,90,0.30)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14,
  },
  errorText: { flex: 1, color: PC.negative, fontSize: 13 },

  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: PC.bgInput,
    borderWidth: 1, borderColor: PC.border,
    borderRadius: 12, paddingHorizontal: 14, height: 50, marginBottom: 20,
  },
  input: { flex: 1, color: PC.textPrimary, fontSize: 15 },

  saveBtn: {
    backgroundColor: PC.accent, borderRadius: 14,
    height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  saveBtnText: { color: '#060A09', fontSize: 15, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: PC.textSecondary, fontSize: 14 },
});
