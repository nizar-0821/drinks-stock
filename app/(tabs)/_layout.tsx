import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D0D0E',
          borderTopColor: 'rgba(255,255,255,0.08)',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#1D9E75',
        tabBarInactiveTintColor: '#444',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'cube';

          if (route.name === 'dashboard') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'sales') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'summary') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Stock' }} />
      <Tabs.Screen name="sales" options={{ title: 'Sales' }} />
      <Tabs.Screen name="summary" options={{ title: 'Summary' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
