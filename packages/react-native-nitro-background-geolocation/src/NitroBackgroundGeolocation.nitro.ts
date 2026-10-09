import type { AnyMap, HybridObject } from 'react-native-nitro-modules';

// --- Enums ---

/**
 * Selects which native location provider strategy should be used.
 */
export enum LocationProvider {
  /**
   * Uses the classic distance-filter provider with Stationary API and an elastic
   * distance filter for optimal battery and data usage.
   */
  DISTANCE_FILTER = 0,
  /**
   * Uses activity recognition together with fused location updates.
   * Best suited for foreground-style tracking.
   */
  ACTIVITY = 1,
  /**
   * Returns raw sensor/device locations without additional provider-side processing.
   */
  RAW = 2,
}

/**
 * Authorization status reported by the native layer.
 */
export enum AuthorizationStatus {
  /**
   * Location access is not authorized.
   */
  NOT_AUTHORIZED = 0,
  /**
   * Authorized to run in background and foreground.
   */
  AUTHORIZED = 1,
  /**
   * Foreground-only authorization.
   * Reserved for platforms that expose this distinction.
   *
   * - **Platform:** iOS-only in the underlying Cordova model
   */
  AUTHORIZED_FOREGROUND = 2,
}

/**
 * Desired location accuracy in meters.
 * Lower accuracy generally means lower power drain.
 */
export enum LocationAccuracy {
  /**
   * Highest accuracy.
   */
  HIGH = 0,
  /**
   * Medium accuracy.
   */
  MEDIUM = 100,
  /**
   * Low accuracy.
   */
  LOW = 1000,
  /**
   * Passive accuracy.
   */
  PASSIVE = 10000,
}

/**
 * Journey hint passed to CoreLocation as its `CLActivityType`.
 * Not activity recognition — see the `activity` config group for that.
 */
export enum ActivityType {
  /** Driving in a vehicle on roads. */
  AutomotiveNavigation = 0,
  /** Other navigation, such as by boat, train or plane. */
  OtherNavigation = 1,
  /** Walking, running or cycling. */
  Fitness = 2,
  /** No specific journey type. */
  Other = 3,
}

/**
 * Minimum log severity for log retrieval.
 * Use this to filter native log records from most verbose (`TRACE`) to least verbose (`ERROR`).
 */
export enum NativeLogLevel {
  /** Most verbose diagnostic logging. */
  TraceValue = 0,
  /** Debug-level logging for development and investigation. */
  DebugValue = 1,
  /** General informational logging. */
  InfoValue = 2,
  /** Warning-level logging for recoverable problems. */
  WarnValue = 3,
  /** Error-level logging for failures. */
  ErrorValue = 4,
}

/**
 * Error codes returned by `getCurrentLocation()`.
 */
export enum LocationErrorCode {
  /**
   * Request failed due to missing permissions.
   */
  PERMISSION_DENIED = 1,
  /**
   * The internal location source returned an error.
   */
  LOCATION_UNAVAILABLE = 2,
  /**
   * The request exceeded the configured timeout.
   */
  TIMEOUT = 3,
}

export type NullableHeaders = Record<string, string> | null;
export type NullableAnyMap = AnyMap | null;

// --- Config Contract ---

/**
 * The Config Contract: the single authored declaration of every configuration
 * field. Public types, published defaults, both native mappers, the native
 * default constants and the docs tables all derive from it. A configuration fact
 * written anywhere else is a bug.
 *
 * Rules this file must keep (each was a real failure, see the wayfinder map):
 *
 * - **No `as const`.** It narrows `default: ''` to the literal type `''`, so no
 *   caller can set a value and nitrogen rejects the derived optional as an
 *   inline union.
 * - `platforms` lists what native actually reads, never what prose claims.
 *   A platform not listed has no `native` binding and drops the write.
 * - A field permitting `null` as a *value* sets `nullable: true`, uses a named
 *   `Nullable*` alias for its default, and declares its Android `nativeType` —
 *   a bare `null` default is untyped in Kotlin.
 * - An enum field names its enum in `enumName`; the default is the enum member.
 * - Every non-primitive field declares a `converter` on **each** platform.
 * - Group struct names are `PascalCase(key) + Options` / `+ Config`, never bare
 *   `Config` or `Options`.
 */
