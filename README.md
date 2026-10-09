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
import BackgroundGeolocation, {
  LocationAccuracy,
  LocationProvider,
} from 'react-native-nitro-background-geolocation';

// Configure
await BackgroundGeolocation.configure({
  tracking: {
    locationProvider: LocationProvider.DISTANCE_FILTER,
    desiredAccuracy: LocationAccuracy.HIGH,
    distanceFilter: 10,
    stationaryRadius: 50,
    interval: 10000,
    fastestInterval: 5000,
  },
  lifecycle: {
    startOnBoot: true,
    stopOnTerminate: false,
  },
  notification: {
    notificationsEnabled: true,
    notificationTitle: 'Tracking',
    notificationText: 'Location tracking is active',
    startForeground: true,
  },
  http: {
    url: 'https://your-server.com/locations',
    httpHeaders: {
      Authorization: 'Bearer YOUR_TOKEN',
    },
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

### 2. Headless Handler (Android only)

`registerHeadlessHandler` fires on every location, stationary, and activity event regardless of app state — including when the app is killed. The native service starts a lightweight JS context to execute the handler, which receives a typed `HeadlessEvent` discriminated union.

> **iOS note:** Headless JS execution is not supported on iOS. When `stopOnTerminate: false` is set on iOS, native location monitoring may continue after app termination and persisted data becomes available when the app is relaunched by a location event. Use `getLocations()` or `getValidLocations()` after relaunch to retrieve locations recorded while the app was terminated.

Register the handler in your entry file **before** `registerRootComponent` (or `AppRegistry.registerComponent`):

```typescript
// index.js
import { registerRootComponent } from 'expo';
import { registerHeadlessHandler } from 'react-native-nitro-background-geolocation';

import App from './src/App';

registerHeadlessHandler(async (event) => {
  switch (event.event) {
    case 'location':
      console.log('Location:', event.location.latitude, event.location.longitude);
      break;
    case 'stationary':
      console.log('Stationary:', event.location.radius);
      break;
    case 'activity':
      console.log('Activity:', event.activity.type, event.activity.confidence);
      break;
  }
});

registerRootComponent(App);
```

No `headlessTaskName` option needed — the library owns the task name internally.

### Which to use?

| | `onLocation` | Headless Handler (Android) |
|---|---|---|
| App in foreground | Fires | Fires |
| App in background | Fires | Fires |
| App killed | Does not fire | Fires |
| Data format | Typed `Location` object | Typed `HeadlessEvent` discriminated union |
| Use case | UI updates, in-app logic | Persisting data, server sync |

You can use both at the same time. For example, use `onLocation` to update the UI and a headless task to sync locations to your server.

## API Reference

### Lifecycle

| Method | Signature | Description |
|--------|-----------|-------------|
| `configure` | `(options: ConfigureOptions) => Promise<void>` | Configure the plugin with the given options. Must be called before `start`. Omitted fields stay unchanged; reset a field by passing its value from `CONFIG_DEFAULTS`. |
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

### ActivityType

| Value | Code |
|-------|------|
| `AutomotiveNavigation` | `0` |
| `OtherNavigation` | `1` |
| `Fitness` | `2` |
| `Other` | `3` |

iOS only. The journey hint passed to CoreLocation, not activity recognition.

## Configuration Options

Options are grouped by domain. `configure()` keeps every omitted group and field
unchanged; reset a field by passing its published default from
`CONFIG_DEFAULTS`. `getConfig()` returns every field. A field the running
platform does not own is dropped on write, with a warning in development, and
reads as its default. `CONFIG_FIELDS` exposes the same metadata at runtime,
keyed by `group.field`.

These tables are generated from the Config Contract with
`yarn workspace react-native-nitro-background-geolocation generate:config`.

<!-- CONFIG-CONTRACT:START -->
<!-- GENERATED from the Config Contract. Do not edit. -->

#### `tracking`

| Field | Type | Default | Platforms | Units | Description |
| --- | --- | --- | --- | --- | --- |
| `tracking.locationProvider` | `LocationProvider` | `LocationProvider.DISTANCE_FILTER` | Android, iOS | — | Native provider strategy. See the provider pages for how each one behaves. |
| `tracking.desiredAccuracy` | `LocationAccuracy` | `LocationAccuracy.MEDIUM` | Android, iOS | — | Desired accuracy in meters. Lower accuracy usually reduces power drain.<br/>**Android:** Maps to a fused location request priority.<br/>**iOS:** Maps to a CLLocationAccuracy tier. |
| `tracking.stationaryRadius` | `number` | `50` | Android, iOS | m | Radius in meters the device must leave before aggressive tracking resumes after it stops. |
| `tracking.distanceFilter` | `number` | `50` | Android, iOS | m | Base distance in meters between updates. Elastic: the Distance Filter provider adds a speed penalty, so points thin out as speed increases.<br/>**Android:** The Activity provider ignores it; use interval to control its cadence. |
| `tracking.interval` | `number` | `5000` | Android | ms | Minimum time between updates, applied by the OS in every Android provider. Caps the point rate regardless of movement. |
| `tracking.fastestInterval` | `number` | `1000` | Android | ms | Fastest rate the app accepts updates when other apps request locations faster than interval. |
| `tracking.pauseLocationUpdates` | `boolean` | `false` | iOS | — | Let the system pause location updates automatically. |
| `tracking.saveBatteryOnBackground` | `boolean` | `false` | iOS | — | Reduce accuracy in the background to save battery. |
| `tracking.activityType` | `ActivityType` | `ActivityType.OtherNavigation` | iOS | — | Journey hint CoreLocation uses to decide when to pause updates. Not activity recognition. |

#### `lifecycle`

| Field | Type | Default | Platforms | Units | Description |
| --- | --- | --- | --- | --- | --- |
| `lifecycle.stopOnTerminate` | `boolean` | `true` | Android, iOS | — | Stop tracking when the application is terminated.<br/>**Android:** `false` keeps the service alive and runs the headless task.<br/>**iOS:** `false` enables native continuation after the app is terminated. |
| `lifecycle.startOnBoot` | `boolean` | `false` | Android | — | Start the background service when the device boots. |

#### `activity`

| Field | Type | Default | Platforms | Units | Description |
| --- | --- | --- | --- | --- | --- |
| `activity.activitiesInterval` | `number` | `10000` | Android, iOS | ms | Rate of activity recognition in milliseconds. Larger values save battery but detect changes later.<br/>**Android:** Rate of the ActivityRecognition API.<br/>**iOS:** Rate of the motion detector. |
| `activity.stopOnStillActivity` | `boolean` | `true` | Android | — | Stop location updates when activity recognition reports STILL. Deprecated upstream. |

#### `notification`

| Field | Type | Default | Platforms | Units | Description |
| --- | --- | --- | --- | --- | --- |
| `notification.notificationsEnabled` | `boolean` | `true` | Android | — | Show local notifications while tracking and syncing locations. |
| `notification.startForeground` | `boolean` | `true` | Android | — | Run the location service in the foreground. A foreground service needs a visible notification. |
| `notification.notificationTitle` | `string` | `"Background tracking"` | Android | — | Title of the foreground service notification. |
| `notification.notificationText` | `string` | `"ENABLED"` | Android | — | Text of the foreground service notification. |
| `notification.notificationIconColor` | `string` | `""` | Android | — | Accent color of the notification, for example `#4CAF50`. Empty uses the system color. |
| `notification.notificationIconLarge` | `string` | `""` | Android | — | Resource name of a custom large notification icon. Empty uses the app icon. |
| `notification.notificationIconSmall` | `string` | `""` | Android | — | Resource name of a custom small notification icon. Empty uses the app icon. |

#### `http`

| Field | Type | Default | Platforms | Units | Description |
| --- | --- | --- | --- | --- | --- |
| `http.url` | `string` | `""` | Android, iOS | — | Server URL that receives immediate HTTP POSTs for recorded locations. Empty disables posting. |
| `http.syncUrl` | `string` | `""` | Android, iOS | — | Server URL that receives batched retries for locations that previously failed to post. |
| `http.syncThreshold` | `number` | `100` | Android, iOS | 1–1000 locations | Number of failed locations to batch together before syncing to syncUrl. |
| `http.httpHeaders` | `Record<string, string> \| null` | `null` | Android, iOS | — | HTTP headers sent with every location POST. Pass null to send none. |
| `http.postTemplate` | `AnyMap \| null` | `null` | Android, iOS | — | Custom POST body template for url and syncUrl. Supports placeholders such as @latitude. Pass null for the native default template. |

#### `storage`

| Field | Type | Default | Platforms | Units | Description |
| --- | --- | --- | --- | --- | --- |
| `storage.maxLocations` | `number` | `10000` | Android, iOS | locations | Maximum number of locations kept in the local database. |

#### `debug`

| Field | Type | Default | Platforms | Units | Description |
| --- | --- | --- | --- | --- | --- |
| `debug.debug` | `boolean` | `false` | Android, iOS | — | Play sounds and show notifications for lifecycle events. For field testing only. |

<!-- CONFIG-CONTRACT:END -->

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
