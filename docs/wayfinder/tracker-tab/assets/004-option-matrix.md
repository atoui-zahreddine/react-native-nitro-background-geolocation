# Plugin option inventory and platform matrix

Research asset for
[Plugin option inventory and platform matrix](../tickets/004-plugin-option-inventory.md).
Source of truth: `packages/react-native-nitro-background-geolocation/src/NitroBackgroundGeolocation.nitro.ts`
(fully documented with defaults and platform tags) and `src/index.tsx`
(pure forwarder — adds nothing to the surface). Compiled 2026-07-07.

## `ConfigureOptions` — all 28 fields

`configure()` merges: omitted fields keep their previous values; `null`
restores a field's native default. Grouped into the settings sections the
settings-UI ticket asked for.

### Section 1 — Provider & accuracy (all platforms)

| Option | Type | Default | Control |
| --- | --- | --- | --- |
| `locationProvider` | enum `LocationProvider`: `DISTANCE_FILTER` 0 / `ACTIVITY` 1 / `RAW` 2 | `DISTANCE_FILTER` | segmented (3) |
| `desiredAccuracy` | enum `LocationAccuracy`: `HIGH` 0 / `MEDIUM` 100 / `LOW` 1000 / `PASSIVE` 10000 | `MEDIUM` | segmented (4) |
| `distanceFilter` | number (m) | `50` | numeric + unit |
| `stationaryRadius` | number (m) | `50` | numeric + unit |
| `debug` | boolean (debug sounds) | `false` | switch |

### Section 2 — Lifecycle

| Option | Type | Default | Platform | Control |
| --- | --- | --- | --- | --- |
| `stopOnTerminate` | boolean | `true` | all | switch |
| `startOnBoot` | boolean | `false` | Android | switch |
| `stopOnStillActivity` | boolean (deprecated upstream) | `true` | Android | switch |

### Section 3 — Intervals (Android)

| Option | Type | Default | Control |
| --- | --- | --- | --- |
| `interval` | number (ms) | `5000` | numeric + unit |
| `fastestInterval` | number (ms) | `1000` | numeric + unit |
| `activitiesInterval` | number (ms) | `10000` | numeric + unit |

### Section 4 — Foreground notification (Android)

| Option | Type | Default | Control |
| --- | --- | --- | --- |
| `notificationsEnabled` | boolean | `true` | switch |
| `startForeground` | boolean | `true` | switch |
| `notificationTitle` | string | `"Background tracking"` | text |
| `notificationText` | string | `"ENABLED"` | text |
| `notificationIconColor` | string (`#RRGGBB`) | `""` | text |
| `notificationIconLarge` | string (resource name) | `""` | text |
| `notificationIconSmall` | string (resource name) | `""` | text |

### Section 5 — iOS behavior

| Option | Type | Default | Control |
| --- | --- | --- | --- |
| `activityType` | string (CLActivityType hint) | platform default | picker/text |
| `pauseLocationUpdates` | boolean | platform default | switch |
| `saveBatteryOnBackground` | boolean | platform default | switch |

### Section 6 — HTTP sync (all platforms)

| Option | Type | Default | Control |
| --- | --- | --- | --- |
| `url` | string | `""` | text (URL) |
| `syncUrl` | string | `""` | text (URL) |
| `syncThreshold` | number | `100` | numeric |
| `httpHeaders` | `Record<string,string>` | undefined | key-value editor |
| `postTemplate` | `AnyMap` (supports `@latitude` placeholders) | native template | JSON text (advanced) |

### Section 7 — Storage (all platforms)

| Option | Type | Default | Control |
| --- | --- | --- | --- |
| `maxLocations` | number | `10000` | numeric |

## Restart semantics

The type surface documents merge/null-reset semantics but **not** whether a
mid-run `configure()` reconfigures the live service. Safe pattern for the
settings UI: edit while stopped (or stop → configure → start); verifying live
reconfigure behavior is a QA item for implementation, not assumed.

## Events (all return `() => void` disposers)

| Event | Payload | Platform |
| --- | --- | --- |
| `onLocation` | `Location` | all |
| `onStationary` | `StationaryLocation` (adds `radius`) | all |
| `onActivity` | `Activity` (`type`: `IN_VEHICLE`/`ON_BICYCLE`/`ON_FOOT`/`RUNNING`/`STILL`/`TILTING`/`WALKING`/`UNKNOWN`, `confidence` %) | Android |
| `onStart` / `onStop` | — | all |
| `onError` | `{code, message}` | all |
| `onAuthorization` | `AuthorizationStatus` | all |
| `onForeground` / `onBackground` | — | Android |
| `onAbortRequested` / `onHttpAuthorization` | — | all (HTTP sync) |

Plus `removeAllListeners()`.

## Methods relevant to the Tracker screen

- Lifecycle: `configure(options)`, `start()`, `stop()` — all Promises.
- One-shot: `getCurrentLocation({timeout, maximumAge, enableHighAccuracy})`
  (defaults 30000 / 0 / false), `getStationaryLocation()`.
- Status: `checkStatus()` → `{isRunning, locationServicesEnabled, authorization}`;
  `getConfig()` → fully merged config (**seed the settings UI from this**).
- Settings escape hatches (Android): `showAppSettings()`, `showLocationSettings()`.
- Storage: `getLocations()`, `getValidLocations()`,
  `getValidLocationsAndDelete()`, `deleteLocation(id)`, `deleteAllLocations()` —
  route reconstruction uses `getLocations()` filtered by `time`.
- Sync: `forceSync()`. Logging: `getLogEntries(limit, fromId, minLevel)`.

## `Location` fields useful to the tracker

`time` (epoch ms), `latitude`, `longitude`, `accuracy` (m), `speed` (m/s —
feeds the profile heuristic), `altitude`, `bearing`, `provider`,
`isFromMockProvider` (Android).

## Corrections to prior context

- **No `headlessTaskName` config option exists** (an earlier design memory
  said it was required). Headless is wired via
  `registerHeadlessHandler(handler)` exported from the package; events:
  `location`, `stationary`, `activity`.
- `onActivity` exists and is Android-only — confirms the charting decision to
  use speed heuristics (an activity-based profile detector would be
  Android-only anyway).
