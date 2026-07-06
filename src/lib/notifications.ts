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

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReview(hour: number, minute: number, cardCount: number) {
  if (Platform.OS === 'web') return;
  await cancelDailyReview();
  if (cardCount === 0) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Dags att repetera',
      body: `Du har ${cardCount} kort att repetera idag`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });
}

export async function cancelDailyReview() {
  if (Platform.OS === 'web') return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.content.title === 'Dags att repetera') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function scheduleStudyPlan(id: string, title: string, date: Date) {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    identifier: `plan-${id}`,
    content: { title: 'Studiepass inplanerat', body: title },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

export async function cancelStudyPlan(id: string) {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(`plan-${id}`);
}

export async function scheduleTimerNotif(label: string, seconds: number) {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    identifier: 'focus-timer',
    content: { title: label, body: 'Studieassistenten' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
}

export async function cancelTimerNotif() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync('focus-timer');
}
