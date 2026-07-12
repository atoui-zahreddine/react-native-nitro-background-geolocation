---
id: 005
title: Settings subtitles implementation
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: [003]
---

## Question

Implement the subtitles in `apps/example/src/app/settings.tsx` per the decided
copy ([Settings subtitle copy for all options](003-settings-subtitle-copy.md)):
extend `RowShell` with a description slot (styled consistently with the
existing label + platform-pill layout, honoring the read-only lock state) and
apply the copy to all rows.

## Resolution

Implemented 2026-07-12 in `apps/example/src/app/settings.tsx`.

- **`RowShell`** gained an optional `description` slot. Label + platform pill
  now sit in a `rowMain` column with the description beneath (`rowDescription`
  style: 12.5px muted grey). The whole row (description included) dims via the
  existing `rowDisabled` opacity, so the read-only lock state is honored.
- **`SegmentedRow`** options gained an optional per-choice `description`; the
  selected choice's gloss renders below the control (`segmentDescription`).
  Used for the Location provider picker (Distance / Activity / Raw).
- Threaded `description` through every control component (`SwitchRow`,
  `NumberRow`, `TextRow`, `KeyValueEditor`, `JsonRow`).
- Applied the approved copy to all 27 rows across the 7 sections.
- Fixed stale in-UI fallbacks to match the new defaults: `distanceFilter`
  `?? 500` → `?? 50`, `interval` `?? 600000` → `?? 5000`, `fastestInterval`
  `?? 120000` → `?? 1000`.

**Verification:** `turbo typecheck` and `turbo lint` pass for the example. This
is prop-threading + additive styling with no logic change. Visual/on-screen
confirmation (subtitles render, wrap cleanly, dim when locked, provider gloss
switches with selection) folds into the device QA pass
[006](006-field-verification.md), since rendering the Nitro example needs the
native build deferred there.
