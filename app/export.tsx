import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Share, Alert, Linking
} from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../src/store/useStore';
import { getSalesForMonth, getAllDrinks, getStockForUser } from '../src/db/database';

const C = {
  bg: '#0D0D0E', s1: '#1A1A1C', s2: '#222224',
  border: 'rgba(255,255,255,0.08)', border2: 'rgba(255,255,255,0.14)',
  text: '#EFEFEF', text2: '#888', text3: '#555',
  green: '#1D9E75', green2: '#5DCAA5', blue: '#378ADD', red: '#E24B4A',
};

export default function ExportScreen() {
  const activeUser = useStore(s => s.activeUser);
  const [preview, setPreview] = useState<any[]>([]);
  const [totals, setTotals] = useState({ units: 0, revenue: 0 });
  const [monthLabel, setMonthLabel] = useState('');

  useEffect(() => {
    if (!activeUser) return;
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    setMonthLabel(monthName);

    const records = getSalesForMonth(activeUser.id, yearMonth);
    const drinks = getAllDrinks();
    const stock = getStockForUser(activeUser.id);
    const stockMap: Record<string, number> = {};
    stock.forEach((s: any) => { stockMap[s.id] = s.quantity; });

    const drinkTotals: Record<string, number> = {};
    records.forEach((r: any) => {
      const entries = JSON.parse(r.entries);
      entries.forEach((e: any) => {
        drinkTotals[e.drinkId] = (drinkTotals[e.drinkId] || 0) + e.unitsSold;
      });
    });

    let totalUnits = 0, totalRevenue = 0;
    const rows = drinks.map((d: any) => {
      const sold = drinkTotals[d.id] || 0;
      const revenue = sold * d.price_per_unit;
      totalUnits += sold;
      totalRevenue += revenue;
      return { ...d, sold, revenue, left: stockMap[d.id] || 0 };
    });

    setPreview(rows);
    setTotals({ units: totalUnits, revenue: Math.round(totalRevenue) });
  }, [activeUser]);

  const buildWhatsAppText = () => {
    const lines = [
      `*Drinks Stock — ${monthLabel}*`,
      `_${activeUser?.name}_`,
      '',
      ...preview.map(d =>
        `${d.name.padEnd(18)} ${String(d.sold).padStart(4)} sold · ${d.left} left`
      ),
      '',
      `Total: ${totals.units.toLocaleString()} units sold`,
      `Revenue: ${totals.revenue.toLocaleString()} dh`,
    ];
    return lines.join('\n');
  };

  const handleWhatsApp = async () => {
    const msg = buildWhatsAppText();
    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // Fallback: native share
      await Share.share({ message: msg, title: `Drinks Stock — ${monthLabel}` });
    }
  };

  const handleShare = async () => {
    const msg = buildWhatsAppText();
    try {
      await Share.share({ message: msg, title: `Drinks Stock — ${monthLabel}` });
    } catch (e) {
      Alert.alert('Error', 'Ma9dr yshar');
    }
  };

  if (!activeUser) return null;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Summary</Text>
        </TouchableOpacity>
        <Text style={s.topTitle}>Export</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* Preview */}
        <Text style={s.secTitle}>Preview — {monthLabel}</Text>
        <View style={s.previewBox}>
          <Text style={s.previewHeader}>{`Drinks Stock — ${monthLabel}`}</Text>
          <Text style={s.previewUser}>{activeUser.name}</Text>
          <View style={s.divider} />
          {preview.map(d => (
            <View key={d.id} style={s.previewRow}>
              <View style={[s.dot, { backgroundColor: d.color_hex }]} />
              <Text style={s.previewName} numberOfLines={1}>{d.name}</Text>
              <Text style={s.previewSold}>{d.sold} sold</Text>
              <Text style={s.previewLeft}>{d.left} left</Text>
            </View>
          ))}
          <View style={s.divider} />
          <View style={s.previewTotalRow}>
            <Text style={s.previewTotalLbl}>Total sold</Text>
            <Text style={s.previewTotalVal}>{totals.units.toLocaleString()} units</Text>
          </View>
          <View style={s.previewTotalRow}>
            <Text style={s.previewTotalLbl}>Revenue</Text>
            <Text style={[s.previewTotalVal, { color: C.green2 }]}>
              {totals.revenue.toLocaleString()} dh
            </Text>
          </View>
        </View>

        {/* Export options */}
        <Text style={s.secTitle}>Send via</Text>

        <TouchableOpacity style={s.exportRow} onPress={handleWhatsApp}>
          <View style={[s.exportIcon, { backgroundColor: 'rgba(29,158,117,0.12)' }]}>
            <Text style={s.exportIconText}>💬</Text>
          </View>
          <View style={s.exportInfo}>
            <Text style={s.exportTitle}>Send via WhatsApp</Text>
            <Text style={s.exportSub}>Pre-formatted message — ready to send</Text>
          </View>
          <Text style={s.exportArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.exportRow} onPress={handleShare}>
          <View style={[s.exportIcon, { backgroundColor: 'rgba(55,138,221,0.12)' }]}>
            <Text style={s.exportIconText}>📤</Text>
          </View>
          <View style={s.exportInfo}>
            <Text style={s.exportTitle}>Share (any app)</Text>
            <Text style={s.exportSub}>Email, Telegram, SMS, or copy text</Text>
          </View>
          <Text style={s.exportArrow}>›</Text>
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
  secTitle: { fontSize: 10, fontWeight: '600', color: C.text3, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 8 },
  previewBox: { backgroundColor: C.s1, borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 0.5, borderColor: C.border },
  previewHeader: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
  previewUser: { fontSize: 11, color: C.green2, fontStyle: 'italic', marginBottom: 8 },
  divider: { height: 0.5, backgroundColor: C.border, marginVertical: 8 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  previewName: { flex: 1, fontSize: 11, color: C.text, fontFamily: 'monospace' },
  previewSold: { fontSize: 11, color: C.text2, width: 60, textAlign: 'right', fontFamily: 'monospace' },
  previewLeft: { fontSize: 11, color: C.text3, width: 50, textAlign: 'right', fontFamily: 'monospace' },
  previewTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  previewTotalLbl: { fontSize: 12, color: C.text2 },
  previewTotalVal: { fontSize: 13, fontWeight: '700', color: C.text },
  exportRow: { flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.s1, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 0.5, borderColor: C.border },
  exportIcon: { width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center' },
  exportIconText: { fontSize: 18 },
  exportInfo: { flex: 1 },
  exportTitle: { fontSize: 13, fontWeight: '600', color: C.text },
  exportSub: { fontSize: 11, color: C.text2, marginTop: 2 },
  exportArrow: { fontSize: 18, color: C.text3 },
});
