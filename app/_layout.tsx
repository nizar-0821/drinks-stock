import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '../src/db/database';

export default function RootLayout() {
  useEffect(() => {
    try {
      initDatabase();
      console.log('Database initialized successfully');
    } catch (e) {
      console.error('DB init error:', e);
    }
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="pin" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="restock" />
        <Stack.Screen name="confirm" />
        <Stack.Screen name="export" />
        <Stack.Screen name="add-profile" />
      </Stack>
    </>
  );
}
