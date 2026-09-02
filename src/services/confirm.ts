import { Alert, Platform } from 'react-native';

/// A destructive confirmation that works everywhere. Native gets the system alert;
/// the web build, where Alert is a no-op, gets the browser's confirm dialog.
export function confirmDestructive(options: {
  title: string;
  message: string;
  actionLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
}) {
  const { title, message, actionLabel, cancelLabel = 'Keep it', onConfirm } = options;
  if (Platform.OS === 'web') {
    const ok = typeof globalThis.confirm === 'function'
      ? globalThis.confirm(`${title}\n\n${message}`)
      : true;
    if (ok) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: actionLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
