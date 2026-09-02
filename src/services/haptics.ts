import * as Haptics from 'expo-haptics';

/// Touching a plant should feel like touching something alive. Every press in the
/// allotment view pairs a visual pulse with a physical one.
export const tap = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) =>
  Haptics.impactAsync(style).catch(() => {});

/// A soft double-thump, used when a plant is pressed - reads as a heartbeat.
export function pulse() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
  setTimeout(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, 120);
}

export const success = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

export const selection = () => Haptics.selectionAsync().catch(() => {});
