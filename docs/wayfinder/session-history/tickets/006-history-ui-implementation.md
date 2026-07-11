---
id: 006
title: History UI implementation
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: [003, 005]
---

## Question

Build the approved history UI ([History UI prototype](003-history-ui-prototype.md))
on top of the session store ([Session store implementation](005-session-store-implementation.md)):
history list route reachable from the Tracker tab, session detail view (map,
stats, config snapshot, log viewer, events timeline), delete with confirm.
Done when it works on-device with real recorded sessions.

## Resolution

Landed 2026-07-11 (commit `5bc3178`), tsc + vitest (50) + lint green.

- `src/app/history.tsx` — list route per spec frame 1–2: focus-refreshed
  newest-first summaries, profile glyphs, RECOVERED badge, long-press
  inline-confirm delete (deviation from swipe-left, permitted, to avoid a
  gesture-handler dependency), automatic-save empty state.
- `src/app/session/[id].tsx` — detail route, four segmented tabs per frames
  3–6: fitted MapLibre overview (snapped over faded raw) + stats + profile
  cards + Export (disabled until the export ticket) / Delete pills with
  inline confirm; Config snapshot in the settings screen's 7 sections with
  amber config-diff dots vs current settings; virtualized level-colored log
  viewer with filter chips + search; events timeline with headless tags and
  amber lifecycle dots.
- Tracker screen: clock button below the gear (stacked to dodge the live
  stats card; dimmed while tracking) and snap persistence — completed snaps
  (including badge-override re-snaps) attach to the record via
  `attachSnapToRecord(sessionId, …)`.
- Routes registered in `_layout.tsx` following the settings pattern.

On-device acceptance (incl. the kill-flow check inherited from
[What survives app kill](002-app-kill-survival.md)) moved to the new
map-closing [Device acceptance pass](008-device-acceptance.md).
