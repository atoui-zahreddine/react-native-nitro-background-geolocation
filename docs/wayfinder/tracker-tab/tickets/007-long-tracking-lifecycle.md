---
id: 007
title: Long-tracking lifecycle and recovery design
labels: [wayfinder:grilling]
status: closed
assignee:
blocked-by: [004]
---

## Question

Design how a long tracking session survives backgrounding, app kill, and device
reboot on both platforms, and how the Tracker screen reconstructs state when
the app reopens mid-session.

Grill through:

- Baseline long-tracking config per platform (provider, accuracy,
  distanceFilter, intervals, `stopOnTerminate: false`, Android foreground
  notification, iOS background behavior) — informed by the option matrix from
  [Plugin option inventory and platform matrix](004-plugin-option-inventory.md).
- Session bookkeeping: the plugin stores locations in SQLite but has no session
  concept. How does the app mark a session start (timestamp in AsyncStorage?)
  and rebuild the in-progress route from `getLocations()` /
  `getValidLocations()` filtered by that timestamp when relaunched?
- Headless task: what must the example register (`headlessTaskName`,
  AppRegistry task) for kill-state continuation, and what should the task do?
- Live map behavior during tracking: append from `onLocation` while
  foregrounded, re-sync from SQLite on foreground return.
- Battery and store hygiene: when to prune old SQLite rows
  (`deleteAllLocations` on new session start?), `maxLocations` setting.
- Permission upgrades needed for long tracking: Android
  `ACCESS_BACKGROUND_LOCATION` ("Allow all the time"), iOS `Always`
  authorization — current example only requests fine/when-in-use.

## Resolution

Resolved 2026-07-07 with the human.

**Baseline "long-tracking defaults"** (seeds settings on first launch; restored
by Reset): `DISTANCE_FILTER` provider, `HIGH` accuracy, `distanceFilter: 25`,
`stationaryRadius: 25`, Android `interval: 30000` / `fastestInterval: 15000` /
`activitiesInterval: 30000`, `stopOnTerminate: false`, `startOnBoot: false`,
Android `startForeground: true` + `notificationsEnabled: true` (title/text set
to tracker copy), iOS `pauseLocationUpdates: false` +
`saveBatteryOnBackground: false` + `activityType: 'OtherNavigation'`,
`maxLocations: 10000`, `debug: false`, HTTP sync unset.

**Session bookkeeping — timestamp anchor + SQLite rebuild:**

- Start: write `{startedAt}` to AsyncStorage, then `start()`.
- The route is always reconstructable as
  `getLocations().filter(l => l.time >= startedAt)` — used for cold launch,
  foreground return (re-sync missed points), and kill/reboot recovery.
- Launch with anchor + `checkStatus().isRunning` → resume live view;
  anchor without running service → present the orphaned track as the
  stopped/route view.
- Stop: read route, keep anchor's track visible; `deleteAllLocations()` runs at
  the *next* session start (last track stays inspectable via Debug tab).
- Headless handler stays minimal (log-only): SQLite is the source of truth,
  no JS accumulation in the background.

**Permissions (human's call):**

- **Android: no `ACCESS_BACKGROUND_LOCATION`.** The foreground service with
  its visible notification keeps location flowing with only while-in-use
  permission — that is the point of the foreground-notification approach.
  Keep requesting fine location (+ notifications) as today.
- **iOS: request Always when the user starts a tracking session** (progressive
  upgrade at Start, not at app launch). Declines degrade gracefully with an
  inline warning card, never a blocking alert.
