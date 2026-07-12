---
id: 009
title: Scaffold tabs and MapLibre in the example app
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: [001, 003]
---

## Question

Land the structural groundwork in `apps/example`: install and configure the
chosen navigation library and MapLibre React Native per the resolutions of
[MapLibre + open tiles integration in the Expo example](001-maplibre-and-open-tiles-integration.md)
and [Navigation structure for the example app](003-navigation-structure.md).

Done when:

- The app builds and runs on both iOS and Android dev clients.
- Two tabs exist: **Tracker** (placeholder screen rendering a MapLibre map with
  the chosen open tile style, centered on device location) and **Debug** (the
  existing screen moved, functionally unchanged).
- Native rebuild steps are reflected in the example's scripts/docs as needed.

The answer records exact versions installed, config plugin entries, and any
deviations from the research summaries.

## Resolution

Resolved 2026-07-07. Both platforms build green: iOS `yarn build:ios`
(xcodebuild, simulator, exit 0) and Android `yarn build:android`
(`BUILD SUCCESSFUL in 9m 15s`); JS bundle verified separately with
`expo export` (expo-router resolves the `src/app` tree).

**Versions installed** (in `apps/example`, via `npx expo install`):

- `expo-router@~55.0.16`, `expo-linking@~55.0.16`, `expo-constants@~55.0.16`
- `react-native-safe-area-context@~5.6.2`, `react-native-screens@~4.23.0`
- `@maplibre/maplibre-react-native@^11.3.6` (11.3.6 resolved; pod
  `MapLibreReactNative 11.3.6` in `Podfile.lock`)
- `@expo/vector-icons@^15.0.2` + peer `expo-font@~55.0.8` (tab icons —
  vector-icons is no longer a transitive dep of `expo` in SDK 55)

**Config** (`app.json`): added `"scheme": "nitro-bg-geo-example"` (required by
expo-router linking) and plugins `"expo-router"` (auto-added by expo install)
and `"@maplibre/maplibre-react-native"`, after the existing library
`app.plugin.js`. Verified via `yarn expo config --type prebuild`.

**Structure**:

- `index.js` → `import './src/registerHeadless'; import 'expo-router/entry';`
  (headless registration moved to `src/registerHeadless.ts`; import order per
  [Navigation structure for the example app](003-navigation-structure.md)).
- `src/app/_layout.tsx` — root Stack (header hidden) + StatusBar.
- `src/app/(tabs)/_layout.tsx` — Tabs: **Tracker** (`index`, Ionicons
  `navigate`), **Debug** (`debug`, Ionicons `bug`).
- `src/app/(tabs)/index.tsx` — placeholder Tracker: MapLibre `<Map>` with
  OpenFreeMap Liberty, `<Camera trackUserLocation="default">` +
  `<UserLocation>` (centers on device once permission granted); attribution
  left at default (visible).
- `src/App.tsx` → moved to `src/app/(tabs)/debug.tsx`, component renamed
  `DebugScreen`, otherwise unchanged.

**Deviations from the research**:

- `ios/` and `android/` are **gitignored**, not committed (contrary to the
  research asset's assumption) — fresh clones generate them via
  `expo run:ios|android`; existing checkouts need `yarn prebuild` after plugin
  changes. Added a `"prebuild": "expo prebuild"` script to
  `apps/example/package.json`. Prebuild applied the MapLibre Podfile
  post-install hook (`$MLRN.post_install(installer)`) and the scheme on both
  platforms.
- `npx expo …` from outside `apps/example` resolves to the **legacy global
  expo-cli**, which chokes on the MapLibre plugin ("Unexpected token
  'typeof'") — harmless but confusing; use `yarn expo …` inside the app.

QA note carried forward to
[Device QA pass on iOS and Android](014-device-qa-pass.md): re-verify
`[HeadlessTask]` logs fire after force-kill (registration path changed).

