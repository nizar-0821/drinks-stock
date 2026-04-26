import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { getStockForUser, saveSalesRecord } from '../../src/db/database';

const C = {
  bg: '#0D0D0E', s1: '#1A1A1C', s2: '#222224',
  border: 'rgba(255,255,255,0.08)', border2: 'rgba(255,255,255,0.14)',
  text: '#EFEFEF', text2: '#888', text3: '#555',
  green: '#1D9E75', amber: '#EF9F27', red: '#E24B4A',
};

export default function Sales() {
  const activeUser = useStore(s => s.activeUser);
  const setLastSalesRecordId = useStore(s => s.setLastSalesRecordId);
  const [drinks, setDrinks] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!activeUser) return;
    const data = getStockForUser(activeUser.id);
    setDrinks(data);
    const init: Record<string, number> = {};
    data.forEach((d: any) => { init[d.id] = 0; });
    setValues(init);
  }, [activeUser]));

  const adj = (id: string, delta: number) => {
    setValues(v => ({ ...v, [id]: Math.max(0, (v[id] || 0) + delta) }));
  };

  const total = Object.values(values).reduce((a, b) => a + b, 0);

  const handleConfirm = () => {
    if (!activeUser || total === 0) return;
    setSaving(true);
    try {
      const entries = drinks
        .filter(d => (values[d.id] || 0) > 0)
        .map(d => ({ drinkId: d.id, unitsSold: values[d.id] }));
      const recordId = saveSalesRecord(activeUser.id, entries);
      setLastSalesRecordId(recordId);
      router.push('/confirm');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!activeUser) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Text style={s.emptyText}>No user logged in</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard')}>
          <Text style={s.back}>← Stock</Text>
        </TouchableOpacity>
        <Text style={s.topTitle}>Today's Sales</Text>
        <Text style={s.topDate}>
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <Text style={s.secTitle}>Units sold per drink</Text>
        <View style={s.drinksList}>
          {drinks.map((d, i) => (
            <View key={d.id} style={[s.row, i === drinks.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={s.rowLeft}>
                <View style={[s.dot, { backgroundColor: d.color_hex }]} />
                <View>
                  <Text style={s.drinkName}>{d.name}</Text>
                  <Text style={[s.drinkSub, d.quantity < 200 && { color: '#FAC775' }]}>
                    stock: {d.quantity}{d.quantity < 200 ? ' ⚠' : ''}
                  </Text>
                </View>
              </View>
              <View style={s.stepper}>
                <TouchableOpacity style={s.stepBtn} onPress={() => adj(d.id, -1)}>
                  <Text style={s.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={s.stepVal}>{values[d.id] || 0}</Text>
                <TouchableOpacity style={s.stepBtn} onPress={() => adj(d.id, 1)}>
                  <Text style={s.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={s.totalBar}>
          <Text style={s.totalLbl}>Total sold today</Text>
          <Text style={s.totalVal}>{total} units</Text>
        </View>

        <TouchableOpacity
          style={[s.btnPrimary, total === 0 && s.btnDisabled]}
          onPress={handleConfirm}
          disabled={total === 0 || saving}
        >
          <Text style={s.btnPrimaryText}>
            {saving ? 'Saving...' : 'Confirm & update stock'}
          </Text>
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
  back: { fontSize: 13, color: C.green, fontWeight: '500', width: 60 },
  topTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  topDate: { fontSize: 11, color: C.green, width: 60, textAlign: 'right' },
  secTitle: { fontSize: 10, fontWeight: '600', color: C.text3, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 8 },
  drinksList: { backgroundColor: C.s1, borderRadius: 12, borderWidth: 0.5,
    borderColor: C.border, marginBottom: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  drinkName: { fontSize: 13, fontWeight: '600', color: C.text },
  drinkSub: { fontSize: 10, color: C.text2, marginTop: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.s2,
    borderWidth: 0.5, borderColor: C.border2, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 18, color: C.text, fontWeight: '400', lineHeight: 22 },
  stepVal: { fontSize: 16, fontWeight: '700', color: C.text, minWidth: 28, textAlign: 'center' },
  totalBar: { backgroundColor: C.s1, borderRadius: 12, padding: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, borderWidth: 0.5, borderColor: C.border },
  totalLbl: { fontSize: 12, color: C.text2 },
  totalVal: { fontSize: 18, fontWeight: '700', color: C.text },
  btnPrimary: { backgroundColor: C.green, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.35 },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
