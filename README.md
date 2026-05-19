# react-native-nitro-background-geolocation

[![npm version](https://img.shields.io/npm/v/react-native-nitro-background-geolocation.svg)](https://www.npmjs.com/package/react-native-nitro-background-geolocation)
[![license](https://img.shields.io/npm/l/react-native-nitro-background-geolocation.svg)](https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/blob/main/LICENSE)

A React Native background geolocation module built with [Nitro Modules](https://nitro.margelo.com/) (JSI bridge). Based on [cordova-background-geolocation-plugin](https://github.com/HaylLtd/cordova-background-geolocation-plugin).

**React Native New Architecture only.** This module uses Nitro Modules and does not support the legacy bridge.

## Installation

```sh
npm install react-native-nitro-background-geolocation react-native-nitro-modules
```

`react-native-nitro-modules` is a required peer dependency.

## Required Permissions (Android)

Add the following permissions to your `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />

<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

> **Note:** `ACCESS_BACKGROUND_LOCATION` is **not** required. The plugin uses a foreground service with a persistent notification, which keeps location access active even when the app is in the background or killed.

## Quick Start

```typescript
import BackgroundGeolocation from 'react-native-nitro-background-geolocation';

// Configure
await BackgroundGeolocation.configure({
  headlessTaskName: 'BackgroundLocationTask',
  locationProvider: LocationProvider.DISTANCE_FILTER,
  desiredAccuracy: LocationAccuracy.HIGH,
  distanceFilter: 10,
  stationaryRadius: 50,
  startOnBoot: true,
  stopOnTerminate: false,
  notificationsEnabled: true,
  notificationTitle: 'Tracking',
  notificationText: 'Location tracking is active',
  startForeground: true,
  interval: 10000,
  fastestInterval: 5000,
  url: 'https://your-server.com/locations',
  httpHeaders: {
    'Authorization': 'Bearer YOUR_TOKEN',
  },
});

// Listen for location updates
const unsubscribe = BackgroundGeolocation.onLocation((location) => {
  console.log('Location:', location.latitude, location.longitude);
});

// Start tracking
await BackgroundGeolocation.start();

// Later: stop tracking
await BackgroundGeolocation.stop();

// Remove the listener
unsubscribe();
```

## Receiving Location Updates

There are two ways to receive location updates, and both fire simultaneously:

### 1. Event Callbacks (`onLocation`)

Callbacks registered via `onLocation` fire whenever the app process is alive (foreground or background). They deliver typed `Location` objects directly via JSI — no serialization overhead.

```typescript
const unsubscribe = BackgroundGeolocation.onLocation((location) => {
  console.log('Location:', location.latitude, location.longitude);
});
```

### 2. Headless Tasks (Android only)

Headless tasks fire on every location, stationary, and activity event regardless of app state — including when the app is killed. The native service starts a lightweight JS context to execute the task. The data arrives as a serialized object with `event` and `params` fields.

The `event` field is one of: `"location"`, `"stationary"`, or `"activity"`.

> **iOS note:** Headless JS execution is not supported on iOS. When `stopOnTerminate: false` is set on iOS, native location monitoring may continue after app termination and persisted data becomes available when the app is relaunched by a location event. Use `getLocations()` or `getValidLocations()` after relaunch to retrieve locations recorded while the app was terminated.

Register the headless task in your entry file **before** `registerRootComponent`:

#### Bare React Native

```typescript
// index.js
import { AppRegistry } from 'react-native';

AppRegistry.registerHeadlessTask('BackgroundLocationTask', () => async ({ event, params }) => {
  console.log('Location event:', event, params);
});
```

#### Expo

```typescript
// index.js
import { AppRegistry } from 'react-native';

AppRegistry.registerHeadlessTask('BackgroundLocationTask', () => async ({ event, params }) => {
  console.log('Location event:', event, params);
});
```

Then configure with the matching task name:

```typescript
await BackgroundGeolocation.configure({
  headlessTaskName: 'BackgroundLocationTask',
  // ...other options
});
```

### Which to use?

| | `onLocation` | Headless Task (Android) |
|---|---|---|
| App in foreground | Fires | Fires |
| App in background | Fires | Fires |
| App killed | Does not fire | Fires |
| Data format | Typed `Location` object | `{ event: string, params: string }` |
| Use case | UI updates, in-app logic | Persisting data, server sync |

You can use both at the same time. For example, use `onLocation` to update the UI and a headless task to sync locations to your server.

## API Reference

### Lifecycle

| Method | Signature | Description |
|--------|-----------|-------------|
| `configure` | `(options: ConfigureOptions) => Promise<void>` | Configure the plugin with the given options. Must be called before `start`. Omitted fields stay unchanged; pass `null` to reset a field to its native default. |
| `start` | `() => Promise<void>` | Start background geolocation tracking. |
| `stop` | `() => Promise<void>` | Stop background geolocation tracking. |

### Location

| Method | Signature | Description |
|--------|-----------|-------------|
| `getCurrentLocation` | `(options: LocationOptions) => Promise<Location>` | Get a single location fix. |
| `getStationaryLocation` | `() => Promise<StationaryLocation \| undefined>` | Get the current stationary location, if any. |

### Status

| Method | Signature | Description |
|--------|-----------|-------------|
| `checkStatus` | `() => Promise<ServiceStatus>` | Check if the service is running, location services are enabled, and authorization status. |
| `getConfig` | `() => Promise<ConfigureOptions>` | Get the current configuration. |

### Settings

| Method | Signature | Description |
|--------|-----------|-------------|
| `showAppSettings` | `() => void` | Open the app's system settings page. |
| `showLocationSettings` | `() => void` | Open the device's location settings page. |

### Storage

| Method | Signature | Description |
|--------|-----------|-------------|
| `getLocations` | `() => Promise<Location[]>` | Get all stored locations. |
| `getValidLocations` | `() => Promise<Location[]>` | Get all valid (non-deleted) stored locations. |
| `getValidLocationsAndDelete` | `() => Promise<Location[]>` | Get all valid stored locations and delete them from storage. |
| `deleteLocation` | `(locationId: number) => Promise<void>` | Delete a specific location by ID. |
| `deleteAllLocations` | `() => Promise<void>` | Delete all stored locations. |

### Sync

| Method | Signature | Description |
|--------|-----------|-------------|
| `forceSync` | `() => Promise<void>` | Force sync stored locations to the configured server. |

### Logging

| Method | Signature | Description |
|--------|-----------|-------------|
| `getLogEntries` | `(limit: number, fromId: number, minLevel: LogLevel) => Promise<LogEntry[]>` | Retrieve log entries filtered by limit, starting ID, and minimum log level. |

### Events

All event methods return a disposer function (`() => void`) that removes the listener when called.

| Method | Callback Signature | Description |
|--------|-------------------|-------------|
| `onLocation` | `(location: Location) => void` | Fired on each location update. |
| `onStationary` | `(location: StationaryLocation) => void` | Fired when the device becomes stationary. |
| `onActivity` | `(activity: Activity) => void` | Fired when detected activity changes (walking, driving, etc.). **Android only.** |
| `onStart` | `() => void` | Fired when tracking starts. |
| `onStop` | `() => void` | Fired when tracking stops. |
| `onError` | `(error: BackgroundGeolocationError) => void` | Fired on errors. |
| `onAuthorization` | `(status: AuthorizationStatus) => void` | Fired when authorization status changes. |
| `onForeground` | `() => void` | Fired when the app enters the foreground. **Android only.** |
| `onBackground` | `() => void` | Fired when the app enters the background. **Android only.** |
| `onAbortRequested` | `() => void` | Fired when an abort is requested. |
| `onHttpAuthorization` | `() => void` | Fired on HTTP authorization events. |

### Cleanup

| Method | Signature | Description |
|--------|-----------|-------------|
| `removeAllListeners` | `() => void` | Remove all registered event listeners. |

## Enums

### LocationProvider

| Value | Code | Description |
|-------|------|-------------|
| `DISTANCE_FILTER` | `0` | Classic background provider. Uses stationary detection and an elastic distance filter for good battery and data usage. |
| `ACTIVITY` | `1` | Activity-aware provider. Uses fused location + activity recognition and works best when you want tighter control over update intervals. |
| `RAW` | `2` | Raw sensor/device locations with minimal provider-side processing. |

### LocationAccuracy

| Value | Code | Description |
|-------|------|-------------|
| `HIGH` | `0` | Highest accuracy (GPS). |
| `MEDIUM` | `100` | Medium accuracy (~100m). |
| `LOW` | `1000` | Low accuracy (~1km). |
| `PASSIVE` | `10000` | Passive, only receives updates from other apps. |

### AuthorizationStatus

| Value | Code | Description |
|-------|------|-------------|
| `NOT_AUTHORIZED` | `0` | Location access not authorized. |
| `AUTHORIZED` | `1` | Full location access authorized. |
| `AUTHORIZED_FOREGROUND` | `2` | Foreground-only location access. Reserved for platforms that expose a distinct foreground-only state. |

### LogLevel

| Value | Code |
|-------|------|
| `TRACE` | `0` |
| `DEBUG` | `1` |
| `INFO` | `2` |
| `WARN` | `3` |
| `ERROR` | `4` |

### LocationErrorCode

| Value | Code |
|-------|------|
| `PERMISSION_DENIED` | `1` |
| `LOCATION_UNAVAILABLE` | `2` |
| `TIMEOUT` | `3` |

### ServiceMode

| Value | Code |
|-------|------|
| `BACKGROUND` | `0` |
| `FOREGROUND` | `1` |

`ServiceMode` comes from the Cordova plugin's iOS `switchMode()` concept. It is currently kept for parity in the type surface, but the Nitro API does not actively use it.

## Configuration Options

`configure()` keeps omitted fields unchanged. Pass `null` for a supported option when you want Cordova-style "reset to default" behavior.

| Option | Type | Default | Platform | Description |
|--------|------|---------|----------|-------------|
| `headlessTaskName` | `string \| null` | `undefined` | Android | Name of the registered headless task. Required only when using headless delivery. |
| `locationProvider` | `LocationProvider \| null` | `DISTANCE_FILTER` | all | Location provider to use. `DISTANCE_FILTER` is the classic battery-friendly background provider, `ACTIVITY` is activity-aware, and `RAW` returns less-processed sensor fixes. |
| `desiredAccuracy` | `LocationAccuracy \| null` | `MEDIUM` | all | Desired accuracy level. Lower accuracy generally reduces power drain. |
| `stationaryRadius` | `number \| null` | `50` | all | Radius in meters to trigger stationary detection. |
| `debug` | `boolean \| null` | `false` | all | Enable debug sounds and notifications. |
| `distanceFilter` | `number \| null` | `500` | all | Minimum distance (meters) between location updates. |
| `stopOnTerminate` | `boolean \| null` | `true` | all | Stop tracking when the app is terminated. On Android, the service is destroyed. On iOS, `false` enables native continuation: the OS may relaunch the app on significant location changes, and persisted locations can be retrieved via `getLocations()` after relaunch. |
| `startOnBoot` | `boolean \| null` | `false` | Android | Start tracking on device boot. |
| `interval` | `number \| null` | `600000` | Android | Minimum time interval between location updates in milliseconds. |
| `fastestInterval` | `number \| null` | `120000` | Android | Fastest location update interval in milliseconds. |
| `activitiesInterval` | `number \| null` | `10000` | Android | Activity recognition interval in milliseconds. |
| `stopOnStillActivity` | `boolean \| null` | `true` | Android | Deprecated upstream Android option that stops updates when STILL is detected. |
| `notificationsEnabled` | `boolean \| null` | `true` | Android | Show foreground service notification. |
| `startForeground` | `boolean \| null` | `true` | Android | Run as a foreground service. |
| `notificationTitle` | `string \| null` | `"Background tracking"` | Android | Notification title. |
| `notificationText` | `string \| null` | `"ENABLED"` | Android | Notification text. |
| `notificationIconColor` | `string \| null` | `''` | Android | Notification icon color (hex). |
| `notificationIconLarge` | `string \| null` | `''` | Android | Large notification icon resource name. |
| `notificationIconSmall` | `string \| null` | `''` | Android | Small notification icon resource name. |
| `activityType` | `string \| null` | platform default | iOS | iOS activity type hint. |
| `pauseLocationUpdates` | `boolean \| null` | platform default | iOS | Allow the system to pause location updates. |
| `saveBatteryOnBackground` | `boolean \| null` | platform default | iOS | Reduce accuracy in the background to save battery. |
| `url` | `string \| null` | `''` | all | URL for HTTP location posting. |
| `syncUrl` | `string \| null` | `''` | all | URL for batch sync of stored locations. |
| `syncThreshold` | `number \| null` | `100` | all | Number of failed locations to batch together before sync. |
| `httpHeaders` | `Record<string, string> \| null` | `undefined` | all | Optional HTTP headers for location posting. |
| `maxLocations` | `number \| null` | `10000` | all | Maximum number of locations to store. |
| `postTemplate` | `AnyMap \| null` | `undefined` | all | Custom POST body template for location posting. Supports object or array shapes and nested JSON values. |

## Platform Support

| Platform | Status |
|----------|--------|
| Android | Supported |
| iOS | Supported |

## Credits

The native geolocation service code is derived from [cordova-background-geolocation-plugin](https://github.com/HaylLtd/cordova-background-geolocation-plugin) by HAYL Ltd, which is itself a fork of [@mauron85/cordova-plugin-background-geolocation](https://github.com/mauron85/cordova-plugin-background-geolocation) by Marian Hello, originally based on [cordova-plugin-background-geolocation](https://github.com/christocracy/cordova-plugin-background-geolocation) by Christopher Scott. The Nitro Modules bridge layer is original work by Zahreddine Atoui.

## License

The Nitro bridge layer (TypeScript/Kotlin/Swift) is licensed under the [MIT License](LICENSE).

The native geolocation service code (derived from the Cordova plugin) is licensed under the [Apache License 2.0](LICENSE-APACHE).

See [NOTICE](NOTICE) for full attribution.
