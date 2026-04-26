// src/utils/notifHelper.ts
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_SETTINGS_KEY = 'notif_settings';

export async function checkAndSendLowStockAlerts(
  stock: Array<{ name: string; quantity: number }>
) {
  try {
    const stored = await AsyncStorage.getItem(NOTIF_SETTINGS_KEY);
    const settings = stored
      ? JSON.parse(stored)
      : { lowStock: true, critical: true };

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    for (const drink of stock) {
      if (settings.critical && drink.quantity < 50) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `⚠️ ${drink.name} — Critical`,
            body: `${drink.quantity} units remaining!`,
            sound: true,
          },
          trigger: null, // immediate — SDK 53 compatible
        });
      } else if (settings.lowStock && drink.quantity < 200) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${drink.name} — Low stock`,
            body: `Only ${drink.quantity} units left`,
            sound: false,
          },
          trigger: null,
        });
      }
    }
  } catch (e) {
    // Silently fail in Expo Go — works in dev build
    console.log('Notification skipped (Expo Go limitation):', e);
  }
}
