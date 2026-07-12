---
id: 014
title: Device QA pass on iOS and Android
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [010, 011, 013]
---

## Question

Verify the destination on real devices (long-tracking behavior cannot be
validated in simulators). Checklist, both platforms unless noted:

- Fresh install → permission flow → start → walk/bike/drive a short real
  track → stop → profile detected correctly, snapped route renders, toggle
  and badge-override work.
- Backgrounding: track continues with app backgrounded ≥ 30 min; foreground
  return re-syncs missed points.
- Kill-state: force-kill mid-session (`stopOnTerminate: false`) → service
  keeps recording (Android foreground notification visible; `[HeadlessTask]`
  logs fire) → relaunch resumes live view with full route.
- Reboot mid-session (Android `startOnBoot` exercised if enabled).
- iOS Always declined path → inline warning card, tracking still runs
  foreground.
- Settings: change distanceFilter, verify next session honors it; read-only
  lock while running; reset-to-defaults.
- Snap failure path (airplane mode at stop) → raw fallback card + Retry.
- Battery sanity over a multi-hour session with the baseline config.

Resolved when the checklist passes on one physical iOS and one physical
Android device; the answer records device models, OS versions, and any
deviations found and fixed.

## Resolution

