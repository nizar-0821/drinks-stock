import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { createUser } from '../src/db/database';

const COLORS = {
  bg: '#0D0D0E', surface: '#1A1A1C', border: 'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.14)', text: '#EFEFEF', text2: '#888',
  green: '#1D9E75', red: '#E24B4A',
};

const AVATAR_COLORS = ['#1D9E75', '#7F77DD', '#EF9F27', '#D4537E', '#378ADD', '#D85A30'];

export default function AddProfileScreen() {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [step, setStep] = useState<'name' | 'pin' | 'confirm'>('name');

  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Auto-advance: pin filled → go to confirm
  useEffect(() => {
    if (step === 'pin' && pin.length === 4) {
      const t = setTimeout(() => {
        setStep('confirm');
      }, 250);
      return () => clearTimeout(t);
    }
  }, [pin, step]);

  // Auto-save: confirm filled + matches → save
  useEffect(() => {
    if (step === 'confirm' && pinConfirm.length === 4 && pinConfirm === pin) {
      const t = setTimeout(() => {
        try {
          createUser(name.trim(), pin);
          Alert.alert('Mzyan!', `Profile "${name}" tkhla9`, [
            { text: 'OK', onPress: () => router.replace('/') }
          ]);
        } catch (e) {
          Alert.alert('Error', 'Ma9dr ysave profile, 3awd');
        }
      }, 300);
      return () => clearTimeout(t);
    }
  }, [pinConfirm, step, pin, name]);

  // Wrong PIN — reset after 600ms
  useEffect(() => {
    if (step === 'confirm' && pinConfirm.length === 4 && pinConfirm !== pin) {
      const t = setTimeout(() => setPinConfirm(''), 600);
      return () => clearTimeout(t);
    }
  }, [pinConfirm, step, pin]);

  const handleBack = () => {
    if (step === 'confirm') { setPinConfirm(''); setStep('pin'); }
    else if (step === 'pin') { setPin(''); setStep('name'); }
    else router.back();
  };

  const currentIndex = step === 'name' ? 0 : step === 'pin' ? 1 : 2;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Profile</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={styles.progress}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.progressDot, i <= currentIndex && styles.progressDotActive]} />
          ))}
        </View>

        <View style={styles.body}>

          {step === 'name' && (
            <>
              <View style={styles.avatarWrap}>
                <View style={[styles.avatar, { backgroundColor: selectedColor + '33' }]}>
                  <Text style={[styles.avatarText, { color: selectedColor }]}>{initials || '?'}</Text>
                </View>
              </View>
              <Text style={styles.label}>Isem dyalek</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="ex: Yassine"
                placeholderTextColor={COLORS.text2}
                autoFocus
                maxLength={20}
              />
              <Text style={styles.label}>Couleur dyal avatar</Text>
              <View style={styles.colorRow}>
                {AVATAR_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSel]}
                    onPress={() => setSelectedColor(c)}
                  />
                ))}
              </View>
            </>
          )}

          {(step === 'pin' || step === 'confirm') && (
            <>
              <View style={styles.avatarWrap}>
                <View style={[styles.avatar, { backgroundColor: selectedColor + '33' }]}>
                  <Text style={[styles.avatarText, { color: selectedColor }]}>{initials}</Text>
                </View>
                <Text style={styles.stepName}>{name}</Text>
              </View>

              <Text style={styles.label}>
                {step === 'pin' ? 'Chtar PIN dyal 4 arqam' : 'Confirm PIN'}
              </Text>

              <View style={styles.pinRow}>
                {[0, 1, 2, 3].map(i => {
                  const val = step === 'pin' ? pin : pinConfirm;
                  const isWrong = step === 'confirm' && val.length === 4 && val !== pin;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.pinDot,
                        val.length > i && styles.pinDotFilled,
                        isWrong && styles.pinDotError,
                      ]}
                    />
                  );
                })}
              </View>

              {step === 'confirm' && pinConfirm.length === 4 && pinConfirm !== pin && (
                <Text style={styles.errorText}>PIN ma tatfa9ach — 3awd</Text>
              )}

              <NumPad
                value={step === 'pin' ? pin : pinConfirm}
                onChange={step === 'pin' ? setPin : setPinConfirm}
              />
            </>
          )}
        </View>

        {step === 'name' && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btn, name.trim().length < 2 && styles.btnDisabled]}
              onPress={() => { if (name.trim().length >= 2) setStep('pin'); }}
              disabled={name.trim().length < 2}
            >
              <Text style={styles.btnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function NumPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  return (
    <View style={num.pad}>
      {keys.map((k, i) =>
        k === '' ? <View key={i} style={num.empty} /> : (
          <TouchableOpacity
            key={i}
            style={num.key}
            activeOpacity={0.6}
            onPress={() => {
              if (k === 'del') onChange(value.slice(0, -1));
              else if (value.length < 4) onChange(value + k);
            }}
          >
            <Text style={num.keyText}>{k === 'del' ? '⌫' : k}</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  backBtn: { fontSize: 13, color: COLORS.green, fontWeight: '500', width: 48 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  progress: { flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: 14 },
  progressDot: { width: 32, height: 4, borderRadius: 2, backgroundColor: COLORS.surface },
  progressDotActive: { backgroundColor: COLORS.green },
  body: { flex: 1, padding: 20 },
  avatarWrap: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { fontSize: 22, fontWeight: '700' },
  stepName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  label: { fontSize: 11, fontWeight: '500', color: COLORS.text2, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    fontSize: 16, color: COLORS.text, borderWidth: 0.5, borderColor: COLORS.border2, marginBottom: 20,
  },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotSel: { borderWidth: 3, borderColor: COLORS.text },
  pinRow: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginBottom: 28 },
  pinDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border2 },
  pinDotFilled: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  pinDotError: { backgroundColor: COLORS.red, borderColor: COLORS.red },
  errorText: { textAlign: 'center', color: COLORS.red, fontSize: 13, marginBottom: 12 },
  footer: { padding: 16, paddingBottom: 24 },
  btn: { backgroundColor: COLORS.green, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

const num = StyleSheet.create({
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingHorizontal: 20 },
  key: { width: 72, height: 56, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 0.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 22, fontWeight: '500', color: COLORS.text },
  empty: { width: 72, height: 56 },
});
