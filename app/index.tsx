import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { getAllUsers } from '../src/db/database';

const COLORS = {
  bg: '#0D0D0E', surface: '#1A1A1C', border: 'rgba(255,255,255,0.08)',
  text: '#EFEFEF', text2: '#888', green: '#1D9E75', green2: '#5DCAA5',
};

export default function LaunchScreen() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    setUsers(getAllUsers() as any[]);
  }, []);

  const handleSelectUser = (user: any) => {
    router.push({ pathname: '/pin', params: { userId: user.id, userName: user.name, avatarColor: user.avatar_color, initials: user.initials } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Drinks Stock</Text>
        <Text style={styles.subtitle}>Select your profile</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.userCard} onPress={() => handleSelectUser(item)}>
            <View style={[styles.avatar, { backgroundColor: item.avatar_color + '33' }]}>
              <Text style={[styles.avatarText, { color: item.avatar_color }]}>{item.initials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userSub}>Streak: {item.streak_days} days</Text>
            </View>
            {item.streak_days > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>🔥 {item.streak_days}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addCard}
            onPress={() => router.push('/add-profile')}>
            <Text style={styles.addText}>+ Add new profile</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 24, paddingTop: 32, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.text2 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 0.5, borderColor: COLORS.border },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  userSub: { fontSize: 11, color: COLORS.text2, marginTop: 2 },
  streakBadge: { backgroundColor: 'rgba(239,159,39,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  streakText: { fontSize: 11, fontWeight: '600', color: '#FAC775' },
  addCard: { borderWidth: 0.5, borderStyle: 'dashed', borderColor: COLORS.border,
    borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4 },
  addText: { fontSize: 13, color: COLORS.green, fontWeight: '600' },
});