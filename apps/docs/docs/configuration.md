---
sidebar_position: 3
---

# Configuration

The `configure()` method accepts a `ConfigureOptions` object. Omitted fields keep their previous values. Pass `null` for a supported option when you want Cordova-style "reset to default" behavior.

```ts
import BackgroundGeolocation, {
  LocationProvider,
  LocationAccuracy,
} from 'react-native-nitro-background-geolocation';

await BackgroundGeolocation.configure({
  locationProvider: LocationProvider.DISTANCE_FILTER,
  desiredAccuracy: LocationAccuracy.HIGH,
  distanceFilter: 50,
  // ...
});
```

## Options

| Option | Type | Default | Platform | Description |
|--------|------|---------|----------|-------------|
| `locationProvider` | `LocationProvider \| null` | `DISTANCE_FILTER` | all | Location provider to use. See [Providers](./providers/distance-filter). |
| `desiredAccuracy` | `LocationAccuracy \| null` | `MEDIUM` | all | Desired accuracy level. Lower accuracy generally reduces power drain. |
| `stationaryRadius` | `number \| null` | `50` | all | Radius in meters to trigger stationary detection. |
| `debug` | `boolean \| null` | `false` | all | Enable debug sounds and notifications. Useful during field testing. |
| `distanceFilter` | `number \| null` | `500` | all | Minimum distance (meters) between location updates. |
| `stopOnTerminate` | `boolean \| null` | `true` | all | Stop tracking when the app is terminated. On Android, the service is destroyed. On iOS, `false` enables [Native Continuation](./platform-quirks#ios-native-continuation). |
| `startOnBoot` | `boolean \| null` | `false` | Android | Start tracking on device boot. |
| `interval` | `number \| null` | `600000` | Android | Minimum time interval between location updates (ms). |
| `fastestInterval` | `number \| null` | `120000` | Android | Fastest location update interval (ms). |
| `activitiesInterval` | `number \| null` | `10000` | Android | Activity recognition interval (ms). |
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
| `url` | `string \| null` | `''` | all | URL for HTTP location posting. See [HTTP Posting](./http-posting). |
| `syncUrl` | `string \| null` | `''` | all | URL for batch sync of stored locations. |
| `syncThreshold` | `number \| null` | `100` | all | Number of failed locations to batch together before sync. |
| `httpHeaders` | `Record<string, string> \| null` | `undefined` | all | Optional HTTP headers for location posting. |
| `maxLocations` | `number \| null` | `10000` | all | Maximum number of locations to store. |
| `postTemplate` | `AnyMap \| null` | `undefined` | all | Custom POST body template. See below. |

## postTemplate

Customize the JSON body sent to your server. Supports object or array shapes and may include location placeholders such as `@latitude`, `@longitude`, `@time`, `@accuracy`, `@speed`, `@altitude`, `@bearing`.

```ts
await BackgroundGeolocation.configure({
  url: 'https://your-server.com/locations',
  postTemplate: {
    lat: '@latitude',
    lon: '@longitude',
    timestamp: '@time',
    accuracy: '@accuracy',
    custom: 'static-value',
  },
});
```

## Enums

### LocationProvider

| Value | Code | Description |
|---|---|---|
| `DISTANCE_FILTER` | `0` | Classic background provider with stationary detection and elastic distance filter. |
| `ACTIVITY` | `1` | Activity-aware provider with fused locations and activity recognition. |
| `RAW` | `2` | Raw sensor/device locations with minimal processing. |

### LocationAccuracy

| Value | Code | Description |
|---|---|---|
| `HIGH` | `0` | Highest accuracy (GPS). |
| `MEDIUM` | `100` | Medium accuracy (~100m). |
| `LOW` | `1000` | Low accuracy (~1km). |
| `PASSIVE` | `10000` | Passive — only receives updates from other apps. |

### AuthorizationStatus

| Value | Code | Description |
|---|---|---|
| `NOT_AUTHORIZED` | `0` | Location access not authorized. |
| `AUTHORIZED` | `1` | Full location access. |
| `AUTHORIZED_FOREGROUND` | `2` | Foreground-only access (iOS-style distinction). |

### LogLevel

`TRACE` (0), `DEBUG` (1), `INFO` (2), `WARN` (3), `ERROR` (4).

### LocationErrorCode

`PERMISSION_DENIED` (1), `LOCATION_UNAVAILABLE` (2), `TIMEOUT` (3).
