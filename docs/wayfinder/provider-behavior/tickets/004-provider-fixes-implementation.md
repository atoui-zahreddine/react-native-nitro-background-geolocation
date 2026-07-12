---
id: 004
title: Provider fixes implementation
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [002]
---

## Question

Apply the decided changes
([Decide provider and interval behavior changes](002-provider-interval-decisions.md))
in `packages/react-native-nitro-background-geolocation`. Concretely:

- **Defaults** in `Config.java`: `interval` 600000 → **5000**,
  `fastestInterval` 120000 → **1000**, `distanceFilter` 500 → **50**. Mirror the
  same values in the example settings fallbacks. Because `distanceFilter` is
  cross-platform, change its default on the **iOS** side too (wherever the iOS
  default is set); `interval` / `fastestInterval` are Android-only.
- **Activity provider**: no behavior change. Replace the dead commented
  `setSmallestDisplacement` line at
  `ActivityRecognitionLocationProvider.java:118` with a short doc comment
  explaining the provider is time/activity-driven and `distanceFilter` /
  `stationaryRadius` do not apply there.
- **JSDoc** in `NitroBackgroundGeolocation.nitro.ts`: clarify that `interval`
  is an OS-level `minTime` throttle applied in every provider (caps point rate
  even in Distance mode) and that the Activity provider ignores `distanceFilter`.

No changelog/migration work (library is early-stage, no consumers). Build green
on both platforms; existing tests pass.

## Resolution
