import { NitroModules } from 'react-native-nitro-modules';
import type { NitroBackgroundGeolocation } from './NitroBackgroundGeolocation.nitro';

// Re-export all enums
export {
  LocationProvider,
  ServiceMode,
  AuthorizationStatus,
  LocationAccuracy,
  NativeLogLevel as LogLevel,
  LocationErrorCode,
} from './NitroBackgroundGeolocation.nitro';

export type {
  ConfigureOptions,
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

const BackgroundGeolocation: OwnMethods = {
  // Lifecycle
  configure: forward('configure'),
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
