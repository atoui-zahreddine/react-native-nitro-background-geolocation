---
id: 001
title: Why the Activity provider ignores distanceFilter
labels: [wayfinder:research]
status: closed
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

Full findings:
[001-activity-smallestdisplacement-research.md](../assets/001-activity-smallestdisplacement-research.md).

**Factual correction:** the commented line references `stationaryRadius`
(default 50 m), **not** `distanceFilter` (default 500 m) as the map originally
assumed. `stationaryRadius` is the stationary-region radius documented for the
`DISTANCE_FILTER_PROVIDER`; `distanceFilter` is the true minimum-displacement
knob. So the disabled call fed the wrong-meaning value into
`setSmallestDisplacement` — the wiring was arguably wrong even before the
"buggy" question.

**Why it's disabled (documented fact):** intentionally commented out upstream
by the maintainer in `mauron85/cordova-plugin-background-geolocation` commit
`10503ed` (2015-10-22, v0.7.1), message *"Android ANDROID_FUSED_LOCATION
ditching setSmallestDisplacement(stationaryRadius) (seems buggy)"*. It was an
empirical bug workaround — the *exact* bug is undocumented ("seems buggy" is
the only rationale on record; no linked issue). The christocracy original is
README-only today, so pre-2015 history is unrecoverable.

**Implications of enabling it:** `setSmallestDisplacement` is a hard
minimum-distance gate layered on top of the time interval — no callback fires
until the device physically moves that far. It suppresses updates when
stationary/slow, and would **compound** with this provider's STILL →
`stopTracking` logic (delaying activity-driven re-engagement, risking dropped
points on slow starts) and with Doze batching.

**Recommendation (human decides in ticket 002):** *keep it disabled* and
document that the Activity provider is time/activity-driven by design; if
distance thinning is ever wanted, use `distanceFilter`, never `stationaryRadius`.