export const TRACKING_CONTRACT = {
  locationProvider: {
    default: LocationProvider.DISTANCE_FILTER,
    enumName: 'LocationProvider',
    platforms: ['android', 'ios'],
    native: {
      android: { key: 'locationProvider' },
      ios: { key: 'locationProvider' },
    },
    description:
      'Native provider strategy. See the provider pages for how each one behaves.',
  },
  desiredAccuracy: {
    default: LocationAccuracy.MEDIUM,
    enumName: 'LocationAccuracy',
    platforms: ['android', 'ios'],
    native: {
      android: { key: 'desiredAccuracy' },
      ios: { key: 'desiredAccuracy' },
    },
    platformNotes: {
      android: 'Maps to a fused location request priority.',
      ios: 'Maps to a CLLocationAccuracy tier.',
    },
    description:
      'Desired accuracy in meters. Lower accuracy usually reduces power drain.',
  },
  stationaryRadius: {
    default: 50,
    platforms: ['android', 'ios'],
    units: 'm',
    native: {
      android: { key: 'stationaryRadius', cast: 'float' },
      ios: { key: 'stationaryRadius' },
    },
    description:
      'Radius in meters the device must leave before aggressive tracking resumes after it stops.',
  },
  distanceFilter: {
    default: 50,
    platforms: ['android', 'ios'],
    units: 'm',
    native: {
      android: { key: 'distanceFilter', cast: 'int' },
      ios: { key: 'distanceFilter' },
    },
    platformNotes: {
      android:
        'The Activity provider ignores it; use interval to control its cadence.',
    },
    description:
      'Base distance in meters between updates. Elastic: the Distance Filter provider adds a speed penalty, so points thin out as speed increases.',
  },
  interval: {
    default: 5000,
    platforms: ['android'],
    units: 'ms',
    native: { android: { key: 'interval', cast: 'int' } },
    description:
      'Minimum time between updates, applied by the OS in every Android provider. Caps the point rate regardless of movement.',
  },
  fastestInterval: {
    default: 1000,
    platforms: ['android'],
    units: 'ms',
    native: { android: { key: 'fastestInterval', cast: 'int' } },
    description:
      'Fastest rate the app accepts updates when other apps request locations faster than interval.',
  },
  pauseLocationUpdates: {
    default: false,
    platforms: ['ios'],
    native: { ios: { key: 'pauseLocationUpdates' } },
    description: 'Let the system pause location updates automatically.',
  },
  saveBatteryOnBackground: {
    default: false,
    platforms: ['ios'],
    native: { ios: { key: 'saveBatteryOnBackground' } },
    description: 'Reduce accuracy in the background to save battery.',
  },
  activityType: {
    default: ActivityType.OtherNavigation,
    enumName: 'ActivityType',
    platforms: ['ios'],
    native: { ios: { key: 'activityType', enumAs: 'name' } },
    description:
      'Journey hint CoreLocation uses to decide when to pause updates. Not activity recognition.',
  },
};

export const LIFECYCLE_CONTRACT = {
  stopOnTerminate: {
    default: true,
    platforms: ['android', 'ios'],
    native: {
      android: { key: 'stopOnTerminate' },
      ios: { key: 'stopOnTerminate' },
    },
    platformNotes: {
      android: '`false` keeps the service alive and runs the headless task.',
      ios: '`false` enables native continuation after the app is terminated.',
    },
    description: 'Stop tracking when the application is terminated.',
  },
  startOnBoot: {
    default: false,
    platforms: ['android'],
    native: { android: { key: 'startOnBoot' } },
    description: 'Start the background service when the device boots.',
  },
};

export const ACTIVITY_CONTRACT = {
  activitiesInterval: {
    default: 10000,
    platforms: ['android', 'ios'],
    units: 'ms',
    native: {
      android: { key: 'activitiesInterval', cast: 'int' },
      ios: { key: 'activitiesInterval' },
    },
    platformNotes: {
      android: 'Rate of the ActivityRecognition API.',
      ios: 'Rate of the motion detector.',
    },
    description:
      'Rate of activity recognition in milliseconds. Larger values save battery but detect changes later.',
  },
  stopOnStillActivity: {
    default: true,
    platforms: ['android'],
    native: { android: { key: 'stopOnStillActivity' } },
    description:
      'Stop location updates when activity recognition reports STILL. Deprecated upstream.',
  },
};

