---
id: 004
title: Plugin option inventory and platform matrix
labels: [wayfinder:research]
status: closed
assignee:
blocked-by: []
---

## Question

Enumerate every configuration option, method, and event the plugin exposes, and
classify each by platform applicability (iOS / Android / both). This feeds the
settings UI (which must expose *every* option) and the long-tracking lifecycle
design.

To resolve, read the package's TypeScript definitions and native docs in
`packages/react-native-nitro-background-geolocation`:

- All `ConfigureOptions` fields: type, default, allowed values (enums), platform,
  and a one-line human description suitable for a settings row.
- Which options require restart vs. apply live via re-`configure()`.
- All events (`onLocation`, `onStationary`, `onActivity`?, `onError`, …) and
  status/query methods relevant to the tracker screen.
- Group options into sensible settings sections (provider & accuracy, intervals
  & filters, Android foreground notification, iOS behavior, HTTP sync, logging
  & debug).

Deliverable: a linked markdown matrix (option × type × default × platform ×
section) the settings-UI ticket can consume directly.

## Resolution

Resolved 2026-07-07 — full matrix in
[the option matrix asset](../assets/004-option-matrix.md). Source of truth is
`src/NitroBackgroundGeolocation.nitro.ts`; the TS wrapper adds nothing.

- **28 `ConfigureOptions` fields**, grouped into 7 settings sections:
  provider & accuracy (5, all platforms), lifecycle (3), Android intervals (3),
  Android foreground notification (7), iOS behavior (3), HTTP sync (5),
  storage (1). Each has type, default, platform, and suggested control type
  in the matrix.
- Merge semantics: omitted fields unchanged, `null` restores native default;
  `getConfig()` returns the fully merged config — the settings UI should seed
  from it. Whether mid-run `configure()` applies live is undocumented —
  settings UI should edit while stopped; live-reconfigure is a QA item.
- 11 events (all disposer-returning), including Android-only `onActivity`,
  `onForeground`/`onBackground`; full method list annotated for the tracker
  screen (route reconstruction via `getLocations()` filtered by `time`).
- Correction to prior context: **no `headlessTaskName` option exists** —
  headless is `registerHeadlessHandler()` with `location`/`stationary`/
  `activity` events.
