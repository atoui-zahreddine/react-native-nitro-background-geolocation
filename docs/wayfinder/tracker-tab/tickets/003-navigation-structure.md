---
id: 003
title: Navigation structure for the example app
labels: [wayfinder:grilling]
status: closed
assignee:
blocked-by: []
---

## Question

The example app is a single screen with no navigation. It needs bottom tabs:
**Tracker** (new) and **Debug** (existing screen, kept mostly as-is). Do we use
Expo Router or React Navigation bottom tabs?

Considerations to grill through:

- Expo Router requires switching `main` to `expo-router/entry` and a file-based
  `app/` directory — more idiomatic for Expo 55, but restructures the example.
- `@react-navigation/bottom-tabs` is additive: keep `index.js` + `App.tsx`,
  wrap in a NavigationContainer. Less churn, more deps.
- Whatever is chosen must not break the headless-task registration path the
  plugin requires (`AppRegistry` entry point), which matters for long tracking
  with `stopOnTerminate: false`.

## Resolution

Resolved 2026-07-07 with the human: **Expo Router** (file-based routing,
idiomatic for Expo SDK 55), chosen over React Navigation despite the extra
restructuring.

- `package.json` keeps `"main": "index.js"` (custom entry, *not*
  `expo-router/entry` directly), preserving the headless registration path.
- **Import-hoisting trap**: in the custom entry, the headless registration must
  be an *import of a module* that runs before the router entry — a bare
  `registerHeadlessHandler(...)` call above `import 'expo-router/entry'` would
  execute *after* it (ES imports hoist). Entry becomes:

  ```js
  // index.js — order guaranteed by ES module evaluation order
  import './src/registerHeadless'; // calls registerHeadlessHandler(...)
  import 'expo-router/entry';
  ```

- Route tree lives at `src/app/` (expo-router supports `src/app`; keeps source
  under `src/` as today):
  - `src/app/_layout.tsx` — root layout
  - `src/app/(tabs)/_layout.tsx` — bottom tabs: **Tracker**, **Debug**
  - `src/app/(tabs)/index.tsx` — Tracker screen
  - `src/app/(tabs)/debug.tsx` — existing `App.tsx` content moved to a plain
    component, functionally unchanged
- QA note for the scaffold task: after migration, verify the headless handler
  still fires (kill the app while tracking with `stopOnTerminate: false` and
  watch for `[HeadlessTask]` logs).
