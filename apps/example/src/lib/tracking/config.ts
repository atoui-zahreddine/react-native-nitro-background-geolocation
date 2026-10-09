import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  ActivityType,
  CONFIG_DEFAULTS,
  LocationAccuracy,
  LocationProvider,
  ownsField,
  type AppliedConfig,
  type ConfigPlatform,
  type ConfigureOptions,
} from 'react-native-nitro-background-geolocation';
import {
  applyOptions,
  CONFIG_FIELD_PATHS,
  nestConfig,
  readField,
  splitPath,
} from '../config/shape';

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
  tracking: {
    locationProvider: LocationProvider.DISTANCE_FILTER,
    desiredAccuracy: LocationAccuracy.HIGH,
    distanceFilter: 25,
    stationaryRadius: 25,
    interval: 5000,
    fastestInterval: 1000,
    activityType: ActivityType.OtherNavigation,
    pauseLocationUpdates: false,
    saveBatteryOnBackground: false,
  },
  lifecycle: {
    stopOnTerminate: false,
    startOnBoot: false,
  },
  activity: {
    activitiesInterval: 30000,
  },
  notification: {
    startForeground: true,
    notificationsEnabled: true,
    notificationTitle: 'Route tracker',
    notificationText: 'Recording your route',
  },
  storage: {
    maxLocations: 10000,
  },
  debug: {
    debug: false,
  },
};

export const BASELINE_CONFIG: AppliedConfig = applyOptions(
  CONFIG_DEFAULTS,
  LONG_TRACKING_BASELINE
);

const CONFIG_KEY = 'tracker.config';

/** Stored settings applied over the baseline; older flat snapshots are nested. */
export async function loadStoredConfig(): Promise<AppliedConfig> {
  const raw = await AsyncStorage.getItem(CONFIG_KEY);
  if (raw === null) {
    return BASELINE_CONFIG;
  }
  try {
    return applyOptions(BASELINE_CONFIG, nestConfig(JSON.parse(raw)));
  } catch {
    return BASELINE_CONFIG;
  }
}

export async function saveStoredConfig(config: AppliedConfig): Promise<void> {
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export async function resetStoredConfig(): Promise<void> {
  await AsyncStorage.removeItem(CONFIG_KEY);
}

/** Only the fields this platform reads, so configure() drops nothing. */
export function ownedOptions(config: AppliedConfig): ConfigureOptions {
  const platform = Platform.OS as ConfigPlatform;
  const options: Record<string, Record<string, unknown>> = {};
  for (const path of CONFIG_FIELD_PATHS) {
    if (ownsField(platform, path)) {
      const [group, field] = splitPath(path);
      options[group] = { ...options[group], [field]: readField(config, path) };
    }
  }
  return options as ConfigureOptions;
}
