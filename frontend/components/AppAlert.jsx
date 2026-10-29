import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
} from 'react-native';
import { Text } from '@/components/text';
import Touchable from '@/components/Touchable';
import { Ionicons } from '@expo/vector-icons';
import { PC } from '@/constants/theme';

/**
 * Custom in-app alert dialog — replaces Alert.alert() for confirmations.
 *
 * Props:
 *   visible        — boolean
 *   icon           — Ionicons name (optional)
 *   iconColor      — color string (default: PC.accent)
 *   title          — string
 *   message        — string (optional)
 *   buttons        — [{ text, style: 'cancel'|'destructive'|'primary', onPress }]
 *   onRequestClose — () => void
 */
export default function AppAlert({
  visible,
  icon,
  iconColor,
  title,
  message,
  buttons = [],
  onRequestClose,
}) {
  if (!visible) return null;

  const resolvedIconColor = iconColor || PC.accent;

  return (
    <Modal statusBarTranslucent
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon badge */}
          {icon ? (
            <View style={[styles.iconWrap, { backgroundColor: resolvedIconColor + '18' }]}>
              <Ionicons name={icon} size={26} color={resolvedIconColor} />
            </View>
          ) : null}

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Separator */}
          <View style={styles.sep} />

          {/* Buttons */}
          <View style={styles.buttonsRow}>
            {buttons.map((btn, i) => {
              const isDestructive = btn.style === 'destructive';
              const isPrimary     = btn.style === 'primary';
              const isCancel      = btn.style === 'cancel';
              return (
                <Touchable
                  key={i}
                  style={[
                    styles.btn,
                    isCancel      && styles.btnCancel,
                    isDestructive && styles.btnDestructive,
                    isPrimary     && styles.btnPrimary,
                    i > 0         && styles.btnGap,
                  ]}
                  onPress={btn.onPress}>
                  <Text
                    style={[
                      styles.btnText,
                      isDestructive && styles.btnTextDestructive,
                      isPrimary     && styles.btnTextPrimary,
                    ]}>
                    {btn.text}
                  </Text>
                </Touchable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    backgroundColor: PC.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PC.borderLight,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: PC.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: PC.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 4,
  },
  sep: {
    height: 1,
    backgroundColor: PC.border,
    width: '100%',
    marginVertical: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    width: '100%',
  },
  btn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PC.bgCardElevated,
    borderWidth: 1,
    borderColor: PC.border,
  },
  btnGap:        { marginLeft: 10 },
  btnCancel:     { backgroundColor: PC.bgCardElevated, borderColor: PC.border },
  btnDestructive: {
    backgroundColor: 'rgba(255,80,85,0.10)',
    borderColor: 'rgba(255,80,85,0.35)',
  },
  btnPrimary: {
    backgroundColor: PC.accent,
    borderColor: PC.accent,
  },
  btnText:            { color: PC.textSecondary, fontSize: 14, fontWeight: '600' },
  btnTextDestructive: { color: PC.negative, fontWeight: '600' },
  btnTextPrimary:     { color: '#060A09', fontWeight: '700' },
});
