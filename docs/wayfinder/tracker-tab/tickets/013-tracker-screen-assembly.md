---
id: 013
title: Tracker screen assembly
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: [009, 010, 012]
---

## Question

Assemble the Tracker screen (`src/app/(tabs)/index.tsx`) implementing all six
approved states from the
[Tracker screen UX prototype](008-tracker-screen-ux-prototype.md) spec:

- Idle: map on current position, gear → settings, Start pill.
- Tracking: stats card (REC indicator, tabular numerals), live polyline,
  follow-me camera with pan-disengage + recenter FAB, Stop pill, dimmed gear.
- Stopped: instant raw trace + fitted camera; profile badge + progress while
  snapping; snapped-over-raw result with Snapped/Raw/Both toggle, badge
  override → re-snap, Discard (inline confirm) / Done.
- Degraded: stacked inline cards for snap failure (Retry) and permission
  shortfalls (Open Settings) — no Alert dialogs.
- Sheet: swipeable peek ↔ full.
- Kill-state relaunch mid-session opens directly into the tracking state.

Uses the session engine
([Tracking session engine](010-session-engine.md)) and the snap/profile module
([Snap-and-profile TS module](012-snap-profile-module.md)). MapLibre layers:
raw dotted line source, snapped line source, start/end circle layers,
attribution visible.

## Resolution

Resolved 2026-07-08. `src/app/(tabs)/index.tsx` rewritten from the MapLibre
placeholder into the full six-state screen; typecheck, lint, tests (35) and
a JS bundle export all pass. Composes `useTrackingSession()`,
`detectProfile()` and `snapToRoads()`.

**States as implemented:**

1. **Idle** — map with `UserLocation` puck + follow camera, gear top-right,
   emerald "Start tracking" pill ("Starting…" while in flight).
2. **Tracking** — white stats card (pulsing REC dot; elapsed / distance /
   avg moving speed / point count, tabular numerals, 1 s elapsed ticker),
   live emerald `GeoJSONSource` polyline, follow-me via Camera
   `trackUserLocation="default"` with pan-disengage detected through
   `onTrackUserLocationChange` (`nativeEvent.trackUserLocation === null`)
   and a recenter FAB re-engaging it; red Stop pill; gear dimmed.
3. **Stopped, snapping** — Camera switches to a `bounds` stop (route
   bounds, 700 ms, sheet-aware padding); raw dotted trace renders
   immediately; sheet shows the profile badge (+" (guess)" when not
   confident) and an indeterminate progress bar under "Snapping to roads…".
4. **Stopped, result** — solid indigo snapped line over the faded dotted
   raw trace, green start / red end circle layers; sheet gains the
   Snapped / Raw GPS / Both segmented toggle (default Both), distance ·
   duration header, and snapped length in the expanded details. Tapping
   the badge opens an inline three-chip picker; picking re-snaps with the
   new costing (guarded by a run-id so stale responses are dropped).
5. **Degraded** — stacked amber `InlineCard`s below the stats area:
   permission denied (Open Settings via `Linking.openSettings()`),
   location services off (Android `showLocationSettings()`), iOS
   foreground-only authorization warning while tracking. Snap failures
   render inside the sheet with reason-specific copy
   (`SNAP_FAILURE_COPY`) and a Retry button; the raw route stays usable.
   No Alert dialogs anywhere.
6. **Sheet** — peek ↔ expanded via drag (PanResponder, ±30 px threshold)
   or tapping the handle; expanded adds moving time / avg speed / point
   count / snapped length. Footer: Discard (inline "Discard route?" red
   confirm + Keep) and Done — both call `session.discard()`.

Kill-state relaunch mid-session lands in state 2 automatically (the
engine's launch resolution); an orphaned anchor lands in state 3→4 with
the auto-snap effect keyed on `startedAt` so it fires once per session.
The `< 2 points` stop shows a "No route recorded" sheet.

**Spec deviation (recorded):** the prototype's "current speed" stat was
replaced by point count + avg moving speed (the stats card shows four
slots as approved; current speed is noisy at 25 m distance-filter sampling
and the option matrix's `speed` field is only per-fix).

On-device exercise of all six states is the remit of
[Device QA pass on iOS and Android](014-device-qa-pass.md).

