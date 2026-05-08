import type { HybridObject } from 'react-native-nitro-modules';

// --- Enums ---

export enum LocationProvider {
  DISTANCE_FILTER = 0,
  ACTIVITY = 1,
  RAW = 2,
}

export enum ServiceMode {
  BACKGROUND = 0,
  FOREGROUND = 1,
}

export enum AuthorizationStatus {
  NOT_AUTHORIZED = 0,
  AUTHORIZED = 1,
  AUTHORIZED_FOREGROUND = 2,
}

export enum LocationAccuracy {
  HIGH = 0,
  MEDIUM = 100,
  LOW = 1000,
  PASSIVE = 10000,
}

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
}

export enum LocationErrorCode {
  PERMISSION_DENIED = 1,
  LOCATION_UNAVAILABLE = 2,
  TIMEOUT = 3,
}

// --- Structs ---

export interface ConfigureOptions {
  headlessTaskName: string;
  locationProvider?: LocationProvider;
  desiredAccuracy?: LocationAccuracy;
  stationaryRadius?: number;
  debug?: boolean;
  distanceFilter?: number;
  stopOnTerminate?: boolean;
  startOnBoot?: boolean;
  interval?: number;
  fastestInterval?: number;
  activitiesInterval?: number;
  stopOnStillActivity?: boolean;
  notificationsEnabled?: boolean;
  startForeground?: boolean;
  notificationTitle?: string;
  notificationText?: string;
  notificationIconColor?: string;
  notificationIconLarge?: string;
  notificationIconSmall?: string;
  activityType?: string;
  pauseLocationUpdates?: boolean;
  saveBatteryOnBackground?: boolean;
  url?: string;
  syncUrl?: string;
  syncThreshold?: number;
  httpHeaders?: Record<string, string>;
  maxLocations?: number;
  postTemplate?: Record<string, string>;
}

export interface Location {
  id: number;
  provider: string;
  locationProvider: number;
  time: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  altitude: number;
  bearing: number;
  isFromMockProvider: boolean;
  mockLocationsEnabled: boolean;
}

export interface StationaryLocation {
  id: number;
  provider: string;
  locationProvider: number;
  time: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  altitude: number;
  bearing: number;
  isFromMockProvider: boolean;
  mockLocationsEnabled: boolean;
  radius: number;
}

export interface Activity {
  confidence: number;
  type: string;
}

export interface ServiceStatus {
  isRunning: boolean;
  locationServicesEnabled: boolean;
  authorization: AuthorizationStatus;
}

export interface LogEntry {
  id: number;
  timestamp: number;
  level: string;
  message: string;
  stackTrace: string;
}

export interface LocationOptions {
  timeout?: number;
  maximumAge?: number;
  enableHighAccuracy?: boolean;
}

export interface BackgroundGeolocationError {
  code: number;
  message: string;
}

// --- HybridObject ---

export interface NitroBackgroundGeolocation extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  // Lifecycle
  configure(options: ConfigureOptions): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;

  // Location
  getCurrentLocation(options: LocationOptions): Promise<Location>;
  getStationaryLocation(): Promise<StationaryLocation | undefined>;

  // Status
  checkStatus(): Promise<ServiceStatus>;
  getConfig(): Promise<ConfigureOptions>;

  // Storage
  getLocations(): Promise<Location[]>;
  getValidLocations(): Promise<Location[]>;
  getValidLocationsAndDelete(): Promise<Location[]>;
  deleteLocation(locationId: number): Promise<void>;
  deleteAllLocations(): Promise<void>;

  // Sync
  forceSync(): Promise<void>;

  // Logging
  getLogEntries(
    limit: number,
    fromId: number,
    minLevel: LogLevel
  ): Promise<LogEntry[]>;

  // Events — each returns a disposer function
  onLocation(callback: (location: Location) => void): () => void;
  onStationary(callback: (location: StationaryLocation) => void): () => void;
  onActivity(callback: (activity: Activity) => void): () => void;
  onStart(callback: () => void): () => void;
  onStop(callback: () => void): () => void;
  onError(callback: (error: BackgroundGeolocationError) => void): () => void;
  onAuthorization(callback: (status: AuthorizationStatus) => void): () => void;
  onForeground(callback: () => void): () => void;
  onBackground(callback: () => void): () => void;
  onAbortRequested(callback: () => void): () => void;
  onHttpAuthorization(callback: () => void): () => void;

  // Cleanup
  removeAllListeners(): void;
}
