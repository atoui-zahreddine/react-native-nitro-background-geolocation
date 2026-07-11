import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import BackgroundGeolocation from 'react-native-nitro-background-geolocation';
import { loadStoredConfig } from '../lib/tracking/config';

export default function RootLayout() {
  // Apply the persisted settings once per launch, but never touch a live
  // session (relaunch mid-session must not reconfigure the running service).
  useEffect(() => {
    (async () => {
      try {
        const status = await BackgroundGeolocation.checkStatus();
        if (!status.isRunning) {
          await BackgroundGeolocation.configure(await loadStoredConfig());
        }
      } catch (error) {
        console.warn('[App] configure on launch failed:', error);
      }
    })();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="settings"
          options={{ headerShown: true, title: 'Settings' }}
        />
        <Stack.Screen
          name="history"
          options={{ headerShown: true, title: 'History' }}
        />
        <Stack.Screen
          name="session/[id]"
          options={{ headerShown: true, title: 'Session' }}
        />
      </Stack>
    </>
  );
}
