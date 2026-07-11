---
id: 005
title: Session store implementation
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: [001, 002]
---

## Question

Implement the session store in `apps/example` per the decided schema
([Session record schema and storage](001-session-record-schema.md)) and the
kill-test verdict ([What survives app kill](002-app-kill-survival.md)):

- Capture events from JS listeners during a live session; on stop, assemble
  and persist the full record (points, snap result, config snapshot, log
  slice, events) before anything prunes the underlying data.
- Integrate with `useTrackingSession()` so recovery-after-kill still finalizes
  a record from what natively survived.
- List/read/delete APIs for the UI; unit tests alongside the existing vitest
  suites in `apps/example/src/lib/tracking/`.

## Resolution

Landed 2026-07-11 (commit `dc3d07b`), TDD, 50 vitest tests green (15 new),
tsc + eslint clean.

- **Pure logic** (`apps/example/src/lib/tracking/history.ts`, tested):
  `buildSessionRecord` (version-1 record per the schema ticket, stats =
  `deriveStats` + `durationMs`), `summarizeRecord`, `filterLogWindow`
  (DEBUG+, ±30 s margin, TRACE excluded), `mergeEventTimelines` (headless
  entries tagged). Spool JSONL codec in `spool.ts` (torn-write tolerant,
  tested).
- **IO** (`historyStore.ts`, thin, on-device convention): file-per-session
  under `<documents>/sessions/` via the expo-file-system File/Directory API
  (newly added dep `expo-file-system@~55.0.23`), AsyncStorage summary index,
  `list/load/save/delete`, `attachSnapToRecord(id, snap)` for the Tracker
  screen (ticket 006), `collectSessionLogs` paging `getLogEntries` backwards
  (positive limit = newest-first, fromId pages older — verified in
  `DBLogReader`). Spool IO in `spoolStore.ts`.
- **Anchor** (`sessionStore.ts`): grew from bare timestamp to
  `{startedAt, config}` JSON blob (config snapshot captured at start);
  legacy bare-timestamp anchors parse with null config (tested).
- **Hook** (`useTrackingSession.ts`): records all plugin events
  (start/stop/stationary/activity/error/authorization/foreground/background/
  abortRequested) into the live timeline; finalizes a record at clean stop
  and finalizes a `recovered` record in the orphaned-session launch path
  (before any prune; `stoppedAt` = last point's time); exposes `sessionId`
  for snap attachment; discard deletes the record ("this run never
  happened"); spool cleared at start and after merge.
- **Headless** (`registerHeadless.ts`): stationary/activity events now spool
  to `headless-events.jsonl`; locations stay native-only.

**Residual empirical check** (from
[What survives app kill](002-app-kill-survival.md)): the on-device kill-flow
run needs the history UI to inspect results, so it rides with
[History UI implementation](006-history-ui-implementation.md)'s device
acceptance.
