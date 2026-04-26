import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, TextInput, Modal
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { getAllDrinks, updateDrink, addDrink } from '../../src/db/database';

const C = {
  bg: '#0D0D0E', s1: '#1A1A1C', s2: '#222224',
  border: 'rgba(255,255,255,0.08)', border2: 'rgba(255,255,255,0.14)',
  text: '#EFEFEF', text2: '#888', text3: '#555',
  green: '#1D9E75', red: '#E24B4A',
};

const COLORS = ['#1D9E75','#7F77DD','#EF9F27','#D4537E','#378ADD','#D85A30','#639922','#C46BA8'];

export default function SettingsScreen() {
  const activeUser = useStore(s => s.activeUser);
  const setActiveUser = useStore(s => s.setActiveUser);
  const [drinks, setDrinks] = useState<any[]>([]);
  const [editDrink, setEditDrink] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);

  useFocusEffect(useCallback(() => {
    setDrinks(getAllDrinks());
  }, []));

  const openEdit = (d: any) => {
    setEditDrink(d);
    setEditName(d.name);
    setEditPrice(String(d.price_per_unit));
    setEditColor(d.color_hex);
  };

  const saveEdit = () => {
    if (!editDrink || !editName.trim() || !editPrice) return;
    updateDrink(editDrink.id, editName.trim(), parseFloat(editPrice), editColor);
    setDrinks(getAllDrinks());
    setEditDrink(null);
  };

  const saveAdd = () => {
    if (!newName.trim() || !newPrice) return;
    addDrink(newName.trim(), parseFloat(newPrice), newColor);
    setDrinks(getAllDrinks());
    setShowAdd(false);
    setNewName(''); setNewPrice(''); setNewColor(COLORS[0]);
  };

  const handleLogout = () => {
    Alert.alert('Switch profile', 'Bghiti tkhrej o tbdl profile?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Switch', style: 'destructive', onPress: () => {
        setActiveUser(null);
        router.replace('/');
      }},
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topbar}>
        <Text style={s.topTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* Current user */}
        {activeUser && (
          <View style={s.userCard}>
            <View style={[s.av, { backgroundColor: activeUser.avatarColor + '33' }]}>
              <Text style={[s.avText, { color: activeUser.avatarColor }]}>{activeUser.initials}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.userName}>{activeUser.name}</Text>
              <Text style={s.userSub}>
                {activeUser.streakDays > 0 ? `🔥 ${activeUser.streakDays} day streak` : 'No streak yet'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={s.switchBtn}>Switch →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Drinks */}
        <Text style={s.secTitle}>Manage drinks</Text>
        <View style={s.card}>
          {drinks.map((d, i) => (
            <View key={d.id} style={[s.drinkRow, i === drinks.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[s.dot, { backgroundColor: d.color_hex }]} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={s.drinkName}>{d.name}</Text>
                <Text style={s.drinkSub}>{d.price_per_unit} dh</Text>
              </View>
              <TouchableOpacity style={s.editBtn} onPress={() => openEdit(d)}>
                <Text style={s.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.addDrinkBtn} onPress={() => setShowAdd(true)}>
          <Text style={s.addDrinkText}>+ Add new drink</Text>
        </TouchableOpacity>

        {/* App prefs */}
        <Text style={s.secTitle}>Preferences</Text>
        <View style={s.card}>
          <View style={[s.prefRow, { borderBottomWidth: 0.5, borderBottomColor: C.border }]}>
            <Text style={s.prefLabel}>Low stock threshold</Text>
            <Text style={s.prefVal}>200 units</Text>
          </View>
          <View style={[s.prefRow, { borderBottomWidth: 0.5, borderBottomColor: C.border }]}>
            <Text style={s.prefLabel}>Currency</Text>
            <Text style={s.prefVal}>DH</Text>
          </View>
          <TouchableOpacity style={s.prefRow} onPress={() => router.push('/notifications')}>
            <Text style={s.prefLabel}>Notifications</Text>
            <Text style={[s.prefVal, { color: C.green }]}>Configure →</Text>
          </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <Text style={s.secTitle}>Account</Text>
        <View style={s.card}>
          <TouchableOpacity style={[s.prefRow, { borderBottomWidth: 0 }]} onPress={handleLogout}>
            <Text style={[s.prefLabel, { color: C.red }]}>Switch profile</Text>
            <Text style={[s.prefVal, { color: C.red }]}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Edit drink modal */}
      <Modal visible={!!editDrink} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Edit Drink</Text>
            <Text style={s.modalLabel}>Name</Text>
            <TextInput style={s.modalInput} value={editName} onChangeText={setEditName} placeholderTextColor={C.text2} />
            <Text style={s.modalLabel}>Price (dh)</Text>
            <TextInput style={s.modalInput} value={editPrice} onChangeText={setEditPrice}
              keyboardType="numeric" placeholderTextColor={C.text2} />
            <Text style={s.modalLabel}>Color</Text>
            <View style={s.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} style={[s.colorDot, { backgroundColor: c },
                  editColor === c && s.colorDotSel]} onPress={() => setEditColor(c)} />
              ))}
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setEditDrink(null)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={saveEdit}>
                <Text style={s.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add drink modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Add New Drink</Text>
            <Text style={s.modalLabel}>Name</Text>
            <TextInput style={s.modalInput} value={newName} onChangeText={setNewName}
              placeholder="ex: Sprite" placeholderTextColor={C.text2} />
            <Text style={s.modalLabel}>Price (dh)</Text>
            <TextInput style={s.modalInput} value={newPrice} onChangeText={setNewPrice}
              keyboardType="numeric" placeholder="25" placeholderTextColor={C.text2} />
            <Text style={s.modalLabel}>Color</Text>
            <View style={s.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} style={[s.colorDot, { backgroundColor: c },
                  newColor === c && s.colorDotSel]} onPress={() => setNewColor(c)} />
              ))}
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowAdd(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalSave, (!newName.trim() || !newPrice) && { opacity: 0.4 }]}
                onPress={saveAdd} disabled={!newName.trim() || !newPrice}>
                <Text style={s.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topbar: { padding: 14, borderBottomWidth: 0.5, borderBottomColor: C.border },
  topTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.s1,
    borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 0.5, borderColor: C.border },
  av: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 14, fontWeight: '700' },
  userName: { fontSize: 14, fontWeight: '600', color: C.text },
  userSub: { fontSize: 11, color: C.text2, marginTop: 2 },
  switchBtn: { fontSize: 12, color: C.green, fontWeight: '600' },
  secTitle: { fontSize: 10, fontWeight: '600', color: C.text3, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 8 },
  card: { backgroundColor: C.s1, borderRadius: 12, borderWidth: 0.5,
    borderColor: C.border, marginBottom: 14, overflow: 'hidden' },
  drinkRow: { flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 0.5, borderBottomColor: C.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
  drinkName: { fontSize: 13, fontWeight: '600', color: C.text },
  drinkSub: { fontSize: 10, color: C.text2, marginTop: 1 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7,
    borderWidth: 0.5, borderColor: C.green },
  editBtnText: { fontSize: 11, color: C.green, fontWeight: '600' },
  addDrinkBtn: { borderWidth: 0.5, borderStyle: 'dashed', borderColor: C.border2,
    borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 16 },
  addDrinkText: { fontSize: 13, color: C.green, fontWeight: '600' },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  prefLabel: { fontSize: 13, color: C.text },
  prefVal: { fontSize: 12, color: C.text2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: C.s1, borderRadius: 20, padding: 20, margin: 12,
    borderWidth: 0.5, borderColor: C.border2 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 14 },
  modalLabel: { fontSize: 11, color: C.text2, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  modalInput: { backgroundColor: C.s2, borderRadius: 10, padding: 12, fontSize: 14,
    color: C.text, borderWidth: 0.5, borderColor: C.border2, marginBottom: 14 },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 16 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSel: { borderWidth: 3, borderColor: C.text },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 0.5,
    borderColor: C.border, alignItems: 'center' },
  modalCancelText: { color: C.text2, fontSize: 14, fontWeight: '600' },
  modalSave: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: C.green, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