export const NOTIFICATION_CONTRACT = {
  notificationsEnabled: {
    default: true,
    platforms: ['android'],
    native: { android: { key: 'notificationsEnabled' } },
    description:
      'Show local notifications while tracking and syncing locations.',
  },
  startForeground: {
    default: true,
    platforms: ['android'],
    native: { android: { key: 'startForeground' } },
    description:
      'Run the location service in the foreground. A foreground service needs a visible notification.',
  },
  notificationTitle: {
    default: 'Background tracking',
    platforms: ['android'],
    native: { android: { key: 'notificationTitle' } },
    description: 'Title of the foreground service notification.',
  },
  notificationText: {
    default: 'ENABLED',
    platforms: ['android'],
    native: { android: { key: 'notificationText' } },
    description: 'Text of the foreground service notification.',
  },
  notificationIconColor: {
    default: '',
    platforms: ['android'],
    native: { android: { key: 'notificationIconColor' } },
    description:
      'Accent color of the notification, for example `#4CAF50`. Empty uses the system color.',
  },
  notificationIconLarge: {
    default: '',
    platforms: ['android'],
    native: { android: { key: 'largeNotificationIcon' } },
    description:
      'Resource name of a custom large notification icon. Empty uses the app icon.',
  },
  notificationIconSmall: {
    default: '',
    platforms: ['android'],
    native: { android: { key: 'smallNotificationIcon' } },
    description:
      'Resource name of a custom small notification icon. Empty uses the app icon.',
  },
};

export const HTTP_CONTRACT = {
  url: {
    default: '',
    platforms: ['android', 'ios'],
    native: { android: { key: 'url' }, ios: { key: 'url' } },
    description:
      'Server URL that receives immediate HTTP POSTs for recorded locations. Empty disables posting.',
  },
  syncUrl: {
    default: '',
    platforms: ['android', 'ios'],
    native: { android: { key: 'syncUrl' }, ios: { key: 'syncUrl' } },
    description:
      'Server URL that receives batched retries for locations that previously failed to post.',
  },
  syncThreshold: {
    default: 100,
    platforms: ['android', 'ios'],
    range: { min: 1, max: 1000, step: 1, units: 'locations' },
    native: {
      android: { key: 'syncThreshold', cast: 'int' },
      ios: { key: 'syncThreshold' },
    },
    description:
      'Number of failed locations to batch together before syncing to syncUrl.',
  },
  httpHeaders: {
    default: null as NullableHeaders,
    nullable: true,
    nativeType: { android: 'HashMap<String, String>?' },
    platforms: ['android', 'ios'],
    native: {
      android: { key: 'httpHeaders', converter: 'headers' },
      ios: { key: 'httpHeaders', converter: 'headers' },
    },
    description:
      'HTTP headers sent with every location POST. Pass null to send none.',
  },
  postTemplate: {
    default: null as NullableAnyMap,
    nullable: true,
    nativeType: { android: 'LocationTemplate?' },
    platforms: ['android', 'ios'],
    native: {
      android: { key: 'template', converter: 'locationTemplate' },
      ios: { key: 'postTemplate', converter: 'anyMap' },
    },
    description:
      'Custom POST body template for url and syncUrl. Supports placeholders such as @latitude. Pass null for the native default template.',
  },
};

export const STORAGE_CONTRACT = {
  maxLocations: {
    default: 10000,
    platforms: ['android', 'ios'],
    units: 'locations',
    native: {
      android: { key: 'maxLocations', cast: 'int' },
      ios: { key: 'maxLocations' },
    },
    description: 'Maximum number of locations kept in the local database.',
  },
};

export const DEBUG_CONTRACT = {
  debug: {
    default: false,
    platforms: ['android', 'ios'],
    native: {
      android: { key: 'isDebugging', setter: 'setDebugging' },
      ios: { key: 'debug' },
    },
    description:
      'Play sounds and show notifications for lifecycle events. For field testing only.',
  },
};

