---
id: 001
title: Why the Activity provider ignores distanceFilter
labels: [wayfinder:research]
status: open
assignee:
blocked-by: []
---

## Question

Research (AFK): why is `setSmallestDisplacement` commented out in
`ActivityRecognitionLocationProvider.java:118`, and what are the implications
of enabling it?

- Upstream history: search mauron85/react-native-background-geolocation (and
  its cordova ancestor) commits/issues for when and why the line was disabled —
  was it a bug workaround, a deliberate design choice, or leftover debugging?
- Fused-location behavior: how does `setSmallestDisplacement` interact with
  `setInterval`/`setFastestInterval` and priority on Google Play Services —
  any known gotchas (e.g. displacement suppressing activity-driven updates,
  batching effects, doze behavior)?
- Produce a markdown summary as a linked asset with a recommendation for the
  decision ticket.

## Resolution
