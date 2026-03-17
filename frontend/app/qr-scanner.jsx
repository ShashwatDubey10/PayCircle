import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { PC } from '@/constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FRAME_SIZE = SCREEN_W * 0.68;

// ─── Parse UPI QR URL ─────────────────────────────────────────────────────────

function parseUpiUrl(raw) {
  try {
    const url = raw.trim();
    if (!url.startsWith('upi://')) return null;

    // upi://pay?pa=...&pn=...&am=...&cu=...&tn=...
    const queryStr = url.split('?')[1] ?? '';
    const params = {};
    queryStr.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    });

    const pa = params['pa'] ?? params['PA'] ?? ''; // payee address (UPI ID)
    if (!pa) return null;

    return {
      raw: url,
      upiId: pa,
      name: params['pn'] ?? params['PN'] ?? '',
      amount: params['am'] ?? params['AM'] ?? '',
      note: params['tn'] ?? params['TN'] ?? '',
    };
  } catch {
    return null;
  }
}

// ─── Corner marker component ──────────────────────────────────────────────────

function Corner({ position }) {
  const style = [styles.corner];
  if (position.includes('top'))    style.push({ top: 0 });
  if (position.includes('bottom')) style.push({ bottom: 0 });
  if (position.includes('left'))   style.push({ left: 0, borderLeftWidth: 3, borderTopWidth: position.includes('top') ? 3 : 0, borderBottomWidth: position.includes('bottom') ? 3 : 0 });
  if (position.includes('right'))  style.push({ right: 0, borderRightWidth: 3, borderTopWidth: position.includes('top') ? 3 : 0, borderBottomWidth: position.includes('bottom') ? 3 : 0 });
  return <View style={style} />;
}

// ─── Payment Sheet ─────────────────────────────────────────────────────────────

