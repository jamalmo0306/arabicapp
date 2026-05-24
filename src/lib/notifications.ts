import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(
  hour: number,
  minute: number
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('daily-reminder').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-reminder',
    content: {
      title: 'يلا! Time for Arabic 🌿',
      body: 'Even 10 minutes counts today — keep the streak alive.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });
}

export async function scheduleStreakAtRisk(): Promise<void> {
  // Cancel any existing streak-at-risk notification
  await Notifications.cancelScheduledNotificationAsync('streak-at-risk').catch(() => {});
  // Schedule 20 hours from now
  const fireDate = new Date(Date.now() + 20 * 60 * 60 * 1000);
  await Notifications.scheduleNotificationAsync({
    identifier: 'streak-at-risk',
    content: {
      title: "Don't break your streak 🔥",
      body: "5 minutes is all you need — tap to log.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireDate,
    },
  });
}

export async function cancelStreakAtRisk(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('streak-at-risk').catch(() => {});
}

export async function scheduleSundayCheckIn(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('sunday-checkin').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: 'sunday-checkin',
    content: {
      title: 'Weekly check-in time 📋',
      body: '10 minutes of reflection — then you\'re done for the week.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday (1=Sunday in Expo's calendar)
      hour: 10,
      minute: 0,
    },
  });
}

export async function sendBadgeUnlockedNotification(badgeName: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `New badge unlocked 🎉`,
      body: `${badgeName} — keep going!`,
    },
    trigger: null, // immediate
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
