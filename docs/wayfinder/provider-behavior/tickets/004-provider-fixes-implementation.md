---
id: 004
title: Provider fixes implementation
labels: [wayfinder:task]
status: closed
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

Implemented 2026-07-12.

- **Android defaults** (`Config.java:131,140,141`): `distanceFilter` 500→**50**,
  `interval` 600000→**5000**, `fastestInterval` 120000→**1000**.
- **iOS default** (`MAURConfig.m:25`): `distanceFilter` 500→**50**. iOS has no
  `interval`/`fastestInterval` in its defaults (Android-only), so nothing else
  to mirror there.
- **Activity provider** (`ActivityRecognitionLocationProvider.java:118`):
  replaced the dead commented `setSmallestDisplacement` line with a doc comment
  explaining the provider is time/activity-driven, `distanceFilter` /
  `stationaryRadius` do not apply, and pointing to the DISTANCE_FILTER_PROVIDER
  for distance thinning. No behavior change.
- **JSDoc** (`NitroBackgroundGeolocation.nitro.ts`): `interval` now documents
  its OS-level `minTime` throttle role (caps point rate in every provider,
  Distance mode included) and updated default; `distanceFilter` notes the
  Activity provider ignores it; `fastestInterval` clarified + default updated.

**Discovery — corrects the map's premise.** The example app never used the
library defaults: `LONG_TRACKING_BASELINE` (`config.ts`) explicitly set
`interval: 30000`, which is the value the map records as starving the field
tracks. So the field starvation came from the example's own 30 s baseline, not
the 10-min library default. Per the dev's call, the baseline's `interval`/
`fastestInterval` were lowered to **5000 / 1000** to match the new library
defaults (`distanceFilter`/`stationaryRadius` stay 25). This is the change that
actually fixes the example app's field density.

**Verification:** full-workspace `turbo typecheck` passes, nitrogen codegen
clean, all 53 example tests pass. Full native Gradle/Xcode builds were **not**
run (need device/emulator toolchains); the native edits are int-literal +
comment changes that don't affect compilation. On-device confirmation is
[Field verification of provider distinctness](006-field-verification.md).
