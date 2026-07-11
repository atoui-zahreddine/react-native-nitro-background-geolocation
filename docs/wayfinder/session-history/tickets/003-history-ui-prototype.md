---
id: 003
title: History UI prototype
labels: [wayfinder:prototype]
status: closed
assignee:
blocked-by: [001]
---

## Question

How should history look and behave? Prototype (per `/prototype`) the two
surfaces and iterate with the user:

- **History list**, opened from the Tracker tab: per-session summary rows
  (date, profile, distance, duration, point count), delete affordance,
  empty state.
- **Session detail**: map with raw/snapped route, stats, the config snapshot
  it ran with, a log viewer (level filter, scroll/search for long slices), the
  events timeline, and export + delete entry points.

Resolve against the record schema decided in
[Session record schema and storage](001-session-record-schema.md).

## Resolution

Resolved 2026-07-11. Prototype **approved as-is** — binding interaction spec
for [History UI implementation](006-history-ui-implementation.md).

Prototype: <https://claude.ai/code/artifact/a4b8c999-4042-4743-9d0b-0d4143259a70>
(six phone frames; states summarized here so the spec survives the artifact).

1. **History list** — pushed route off a clock button beside the Tracker's
   gear (visible idle/stopped, dimmed while tracking — the live session isn't
   in history yet). Summary rows from the AsyncStorage index only: profile
   glyph, time range, distance / duration / point count; amber RECOVERED badge
   on kill-recovered sessions; newest first; swipe-left reveals Delete.
2. **Empty state** — copy states saving is automatic; there is no save button
   anywhere.
3. **Detail · Overview** — Tracker-result map treatment (snapped over faded
   raw, Snapped/Raw/Both via the snap chip), stats card (distance / duration /
   points, tabular numerals), profile card with detection detail, then
   "Export session" (share sheet, bundle per
   [Export bundle format](004-export-bundle-format.md)) + "Delete" pills.
   Delete confirms inline in place of the pills — no Alert dialogs.
4. **Detail · Config** — the full 28-option snapshot in the Settings screen's
   7 sections. **Config-diff kept (explicit user call):** values differing
   from the *current* settings get an amber dot + legend card.
5. **Detail · Logs** — the DEBUG+ uncapped slice in a virtualized monospace
   list, level-colored, filter chips (All / Debug / Info / Warn+) and text
   search.
6. **Detail · Events** — vertical timeline merging JS-listener events with the
   headless spool; headless-captured entries tagged "captured headless", kill
   inferred from log gap, lifecycle warnings in amber.

Navigation: History and Detail are pushed routes; Detail's four faces are
segmented tabs (Overview / Config / Logs / Events) on one screen.
Deliberately absent: editing, renaming, favorites, maps on list rows —
anything analytical happens after Export.
