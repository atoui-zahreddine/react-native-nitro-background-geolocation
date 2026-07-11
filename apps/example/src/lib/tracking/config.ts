import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LocationAccuracy,
  LocationProvider,
  type ConfigureOptions,
} from 'react-native-nitro-background-geolocation';

/**
 * The "long-tracking defaults": balanced accuracy/battery baseline for
 * multi-hour sessions. Seeds the stored settings on first launch and is what
 * "Reset to long-tracking defaults" restores.
 *
 * Notes:
 * - Android runs a foreground service with a visible notification, which is
 *   what keeps location flowing with only while-in-use permission — no
 *   ACCESS_BACKGROUND_LOCATION needed.
 * - `stopOnTerminate: false` keeps recording after the app is killed.
 */
export const LONG_TRACKING_BASELINE: ConfigureOptions = {
  locationProvider: LocationProvider.DISTANCE_FILTER,
  desiredAccuracy: LocationAccuracy.HIGH,
  distanceFilter: 25,
  stationaryRadius: 25,
  interval: 30000,
  fastestInterval: 15000,
  activitiesInterval: 30000,
  stopOnTerminate: false,
  startOnBoot: false,
  startForeground: true,
  notificationsEnabled: true,
  notificationTitle: 'Route tracker',
  notificationText: 'Recording your route',
  activityType: 'OtherNavigation',
  pauseLocationUpdates: false,
  saveBatteryOnBackground: false,
  maxLocations: 10000,
  debug: false,
};

const CONFIG_KEY = 'tracker.config';

/** Stored settings merged over the baseline (missing keys fall back). */
export async function loadStoredConfig(): Promise<ConfigureOptions> {
  const raw = await AsyncStorage.getItem(CONFIG_KEY);
  if (raw === null) {
    return { ...LONG_TRACKING_BASELINE };
  }
  try {
    const stored = JSON.parse(raw) as ConfigureOptions;
    return { ...LONG_TRACKING_BASELINE, ...stored };
  } catch {
    return { ...LONG_TRACKING_BASELINE };
  }
}

export async function saveStoredConfig(config: ConfigureOptions): Promise<void> {
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function resetStoredConfig(): Promise<void> {
  await AsyncStorage.removeItem(CONFIG_KEY);
}
