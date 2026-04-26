import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, TextInput, Alert
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useStore } from '../src/store/useStore';
import { getStockForUser, saveRestockRecord } from '../src/db/database';

const C = {
  bg: '#0D0D0E', s1: '#1A1A1C', s2: '#222224',
  border: 'rgba(255,255,255,0.08)', border2: 'rgba(255,255,255,0.14)',
  text: '#EFEFEF', text2: '#888', text3: '#555',
  green: '#1D9E75', amber: '#EF9F27', red: '#E24B4A',
};

type Mode = 'add' | 'set';

export default function RestockScreen() {
  const activeUser = useStore(s => s.activeUser);
  const [drinks, setDrinks] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<Mode>('add');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!activeUser) return;
    const data = getStockForUser(activeUser.id);
    setDrinks(data);
    const init: Record<string, string> = {};
    data.forEach((d: any) => { init[d.id] = mode === 'add' ? '0' : String(d.quantity); });
    setValues(init);
  }, [activeUser, mode]));

  const switchMode = (m: Mode) => {
    setMode(m);
    const init: Record<string, string> = {};
    drinks.forEach(d => { init[d.id] = m === 'add' ? '0' : String(d.quantity); });
    setValues(init);
  };

  const getNewTotal = (d: any) => {
    const v = parseInt(values[d.id] || '0') || 0;
    return mode === 'add' ? d.quantity + v : v;
  };

  const hasChanges = drinks.some(d => {
    const v = parseInt(values[d.id] || '0') || 0;
    return mode === 'add' ? v > 0 : v > 0;
  });

  const handleConfirm = () => {
    if (!activeUser || !hasChanges) return;
    setSaving(true);
    try {
      const entries = drinks
        .filter(d => {
          const v = parseInt(values[d.id] || '0') || 0;
          return mode === 'add' ? v > 0 : v > 0;
        })
        .map(d => {
          const v = parseInt(values[d.id] || '0') || 0;
          const newTotal = mode === 'add' ? d.quantity + v : v;
          return { drinkId: d.id, unitsAdded: mode === 'add' ? v : newTotal - d.quantity, newTotal };
        });
      saveRestockRecord(activeUser.id, entries, mode);
      Alert.alert('Mzyan!', 'Stock updated b njah', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/dashboard') }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Ma9dr ysave restock');
    } finally {
      setSaving(false);
    }
  };

  if (!activeUser) return null;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topbar}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/dashboard')}>
          <Text style={s.back}>← Stock</Text>
        </TouchableOpacity>
        <Text style={s.topTitle}>Restock</Text>
        <Text style={s.topDate}>
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Mode toggle */}
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[s.toggleBtn, mode === 'add' && s.toggleBtnActive]}
            onPress={() => switchMode('add')}
          >
            <Text style={[s.toggleText, mode === 'add' && s.toggleTextActive]}>Add units</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, mode === 'set' && s.toggleBtnActive]}
            onPress={() => switchMode('set')}
          >
            <Text style={[s.toggleText, mode === 'set' && s.toggleTextActive]}>Set new total</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.secTitle}>
          {mode === 'add' ? 'Units to add per drink' : 'New total per drink'}
        </Text>

        <View style={s.drinksList}>
          {drinks.map((d, i) => {
            const isLow = d.quantity < 200;
            const newTotal = getNewTotal(d);
            const changed = mode === 'add'
              ? (parseInt(values[d.id] || '0') || 0) > 0
              : newTotal !== d.quantity;

            return (
              <View key={d.id} style={[s.row, i === drinks.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={s.rowLeft}>
                  <View style={[s.dot, { backgroundColor: d.color_hex }]} />
                  <View>
                    <Text style={s.drinkName}>{d.name}</Text>
                    <Text style={[s.drinkSub, isLow && { color: '#FAC775' }]}>
                      now: {d.quantity}{isLow ? ' ⚠' : ''}
                    </Text>
                  </View>
                </View>
                <View style={s.inputWrap}>
                  <TextInput
                    style={s.input}
                    value={values[d.id] || ''}
                    onChangeText={v => setValues(prev => ({ ...prev, [d.id]: v.replace(/[^0-9]/g, '') }))}
                    keyboardType="numeric"
                    maxLength={5}
                    selectTextOnFocus
                  />
                  <Text style={s.arrow}>→</Text>
                  <Text style={[s.newTotal, changed && { color: C.green }]}>
                    {newTotal}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[s.btnPrimary, !hasChanges && s.btnDisabled]}
          onPress={handleConfirm}
          disabled={!hasChanges || saving}
        >
          <Text style={s.btnPrimaryText}>
            {saving ? 'Saving...' : 'Confirm restock'}
          </Text>
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
  back: { fontSize: 13, color: C.green, fontWeight: '500', width: 60 },
  topTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  topDate: { fontSize: 11, color: C.green, width: 60, textAlign: 'right' },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  toggleBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 0.5,
    borderColor: C.border, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: C.green, borderColor: C.green },
  toggleText: { fontSize: 13, fontWeight: '600', color: C.text2 },
  toggleTextActive: { color: '#fff' },
  secTitle: { fontSize: 10, fontWeight: '600', color: C.text3, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 8 },
  drinksList: { backgroundColor: C.s1, borderRadius: 12, borderWidth: 0.5,
    borderColor: C.border, marginBottom: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  drinkName: { fontSize: 12, fontWeight: '600', color: C.text },
  drinkSub: { fontSize: 10, color: C.text2, marginTop: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { width: 54, height: 32, backgroundColor: C.s2, borderRadius: 8,
    borderWidth: 0.5, borderColor: C.border2, color: C.text,
    fontSize: 13, fontWeight: '700', textAlign: 'center' },
  arrow: { fontSize: 11, color: C.text3 },
  newTotal: { fontSize: 13, fontWeight: '700', color: C.text2, minWidth: 32, textAlign: 'right' },
  btnPrimary: { backgroundColor: C.green, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.35 },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