/**
 * The per-call request surface of `getCurrentLocation()`. Not persisted, so it
 * is not a config group: omission means "use this call's default", not
 * "unchanged", and nothing reads it back.
 */
export const LOCATION_OPTIONS_CONTRACT = {
  timeout: {
    default: 30000,
    platforms: ['android', 'ios'],
    units: 'ms',
    native: {
      android: { key: 'timeout', cast: 'int' },
      ios: { key: 'timeout' },
    },
    description: 'Maximum time to wait for a location fix.',
  },
  maximumAge: {
    default: 0,
    platforms: ['android', 'ios'],
    units: 'ms',
    native: {
      android: { key: 'maximumAge', cast: 'long' },
      ios: { key: 'maximumAge' },
    },
    description:
      'Maximum age of a cached location that is acceptable to return. `0` always requests a fresh fix.',
  },
  enableHighAccuracy: {
    default: false,
    platforms: ['android', 'ios'],
    native: {
      android: { key: 'enableHighAccuracy' },
      ios: { key: 'enableHighAccuracy' },
    },
    description: 'Request the most accurate position the device can provide.',
  },
};

/**
 * Every config group in declaration order. `ConfigureOptions` and
 * `AppliedConfig` carry exactly these keys, which a test enforces.
 */
export const CONFIG_CONTRACT = {
  tracking: TRACKING_CONTRACT,
  lifecycle: LIFECYCLE_CONTRACT,
  activity: ACTIVITY_CONTRACT,
  notification: NOTIFICATION_CONTRACT,
  http: HTTP_CONTRACT,
  storage: STORAGE_CONTRACT,
  debug: DEBUG_CONTRACT,
};

/** A contract field's TypeScript type is the type of its published default. */
type ContractValue<E> = E extends { default: infer D } ? D : never;

// Each group is spelled out rather than produced by a generic helper: nitrogen
// names a struct after the alias it resolves, and a shared generic would give
// all seven groups one name.

export type TrackingOptions = {
  [K in keyof typeof TRACKING_CONTRACT]?: ContractValue<
    (typeof TRACKING_CONTRACT)[K]
  >;
};
export type TrackingConfig = {
  [K in keyof typeof TRACKING_CONTRACT]-?: ContractValue<
    (typeof TRACKING_CONTRACT)[K]
  >;
};
export type LifecycleOptions = {
  [K in keyof typeof LIFECYCLE_CONTRACT]?: ContractValue<
    (typeof LIFECYCLE_CONTRACT)[K]
  >;
};
export type LifecycleConfig = {
  [K in keyof typeof LIFECYCLE_CONTRACT]-?: ContractValue<
    (typeof LIFECYCLE_CONTRACT)[K]
  >;
};
export type ActivityOptions = {
  [K in keyof typeof ACTIVITY_CONTRACT]?: ContractValue<
    (typeof ACTIVITY_CONTRACT)[K]
  >;
};
export type ActivityConfig = {
  [K in keyof typeof ACTIVITY_CONTRACT]-?: ContractValue<
    (typeof ACTIVITY_CONTRACT)[K]
  >;
};
export type NotificationOptions = {
  [K in keyof typeof NOTIFICATION_CONTRACT]?: ContractValue<
    (typeof NOTIFICATION_CONTRACT)[K]
  >;
};
export type NotificationConfig = {
  [K in keyof typeof NOTIFICATION_CONTRACT]-?: ContractValue<
    (typeof NOTIFICATION_CONTRACT)[K]
  >;
};
export type HttpOptions = {
  [K in keyof typeof HTTP_CONTRACT]?: ContractValue<(typeof HTTP_CONTRACT)[K]>;
};
export type HttpConfig = {
  [K in keyof typeof HTTP_CONTRACT]-?: ContractValue<(typeof HTTP_CONTRACT)[K]>;
};
export type StorageOptions = {
  [K in keyof typeof STORAGE_CONTRACT]?: ContractValue<
    (typeof STORAGE_CONTRACT)[K]
  >;
};
export type StorageConfig = {
  [K in keyof typeof STORAGE_CONTRACT]-?: ContractValue<
    (typeof STORAGE_CONTRACT)[K]
  >;
};
export type DebugOptions = {
  [K in keyof typeof DEBUG_CONTRACT]?: ContractValue<
    (typeof DEBUG_CONTRACT)[K]
  >;
};
export type DebugConfig = {
  [K in keyof typeof DEBUG_CONTRACT]-?: ContractValue<
    (typeof DEBUG_CONTRACT)[K]
  >;
};

