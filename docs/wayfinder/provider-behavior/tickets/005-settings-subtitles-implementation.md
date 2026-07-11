---
id: 005
title: Settings subtitles implementation
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [003]
---

## Question

Implement the subtitles in `apps/example/src/app/settings.tsx` per the decided
copy ([Settings subtitle copy for all options](003-settings-subtitle-copy.md)):
extend `RowShell` with a description slot (styled consistently with the
existing label + platform-pill layout, honoring the read-only lock state) and
apply the copy to all rows.

## Resolution
