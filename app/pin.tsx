import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getUserById } from '../src/db/database';
import { useStore } from '../src/store/useStore';

const C = {
  bg: '#0D0D0E', surface: '#1A1A1C', border: 'rgba(255,255,255,0.08)',
  text: '#EFEFEF', text2: '#888', green: '#1D9E75', red: '#E24B4A',
};

export default function PinScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [user, setUser] = useState<any>(null);
  const setActiveUser = useStore(s => s.setActiveUser);

  useEffect(() => {
    if (userId) setUser(getUserById(userId));
  }, [userId]);

  useEffect(() => {
    if (pin.length !== 4 || !user) return;
    if (pin === user.pin) {
      setActiveUser({ id: user.id, name: user.name, pin: user.pin,
        avatarColor: user.avatar_color, initials: user.initials,
        streakDays: user.streak_days, createdAt: user.created_at });
      setTimeout(() => router.replace('/(tabs)/dashboard'), 200);
    } else {
      const n = attempts + 1;
      setAttempts(n);
      if (n >= 5) { Alert.alert('Bzaf d les essais', 'Attends o 3awd'); setAttempts(0); }
      setTimeout(() => setPin(''), 500);
    }
  }, [pin, user]);

  if (!user) return (
    <SafeAreaView style={s.container}>
      <Text style={{ color: C.text2, textAlign: 'center', marginTop: 60 }}>Loading...</Text>
    </SafeAreaView>
  );

  const wrong = pin.length === 4 && pin !== user.pin;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Enter PIN</Text>
        <View style={{ width: 48 }} />
      </View>
      <View style={s.body}>
        <View style={s.avWrap}>
          <View style={[s.av, { backgroundColor: user.avatar_color + '33' }]}>
            <Text style={[s.avText, { color: user.avatar_color }]}>{user.initials}</Text>
          </View>
          <Text style={s.name}>{user.name}</Text>
          <Text style={s.sub}>Enter your 4-digit PIN</Text>
        </View>
        <View style={s.dots}>
          {[0,1,2,3].map(i => (
            <View key={i} style={[s.dot, pin.length > i && s.dotOn, wrong && s.dotErr]} />
          ))}
        </View>
        {wrong && <Text style={s.errText}>PIN 8alat — 3awd</Text>}
        <View style={s.pad}>
          {['1','2','3','4','5','6','7','8','9','','0','del'].map((k,i) =>
            k === '' ? <View key={i} style={s.empty} /> : (
              <TouchableOpacity key={i} style={s.key} activeOpacity={0.6}
                onPress={() => k === 'del' ? setPin(p => p.slice(0,-1)) : pin.length < 4 && setPin(p => p+k)}>
                <Text style={s.keyT}>{k === 'del' ? '⌫' : k}</Text>
              </TouchableOpacity>
            )
          )}
        </View>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={s.switch}>Not you? Switch profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 0.5, borderBottomColor: C.border },
  back: { fontSize: 13, color: C.green, fontWeight: '500', width: 48 },
  title: { fontSize: 16, fontWeight: '700', color: C.text },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  avWrap: { alignItems: 'center', marginBottom: 32 },
  av: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avText: { fontSize: 22, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 4 },
  sub: { fontSize: 13, color: C.text2 },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
  dotOn: { backgroundColor: C.green, borderColor: C.green },
  dotErr: { backgroundColor: C.red, borderColor: C.red },
  errText: { color: C.red, fontSize: 13, marginBottom: 12 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 24, maxWidth: 280 },
  key: { width: 72, height: 56, borderRadius: 12, backgroundColor: C.surface,
    borderWidth: 0.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  keyT: { fontSize: 22, fontWeight: '500', color: C.text },
  empty: { width: 72, height: 56 },
  switch: { fontSize: 13, color: C.text2, marginTop: 28 },
});