/** Options for a one-time current location request. */
export type LocationOptions = {
  [K in keyof typeof LOCATION_OPTIONS_CONTRACT]?: ContractValue<
    (typeof LOCATION_OPTIONS_CONTRACT)[K]
  >;
};

// --- Structs ---

/**
 * Configuration as a caller writes it. Every group and field is optional:
 * omitting one leaves it unchanged. Reset a field by passing its published
 * default from `CONFIG_DEFAULTS`.
 */
export interface ConfigureOptions {
  tracking?: TrackingOptions;
  lifecycle?: LifecycleOptions;
  activity?: ActivityOptions;
  notification?: NotificationOptions;
  http?: HttpOptions;
  storage?: StorageOptions;
  debug?: DebugOptions;
}

/**
 * The fully applied configuration, as a read reports it. Every group and field
 * is present. A field the running platform does not own reads as its contract
 * default — consult `CONFIG_FIELDS` to know whether it is in effect.
 */
export interface AppliedConfig {
  tracking: TrackingConfig;
  lifecycle: LifecycleConfig;
  activity: ActivityConfig;
  notification: NotificationConfig;
  http: HttpConfig;
  storage: StorageConfig;
  debug: DebugConfig;
}

/**
 * A recorded location fix.
 */
export interface Location {
  /**
   * Location identifier as stored in the database.
   */
  id: number;
  /**
   * Native provider name, such as `gps`, `network`, `passive`, or `fused`.
   */
  provider: string;
  /**
   * Numeric location provider code.
   */
  locationProvider: number;
  /**
   * UTC timestamp of this fix in milliseconds since January 1, 1970.
   */
  time: number;
  /**
   * Latitude in degrees.
   */
  latitude: number;
  /**
   * Longitude in degrees.
   */
  longitude: number;
  /**
   * Estimated accuracy of this location in meters.
   */
  accuracy: number;
  /**
   * Speed in meters per second over ground.
   */
  speed: number;
  /**
   * Altitude in meters above the WGS 84 reference ellipsoid.
   */
  altitude: number;
  /**
   * Estimated altitude accuracy in meters.
   */
  altitudeAccuracy: number;
  /**
   * Bearing in degrees.
   */
  bearing: number;
  /**
   * Android only. True when the location was recorded by a mock provider.
   */
  isFromMockProvider: boolean;
  /**
   * Android only. True when mock locations are enabled on the device.
   */
  mockLocationsEnabled: boolean;
}

/**
 * A stationary location fix with an additional stationary radius.
 */
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
  altitudeAccuracy: number;
  bearing: number;
  isFromMockProvider: boolean;
  mockLocationsEnabled: boolean;
  /**
   * Radius in meters that defines the stationary region.
   */
  radius: number;
}

/**
 * Activity recognition payload reported by the Android activity provider.
 */
export interface Activity {
  /**
   * Percentage indicating the likelihood the user is performing this activity.
   */
  confidence: number;
  /**
   * Activity type such as `IN_VEHICLE`, `ON_BICYCLE`, `ON_FOOT`, `RUNNING`,
   * `STILL`, `TILTING`, `UNKNOWN`, or `WALKING`.
   */
  type: string;
}

/**
 * Current runtime status of the service and device location state.
 */
export interface ServiceStatus {
  /**
   * True when the background geolocation service is running.
   */
  isRunning: boolean;
  /**
   * True when device location services are enabled.
   */
  locationServicesEnabled: boolean;
  /**
   * Current authorization status.
   */
  authorization: AuthorizationStatus;
}

/**
 * Single log entry returned from the native logger database.
 */
export interface LogEntry {
  id: number;
  timestamp: number;
  level: string;
  message: string;
  stackTrace: string;
}

/**
 * Error payload returned by the native plugin.
 */
