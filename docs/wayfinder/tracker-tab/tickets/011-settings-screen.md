---
id: 011
title: Settings screen implementation
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: [009]
---

## Question

Build `src/app/settings.tsx` per
[Settings UI design for all plugin options](005-settings-ui-design.md) and the
[option matrix](../assets/004-option-matrix.md):

- All 28 options in the 7 matrix sections; controls per the matrix (segmented
  enums, switches, numeric+unit fields, text, key-value editor and JSON area in
  a collapsed Advanced disclosure).
- ANDROID/IOS pills on platform-foreign rows, disabled off-platform.
- Read-only mode with amber banner while a session is running.
- AsyncStorage persistence (seeded from the long-tracking baseline in
  [Long-tracking lifecycle and recovery design](007-long-tracking-lifecycle.md)),
  `configure()` on launch and on leaving the screen, verified via `getConfig()`.
- "Reset to long-tracking defaults" pinned last.

Done when both platforms render correctly and a changed option demonstrably
affects the next session (e.g. distanceFilter).

## Resolution

Resolved 2026-07-08. `apps/example/src/app/settings.tsx` implements the full
005 design; typecheck, lint, tests (35) and a JS bundle export all pass.

**Screen** (self-contained route with local row components — `Section`,
`RowShell`, `SegmentedRow`, `SwitchRow`, `NumberRow`, `TextRow`,
`KeyValueEditor`, `JsonRow`):

- All 28 options in the 7 matrix sections, controls per the matrix:
  segmented for `locationProvider` / `desiredAccuracy` / `activityType`
  (native accepts `AutomotiveNavigation | OtherNavigation | Fitness |
  Other` — verified in `MAURConfig.m`), switches for booleans, numeric
  fields with m/ms unit labels (commit on end-editing, revert on invalid),
  text fields for strings/URLs.
- `httpHeaders` key-value row editor and `postTemplate` validated-JSON
  text area (invalid JSON shows an inline error and is not saved) live in
  a collapsed **Advanced** disclosure inside HTTP sync.
- ANDROID/IOS pills on platform-foreign rows, disabled off-platform
  (living documentation).
- **Read-only while running**: amber banner + all controls disabled;
  `isRunning` seeds from `checkStatus()` and tracks `onStart`/`onStop`
  live.
- **Persistence**: every edit saves to AsyncStorage immediately via
  `saveStoredConfig`; on leaving the screen (unmount cleanup) the stored
  config is applied with `configure()` and read back via `getConfig()`
  (logged) — skipped when a session is running. Seeding/merging over
  `LONG_TRACKING_BASELINE` comes from the session engine's `config.ts`.
- **Reset to long-tracking defaults** pinned last, with an inline
  two-tap confirm (no Alert dialogs, consistent with the UX spec).

**Wiring beyond the screen:**

- Root `_layout.tsx` now applies the stored config once per launch
  (`configure(loadStoredConfig())`), guarded by `checkStatus().isRunning`
  so a kill-relaunch mid-session never reconfigures the live service; it
  also registers the `settings` stack screen (header shown, title
  "Settings").
- The Tracker placeholder got its gear button (floating, safe-area aware,
  `Link href="/settings"`) — the 013 assembly restyles it per the
  prototype.

**Deferred to [Device QA pass](014-device-qa-pass.md)** (already on its
checklist): on-device render check on both platforms and proving a changed
`distanceFilter` affects the next session.

