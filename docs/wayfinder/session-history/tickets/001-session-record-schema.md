---
id: 001
title: Session record schema and storage
labels: [wayfinder:grilling]
status: closed
assignee:
blocked-by: []
---

## Question

What exactly does a stored session record contain, and where does it live?

- Fields: raw points, snapped route + detected profile, stats (distance,
  duration, point count), the exact config snapshot the session ran with, the
  native log slice (`getLogEntries()` filtered to the session window), and the
  events timeline (start/stop, provider switches, permission changes,
  stationary transitions) captured from JS listeners.
- Storage: files (e.g. one JSON per session under the app's documents dir) vs
  AsyncStorage — log slices can be large, so weigh size limits and read
  patterns for the history list (list needs summaries without loading full
  records).
- Lifecycle: how a live session finalizes into a history record on stop
  (including discard), and how capture interleaves with the existing
  prune-at-next-start behavior in `useTrackingSession()` — points must be
  captured into the record before the prune deletes them.
- Log slicing: which log levels to keep, and how to bound the slice for very
  long sessions.

## Resolution

Grilled 2026-07-11.

**Storage: one JSON file per session + a summary index.** Full records live as
`sessions/<id>.json` under the app's documents directory (expo-file-system);
a lightweight index (array of summaries) lives in AsyncStorage for the history
list. Summary fields: `id`, `startedAt`, `stoppedAt`, `profile`,
`distanceMeters`, `durationMs`, `pointCount`, plus a `recovered` flag. The
list never loads full records.

**Record schema (`version: 1`):**

```jsonc
{
  "version": 1,
  "id": "<uuid or startedAt-based>",
  "startedAt": 0, "stoppedAt": 0,          // UTC ms
  "recovered": false,                       // finalized by kill-recovery path
  "config": { /* full getConfig() snapshot taken at session start */ },
  "points": [ /* raw locations from getLocations(), session window */ ],
  "snap": { /* SnapResult: snapped geometry, profile, override, degraded */ },
  "stats": { "distanceMeters": 0, "durationMs": 0, "pointCount": 0 },
  "logs": [ /* LogEntry[] from getLogEntries(), see slice policy */ ],
  "events": [ { "at": 0, "type": "start", "payload": {} } ]
}
```

**Events timeline:** subscribe to every plugin listener during a live session —
`onStart`, `onStop`, `onStationary`, `onActivity`, `onError`,
`onAuthorization`, `onForeground`, `onBackground`, `onAbortRequested` — and
append `{at, type, payload}` entries in memory; they land in the record at
finalize. (JS-only; gaps while the app is dead are the subject of
[What survives app kill](002-app-kill-survival.md).)

**Log slice: DEBUG and above, uncapped.** Slice = `getLogEntries()` filtered
to the session window plus a ±30 s margin. TRACE is excluded as noise; no
entry cap — keep-all history was already decided and debugging fidelity is
the point of this effort.

**Discard deletes from history.** Every stop saves a session; the Tracker's
discard action also removes the saved record + index entry. One mental model:
discard = "this run never happened".

**Write timing: at stop + at recovery.** The record is assembled once at clean
stop (before `clearSessionAnchor()`). If the app died mid-session, the
next-launch recovery path in `useTrackingSession()` finalizes a `recovered`
record from what natively survived (locations + logs persist in native
SQLite; the config snapshot is re-read from the persisted native config).
Finalization always runs **before** the prune-at-next-start step, closing the
capture-vs-prune race. Config snapshot is captured at `start()` time into the
anchor storage (extending the anchor from a bare timestamp to a small JSON
blob) so recovery can still embed it.
