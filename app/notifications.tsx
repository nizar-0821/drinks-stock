import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStockForUser, getSalesForMonth, getAllDrinks } from '../src/db/database';
import { useStore } from '../src/store/useStore';

const C = {
  bg: '#0D0D0E', s1: '#1A1A1C', s2: '#222224',
  border: 'rgba(255,255,255,0.08)', border2: 'rgba(255,255,255,0.14)',
  text: '#EFEFEF', text2: '#888', text3: '#555',
  green: '#1D9E75', amber: '#EF9F27', red: '#E24B4A',
  blue: '#378ADD', purple: '#7F77DD',
};

const KEY = 'smart_notif_settings';

const DEFAULTS = {
  enabled: true,
  criticalAlert: true,       // < 50 units → immediate
  lowStockAlert: true,       // < 200 units → immediate
  daysLeftAlert: true,       // < 5 days → immediate after sales
  morningDigest: true,       // kol sba7 f 9:00 — critical drinks
  eveningReminder: true,     // 20:00 — ida ma dkhaltich sales
  weeklyReport: false,       // kol had — weekly summary
  digestHour: 9,
  reminderHour: 20,
  daysLeftThreshold: 5,      // warn when < X days left
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true,
  }),
});

export default function NotificationsScreen() {
  const activeUser = useStore(s => s.activeUser);
  const [settings, setSettings] = useState(DEFAULTS);
  const [permission, setPermission] = useState('undetermined');
  const [smartAlerts, setSmartAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    load();
    analyzeStock();
  }, [activeUser]));

  const load = async () => {
    try {
      const stored = await AsyncStorage.getItem(KEY);
      if (stored) setSettings({ ...DEFAULTS, ...JSON.parse(stored) });
    } catch (e) {}
    const { status } = await Notifications.getPermissionsAsync();
    setPermission(status);
    setLoading(false);
  };

  // Smart analysis — calculate days left per drink
  const analyzeStock = () => {
    if (!activeUser) return;
    const stock = getStockForUser(activeUser.id);
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const records = getSalesForMonth(activeUser.id, yearMonth);

    // Sales per drink this month
    const salesMap: Record<string, number> = {};
    records.forEach((r: any) => {
      JSON.parse(r.entries).forEach((e: any) => {
        salesMap[e.drinkId] = (salesMap[e.drinkId] || 0) + e.unitsSold;
      });
    });

    const alerts: any[] = [];
    stock.forEach((d: any) => {
      const avgDaily = records.length > 0
        ? Math.round((salesMap[d.id] || 0) / records.length)
        : 0;
      const daysLeft = avgDaily > 0 ? Math.round(d.quantity / avgDaily) : 999;
      const velocity = avgDaily;

      if (d.quantity < 50) {
        alerts.push({ id: d.id, name: d.name, color: d.color_hex, type: 'critical',
          message: `Critique — ${d.quantity} units restants!`, daysLeft, velocity });
      } else if (daysLeft <= 5 && daysLeft < 999) {
        alerts.push({ id: d.id, name: d.name, color: d.color_hex, type: 'urgent',
          message: `~${daysLeft} jours restants (${avgDaily}/jour)`, daysLeft, velocity });
      } else if (d.quantity < 200) {
        alerts.push({ id: d.id, name: d.name, color: d.color_hex, type: 'low',
          message: `Stock bas — ${d.quantity} units`, daysLeft: daysLeft < 999 ? daysLeft : null, velocity });
      }
    });

    alerts.sort((a, b) => {
      const order: any = { critical: 0, urgent: 1, low: 2 };
      return order[a.type] - order[b.type];
    });
    setSmartAlerts(alerts);
  };

  const save = async (newSettings: typeof DEFAULTS) => {
    setSettings(newSettings);
    try { await AsyncStorage.setItem(KEY, JSON.stringify(newSettings)); } catch (e) {}
    if (newSettings.enabled) scheduleAll(newSettings);
    else Notifications.cancelAllScheduledNotificationsAsync();
  };

  const toggle = async (key: keyof typeof DEFAULTS) => {
    if (permission !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermission(status);
      if (status !== 'granted') {
        Alert.alert('Notifications désactivées', 'Active les notifications dans les paramètres du téléphone.');
        return;
      }
    }
    const next = { ...settings, [key]: !settings[key as keyof typeof settings] };
    await save(next as typeof DEFAULTS);
  };

  const scheduleAll = async (s: typeof DEFAULTS) => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!s.enabled) return;

    // Morning digest
    if (s.morningDigest) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '☀️ Drinks Stock — Bonjour',
          body: smartAlerts.filter(a => a.type === 'critical').length > 0
            ? `⚠️ ${smartAlerts.filter(a => a.type === 'critical').length} boisson(s) en état critique!`
            : 'Stock OK — bonne journée!',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: s.digestHour, minute: 0,
        },
      });
    }

    // Evening reminder
    if (s.eveningReminder) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📦 Drinks Stock',
          body: 'Tu as enregistré les ventes d\'aujourd\'hui?',
          sound: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: s.reminderHour, minute: 0,
        },
      });
    }
  };

  const testSmartNotif = async () => {
    if (permission !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermission(status);
      if (status !== 'granted') return;
    }
    try {
      const critCount = smartAlerts.filter(a => a.type === 'critical').length;
      const urgCount = smartAlerts.filter(a => a.type === 'urgent').length;
      const body = critCount > 0
        ? `🔴 ${critCount} critique · 🟡 ${urgCount} urgent — Vérifier maintenant`
        : urgCount > 0
        ? `🟡 ${urgCount} boisson(s) à restocke dans < 5 jours`
        : '✅ Tout le stock est OK!';
      await Notifications.scheduleNotificationAsync({
        content: { title: '🔔 Smart Alert — Test', body, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
        },
      });
      Alert.alert('Envoyé!', 'Smart notification dans 2 secondes');
    } catch (e) {
      Alert.alert('Note', 'Fonctionne pleinement dans un dev build.');
    }
  };

  if (loading) return null;

  const alertColors: any = {
    critical: { bg: 'rgba(226,75,74,0.08)', border: 'rgba(226,75,74,0.3)', text: '#F09595', dot: C.red },
    urgent: { bg: 'rgba(239,159,39,0.08)', border: 'rgba(239,159,39,0.3)', text: '#FAC775', dot: C.amber },
    low: { bg: 'rgba(29,158,117,0.06)', border: 'rgba(29,158,117,0.2)', text: '#5DCAA5', dot: C.green },
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Settings</Text>
        </TouchableOpacity>
        <Text style={s.title}>🔔 Smart Alerts</Text>
        <Switch
          value={settings.enabled}
          onValueChange={() => toggle('enabled')}
          trackColor={{ false: C.s2, true: C.green }}
          thumbColor="#fff"
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* Permission banner */}
        {permission !== 'granted' && (
          <TouchableOpacity style={s.permBanner}
            onPress={async () => {
              const { status } = await Notifications.requestPermissionsAsync();
              setPermission(status);
            }}>
            <Text style={s.permTitle}>⚠️ Notifications désactivées</Text>
            <Text style={s.permSub}>Appuie pour activer</Text>
          </TouchableOpacity>
        )}

        {/* Smart alerts — current status */}
        {smartAlerts.length > 0 && (
          <>
            <Text style={s.secTitle}>Alertes actives maintenant</Text>
            {smartAlerts.map((a, i) => {
              const col = alertColors[a.type];
              return (
                <View key={a.id} style={[s.alertCard, { backgroundColor: col.bg, borderColor: col.border }]}>
                  <View style={s.alertRow}>
                    <View style={[s.dot, { backgroundColor: a.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.alertName, { color: col.text }]}>{a.name}</Text>
                      <Text style={s.alertMsg}>{a.message}</Text>
                    </View>
                    {a.daysLeft && (
                      <View style={[s.daysBadge, { backgroundColor: col.border }]}>
                        <Text style={[s.daysText, { color: col.text }]}>{a.daysLeft}j</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}
        {smartAlerts.length === 0 && (
          <View style={[s.alertCard, { backgroundColor: 'rgba(29,158,117,0.06)', borderColor: 'rgba(29,158,117,0.2)' }]}>
            <Text style={{ color: '#5DCAA5', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
              ✅ Tout le stock est OK!
            </Text>
          </View>
        )}

        {/* Notification types */}
        <Text style={s.secTitle}>Types d'alertes</Text>

        {[
          { key: 'criticalAlert', color: '#F09595', title: '🔴 Alerte critique', body: 'Stock < 50 units — notification immédiate' },
          { key: 'lowStockAlert', color: '#FAC775', title: '🟡 Stock bas', body: 'Stock < 200 units — alerte après ventes' },
          { key: 'daysLeftAlert', color: '#85B7EB', title: '⏱ Jours restants', body: `Alert si < ${settings.daysLeftThreshold} jours de stock restants` },
          { key: 'morningDigest', color: '#AFA9EC', title: '☀️ Digest du matin', body: `Résumé à ${settings.digestHour}:00 — stocks critiques` },
          { key: 'eveningReminder', color: '#5DCAA5', title: '🌙 Rappel du soir', body: `Rappel à ${settings.reminderHour}:00 si ventes non enregistrées` },
          { key: 'weeklyReport', color: '#EF9F27', title: '📊 Rapport hebdo', body: 'Résumé chaque lundi matin' },
        ].map(item => (
          <View key={item.key} style={s.notifCard}>
            <View style={s.notifHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[s.dot, { backgroundColor: item.color }]} />
                <Text style={s.notifTitle}>{item.title}</Text>
              </View>
              <Switch
                value={settings[item.key as keyof typeof settings] as boolean}
                onValueChange={() => toggle(item.key as keyof typeof DEFAULTS)}
                trackColor={{ false: C.s2, true: C.green }}
                thumbColor="#fff"
                disabled={!settings.enabled}
              />
            </View>
            <Text style={[s.notifBody, !settings.enabled && { opacity: 0.35 }]}>{item.body}</Text>
          </View>
        ))}

        {/* Test button */}
        <TouchableOpacity style={s.testBtn} onPress={testSmartNotif}>
          <Text style={s.testBtnText}>🧪 Tester les smart alerts</Text>
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
  back: { fontSize: 13, color: C.green, fontWeight: '500', width: 70 },
  title: { fontSize: 15, fontWeight: '700', color: C.text },
  permBanner: { backgroundColor: 'rgba(239,159,39,0.1)', borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 0.5, borderColor: 'rgba(239,159,39,0.3)' },
  permTitle: { fontSize: 13, fontWeight: '600', color: '#FAC775' },
  permSub: { fontSize: 11, color: C.amber, marginTop: 2 },
  secTitle: { fontSize: 10, fontWeight: '600', color: C.text3, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  alertCard: { borderRadius: 10, padding: 10, marginBottom: 7, borderWidth: 0.5 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  alertName: { fontSize: 12, fontWeight: '600' },
  alertMsg: { fontSize: 11, color: C.text2, marginTop: 2 },
  daysBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  daysText: { fontSize: 11, fontWeight: '700' },
  notifCard: { backgroundColor: C.s1, borderRadius: 12, borderWidth: 0.5,
    borderColor: C.border, marginBottom: 8, overflow: 'hidden' },
  notifHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, backgroundColor: C.s2, borderBottomWidth: 0.5, borderBottomColor: C.border },
  notifTitle: { fontSize: 13, fontWeight: '600', color: C.text },
  notifBody: { padding: 10, fontSize: 11, color: C.text2, lineHeight: 17 },
  testBtn: { borderWidth: 0.5, borderColor: C.green, borderRadius: 12,
    padding: 13, alignItems: 'center', marginTop: 4 },
  testBtnText: { fontSize: 13, color: C.green, fontWeight: '600' },
});
