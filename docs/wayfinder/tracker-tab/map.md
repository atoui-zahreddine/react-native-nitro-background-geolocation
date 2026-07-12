---
title: Tracker tab in the example app
labels: [wayfinder:map]
---

# Tracker tab in the example app

## Destination

A working **Tracker** tab in `apps/example`, on iOS and Android: start a
(potentially multi-hour) background tracking session, stop it, and see the
tracked route on a MapLibre map — raw GPS trace plus a snapped-to-road route
matched with an auto-detected profile (walking / biking / driving). A settings
UI exposes every plugin config option. This map carries execution: it is done
when the feature works on both platforms.

## Notes

- Domain: React Native (Expo 55 dev-client, RN 0.83, New Architecture) example
  app for the `react-native-nitro-background-geolocation` Nitro module, in a
  yarn-workspaces monorepo.
- Standing constraints (from the charting grill):
  - External services must be **free and keyless** (open tile styles, public
    map-matching instances) so the example runs for anyone who clones the repo.
  - Profile detection is **speed heuristics only** — no OS activity
    recognition, no new native code in the library.
  - **Last route only** — no session history.
  - The existing debug screen is **kept as a second tab**, mostly as-is.
- Skills to consult per ticket type: `/grilling` + `/domain-modeling` for
  grilling tickets, `/prototype` for the UX prototype ticket.
- API design context lives in the project memory "Nitro Background Geolocation
  design decisions" and `docs/adr/`.
- Tracker mechanics: see `docs/agents/issue-tracker.md` (local markdown
  tracker).

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [MapLibre + open tiles integration in the Expo example](tickets/001-maplibre-and-open-tiles-integration.md) — use `@maplibre/maplibre-react-native` `^11.3.6` (New-Arch-only, fits RN 0.83) via its Expo config plugin + prebuild; tiles from OpenFreeMap Liberty (`https://tiles.openfreemap.org/styles/liberty`), keyless, attribution kept visible.
- [Keyless map-matching service per profile](tickets/002-keyless-map-matching-service.md) — FOSSGIS Valhalla `trace_route` (`pedestrian`/`bicycle`/`auto`, polyline6 responses, 5,000-point requests verified, `X-Client-Id` header, 1 req/s); snapping is progressive enhancement with raw-trace fallback; FOSSGIS OSRM documented as runner-up (GeoJSON but 100-point cap).
- [Navigation structure for the example app](tickets/003-navigation-structure.md) — Expo Router with a custom `index.js` entry: `import './src/registerHeadless'` *before* `import 'expo-router/entry'` (import-order guarantees headless registration); route tree at `src/app/(tabs)/` with Tracker (`index.tsx`) and Debug (`debug.tsx`, existing screen moved as-is).
- [Plugin option inventory and platform matrix](tickets/004-plugin-option-inventory.md) — 28 config options in 7 sections (matrix with types/defaults/platforms/controls in the asset); seed settings UI from `getConfig()`; edit-while-stopped until live reconfigure is verified; no `headlessTaskName` option — headless wires via `registerHeadlessHandler`.
- [Settings UI design for all plugin options](tickets/005-settings-ui-design.md) — full-screen `settings.tsx` route off a gear button; read-only while tracking; platform-foreign options badged+disabled (living documentation); AsyncStorage persistence with configure-on-launch and reset-to-baseline; advanced JSON/key-value editors collapsed in HTTP sync.
- [Profile detection heuristic (walking / biking / driving)](tickets/006-profile-detection-heuristic.md) — pure TS `detectProfile()`: filter accuracy > 50m, segment speeds from distance/Δt, drop dwell < 1 km/h, classify p85 at 8 / 28 km/h boundaries; dominant profile with tappable badge override that re-snaps; sparse tracks default to walking, low-confidence.
- [Long-tracking lifecycle and recovery design](tickets/007-long-tracking-lifecycle.md) — balanced 25m-filter baseline config (full spec in ticket); session = AsyncStorage `startedAt` anchor with route rebuilt from `getLocations()` by time (covers kill/reboot/foreground-return); prune at next start; headless stays log-only; Android needs no background permission (foreground notification covers it), iOS requests Always at session start.
- [Tracker screen UX prototype](tickets/008-tracker-screen-ux-prototype.md) — approved as-is; six binding states (idle / tracking / snapping / result / degraded / settings) fully specified in the ticket, prototype artifact linked there.
- [Scaffold tabs and MapLibre in the example app](tickets/009-scaffold-tabs-maplibre.md) — landed and building green on both platforms: Expo Router tabs at `src/app/(tabs)/` (Tracker = MapLibre/OpenFreeMap placeholder, Debug = old screen moved intact), headless registration preserved via `src/registerHeadless.ts` import-first entry; exact versions and prebuild notes in the ticket.
- [Snap-and-profile TS module](tickets/012-snap-profile-module.md) — landed at `apps/example/src/lib/tracking/` (`detectProfile`, `snapToRoads`, polyline codec, typed `SnapResult`); 26 vitest unit tests green (vitest newly added to the example app) plus a live Valhalla match verified through the module.
- [Tracking session engine](tickets/010-session-engine.md) — `useTrackingSession()` hook + pure session logic landed next to the snap module: anchor in AsyncStorage, route rebuilt from SQLite on launch/foreground/kill recovery, long-tracking baseline config store, permissions helper (no Android background permission; iOS Always fires inside native `start()`); 35 tests green, device kill-flow check deferred to the QA pass.
- [Settings screen implementation](tickets/011-settings-screen.md) — `src/app/settings.tsx` landed: all 28 options in 7 sections with matrix controls, platform pills, read-only lock while recording, AsyncStorage persistence with configure-on-leave + configure-on-launch (both guarded against live sessions), inline-confirm reset; gear entry point added to the Tracker screen.
- [Tracker screen assembly](tickets/013-tracker-screen-assembly.md) — the six-state Tracker screen landed at `src/app/(tabs)/index.tsx`: live stats + follow camera with recenter, instant raw trace + auto detect/snap on stop, badge-override re-snap, Snapped/Raw/Both toggle, inline degraded cards, swipeable sheet with inline discard confirm; one recorded deviation (point count replaces the noisy current-speed stat).

## Not yet specified

*(empty — all fog has graduated into tickets; the way to the destination is
fully charted)*

## Out of scope

- **Session history** — each stop shows only the just-recorded route; ruled out
  in the charting grill.
- **OS activity recognition for profile detection** — would require new native
  surface in the library; speed heuristics chosen instead.
- **Services requiring API keys** (Mapbox, Stadia, etc.) — the example must run
  with zero provisioning.

## Tickets

Open children live in [tickets/](tickets/); frontier = open, unassigned, all
`blocked-by` closed.

| Ticket | Type | Blocked by |
| --- | --- | --- |
| [Device QA pass on iOS and Android](tickets/014-device-qa-pass.md) | task | 010 ✓, 011 ✓, 013 ✓ |
