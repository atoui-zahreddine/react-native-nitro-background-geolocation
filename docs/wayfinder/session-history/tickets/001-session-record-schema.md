---
id: 001
title: Session record schema and storage
labels: [wayfinder:grilling]
status: open
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
