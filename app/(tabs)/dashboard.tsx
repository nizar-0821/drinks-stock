import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { getStockForUser } from '../../src/db/database';

const C = {
  bg: '#0D0D0E', s1: '#1A1A1C', s2: '#222224',
  border: 'rgba(255,255,255,0.08)', border2: 'rgba(255,255,255,0.14)',
  text: '#EFEFEF', text2: '#888', text3: '#555',
  green: '#1D9E75', green2: '#5DCAA5', amber: '#EF9F27', red: '#E24B4A',
};

function dayPill(stock: number, avg: number) {
  if (avg <= 0) return { label: '—', color: C.text3, bg: C.s2 };
  const days = Math.round(stock / avg);
  if (days <= 3) return { label: `~${days}d`, color: '#F09595', bg: 'rgba(226,75,74,0.15)' };
  if (days <= 7 || stock < 200) return { label: `~${days}d`, color: '#FAC775', bg: 'rgba(239,159,39,0.15)' };
  return { label: `~${days}d`, color: '#5DCAA5', bg: 'rgba(29,158,117,0.15)' };
}

export default function Dashboard() {
  const activeUser = useStore(s => s.activeUser);
  const [stock, setStock] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadStock = useCallback(() => {
    if (!activeUser) return;
    setStock(getStockForUser(activeUser.id));
  }, [activeUser]);

  useFocusEffect(useCallback(() => { loadStock(); }, [loadStock]));

  const onRefresh = () => { setRefreshing(true); loadStock(); setRefreshing(false); };

  if (!activeUser) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}>
          <Text style={s.emptyText}>No user logged in</Text>
          <TouchableOpacity onPress={() => router.replace('/')}>
            <Text style={s.link}>Go to login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalStock = stock.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const lowCount = stock.filter(d => d.quantity < 200).length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topbar}>
        <View style={s.topbarLeft}>
          <View style={[s.avSm, { backgroundColor: activeUser.avatarColor + '33' }]}>
            <Text style={[s.avSmText, { color: activeUser.avatarColor }]}>{activeUser.initials}</Text>
          </View>
          <Text style={s.topTitle}>{activeUser.name}'s Stock</Text>
        </View>
        <Text style={s.topDate}>
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} />}
      >
        <View style={s.switchBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.switchLabel}>Logged in as</Text>
            <Text style={s.switchName}>{activeUser.name}</Text>
            {activeUser.streakDays > 0 && (
              <View style={s.streakBadge}>
                <Text style={s.streakText}>🔥 {activeUser.streakDays}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => router.replace('/')}>
            <Text style={s.switchBtn}>Switch →</Text>
          </TouchableOpacity>
        </View>

        <View style={s.statRow}>
          <View style={s.statCard}>
            <Text style={s.statVal}>{totalStock.toLocaleString()}</Text>
            <Text style={s.statLbl}>Units in stock</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statVal, lowCount > 0 && { color: '#F09595' }]}>{lowCount}</Text>
            <Text style={s.statLbl}>Low alerts</Text>
          </View>
        </View>

        <Text style={s.secTitle}>All drinks</Text>
        <View style={s.drinksList}>
          {stock.map((d, i) => {
            const pill = dayPill(d.quantity, d.avg_daily || 0);
            return (
              <View key={d.id} style={[s.drinkRow, i === stock.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={s.drinkLeft}>
                  <View style={[s.dot, { backgroundColor: d.color_hex }]} />
                  <View>
                    <Text style={s.drinkName}>{d.name}</Text>
                    <Text style={s.drinkSub}>avg {d.avg_daily || '—'}/day</Text>
                  </View>
                </View>
                <View style={s.drinkRight}>
                  <Text style={s.stockNum}>{d.quantity}</Text>
                  <View style={[s.pill, { backgroundColor: pill.bg }]}>
                    <Text style={[s.pillText, { color: pill.color }]}>{pill.label}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/(tabs)/sales')}>
          <Text style={s.btnPrimaryText}>+ Record today's sales</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnOutline} onPress={() => router.push('/restock')}>
          <Text style={s.btnOutlineText}>+ Restock drinks</Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.text2, fontSize: 14 },
  link: { color: C.green, fontSize: 14, marginTop: 8 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 0.5, borderBottomColor: C.border },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avSm: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avSmText: { fontSize: 11, fontWeight: '700' },
  topTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  topDate: { fontSize: 11, color: C.text2 },
  switchBanner: { backgroundColor: C.s1, borderRadius: 10, padding: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, borderWidth: 0.5, borderColor: C.border },
  switchLabel: { fontSize: 11, color: C.text2 },
  switchName: { fontSize: 12, fontWeight: '600', color: C.text },
  switchBtn: { fontSize: 12, color: C.green, fontWeight: '600' },
  streakBadge: { backgroundColor: 'rgba(239,159,39,0.12)', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2 },
  streakText: { fontSize: 10, fontWeight: '600', color: '#FAC775' },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: C.s1, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: C.border },
  statVal: { fontSize: 24, fontWeight: '700', color: C.text },
  statLbl: { fontSize: 10, color: C.text2, marginTop: 2 },
  secTitle: { fontSize: 10, fontWeight: '600', color: C.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  drinksList: { backgroundColor: C.s1, borderRadius: 12, borderWidth: 0.5, borderColor: C.border, marginBottom: 14, overflow: 'hidden' },
  drinkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
  drinkLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  drinkName: { fontSize: 13, fontWeight: '600', color: C.text },
  drinkSub: { fontSize: 10, color: C.text2, marginTop: 1 },
  drinkRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stockNum: { fontSize: 14, fontWeight: '700', color: C.text, minWidth: 32, textAlign: 'right' },
  pill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '600' },
  btnPrimary: { backgroundColor: C.green, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnOutline: { borderWidth: 0.5, borderColor: C.border2, borderRadius: 12, padding: 12, alignItems: 'center' },
  btnOutlineText: { color: C.text2, fontSize: 13 },
});
