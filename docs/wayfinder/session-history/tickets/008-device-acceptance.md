---
id: 008
title: Device acceptance pass
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [006, 007]
---

## Question

Device test (HITL) closing the map — verify session history end-to-end on a
real Android device (iOS parity smoke-check welcome):

1. **Clean session**: start → walk/ride → stop → session appears in History;
   detail shows route (snapped after Tracker finishes), stats, config
   snapshot (diff dots against changed current settings), DEBUG+ log slice,
   events timeline.
2. **Kill flow** (the empirical check inherited from
   [What survives app kill](002-app-kill-survival.md)): start → background →
   swipe the app away → keep moving several minutes → relaunch. Expect: a
   RECOVERED session in history containing the full route, logs spanning the
   dead period, and headless-tagged stationary/activity events from the
   spool.
3. **Discard**: stop → discard on the Tracker → session absent from history.
4. **Delete + export**: delete from list (long-press) and from detail;
   export a session and open the JSON bundle elsewhere.

## Resolution
