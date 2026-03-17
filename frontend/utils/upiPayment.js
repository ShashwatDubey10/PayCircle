import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

export function buildUpiUrl({ upiId, name, amount, note }) {
  if (!upiId || !name || !amount) throw new Error('upiId, name, and amount are required');

  const pa = upiId.trim().split('@').map(part => encodeURIComponent(part)).join('@');
  const pn = encodeURIComponent((name || '').trim());
  const am = parseFloat(amount).toFixed(2);
  const tn = encodeURIComponent((note || 'Payment via PayCircle').trim());
  const tr = encodeURIComponent(`PC${Date.now()}`);

  return `upi://pay?pa=${pa}&pn=${pn}&tr=${tr}&tn=${tn}&am=${am}&cu=INR`;
}

/**
 * Opens a UPI payment deep link in the installed UPI app.
 * @param {{ upiId: string, name: string, amount: number, note: string }} params
 */
export function buildUpiQrPayload({ upiId, name, amount, note, txnId }) {
  if (!upiId || !name || !amount) throw new Error('upiId, name, and amount are required');
  const pa = encodeURIComponent(upiId.trim());
  const pn = encodeURIComponent((name || '').trim());
  const am = parseFloat(amount).toFixed(2);
  const tn = encodeURIComponent((note || 'Payment via PayCircle').trim());
  const tr = encodeURIComponent(txnId || `PC${Date.now()}`);
  const payload = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}&tr=${tr}&mc=0000`;
  console.log('[UPI QR] Payload:', payload);
  return payload;
}

export const openUPIPayment = async ({ upiId, name, amount, note }) => {
  let url;
  try {
    url = buildUpiUrl({ upiId, name, amount, note });
  } catch (e) {
    Alert.alert('Payment Error', e.message);
    return;
  }

  console.log('[UPI] Generated URL:', url);

  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    Alert.alert('No UPI App Found', 'No UPI app is installed on this device.');
    return;
  }

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('No UPI App Found', 'Could not open a UPI app on this device.');
  }
};
