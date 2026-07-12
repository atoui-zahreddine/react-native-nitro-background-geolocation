---
id: 005
title: Settings UI design for all plugin options
labels: [wayfinder:grilling]
status: closed
assignee:
blocked-by: [004]
---

## Question

Design the settings surface that exposes **every** plugin config option on the
Tracker tab. Grill through:

- Where it lives: modal sheet from the Tracker tab vs. a third tab vs. a
  stacked screen. Interaction with an active tracking run (lock edits while
  running? apply-on-next-start?).
- Control types per option kind (enum → segmented/picker, number → stepper or
  numeric field with unit label, boolean → switch, strings/records for HTTP
  sync → text fields / key-value editor).
- Platform-conditional rendering: iOS-only and Android-only options (from the
  option matrix in [Plugin option inventory and platform matrix](004-plugin-option-inventory.md))
  shown only on their platform, or shown-but-disabled with a badge.
- Persistence of user-edited settings across app launches (AsyncStorage or
  similar) and a "reset to long-tracking defaults" action.
- How defaults are seeded: the long-tracking baseline config from
  [Long-tracking lifecycle and recovery design](007-long-tracking-lifecycle.md).

## Resolution

Resolved 2026-07-07 with the human. Consumes the section/control matrix from
[the option matrix asset](../assets/004-option-matrix.md).

- **Placement**: full-screen stacked route `src/app/settings.tsx`, pushed from
  a gear button on the Tracker screen. Not a sheet (too much content), not a
  third tab (keeps the agreed two-tab structure).
- **While tracking runs**: the screen is **read-only** — controls disabled
  with a "Stop tracking to change settings" banner. One session = one known
  config; also keeps the profile heuristic's assumptions stable.
- **Platform-foreign options**: always listed, disabled with an
  "Android"/"iOS" badge on the other platform — the example doubles as living
  API documentation.
- **Persistence**: edits save to AsyncStorage immediately; `configure()` is
  called with the stored object on app launch and on leaving the settings
  screen; `getConfig()` verifies applied state. "Reset to long-tracking
  defaults" action restores the baseline defined by
  [Long-tracking lifecycle and recovery design](007-long-tracking-lifecycle.md);
  when AsyncStorage is empty (first launch) that same baseline seeds it.
- **Controls**: per the matrix — segmented controls for the two enums,
  switches for booleans, numeric fields with unit labels (ms/m), text fields
  for strings/URLs; `httpHeaders` as a key-value row editor and `postTemplate`
  as a validated JSON text area, both inside a collapsed "Advanced" disclosure
  in the HTTP sync section. Sections rendered in the matrix's 7-group order.
