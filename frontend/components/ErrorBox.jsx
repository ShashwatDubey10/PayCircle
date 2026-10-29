import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/text';
import { Ionicons } from '@expo/vector-icons';
import { PC } from '@/constants/theme';

/**
 * Inline form error component — replaces the scattered errorBox pattern.
 * Usage: <ErrorBox message={error} />  (renders nothing when message is falsy)
 */
export default function ErrorBox({ message, style }) {
  if (!message) return null;
  return (
    <View style={[styles.box, style]}>
      <View style={styles.leftBar} />
      <Ionicons name="alert-circle" size={15} color={PC.negative} style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,80,85,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,80,85,0.22)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 14,
  },
  leftBar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: PC.negative,
  },
  icon: {
    marginLeft: 10,
    marginRight: 7,
  },
  text: {
    flex: 1,
    color: PC.negative,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 11,
    paddingRight: 12,
  },
});
