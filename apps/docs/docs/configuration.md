---
sidebar_position: 3
---

import ConfigTracking from './generated/_config-tracking.md';
import ConfigLifecycle from './generated/_config-lifecycle.md';
import ConfigActivity from './generated/_config-activity.md';
import ConfigNotification from './generated/_config-notification.md';
import ConfigHttp from './generated/_config-http.md';
import ConfigStorage from './generated/_config-storage.md';
import ConfigDebug from './generated/_config-debug.md';
import LocationOptions from './generated/_location-options.md';

# Configuration

`configure()` accepts a `ConfigureOptions` object grouped by domain: `tracking`,
`lifecycle`, `activity`, `notification`, `http`, `storage` and `debug`. Every
group and field is optional, and an omitted one keeps its previous value.

```ts
import BackgroundGeolocation, {
  LocationAccuracy,
  LocationProvider,
} from 'react-native-nitro-background-geolocation';

await BackgroundGeolocation.configure({
  tracking: {
    locationProvider: LocationProvider.DISTANCE_FILTER,
    desiredAccuracy: LocationAccuracy.HIGH,
    distanceFilter: 50,
  },
  lifecycle: { stopOnTerminate: false },
});
```

## Reading and resetting

`getConfig()` returns an `AppliedConfig`: every group and every field, with
defaults applied, so no fallback is needed.

To reset a field, pass its published default from `CONFIG_DEFAULTS`:

```ts
import { CONFIG_DEFAULTS } from 'react-native-nitro-background-geolocation';

await BackgroundGeolocation.configure({
  tracking: { distanceFilter: CONFIG_DEFAULTS.tracking.distanceFilter },
});
```

`null` is a *value*, not a reset. Only `http.httpHeaders` and
`http.postTemplate` accept it, meaning "send none" and "use the native default
template". `configure({})` changes nothing.

## Platform ownership

Each field lists the platforms that read it. A platform that does not read a
field drops the write — in development it also logs a warning that names the
field and its owner — and `getConfig()` reports that field as its default.

`CONFIG_FIELDS` exposes the same facts at runtime, keyed by `group.field`, so an
app can hide or label rows without restating them:

```ts
import { Platform } from 'react-native';
import { CONFIG_FIELDS, ownsField } from 'react-native-nitro-background-geolocation';

CONFIG_FIELDS['tracking.interval'].units; // 'ms'
ownsField(Platform.OS as 'android' | 'ios', 'tracking.interval'); // false on iOS
```

The tables below are generated from the Config Contract, so they cannot drift
from the native defaults.

## Tracking

<ConfigTracking />

The Distance Filter provider's filter is elastic: the effective value is
`distanceFilter + (speed rounded to the nearest 5 m/s)²`, clamped to 1000 m.

| Speed | Effective filter (with `distanceFilter: 50`) |
| --- | --- |
| `< 2.5 m/s` (walking) | 50 m |
| `2.5–7.5 m/s` (cycling) | 75 m |
| `7.5–12.5 m/s` (city driving) | 150 m |
| `12.5–17.5 m/s` (highway) | 275 m |

## Lifecycle

<ConfigLifecycle />

## Activity

Activity *recognition*. Not to be confused with `tracking.activityType`, which
is a CoreLocation journey hint.

<ConfigActivity />

## Notification

<ConfigNotification />

## HTTP and sync

```ts
await BackgroundGeolocation.configure({
  http: {
    url: 'https://example.com/locations',
    syncThreshold: 100,
  },
});
```

<ConfigHttp />

## Storage

<ConfigStorage />

## Debug

<ConfigDebug />

## postTemplate

Customize the JSON body sent to your server. Supports object or array shapes and may include location placeholders such as `@latitude`, `@longitude`, `@time`, `@accuracy`, `@speed`, `@altitude`, `@bearing`.

```ts
await BackgroundGeolocation.configure({
  http: {
    url: 'https://your-server.com/locations',
    postTemplate: {
      lat: '@latitude',
      lon: '@longitude',
      timestamp: '@time',
      accuracy: '@accuracy',
      custom: 'static-value',
    },
  },
});
```

## getCurrentLocation options

`getCurrentLocation()` takes a `LocationOptions` object. It is not persisted: an
omitted field uses the default below for that call only.

<LocationOptions />

## Enums

### LocationProvider

| Value | Code | Description |
|---|---|---|
| `DISTANCE_FILTER` | `0` | Classic background provider with stationary detection and elastic distance filter. |
| `ACTIVITY` | `1` | Activity-aware provider with fused locations and activity recognition. |
| `RAW` | `2` | Raw sensor/device locations with minimal processing. |

### ActivityType

iOS only. The journey hint passed to CoreLocation.

| Value | Code | Description |
|---|---|---|
| `AutomotiveNavigation` | `0` | Driving in a vehicle on roads. |
| `OtherNavigation` | `1` | Other navigation, such as by boat, train or plane. |
| `Fitness` | `2` | Walking, running or cycling. |
| `Other` | `3` | No specific journey type. |

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
