import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PC } from '@/constants/theme';
import { openUPIPayment } from '@/utils/upiPayment';

/**
 * Tappable button that launches the UPI app chooser for the given payment details.
 *
 * Props: upiId, name, amount, note
 */
export default function PayWithUPIButton({ upiId, name, amount, note }) {
  const handlePress = () => openUPIPayment({ upiId, name, amount, note });

  return (
    <TouchableOpacity style={s.btn} onPress={handlePress} activeOpacity={0.8}>
      <Ionicons name="logo-google" size={16} color="#060A09" />
      <Text style={s.label}>Pay ₹{amount} via UPI</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PC.accent,       // Electric Mint — matches positive actions
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  label: {
    color: '#060A09',                  // Dark text on mint — matches settleConfirmBtnText
    fontSize: 13,
    fontWeight: '600',
  },
});
