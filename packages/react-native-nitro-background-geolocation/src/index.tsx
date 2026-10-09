import { Platform } from 'react-native';
import { NitroModules } from 'react-native-nitro-modules';
import type {
  ConfigureOptions,
  NitroBackgroundGeolocation,
} from './NitroBackgroundGeolocation.nitro';
import { CONFIG_FIELDS, foreignFields, type ConfigPlatform } from './contract';

export {
  registerHeadlessHandler,
  type HeadlessEvent,
  type HeadlessHandler,
} from './headless';

// Re-export all enums
export {
  LocationProvider,
  ActivityType,
  AuthorizationStatus,
  LocationAccuracy,
  NativeLogLevel as LogLevel,
  LocationErrorCode,
} from './NitroBackgroundGeolocation.nitro';

export {
  CONFIG_DEFAULTS,
  CONFIG_FIELDS,
  CONFIG_GROUPS,
  LOCATION_OPTIONS_DEFAULTS,
  foreignFields,
  ownsField,
  type ConfigFieldMeta,
  type ConfigFieldPath,
  type ConfigGroupName,
  type ConfigPlatform,
  type ConfigRange,
} from './contract';

export type {
  AppliedConfig,
  ConfigureOptions,
  TrackingOptions,
  TrackingConfig,
  LifecycleOptions,
  LifecycleConfig,
  ActivityOptions,
  ActivityConfig,
  NotificationOptions,
  NotificationConfig,
  HttpOptions,
  HttpConfig,
  StorageOptions,
  StorageConfig,
  DebugOptions,
  DebugConfig,
  Location,
  StationaryLocation,
  Activity,
  ServiceStatus,
  LogEntry,
  LocationOptions,
  BackgroundGeolocationError,
} from './NitroBackgroundGeolocation.nitro';

let instance: NitroBackgroundGeolocation | null = null;

function getInstance(): NitroBackgroundGeolocation {
  if (instance == null) {
    instance = NitroModules.createHybridObject<NitroBackgroundGeolocation>(
      'NitroBackgroundGeolocation'
    );
  }
  return instance;
}

type OwnMethods = Omit<
  NitroBackgroundGeolocation,
  'name' | 'toString' | 'equals' | 'dispose' | '__type'
>;

function forward<M extends keyof OwnMethods>(method: M): OwnMethods[M] {
  return ((...args: any[]) => {
    const inst = getInstance();
    return (inst[method] as (...a: any[]) => any)(...args);
  }) as OwnMethods[M];
}

function warnForeignWrites(options: ConfigureOptions): void {
  const platform = Platform.OS as ConfigPlatform;
  for (const path of foreignFields(platform, options)) {
    const owners = CONFIG_FIELDS[path]?.platforms.join(', ') ?? 'no platform';
    console.warn(
      `[BackgroundGeolocation] ${path} is read only on ${owners}; ${platform} drops it.`
    );
  }
}

const BackgroundGeolocation: OwnMethods = {
  // Lifecycle
  configure: (options) => {
    if (__DEV__) warnForeignWrites(options);
    return getInstance().configure(options);
  },
  start: forward('start'),
  stop: forward('stop'),

  // Location
  getCurrentLocation: forward('getCurrentLocation'),
  getStationaryLocation: forward('getStationaryLocation'),

  // Status
  checkStatus: forward('checkStatus'),
  getConfig: forward('getConfig'),
  showAppSettings: forward('showAppSettings'),
  showLocationSettings: forward('showLocationSettings'),

  // Storage
  getLocations: forward('getLocations'),
  getValidLocations: forward('getValidLocations'),
  getValidLocationsAndDelete: forward('getValidLocationsAndDelete'),
  deleteLocation: forward('deleteLocation'),
  deleteAllLocations: forward('deleteAllLocations'),

  // Sync
  forceSync: forward('forceSync'),

  // Logging
  getLogEntries: forward('getLogEntries'),

  // Events
  onLocation: forward('onLocation'),
  onStationary: forward('onStationary'),
  onActivity: forward('onActivity'),
  onStart: forward('onStart'),
  onStop: forward('onStop'),
  onError: forward('onError'),
  onAuthorization: forward('onAuthorization'),
  onForeground: forward('onForeground'),
  onBackground: forward('onBackground'),
  onAbortRequested: forward('onAbortRequested'),
  onHttpAuthorization: forward('onHttpAuthorization'),

  // Cleanup
  removeAllListeners: forward('removeAllListeners'),
};

export default BackgroundGeolocation;
