import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Animated
} from 'react-native';
import { router } from 'expo-router';
import { useStore } from '../src/store/useStore';
import { getStockForUser, deleteSalesRecord } from '../src/db/database';

const C = {
  bg: '#0D0D0E', s1: '#1A1A1C', s2: '#222224', s3: '#2C2C2F',
  border: 'rgba(255,255,255,0.08)', border2: 'rgba(255,255,255,0.14)',
  text: '#EFEFEF', text2: '#888', text3: '#555',
  green: '#1D9E75', green2: '#5DCAA5', amber: '#EF9F27', red: '#E24B4A',
};

const UNDO_SECONDS = 5;

export default function ConfirmScreen() {
  const activeUser = useStore(s => s.activeUser);
  const lastSalesRecordId = useStore(s => s.lastSalesRecordId);
  const setLastSalesRecordId = useStore(s => s.setLastSalesRecordId);
  const [stock, setStock] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(UNDO_SECONDS);
  const [undone, setUndone] = useState(false);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (activeUser) setStock(getStockForUser(activeUser.id));
  }, [activeUser]);

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progress, {
      toValue: 0,
      duration: UNDO_SECONDS * 1000,
      useNativeDriver: false,
    }).start();

    // Countdown
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleUndo = () => {
    if (!activeUser || !lastSalesRecordId) return;
    deleteSalesRecord(lastSalesRecordId, activeUser.id);
    setLastSalesRecordId(null);
    setUndone(true);
    setTimeout(() => router.replace('/(tabs)/sales'), 800);
  };

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topbar}>
        <Text style={s.topTitle}>Drinks Stock</Text>
        <Text style={s.topDate}>
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* Success banner */}
        <View style={s.successBanner}>
          <Text style={s.successTitle}>
            {undone ? 'Sales entry undone ↩' : '✓ Sales confirmed for today'}
          </Text>
          <Text style={s.successSub}>
            {undone ? 'Redirecting to sales...' : 'Stock updated automatically'}
          </Text>
        </View>

        {/* Undo bar */}
        {!undone && timeLeft > 0 && (
          <View style={s.undoBar}>
            <View style={{ flex: 1 }}>
              <Text style={s.undoLabel}>Made a mistake?</Text>
              <View style={s.undoTrack}>
                <Animated.View style={[s.undoFill, { width: barWidth }]} />
              </View>
            </View>
            <View style={s.undoRight}>
              <Text style={s.undoTimer}>{timeLeft}s</Text>
              <TouchableOpacity onPress={handleUndo}>
                <Text style={s.undoBtn}>Undo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Updated stock */}
        <Text style={s.secTitle}>Updated stock</Text>
        <View style={s.drinksList}>
          {stock.map((d, i) => {
            const isLow = d.quantity < 200;
            const isCrit = d.quantity < 50;
            const pillColor = isCrit ? '#F09595' : isLow ? '#FAC775' : '#5DCAA5';
            const pillBg = isCrit ? 'rgba(226,75,74,0.15)' : isLow ? 'rgba(239,159,39,0.15)' : 'rgba(29,158,117,0.15)';
            return (
              <View key={d.id} style={[s.row, i === stock.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={s.rowLeft}>
                  <View style={[s.dot, { backgroundColor: d.color_hex }]} />
                  <View>
                    <Text style={s.drinkName}>{d.name}</Text>
                    <Text style={[s.drinkSub, { color: C.text3 }]}>
                      → {d.quantity} left
                    </Text>
                  </View>
                </View>
                <View style={[s.pill, { backgroundColor: pillBg }]}>
                  <Text style={[s.pillText, { color: pillColor }]}>
                    {isCrit ? 'Critical' : isLow ? 'Low ⚠' : 'OK'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={s.btnPrimary} onPress={() => router.replace('/(tabs)/dashboard')}>
          <Text style={s.btnPrimaryText}>Back to dashboard</Text>
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
  topTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  topDate: { fontSize: 11, color: C.text2 },
  successBanner: { backgroundColor: 'rgba(29,158,117,0.08)', borderRadius: 12,
    padding: 12, marginBottom: 10, borderWidth: 0.5, borderColor: 'rgba(29,158,117,0.25)' },
  successTitle: { fontSize: 14, fontWeight: '600', color: C.green2 },
  successSub: { fontSize: 11, color: C.green, marginTop: 2 },
  undoBar: { backgroundColor: C.s3, borderRadius: 12, padding: 12, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 0.5, borderColor: C.border2 },
  undoLabel: { fontSize: 12, color: C.text2, marginBottom: 6 },
  undoTrack: { height: 3, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  undoFill: { height: '100%', backgroundColor: C.green, borderRadius: 2 },
  undoRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  undoTimer: { fontSize: 11, color: C.text3 },
  undoBtn: { fontSize: 14, color: C.green, fontWeight: '700' },
  secTitle: { fontSize: 10, fontWeight: '600', color: C.text3, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 8 },
  drinksList: { backgroundColor: C.s1, borderRadius: 12, borderWidth: 0.5,
    borderColor: C.border, marginBottom: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  drinkName: { fontSize: 13, fontWeight: '600', color: C.text },
  drinkSub: { fontSize: 10, marginTop: 1 },
  pill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '600' },
  btnPrimary: { backgroundColor: C.green, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
