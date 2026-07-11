import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

type TabIconProps = { color: string; size: number };

function TrackerTabIcon({ color, size }: TabIconProps) {
  return <Ionicons name="navigate" size={size} color={color} />;
}

function DebugTabIcon({ color, size }: TabIconProps) {
  return <Ionicons name="bug" size={size} color={color} />;
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
