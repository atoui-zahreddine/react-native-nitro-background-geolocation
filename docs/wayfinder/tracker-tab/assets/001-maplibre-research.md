# MapLibre + open tiles integration research

Research asset for
[MapLibre + open tiles integration in the Expo example](../tickets/001-maplibre-and-open-tiles-integration.md).
Researched 2026-07-07.

## Package: `@maplibre/maplibre-react-native`

- **Version to install: `^11.3.6`** (latest, released 2026-06-25; actively
  maintained — 7 releases in June 2026 alone).
- **New Architecture: required.** From v11 onwards *only* the New Architecture
  is supported — exactly matches our example (RN 0.83 is New-Arch-only).
- **Minimum RN**: ≥ 0.80.0. RN 0.83 is in range; a compat fix for RN ≥ 0.87
  landed in v11.3.4, so the actively supported window comfortably covers us.
- **v11 API note**: the current API is `<Map mapStyle="…" />` (the old
  `MapView`/`styleURL` names changed in v11) — follow current docs, not older
  blog posts.

## Expo integration

- Install with `npx expo install @maplibre/maplibre-react-native` (run in
  `apps/example`).
- Add `"@maplibre/maplibre-react-native"` to `expo.plugins` in
  `apps/example/app.json` (alongside the existing
  `../../packages/react-native-nitro-background-geolocation/app.plugin.js`).
- **Not compatible with Expo Go** — fine, the example already uses a dev
  client (`expo start --dev-client`).
- **Native rebuild required.** The example has committed `android/` and `ios/`
  directories, so config plugins only take effect via prebuild: run
  `npx expo prebuild` (or `--clean` if drift is suspected) and then rebuild the
  dev clients (`yarn ios` / `yarn android`). On iOS the plugin adds required
  post-install hooks to the Podfile.
- Optional `MapLibrePluginProps` exist for native customizations; defaults are
  fine for us.

## Monorepo notes

- `metro.config.js` already watches the monorepo root and resolves from both
  `node_modules` trees; a normal app dependency like MapLibre needs no metro
  changes (it will hoist or land in one of the watched trees; autolinking picks
  it up from the app project).
- If duplicate-React-style errors ever appear, the existing
  `extraNodeModules` pattern in `metro.config.js` is the place to pin it —
  not expected for a native-only dep.

## Tile style: OpenFreeMap **Liberty**

- **Style URL: `https://tiles.openfreemap.org/styles/liberty`**
- Free, **no API key, no registration**; OpenFreeMap explicitly supports usage
  from MapLibre Native (the engine under maplibre-react-native).
- No published rate limits; financed by donations. Perfectly adequate for a
  demo app; self-hosting is documented if it ever mattered.
- **Attribution required**: "Data from OpenStreetMap © OpenMapTiles" — MapLibre
  renders the style's built-in attribution control; keep it visible on the map.
- Alternatives considered: `bright` / `positron` / `dark` (same host, fine as
  well — Liberty chosen as the most complete general-purpose look);
  MapLibre demotiles (too bare for a tracker demo — country borders only);
  Stadia/MapTiler (rejected: API keys).

## Gotchas

1. Config plugins don't apply until prebuild — a plain `yarn ios` after
   editing `app.json` is not enough if prebuild isn't part of the flow.
2. Keep the attribution button enabled (usage-policy requirement).
3. v11 docs/API differ from the widely-blogged v10 (`Map` vs `MapView`).

Sources:
- [Expo Setup | MapLibre React Native](https://maplibre.org/maplibre-react-native/docs/setup/expo/)
- [Getting Started | MapLibre React Native](https://maplibre.org/maplibre-react-native/docs/setup/getting-started/)
- [maplibre-react-native releases](https://github.com/maplibre/maplibre-react-native/releases)
- [OpenFreeMap quick start](https://openfreemap.org/quick_start/)
