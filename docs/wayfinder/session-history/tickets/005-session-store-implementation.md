---
id: 005
title: Session store implementation
labels: [wayfinder:task]
status: open
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
