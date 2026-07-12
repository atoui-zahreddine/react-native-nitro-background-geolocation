---
id: 006
title: Field verification of provider distinctness
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [004, 005]
---

## Question

Device test (HITL): with the fixes landed
([Provider fixes implementation](004-provider-fixes-implementation.md)) and
the subtitles in place
([Settings subtitles implementation](005-settings-subtitles-implementation.md)),
walk/bike the same route once per provider with a sane interval and compare
the recorded tracks: do Distance, Activity, and Raw now produce visibly
different point patterns matching their documented strategies (elastic
distance filtering + stationary detection vs fused/activity-driven vs raw)?
Record the comparison (point counts, gaps, stationary handling) as the
resolution; this closes the map.

Also, since this is the first native build after 004/005, confirm en route:
- The build is green on both platforms (Gradle + Xcode) — not run in the
  implementation tickets.
- The settings subtitles render correctly: readable, wrap cleanly, dim with the
  read-only lock while recording, and the Location provider gloss switches with
  the selected segment ([005](005-settings-subtitles-implementation.md)).

## Resolution
