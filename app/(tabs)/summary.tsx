import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { getSalesForMonth, getStockForUser, getAllDrinks } from '../../src/db/database';

const C = {
  bg: '#0D0D0E', s1: '#1A1A1C', s2: '#222224',
  border: 'rgba(255,255,255,0.08)', border2: 'rgba(255,255,255,0.14)',
  text: '#EFEFEF', text2: '#888', text3: '#555',
  green: '#1D9E75', green2: '#5DCAA5',
  amber: '#EF9F27', pink: '#D4537E',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SummaryScreen() {
  const activeUser = useStore(s => s.activeUser);
  const [data, setData] = useState<any>(null);

  useFocusEffect(useCallback(() => {
    if (!activeUser) return;
    loadData();
  }, [activeUser]));

  const loadData = () => {
    if (!activeUser) return;
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const records = getSalesForMonth(activeUser.id, yearMonth);
    const drinks = getAllDrinks();
    const stock = getStockForUser(activeUser.id);

    // Total units + revenue per drink
    const drinkTotals: Record<string, number> = {};
    const dayTotals: Record<number, number> = { 0:0,1:0,2:0,3:0,4:0,5:0,6:0 };
    const dayCounts: Record<number, number> = { 0:0,1:0,2:0,3:0,4:0,5:0,6:0 };

    records.forEach((r: any) => {
      const entries = JSON.parse(r.entries);
      const dayOfWeek = new Date(r.date).getDay();
      let dayTotal = 0;
      entries.forEach((e: any) => {
        drinkTotals[e.drinkId] = (drinkTotals[e.drinkId] || 0) + e.unitsSold;
        dayTotal += e.unitsSold;
      });
      dayTotals[dayOfWeek] += dayTotal;
      dayCounts[dayOfWeek]++;
    });

    // Revenue
    const drinkMap: Record<string, any> = {};
    drinks.forEach((d: any) => { drinkMap[d.id] = d; });

    let totalUnits = 0, totalRevenue = 0;
    const drinkStats = drinks.map((d: any) => {
      const units = drinkTotals[d.id] || 0;
      const revenue = units * d.price_per_unit;
      totalUnits += units;
      totalRevenue += revenue;
      return { ...d, units, revenue };
    }).sort((a: any, b: any) => b.units - a.units);

    // Best day
    const dayAvgs = DAYS.map((_, i) => ({
      day: i,
      avg: dayCounts[i] > 0 ? Math.round(dayTotals[i] / dayCounts[i]) : 0,
      total: dayTotals[i],
    }));
    const maxDay = Math.max(...dayAvgs.map(d => d.avg));

    // Restock suggestions
    const stockMap: Record<string, number> = {};
    stock.forEach((s: any) => { stockMap[s.id] = s.quantity; });
    const suggestions = drinkStats
      .filter((d: any) => {
        const avgDaily = records.length > 0
          ? Math.round((drinkTotals[d.id] || 0) / Math.max(records.length, 1))
          : 0;
        const days = avgDaily > 0 ? Math.round(stockMap[d.id] / avgDaily) : 999;
        return days < 7 && stockMap[d.id] < 200;
      })
      .map((d: any) => {
        const avgDaily = Math.round((drinkTotals[d.id] || 0) / Math.max(records.length, 1));
        const days = avgDaily > 0 ? Math.round(stockMap[d.id] / avgDaily) : 0;
        return { ...d, avgDaily, daysLeft: days };
      });

    setData({ totalUnits, totalRevenue, drinkStats, dayAvgs, maxDay, suggestions, monthLabel: yearMonth, daysRecorded: records.length });
  };

  if (!activeUser || !data) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Text style={s.emptyText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const maxBar = Math.max(...data.drinkStats.map((d: any) => d.units), 1);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topbar}>
        <Text style={s.topTitle}>{data.monthLabel}</Text>
        <Text style={s.topSub}>{data.daysRecorded} days recorded</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* Stats */}
        <View style={s.statRow}>
          <View style={s.statCard}>
            <Text style={s.statVal}>{data.totalUnits.toLocaleString()}</Text>
            <Text style={s.statLbl}>Units sold</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statVal}>{Math.round(data.totalRevenue).toLocaleString()}</Text>
            <Text style={s.statLbl}>Revenue (dh)</Text>
          </View>
        </View>

        {/* Restock suggestions */}
        {data.suggestions.length > 0 && (
          <>
            <Text style={s.secTitle}>Restock suggestions</Text>
            {data.suggestions.map((d: any) => (
              <View key={d.id} style={[s.alertCard, { borderColor: 'rgba(239,159,39,0.3)', backgroundColor: 'rgba(239,159,39,0.07)' }]}>
                <Text style={[s.alertTitle, { color: '#FAC775' }]}>{d.name}</Text>
                <Text style={s.alertSub}>~{d.daysLeft} days left at current pace</Text>
                <TouchableOpacity onPress={() => router.push('/restock')}>
                  <Text style={[s.alertLink, { color: C.amber }]}>Restock now →</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Sales bar chart */}
        <Text style={s.secTitle}>Sales by drink</Text>
        <View style={s.card}>
          {data.drinkStats.map((d: any) => (
            <View key={d.id} style={s.barRow}>
              <Text style={s.barLabel} numberOfLines={1}>{d.name.replace('Fritz Kola ', 'FK ')}</Text>
              <View style={s.barTrack}>
                <View style={[s.barFill, {
                  width: `${Math.round((d.units / maxBar) * 100)}%`,
                  backgroundColor: d.color_hex,
                }]} />
              </View>
              <Text style={s.barVal}>{d.units}</Text>
            </View>
          ))}
        </View>

        {/* Best day chart */}
        <Text style={s.secTitle}>Best day of week</Text>
        <View style={s.card}>
          {data.dayAvgs.map((d: any) => {
            const isBest = d.avg === data.maxDay && data.maxDay > 0;
            return (
              <View key={d.day} style={s.barRow}>
                <Text style={[s.barLabel, { width: 32 }]}>{DAYS[d.day]}</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, {
                    width: data.maxDay > 0 ? `${Math.round((d.avg / data.maxDay) * 100)}%` : '0%',
                    backgroundColor: isBest ? C.pink : C.green,
                  }]} />
                </View>
                <Text style={[s.barVal, isBest && { color: C.pink, fontWeight: '700' }]}>
                  {d.avg}
                </Text>
              </View>
            );
          })}
          {data.maxDay > 0 && (
            <View style={[s.insightCard, { borderColor: 'rgba(212,83,126,0.2)', backgroundColor: 'rgba(212,83,126,0.07)' }]}>
              <Text style={[s.insightTitle, { color: '#ED93B1' }]}>
                {DAYS[data.dayAvgs.findIndex((d: any) => d.avg === data.maxDay)]} kaytbi3 akthar
              </Text>
              <Text style={s.insightSub}>
                Avg {data.maxDay} units — zid stock nhar li 9blou
              </Text>
            </View>
          )}
        </View>

        {/* Export CTA */}
        <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/export')}>
          <Text style={s.btnPrimaryText}>Export this month</Text>
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
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 0.5, borderBottomColor: C.border },
  topTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  topSub: { fontSize: 11, color: C.green },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: C.s1, borderRadius: 12, padding: 12,
    borderWidth: 0.5, borderColor: C.border },
  statVal: { fontSize: 22, fontWeight: '700', color: C.text },
  statLbl: { fontSize: 10, color: C.text2, marginTop: 2 },
  secTitle: { fontSize: 10, fontWeight: '600', color: C.text3, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 8 },
  card: { backgroundColor: C.s1, borderRadius: 12, borderWidth: 0.5,
    borderColor: C.border, padding: 12, marginBottom: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  barLabel: { fontSize: 10, color: C.text2, width: 72, textAlign: 'right' },
  barTrack: { flex: 1, height: 14, backgroundColor: C.s2, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barVal: { fontSize: 10, color: C.text2, width: 32, fontFamily: 'monospace' },
  alertCard: { borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 0.5 },
  alertTitle: { fontSize: 12, fontWeight: '600' },
  alertSub: { fontSize: 11, color: C.text2, marginTop: 2 },
  alertLink: { fontSize: 11, fontWeight: '600', marginTop: 5 },
  insightCard: { borderRadius: 8, padding: 9, marginTop: 6, borderWidth: 0.5 },
  insightTitle: { fontSize: 12, fontWeight: '600' },
  insightSub: { fontSize: 11, color: C.text2, marginTop: 2 },
  btnPrimary: { backgroundColor: C.green, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