function PaymentSheet({ upi, onClose, onPay }) {
  return (
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />

      <View style={styles.sheetHeader}>
        <View style={styles.sheetIconWrap}>
          <Ionicons name="qr-code" size={22} color={PC.accent} />
        </View>
        <Text style={styles.sheetTitle}>UPI Payment</Text>
      </View>

      <View style={styles.sheetRow}>
        <Text style={styles.sheetLabel}>Pay to</Text>
        <Text style={styles.sheetValue}>{upi.name || 'Unknown'}</Text>
      </View>

      <View style={styles.sheetRow}>
        <Text style={styles.sheetLabel}>UPI ID</Text>
        <Text style={[styles.sheetValue, styles.sheetUpiId]}>{upi.upiId}</Text>
      </View>

      {!!upi.amount && (
        <View style={styles.sheetRow}>
          <Text style={styles.sheetLabel}>Amount</Text>
          <Text style={[styles.sheetValue, styles.sheetAmount]}>₹{upi.amount}</Text>
        </View>
      )}

      {!!upi.note && (
        <View style={styles.sheetRow}>
          <Text style={styles.sheetLabel}>Note</Text>
          <Text style={styles.sheetValue}>{upi.note}</Text>
        </View>
      )}

      <View style={styles.sheetActions}>
        <TouchableOpacity style={styles.btnSecondary} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.btnSecondaryText}>Scan Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnPrimary} onPress={onPay} activeOpacity={0.8}>
          <Ionicons name="arrow-forward" size={16} color={PC.bg} style={{ marginRight: 6 }} />
          <Text style={styles.btnPrimaryText}>Open UPI App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function QrScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [upiData, setUpiData] = useState(null);
  const [error, setError] = useState('');

  const handleBarcodeScan = useCallback(({ data }) => {
    if (scanned) return;
    setScanned(true);

    const parsed = parseUpiUrl(data);
    if (parsed) {
      setError('');
      setUpiData(parsed);
    } else {
      setError('Not a valid UPI QR code. Please scan a UPI payment QR.');
    }
  }, [scanned]);

  const resetScan = () => {
    setScanned(false);
    setUpiData(null);
    setError('');
  };

  const openUpiApp = async () => {
    if (!upiData) return;
    try {
      const supported = await Linking.canOpenURL(upiData.raw);
      if (supported) {
        await Linking.openURL(upiData.raw);
      } else {
        setError('No UPI app found on this device.');
        setUpiData(null);
        setScanned(false);
      }
    } catch {
      setError('Could not open UPI app.');
      setUpiData(null);
      setScanned(false);
    }
  };

  // ── Permission not yet determined ──
  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permText}>Checking camera permission…</Text>
      </View>
    );
  }

  // ── Permission denied ──
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={PC.textPrimary} />
        </TouchableOpacity>
        <View style={styles.centered}>
          <View style={styles.permIconWrap}>
            <Ionicons name="camera-outline" size={42} color={PC.accent} />
          </View>
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permDesc}>
            PayCircle needs camera access to scan UPI QR codes for payments.
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission} activeOpacity={0.85}>
            <Text style={styles.btnPrimaryText}>Allow Camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
      />

      {/* Dark overlay with frame cutout via four surrounding rectangles */}
      <View style={styles.overlay} pointerEvents="none">
        {/* Top */}
        <View style={[styles.overlaySegment, { height: (SCREEN_H - FRAME_SIZE) / 2, width: SCREEN_W }]} />
        {/* Middle row */}
        <View style={{ flexDirection: 'row', height: FRAME_SIZE }}>
          <View style={[styles.overlaySegment, { flex: 1 }]} />
          {/* Transparent frame area */}
          <View style={{ width: FRAME_SIZE, height: FRAME_SIZE }}>
            <Corner position="top-left" />
            <Corner position="top-right" />
            <Corner position="bottom-left" />
            <Corner position="bottom-right" />
          </View>
          <View style={[styles.overlaySegment, { flex: 1 }]} />
        </View>
        {/* Bottom */}
        <View style={[styles.overlaySegment, { flex: 1, width: SCREEN_W }]} />
      </View>

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={PC.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Scan QR Code</Text>
        <View style={{ width: 44 }} />
      </SafeAreaView>

      {/* Hint text under frame */}
      {!upiData && (
        <View style={styles.hintWrap} pointerEvents="none">
          {error ? (
            <View style={styles.errorPill}>
              <Ionicons name="alert-circle-outline" size={15} color={PC.negative} style={{ marginRight: 5 }} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <Text style={styles.hintText}>Point your camera at a UPI QR code</Text>
          )}
        </View>
      )}

      {/* Scan-again button when error */}
      {error && !upiData && (
        <View style={styles.retryWrap}>
          <TouchableOpacity style={styles.btnSecondary} onPress={resetScan} activeOpacity={0.8}>
            <Text style={styles.btnSecondaryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Payment sheet */}
      {upiData && (
        <PaymentSheet upi={upiData} onClose={resetScan} onPay={openUpiApp} />
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const CORNER_LEN = 24;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PC.bg,
    paddingHorizontal: 32,
  },

  // ── Camera overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  overlaySegment: {
    backgroundColor: 'rgba(0,0,0,0.62)',
  },

  // ── Frame corners
  corner: {
    position: 'absolute',
    width: CORNER_LEN,
    height: CORNER_LEN,
    borderColor: PC.accent,
  },

  // ── Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    color: PC.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ── Hint / error
  hintWrap: {
    position: 'absolute',
    bottom: SCREEN_H / 2 - FRAME_SIZE / 2 - 54,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,80,85,0.15)',
    borderWidth: 1,
    borderColor: PC.negative + '60',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  errorText: {
    color: PC.negative,
    fontSize: 13,
  },
  retryWrap: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  // ── Permission screen
  permIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PC.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: PC.accent + '60',
  },
  permTitle: {
    color: PC.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  permDesc: {
    color: PC.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  permText: {
    color: PC.textSecondary,
    fontSize: 14,
  },

  // ── Payment sheet
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: PC.bgCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    borderTopWidth: 1,
    borderColor: PC.border,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: PC.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PC.accent + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetTitle: {
    color: PC.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: PC.border,
  },
  sheetLabel: {
    color: PC.textSecondary,
    fontSize: 14,
  },
  sheetValue: {
    color: PC.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  sheetUpiId: {
    color: PC.accent,
    fontWeight: '600',
  },
  sheetAmount: {
    color: PC.positive,
    fontSize: 17,
    fontWeight: '700',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },

  // ── Buttons
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PC.accent,
    borderRadius: 14,
    paddingVertical: 14,
  },
  btnPrimaryText: {
    color: PC.bg,
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PC.bgCardElevated,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: PC.border,
  },
  btnSecondaryText: {
    color: PC.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
