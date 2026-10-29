import React, { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  Modal,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Touchable from '@/components/Touchable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { PC } from '@/constants/theme';
import { buildUpiQrPayload } from '@/utils/upiPayment';

/**
 * UpiQrModal — shows a UPI QR code for payment.
 *
 * Props:
 *   visible   : boolean        — modal visibility
 *   onClose   : () => void     — dismiss (Cancel / backdrop)
 *   onPaid    : () => void     — optional; if provided shows "Done, I've Paid" + "Cancel"
 *                                if absent shows single "Done" button
 *   upiId     : string         — receiver's UPI ID
 *   name      : string         — receiver's display name
 *   amount    : number         — INR amount
 *   note      : string         — payment note (optional)
 *   txnId     : string         — stable transaction reference (optional)
 *   fromName  : string         — payer's name for subtitle (optional)
 */
export default function UpiQrModal({ visible, onClose, onPaid, upiId, name, amount, note, txnId, fromName }) {
  const insets = useSafeAreaInsets();
  const svgRef = useRef(null);
  const [sharing, setSharing] = useState(false);

  const qrValue = useMemo(() => {
    if (!upiId || !name || !amount) return null;
    try {
      return buildUpiQrPayload({ upiId, name, amount, note, txnId });
    } catch {
      return null;
    }
  }, [upiId, name, amount, note, txnId]);

  async function handleShare() {
    if (!svgRef.current || !qrValue) {
      Alert.alert('Not ready', 'QR code is still rendering, please try again.');
      return;
    }

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Sharing unavailable', 'File sharing is not supported on this device.');
      return;
    }

    setSharing(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('QR capture timed out')), 5000);
        svgRef.current.toDataURL((data) => {
          clearTimeout(timer);
          if (!data) { reject(new Error('QR capture returned empty data')); return; }
          const raw = data.replace(/^data:image\/\w+;base64,/, '');
          resolve(raw);
        });
      });

      const fileUri = FileSystem.cacheDirectory + 'paycircle_qr.png';
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: `Pay ₹${parseFloat(amount).toFixed(2)} to ${name}`,
        UTI: 'public.png',
      });
    } catch (e) {
      Alert.alert('Share Failed', e?.message || 'Could not share QR code.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal statusBarTranslucent visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.handle} />

          <Text style={styles.title}>Payment QR</Text>
          <Text style={styles.subtitle}>
            {fromName || 'You'} → {name}
          </Text>
          <Text style={styles.amount}>₹{parseFloat(amount).toFixed(2)}</Text>

          {qrValue ? (
            <View style={styles.qrWrap}>
              <QRCode
                value={qrValue}
                size={220}
                color={PC.textPrimary}
                backgroundColor={PC.bgCard}
                quietZone={12}
                getRef={(ref) => { svgRef.current = ref; }}
              />
            </View>
          ) : (
            <View style={styles.qrWrap}>
              <Text style={{ color: PC.negative }}>Could not generate QR</Text>
            </View>
          )}

          <Text style={styles.upiId}>{upiId}</Text>
          <Text style={styles.instruction}>Scan with any UPI app to pay</Text>

          <Touchable
            style={[styles.shareBtn, sharing && { opacity: 0.6 }]}
            onPress={handleShare}
            disabled={sharing || !qrValue}>
            {sharing
              ? <ActivityIndicator size="small" color={PC.textSecondary} />
              : <Text style={styles.shareBtnText}>Share QR Image</Text>
            }
          </Touchable>

          {onPaid ? (
            <View style={styles.btnRow}>
              <Touchable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Touchable>
              <Touchable tone="accent" style={styles.doneBtn} onPress={onPaid}>
                <Text style={styles.doneBtnText}>Done, I've Paid</Text>
              </Touchable>
            </View>
          ) : (
            <Touchable tone="accent" style={[styles.doneBtn, { marginHorizontal: 0 }]} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Touchable>
          )}

          <View style={{ height: 24 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: PC.border,
    marginBottom: 20,
  },
  title: {
    color: PC.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: PC.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  amount: {
    color: PC.positive,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  qrWrap: {
    padding: 16,
    backgroundColor: PC.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PC.border,
    marginBottom: 16,
  },
  upiId: {
    color: PC.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  instruction: {
    color: PC.textMuted,
    fontSize: 12,
    marginBottom: 20,
  },
  shareBtn: {
    borderWidth: 1,
    borderColor: PC.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 32,
    marginBottom: 16,
    minWidth: 140,
    alignItems: 'center',
  },
  shareBtnText: {
    color: PC.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: PC.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: PC.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  doneBtn: {
    flex: 1,
    backgroundColor: PC.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#060A09',
    fontSize: 15,
    fontWeight: '700',
  },
});
