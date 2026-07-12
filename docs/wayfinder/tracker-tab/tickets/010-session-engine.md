---
id: 010
title: Tracking session engine
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: [009]
---

## Question

Implement the session layer beneath the Tracker UI, per
[Long-tracking lifecycle and recovery design](007-long-tracking-lifecycle.md):

- `useTrackingSession()` (or equivalent module): Start = prune previous
  session's rows (`deleteAllLocations()`), write `{startedAt}` anchor to
  AsyncStorage, `configure()` with stored settings, `start()`. Stop = `stop()`,
  read route, keep anchor's track visible, clear anchor.
- Route reconstruction: `getLocations().filter(l => l.time >= startedAt)`;
  used on cold launch, foreground return, and kill/reboot recovery. Launch
  with anchor + `checkStatus().isRunning` resumes the live view (UX state 2);
  anchor without running service presents the stopped route view.
- Live updates: append from `onLocation`; wire `onStart`/`onStop`/`onError`/
  `onAuthorization`.
- Permissions: fine location (+ notifications) on first Tracker visit as
  today; iOS Always requested at Start; no Android background permission.
  Expose permission state for the inline cards (UX state 5).
- Live stats derivation (elapsed, distance, avg moving speed, point count).

Done when: unit-testable logic is covered (distance/stats, route filter), and
manual start→background→kill→relaunch on a device rebuilds the live session.

## Resolution

Resolved 2026-07-07. The session layer lives in
`apps/example/src/lib/tracking/` alongside the snap module; 35 unit tests
pass (9 new for the session logic), typecheck and lint clean.

**Files:**

- `session.ts` (pure, unit-tested) — `filterSessionPoints(locations,
  startedAt)`: time-filter ≥ anchor, time-sort, dedupe by database id (live
  `onLocation` appends can overlap a SQLite re-sync); `deriveStats(points)`:
  `{pointCount, distanceMeters, movingSeconds, avgMovingSpeedKmh}` with the
  same hygiene as profile detection (accuracy ≤ 50 m, sub-1 km/h segments
  are dwell — excluded from both distance and moving time). Elapsed time is
  derived in the UI from `startedAt`.
- `sessionStore.ts` — AsyncStorage anchor (`tracker.session.startedAt`):
  get/set/clear.
- `config.ts` — `LONG_TRACKING_BASELINE` (the 007 baseline verbatim,
  notification copy "Route tracker / Recording your route") plus
  `loadStoredConfig()` (stored settings merged over baseline, key
  `tracker.config`), `saveStoredConfig()`, `resetStoredConfig()` — the
  settings screen (011) reuses these.
- `permissions.ts` — `requestTrackingPermissions()`: Android fine location
  (required) + activity recognition (29+) + notifications (33+); **no**
  ACCESS_BACKGROUND_LOCATION (foreground service covers it). iOS returns
  granted — the plugin's `start()` triggers `requestAlwaysAuthorization`
  natively (verified in `MAURLocationManager.m`), so "Always at Start"
  needs no extra call.
- `useTrackingSession.ts` — the hook. Phases: `initializing → idle →
  starting → tracking → stopping → stopped`. Mount resolves launch state:
  anchor + `checkStatus().isRunning` → `tracking` with the route rebuilt
  from SQLite; anchor without running service → `stopped` (orphaned track
  shown, anchor cleared); no anchor → `idle`. Start = permissions →
  `deleteAllLocations()` → `configure(loadStoredConfig())` → write anchor →
  `start()` (any failure rolls the anchor back). Stop = `stop()` → final
  authoritative SQLite re-read → `stopped` → clear anchor. Live: append
  from `onLocation` (filtered by anchor); `onStop` from outside the Stop
  flow (e.g. Debug tab) transitions to `stopped`; `onError`/
  `onAuthorization` surface state; AppState `active` triggers a SQLite
  re-sync (points missed while backgrounded). Exposes `authorization`,
  `locationServicesEnabled`, `permissionsGranted`, `lastError` for the
  degraded-state cards, plus `start/stop/discard/resync`.

**Dependency added:** `@react-native-async-storage/async-storage@2.2.0`
(native module — dev clients need a rebuild).

**Deferred:** the manual start→background→kill→relaunch verification needs
a physical device; it is an explicit line item on
[Device QA pass on iOS and Android](014-device-qa-pass.md).

