import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Switch, Alert
} from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const C = {
  bg: '#0D0D0E', s1: '#1A1A1C', s2: '#222224',
  border: 'rgba(255,255,255,0.08)', border2: 'rgba(255,255,255,0.14)',
  text: '#EFEFEF', text2: '#888', text3: '#555',
  green: '#1D9E75', amber: '#EF9F27',
};

const NOTIF_SETTINGS_KEY = 'notif_settings';
const DEFAULT_SETTINGS = {
  lowStock: true, critical: true,
  dailyReminder: true, monthlyReport: false,
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

export default function NotificationsScreen() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [permission, setPermission] = useState('undetermined');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(NOTIF_SETTINGS_KEY);
        if (stored) setSettings(JSON.parse(stored));
      } catch (e) {}
      const { status } = await Notifications.getPermissionsAsync();
      setPermission(status);
      setLoading(false);
    })();
  }, []);

  const saveSettings = async (s: typeof DEFAULT_SETTINGS) => {
    setSettings(s);
    try { await AsyncStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
  };

  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermission(status);
    if (status !== 'granted') {
      Alert.alert('Disabled', 'Enable notifications from phone settings.');
    }
    return status === 'granted';
  };

  const toggle = async (key: keyof typeof DEFAULT_SETTINGS) => {
    const newVal = !settings[key];
    if (newVal && permission !== 'granted') {
      const ok = await requestPermission();
      if (!ok) return;
    }
    const next = { ...settings, [key]: newVal };
    await saveSettings(next);

    if (key === 'dailyReminder') {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (newVal) {
        // SDK 53 trigger format
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Drinks Stock',
            body: "Dkhlt les ventes d'aujourd'hui? 📦",
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 20,
            minute: 0,
          },
        });
      }
    }
  };

  const testNotif = async () => {
    if (permission !== 'granted') {
      const ok = await requestPermission();
      if (!ok) return;
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Drinks Stock — Test ✅',
          body: 'Notifications khadmin mzyan!',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
        },
      });
      Alert.alert('Sent!', 'Notification ghadi twsal f 2 secondes');
    } catch (e) {
      Alert.alert('Note', 'Local notifications only work in a dev build, not Expo Go SDK 53+.');
    }
  };

  if (loading) return null;

  const items = [
    { key: 'lowStock' as const, color: '#FAC775', title: 'Low stock alert',
      body: 'Alert wqtash ay drink ydkhol taht 200 units.' },
    { key: 'critical' as const, color: '#F09595', title: 'Critical stock alert',
      body: 'Alert wqtash ay drink ydkhol taht 50 units.' },
    { key: 'dailyReminder' as const, color: '#85B7EB', title: 'Daily reminder',
      body: 'Reminder kol nhar f 20:00 ila ma dkhaltich l-mabi3at.' },
    { key: 'monthlyReport' as const, color: '#AFA9EC', title: 'Monthly report',
      body: "Notification f awl nhar d'chhar wqtash summary ready." },
  ];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Settings</Text>
        </TouchableOpacity>
        <Text style={s.topTitle}>Notifications</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* Permission banner */}
        {permission !== 'granted' && (
          <TouchableOpacity style={s.permBanner} onPress={requestPermission}>
            <Text style={s.permTitle}>⚠ Notifications disabled</Text>
            <Text style={s.permSub}>Tap to enable</Text>
          </TouchableOpacity>
        )}

        {/* Expo Go warning */}
        <View style={s.infoBanner}>
          <Text style={s.infoText}>
            ℹ️ Local notifications work fully in a dev build. In Expo Go, settings are saved but push alerts are limited.
          </Text>
        </View>

        <Text style={s.secTitle}>Alert rules</Text>
        {items.map(item => (
          <View key={item.key} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardHeaderLeft}>
                <View style={[s.dot, { backgroundColor: item.color }]} />
                <Text style={s.cardTitle}>{item.title}</Text>
              </View>
              <Switch
                value={settings[item.key]}
                onValueChange={() => toggle(item.key)}
                trackColor={{ false: C.s2, true: C.green }}
                thumbColor="#fff"
              />
            </View>
            <Text style={[s.cardBody, !settings[item.key] && { opacity: 0.4 }]}>
              {item.body}
            </Text>
          </View>
        ))}

        <Text style={s.secTitle}>Thresholds</Text>
        <View style={s.threshCard}>
          <View style={[s.threshRow, { borderBottomWidth: 0.5, borderBottomColor: C.border }]}>
            <View>
              <Text style={s.threshLabel}>Low stock at</Text>
              <Text style={s.threshSub}>Yellow pill on dashboard</Text>
            </View>
            <Text style={s.threshVal}>200 units</Text>
          </View>
          <View style={s.threshRow}>
            <View>
              <Text style={s.threshLabel}>Critical stock at</Text>
              <Text style={s.threshSub}>Red pill on dashboard</Text>
            </View>
            <Text style={s.threshVal}>50 units</Text>
          </View>
        </View>

        <TouchableOpacity style={s.testBtn} onPress={testNotif}>
          <Text style={s.testBtnText}>Send test notification</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 0.5, borderBottomColor: C.border },
  back: { fontSize: 13, color: C.green, fontWeight: '500', width: 80 },
  topTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  permBanner: { backgroundColor: 'rgba(239,159,39,0.1)', borderRadius: 12, padding: 12,
    marginBottom: 10, borderWidth: 0.5, borderColor: 'rgba(239,159,39,0.3)' },
  permTitle: { fontSize: 13, fontWeight: '600', color: '#FAC775' },
  permSub: { fontSize: 11, color: C.amber, marginTop: 2 },
  infoBanner: { backgroundColor: C.s1, borderRadius: 10, padding: 10, marginBottom: 14,
    borderWidth: 0.5, borderColor: C.border },
  infoText: { fontSize: 11, color: C.text2, lineHeight: 16 },
  secTitle: { fontSize: 10, fontWeight: '600', color: C.text3, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 8 },
  card: { backgroundColor: C.s1, borderRadius: 12, borderWidth: 0.5,
    borderColor: C.border, marginBottom: 8, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, backgroundColor: C.s2, borderBottomWidth: 0.5, borderBottomColor: C.border },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: C.text },
  cardBody: { padding: 12, fontSize: 11, color: C.text2, lineHeight: 17 },
  threshCard: { backgroundColor: C.s1, borderRadius: 12, borderWidth: 0.5,
    borderColor: C.border, marginBottom: 14, overflow: 'hidden' },
  threshRow: { flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 12 },
  threshLabel: { fontSize: 13, color: C.text, fontWeight: '500' },
  threshSub: { fontSize: 11, color: C.text2, marginTop: 2 },
  threshVal: { fontSize: 13, fontWeight: '700', color: C.green },
  testBtn: { borderWidth: 0.5, borderColor: C.green, borderRadius: 12,
    padding: 13, alignItems: 'center' },
  testBtnText: { fontSize: 13, color: C.green, fontWeight: '600' },
});
