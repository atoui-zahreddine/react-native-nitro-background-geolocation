import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

// The tab bar passes its tint colour, which is a plain string here; the icon
// library's colour type is narrower than React Native's ColorValue.
type TabIconProps = { color: ColorValue; size: number };

function TrackerTabIcon({ color, size }: TabIconProps) {
  return <Ionicons name="navigate" size={size} color={color as string} />;
}

function DebugTabIcon({ color, size }: TabIconProps) {
  return <Ionicons name="bug" size={size} color={color as string} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366f1',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tracker',
          tabBarIcon: TrackerTabIcon,
        }}
      />
      <Tabs.Screen
        name="debug"
        options={{
          title: 'Debug',
          tabBarIcon: DebugTabIcon,
        }}
      />
    </Tabs>
  );
}