export interface BackgroundGeolocationError {
  /**
   * Numeric error code.
   */
  code: number;
  /**
   * Human-readable error message.
   */
  message: string;
}

// --- HybridObject ---

/**
 * Nitro bridge for the background geolocation engine.
 */
export interface NitroBackgroundGeolocation extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  // Lifecycle
  /**
   * Configure the plugin.
   * Omitted fields keep their previous values. Reset a field by passing its
   * published default.
   */
  configure(options: ConfigureOptions): Promise<void>;
  /**
   * Start background geolocation.
   */
  start(): Promise<void>;
  /**
   * Stop background geolocation.
   */
  stop(): Promise<void>;

  // Location
  /**
   * Perform a one-time location check for the device's current position.
   */
  getCurrentLocation(options: LocationOptions): Promise<Location>;
  /**
   * Return the current stationary location, if one exists.
   */
  getStationaryLocation(): Promise<StationaryLocation | undefined>;

  // Status
  /**
   * Check whether the service is running, whether location services are enabled,
   * and what authorization state is currently reported.
   */
  checkStatus(): Promise<ServiceStatus>;
  /**
   * Return the fully applied configuration after native merging/defaulting.
   * Useful when `configure()` was called with only a subset of fields.
   */
  getConfig(): Promise<AppliedConfig>;
  /**
   * Open the app settings screen so the user can change location permissions.
   *
   * - **Platform:** Android
   */
  showAppSettings(): void;
  /**
   * Open the system location settings screen.
   *
   * - **Platform:** Android
   */
  showLocationSettings(): void;

  // Storage
  /**
   * Return all stored locations.
   * Useful for initial rendering immediately after app launch.
   */
  getLocations(): Promise<Location[]>;
  /**
   * Return locations that have not yet been posted to the server.
   */
  getValidLocations(): Promise<Location[]>;
  /**
   * Return valid locations and mark them deleted so they are not returned again.
   */
  getValidLocationsAndDelete(): Promise<Location[]>;
  /**
   * Delete a location by its database id.
   */
  deleteLocation(locationId: number): Promise<void>;
  /**
   * Delete all stored locations.
   * Native storage keeps ids monotonic by marking rows deleted rather than removing them outright.
   */
  deleteAllLocations(): Promise<void>;

  // Sync
  /**
   * Force synchronization of stored locations to the configured server.
   */
  forceSync(): Promise<void>;

  // Logging
  /**
   * Return log entries filtered by limit, starting id, and minimum level.
   */
  getLogEntries(
    limit: number,
    fromId: number,
    minLevel: NativeLogLevel
  ): Promise<LogEntry[]>;

  // Events — each returns a disposer function
  /**
   * Subscribe to location updates.
   */
  onLocation(callback: (location: Location) => void): () => void;
  /**
   * Subscribe to the device entering stationary mode.
   */
  onStationary(callback: (location: StationaryLocation) => void): () => void;
  /**
   * Subscribe to activity detection changes.
   *
   * - **Platform:** Android
   */
  onActivity(callback: (activity: Activity) => void): () => void;
  /**
   * Subscribe to tracking start events.
   */
  onStart(callback: () => void): () => void;
  /**
   * Subscribe to tracking stop events.
   */
  onStop(callback: () => void): () => void;
  /**
   * Subscribe to plugin errors.
   */
  onError(callback: (error: BackgroundGeolocationError) => void): () => void;
  /**
   * Subscribe to authorization status changes.
   */
  onAuthorization(callback: (status: AuthorizationStatus) => void): () => void;
  /**
   * Subscribe to app foreground transitions.
   *
   * - **Platform:** Android
   */
  onForeground(callback: () => void): () => void;
  /**
   * Subscribe to app background transitions.
   *
   * - **Platform:** Android
   */
  onBackground(callback: () => void): () => void;
  /**
   * Subscribe to server responses indicating updates are not required.
   */
  onAbortRequested(callback: () => void): () => void;
  /**
   * Subscribe to server responses indicating HTTP authorization is required.
   */
  onHttpAuthorization(callback: () => void): () => void;

  // Cleanup
  /**
   * Remove all registered event listeners.
   */
  removeAllListeners(): void;
}
