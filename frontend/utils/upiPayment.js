import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

/**
 * Opens a UPI payment deep link in the installed UPI app.
 * @param {{ upiId: string, name: string, amount: number, note: string }} params
 */
export const openUPIPayment = async ({ upiId, name, amount, note }) => {
  const url =
    `upi://pay?pa=${upiId}` +
    `&pn=${encodeURIComponent(name)}` +
    `&am=${parseFloat(amount).toFixed(2)}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent(note)}`;

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('No UPI App Found', 'No UPI app is installed on this device.');
  }
};
