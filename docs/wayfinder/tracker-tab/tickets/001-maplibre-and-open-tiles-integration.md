---
id: 001
title: MapLibre + open tiles integration in the Expo example
labels: [wayfinder:research]
status: closed
assignee:
blocked-by: []
---

## Question

How do we integrate `@maplibre/maplibre-react-native` into the example app
(Expo 55 dev-client, RN 0.83, New Architecture, monorepo with yarn workspaces),
and which free, keyless tile style should it use?

To resolve:

- Confirm the current MapLibre React Native version supports RN 0.83 / New
  Architecture, and what its Expo config plugin requires (`app.json` plugin
  entry, `expo prebuild` / native rebuild of the dev client on both platforms).
- Any monorepo pitfalls (metro config, autolinking from `apps/example`).
- Pick the tile source: candidates are OpenFreeMap styles (liberty/bright/positron),
  MapLibre demotiles (too bare?), and other keyless OSM-based styles. Constraint
  from the map's Notes: free, no API key, acceptable usage policy for a demo app.
- Verify the chosen style's URL works in MapLibre RN on both iOS and Android.

Deliverable: a linked markdown summary with the chosen package version, config
steps, tile style URL, and any gotchas.

## Resolution

Resolved 2026-07-07 — full detail in
[the research summary](../assets/001-maplibre-research.md).

- Install **`@maplibre/maplibre-react-native` `^11.3.6`** via
  `npx expo install`; v11+ is New-Architecture-only, which matches RN 0.83.
  Min RN 0.80; actively maintained.
- Add `"@maplibre/maplibre-react-native"` to `expo.plugins` in `app.json`,
  then **`npx expo prebuild`** + rebuild both dev clients (config plugins
  don't apply without prebuild; the app has committed `android/`/`ios/`).
  Not Expo Go compatible — irrelevant, we're already dev-client.
- No metro/monorepo changes needed; the existing config already covers it.
- Tile style: **OpenFreeMap Liberty** —
  `https://tiles.openfreemap.org/styles/liberty`. Keyless, free, explicitly
  supports MapLibre Native; keep the built-in attribution control visible
  ("Data from OpenStreetMap © OpenMapTiles").
- API gotcha: v11 renders via `<Map mapStyle={…} />` (not the older
  `MapView`/`styleURL`).
