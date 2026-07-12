---
id: 008
title: Tracker screen UX prototype
labels: [wayfinder:prototype]
status: closed
assignee:
blocked-by: [001, 003]
---

## Question

Prototype the Tracker tab's UX (via the /prototype skill) and react to it with
the human. The screen must cover, with good UX:

- **Idle state**: map centered on current location, prominent Start action,
  entry point to settings.
- **Tracking state**: live route polyline growing on the map, live stats
  (elapsed time, distance, current/avg speed, point count), follow-me camera
  with a recenter control, prominent Stop action. Must feel calm over
  multi-hour sessions.
- **Stopped state**: full route fitted to the viewport; snapped route drawn
  over (or toggleable against) the raw GPS trace; detected profile shown as a
  badge with manual override that re-snaps; snapping progress/failure states
  (fallback to raw route); action to discard and return to idle.
- Permission/blocked states (location off, denied) surfaced inline rather than
  as alerts.

Deliverable: a linked prototype (screens or stub code) plus the agreed
interaction notes that implementation will follow.

## Resolution

Resolved 2026-07-07. Prototype **approved as-is** by the human — it is the
binding interaction spec for implementation.

Prototype: <https://claude.ai/code/artifact/cb432a04-0e93-4123-b163-55a798f1189f>
(six phone frames; HTML source kept in session scratchpad, states summarized
here so the spec survives the artifact).

1. **Idle** — full-screen map on current position, gear (→ settings) top-right,
   single "Start tracking" pill. iOS Always requested on Start. Attribution
   always visible.
2. **Tracking** — stats card (elapsed / distance / avg speed / point count,
   tabular numerals) with pulsing REC indicator; live emerald polyline;
   follow-me camera, pan disengages, recenter FAB re-engages; gear dimmed
   (settings read-only); red "Stop" pill.
3. **Stopped, snapping** — camera fits track; raw dotted trace renders
   instantly; bottom sheet shows detected-profile badge + progress bar
   ("Snapping to roads…"). Nothing blocks on network.
4. **Stopped, result** — solid snapped route over faded raw trace,
   start/end markers; sheet has profile badge (🚶/🚴/🚗, tap to change →
   re-snap), distance/duration, Snapped / Raw GPS / Both toggle,
   Discard + Done. Done keeps route until next start.
5. **Degraded** — snap failure and permission shortfalls are stacked inline
   cards (with Retry / Open Settings actions); never Alert dialogs; raw route
   stays fully usable.
6. **Settings** — full-screen pushed route, 7 matrix sections, ANDROID/IOS
   pills on platform-foreign rows, amber lock banner while recording,
   "Reset to long-tracking defaults" pinned last.

Sheet behavior: swipeable peek ↔ full. Discard confirms inline in the sheet.
Kill-state relaunch mid-session opens directly into state 2 with the route
rebuilt from SQLite.
