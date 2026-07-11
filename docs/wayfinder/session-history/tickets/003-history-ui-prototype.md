---
id: 003
title: History UI prototype
labels: [wayfinder:prototype]
status: open
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
