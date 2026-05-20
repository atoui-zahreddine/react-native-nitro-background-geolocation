import type { AnyMap, HybridObject } from 'react-native-nitro-modules';

// --- Enums ---

/**
 * Selects which native location provider strategy should be used.
 *
 * - **Default:** `LocationProvider.DISTANCE_FILTER`
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
 * Operational mode used by the original Cordova plugin's iOS `switchMode()`.
 * Kept for parity in the type surface, but not currently consumed by the Nitro API.
 *
 * - **Platform:** iOS concept
 */
export enum ServiceMode {
  /**
   * Background mode.
   */
  BACKGROUND = 0,
  /**
   * Foreground mode.
   */
  FOREGROUND = 1,
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
 *
 * - **Default:** `LocationAccuracy.MEDIUM`
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

export type NullableString = string | null;
export type NullableNumber = number | null;
export type NullableBoolean = boolean | null;
export type NullableHeaders = Record<string, string> | null;
export type NullableAnyMap = AnyMap | null;
export type NullableLocationProvider = LocationProvider | null;
export type NullableLocationAccuracy = LocationAccuracy | null;

// --- Structs ---

/**
 * Configuration applied to the background geolocation engine.
 * Later calls may provide only a subset of fields; omitted fields stay unchanged.
 * Pass `null` to restore a supported field to its native default.
 */
export interface ConfigureOptions {
  /**
   * Which native provider strategy should be used.
   *
   * - **Default:** `LocationProvider.DISTANCE_FILTER`
   * - **Platform:** all
   */
  locationProvider?: NullableLocationProvider;
  /**
   * Desired accuracy in meters. Lower accuracy usually reduces power drain.
   * See `LocationAccuracy` for the available accuracy tiers.
   *
   * - **Default:** `LocationAccuracy.MEDIUM`
   * - **Platform:** all
   */
  desiredAccuracy?: NullableLocationAccuracy;
  /**
   * Stationary radius in meters.
   * When stopped, the device must move beyond this radius before aggressive tracking resumes.
   *
   * - **Default:** `50`
   * - **Platform:** all
   */
  stationaryRadius?: NullableNumber;
  /**
   * When enabled, the plugin emits debugging sounds for lifecycle events.
   *
   * - **Default:** `false`
   * - **Platform:** all
   */
  debug?: NullableBoolean;
  /**
   * Minimum horizontal distance in meters the device must move before an update is generated.
   *
   * - **Default:** `500`
   * - **Platform:** all
   */
  distanceFilter?: NullableNumber;
  /**
   * Force tracking to stop when the application is terminated.
   *
   * - **Default:** `true`
   * - **Platform:** all
   */
  stopOnTerminate?: NullableBoolean;
  /**
   * Start the background service when the device boots.
   *
   * - **Default:** `false`
   * - **Platform:** Android
   */
  startOnBoot?: NullableBoolean;
  /**
   * Minimum time interval between location updates, in milliseconds.
   *
   * - **Default:** `600000`
   * - **Platform:** Android
   */
  interval?: NullableNumber;
  /**
   * Fastest rate, in milliseconds, at which the app can handle location updates.
   *
   * - **Default:** `120000`
   * - **Platform:** Android
   */
  fastestInterval?: NullableNumber;
  /**
   * Rate, in milliseconds, at which activity recognition occurs.
   * Larger values improve battery life but reduce detection frequency.
   *
   * - **Default:** `10000`
   * - **Platform:** Android
   */
  activitiesInterval?: NullableNumber;
  /**
   * Deprecated upstream Android option that stops location updates when STILL is detected.
   *
   * - **Default:** `true`
   * - **Platform:** Android
   */
  stopOnStillActivity?: NullableBoolean;
  /**
   * Enable or disable local notifications while tracking and syncing locations.
   *
   * - **Default:** `true`
   * - **Platform:** Android
   */
  notificationsEnabled?: NullableBoolean;
  /**
   * Allow the location service to run in foreground state.
   * Foreground mode requires a visible notification.
   *
   * - **Default:** `true`
   * - **Platform:** Android
   */
  startForeground?: NullableBoolean;
  /**
   * Custom notification title shown in the drawer.
   *
   * - **Default:** `"Background tracking"`
   * - **Platform:** Android
   */
  notificationTitle?: NullableString;
  /**
   * Custom notification text shown in the drawer.
   *
   * - **Default:** `"ENABLED"`
   * - **Platform:** Android
   */
  notificationText?: NullableString;
  /**
   * Accent color used for the notification, for example `#4CAF50`.
   *
   * - **Default:** `""`
   * - **Platform:** Android
   */
  notificationIconColor?: NullableString;
  /**
   * Resource name of a custom large notification icon.
   *
   * - **Default:** `""`
   * - **Platform:** Android
   */
  notificationIconLarge?: NullableString;
  /**
   * Resource name of a custom small notification icon.
   *
   * - **Default:** `""`
   * - **Platform:** Android
   */
  notificationIconSmall?: NullableString;
  /**
   * iOS activity type hint.
   *
   * - **Default:** native platform default
   * - **Platform:** iOS
   */
  activityType?: NullableString;
  /**
   * Allow the system to pause location updates automatically on iOS.
   *
   * - **Default:** platform default / not used on Android
   * - **Platform:** iOS
   */
  pauseLocationUpdates?: NullableBoolean;
  /**
   * Reduce accuracy in the background to save battery on iOS.
   *
   * - **Default:** platform default / not used on Android
   * - **Platform:** iOS
   */
  saveBatteryOnBackground?: NullableBoolean;
  /**
   * Server URL that receives immediate HTTP POSTs for recorded locations.
   *
   * - **Default:** `""`
   * - **Platform:** all
   */
  url?: NullableString;
  /**
   * Server URL that receives batched retries for locations that previously failed to post.
   *
   * - **Default:** `""`
   * - **Platform:** all
   */
  syncUrl?: NullableString;
  /**
   * Number of failed locations to batch together before syncing.
   *
   * - **Default:** `100`
   * - **Platform:** all
   */
  syncThreshold?: NullableNumber;
  /**
   * Optional HTTP headers sent with location POST requests.
   *
   * - **Default:** `undefined`
   * - **Platform:** all
   */
  httpHeaders?: NullableHeaders;
  /**
   * Maximum number of locations stored in the local database.
   *
   * - **Default:** `10000`
   * - **Platform:** all
   */
  maxLocations?: NullableNumber;
  /**
   * Custom POST template for `url` and `syncUrl`.
   * Supports object or array shapes and may include location placeholders such as `@latitude`.
   *
   * - **Default:** native template behavior
   * - **Platform:** all
   */
  postTemplate?: NullableAnyMap;
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
 * Options for a one-time current location request.
 */
export interface LocationOptions {
  /**
   * Maximum time in milliseconds to wait for a location fix.
   *
   * - **Default:** `30000`
   */
  timeout?: number;
  /**
   * Maximum age in milliseconds of a cached location that is acceptable to return.
   *
   * - **Default:** `0`
   */
  maximumAge?: number;
  /**
   * If true, request the most accurate position the device can provide.
   *
   * - **Default:** `false`
   */
  enableHighAccuracy?: boolean;
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
   * Omitted fields keep their previous values.
   * Pass `null` to restore a field to its native default.
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
  getConfig(): Promise<ConfigureOptions>;
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
