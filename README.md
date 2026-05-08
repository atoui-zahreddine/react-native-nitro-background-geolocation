# react-native-nitro-background-geolocation

[![npm version](https://img.shields.io/npm/v/react-native-nitro-background-geolocation.svg)](https://www.npmjs.com/package/react-native-nitro-background-geolocation)
[![license](https://img.shields.io/npm/l/react-native-nitro-background-geolocation.svg)](https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/blob/main/LICENSE)

A React Native background geolocation module built with [Nitro Modules](https://nitro.margelo.com/) (JSI bridge). Based on [cordova-background-geolocation-plugin](https://github.com/nicstrong/cordova-background-geolocation-plugin).

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
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

> **Note:** On Android 10+ you must also request `ACCESS_BACKGROUND_LOCATION` at runtime, separately from foreground location permissions.

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

## Headless Tasks

When the app is killed or in the background, the native service can invoke a headless JS task. Set the `headlessTaskName` in your configuration to match the registered task name.

### Bare React Native (AppRegistry)

```typescript
// index.js
import { AppRegistry } from 'react-native';

AppRegistry.registerHeadlessTask('BackgroundLocationTask', () => async (taskData) => {
  console.log('Headless location event:', taskData);
  // Process location data here
});
```

### Expo (expo-task-manager)

```typescript
// taskManager.ts
import * as TaskManager from 'expo-task-manager';

TaskManager.defineTask('BackgroundLocationTask', ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  console.log('Headless location event:', data);
});
```

Then configure with the matching task name:

```typescript
await BackgroundGeolocation.configure({
  headlessTaskName: 'BackgroundLocationTask',
  // ...other options
});
```

## API Reference

### Lifecycle

| Method | Signature | Description |
|--------|-----------|-------------|
| `configure` | `(options: ConfigureOptions) => Promise<void>` | Configure the plugin with the given options. Must be called before `start`. |
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
| `onActivity` | `(activity: Activity) => void` | Fired when detected activity changes (walking, driving, etc.). |
| `onStart` | `() => void` | Fired when tracking starts. |
| `onStop` | `() => void` | Fired when tracking stops. |
| `onError` | `(error: BackgroundGeolocationError) => void` | Fired on errors. |
| `onAuthorization` | `(status: AuthorizationStatus) => void` | Fired when authorization status changes. |
| `onForeground` | `() => void` | Fired when the app enters the foreground. |
| `onBackground` | `() => void` | Fired when the app enters the background. |
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
| `DISTANCE_FILTER` | `0` | Location updates based on distance moved. |
| `ACTIVITY` | `1` | Location updates based on detected activity. |
| `RAW` | `2` | Raw location updates at the configured interval. |

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
| `AUTHORIZED_FOREGROUND` | `2` | Foreground-only location access. |

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

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headlessTaskName` | `string` | **required** | Name of the registered headless task. |
| `locationProvider` | `LocationProvider` | `DISTANCE_FILTER` | Location provider to use. |
| `desiredAccuracy` | `LocationAccuracy` | `HIGH` | Desired accuracy level. |
| `stationaryRadius` | `number` | `50` | Radius in meters to trigger stationary detection. |
| `debug` | `boolean` | `false` | Enable debug sounds and notifications. |
| `distanceFilter` | `number` | `500` | Minimum distance (meters) between location updates. |
| `stopOnTerminate` | `boolean` | `true` | Stop tracking when the app is terminated. |
| `startOnBoot` | `boolean` | `false` | Start tracking on device boot. |
| `interval` | `number` | `60000` | Location update interval in milliseconds. |
| `fastestInterval` | `number` | `120000` | Fastest location update interval in milliseconds. |
| `activitiesInterval` | `number` | `10000` | Activity recognition interval in milliseconds. |
| `stopOnStillActivity` | `boolean` | `true` | Stop updates when the device is still. |
| `notificationsEnabled` | `boolean` | `true` | Show foreground service notification. |
| `startForeground` | `boolean` | `true` | Run as a foreground service. |
| `notificationTitle` | `string` | `''` | Notification title. |
| `notificationText` | `string` | `''` | Notification text. |
| `notificationIconColor` | `string` | `''` | Notification icon color (hex). |
| `notificationIconLarge` | `string` | `''` | Large notification icon resource name. |
| `notificationIconSmall` | `string` | `''` | Small notification icon resource name. |
| `activityType` | `string` | `''` | iOS activity type hint. |
| `pauseLocationUpdates` | `boolean` | `false` | Allow the system to pause location updates. |
| `saveBatteryOnBackground` | `boolean` | `false` | Reduce accuracy in the background to save battery. |
| `url` | `string` | `''` | URL for HTTP location posting. |
| `syncUrl` | `string` | `''` | URL for batch sync of stored locations. |
| `syncThreshold` | `number` | `100` | Number of locations to accumulate before sync. |
| `httpHeaders` | `Record<string, string>` | `{}` | HTTP headers for location posting. |
| `maxLocations` | `number` | `10000` | Maximum number of locations to store. |
| `postTemplate` | `Record<string, string>` | `{}` | Custom POST body template for location posting. |

## Platform Support

| Platform | Status |
|----------|--------|
| Android | Supported |
| iOS | Coming Soon |

## Credits

Built on top of [cordova-background-geolocation-plugin](https://github.com/nicstrong/cordova-background-geolocation-plugin) by Nic Strong, adapted for React Native New Architecture via Nitro Modules.

## License

MIT
