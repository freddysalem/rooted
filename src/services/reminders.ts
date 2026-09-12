import * as Notifications from 'expo-notifications';
import { Planting, getSpecies } from '../models/planting';
import { WeatherSnapshot } from './weather';
import { waterFor } from './water';

/// Watering reminders that know which plant and how much.
///
/// All scheduled on the device, so they work with no account, no server and no signal.
/// The app already knows when each plant is next due - the species' interval, adjusted
/// for what the sky has been doing - so a reminder is just that date, at a civilised
/// hour, with the amount worked out and put in the message. "Water Basil, about 350 ml"
/// is a thing you can act on without opening anything.
///
/// Everything is rescheduled wholesale whenever the garden changes. Reconciling
/// individual notifications against a garden that can be edited in any order is a lot of
/// bookkeeping to save a few milliseconds once in a while.

const CHANNEL = 'watering';

/// Reminders land here rather than at midnight. Early enough to water before the sun is
/// on the bed, late enough not to wake anybody.
const HOUR = 8;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function permissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as 'granted' | 'denied' | 'undetermined';
  } catch {
    return 'denied';
  }
}

export async function askPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Watering reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/// When this plant next wants water, as a real date.
function dueAt(planting: Planting, intervalDays: number): Date {
  const since = planting.lastWatered ?? planting.plantedOn;
  const due = new Date(since);
  due.setDate(due.getDate() + intervalDays);
  due.setHours(HOUR, 0, 0, 0);
  return due;
}

export async function rescheduleAll(
  plantings: Planting[],
  weather: WeatherSnapshot | null,
  intervalFor: (planting: Planting) => number
): Promise<number> {
  try {
    if ((await permissionStatus()) !== 'granted') return 0;
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = Date.now();
    let scheduled = 0;

    for (const planting of plantings) {
      const species = getSpecies(planting);
      const advice = waterFor(planting, species, weather);
      let when = dueAt(planting, intervalFor(planting));

      // Anything already overdue is nagged about tomorrow morning rather than never:
      // a notification with a date in the past simply does not fire.
      if (when.getTime() <= now) {
        when = new Date();
        when.setDate(when.getDate() + 1);
        when.setHours(HOUR, 0, 0, 0);
      }

      const name = planting.nickname.trim() || species.name;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${name} needs water`,
          body: advice.because
            ? `${advice.amount}. ${advice.because}`
            : `About ${advice.amount} - enough to wet the whole root ball.`,
          data: { plantingId: planting.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: CHANNEL,
        },
      });
      scheduled += 1;
    }
    return scheduled;
  } catch {
    // A reminder that fails to schedule is not worth interrupting the app for.
    return 0;
  }
}

export async function cancelAll(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing to do.
  }
}
