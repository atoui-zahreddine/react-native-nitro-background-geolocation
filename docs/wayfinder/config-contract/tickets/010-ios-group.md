---
id: 010
title: Tracking, lifecycle and activity groups on the contract
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: [008]
---

## Question

Nothing to decide — repeat the HTTP group's pattern for the three groups with
mixed platform ownership, and fix the live configuration bug in the files this
slice already edits. Retitled from "iOS group" because
[the shape decision](005-nested-shape.md) abolished platform groups: the iOS-owned
fields live in `tracking` beside Android-owned and shared ones.

Groups in this slice: `tracking` (locationProvider, desiredAccuracy,
stationaryRadius, distanceFilter, interval, fastestInterval,
pauseLocationUpdates, saveBatteryOnBackground, activityType), `lifecycle`
(stopOnTerminate, startOnBoot), `activity` (activitiesInterval,
stopOnStillActivity).

Done when:

- all thirteen fields are declared in the contract, each reachable only through
  its group, with `platforms` derived from what native reads rather than from the
  existing prose — `activitiesInterval` is `['android', 'ios']`
- `activityType` ships as the `ActivityType` enum defaulting to
  `OtherNavigation`, and the Swift mapper stops writing a stringly-typed
  dictionary for values the contract already types
- the inverted null guard that pins `activitiesInterval` is gone — a reset
  actually resets
- `CONFIG_FIELDS` carries all thirteen entries; the docs table rows derive,
  platform column included
- the example settings screen's rows for these fields lose their `??` fallbacks
  and their platform-map copy
- configuring and reading back works on both an Android and an iOS device, with
  each platform reporting the other's exclusive fields as contract defaults per
  [the read decision](014-foreign-platform-reads.md)

Note: the `getConfig()` fresh-install crash moved to
[Contract module and the HTTP group end to end](008-http-group.md) — the
unconditional read is of `postTemplate`, an HTTP-group field, so it is fixed where
that group's read path is rewritten.

## Resolution

**Done — thirteen fields across `tracking`, `lifecycle` and `activity`, with
platforms derived from what native reads.**

- `TRACKING_CONTRACT`, `LIFECYCLE_CONTRACT` and `ACTIVITY_CONTRACT` declare every
  field; each is reachable only through its group.
- Ownership, from the cores rather than the prose: `interval`,
  `fastestInterval`, `startOnBoot`, `stopOnStillActivity` are Android;
  `pauseLocationUpdates`, `saveBatteryOnBackground`, `activityType` are iOS;
  everything else, **including `activitiesInterval`**, is both. A test pins each
  claim, and the generator refuses a `native` binding for a platform not listed in
  `platforms`, so ownership cannot be stated twice.
- **Divergent behaviour** is now metadata: `platformNotes` on `desiredAccuracy`,
  `distanceFilter`, `stopOnTerminate` and `activitiesInterval`, rendered into the
  docs description cell. No divergent default was found, matching the shape
  decision's measurement.
- `activityType` ships as `ActivityType { AutomotiveNavigation, OtherNavigation,
  Fitness, Other }`, default `OtherNavigation`. The contract marks its iOS storage
  as `enumAs: 'name'`, so the generated Swift writes `stringValue` and decodes
  with `ActivityType(fromString:)`; the integer-stored enums (`locationProvider`,
  `desiredAccuracy`) get generated codecs keyed by member name, so no generated
  code depends on how nitrogen spells a Swift case. The stringly-typed dictionary
  writes are gone.
- **The inverted null guard is fixed**: `MAURConfig.fromDictionary` read
  `if (isNull(config[@"activitiesInterval"]))`, so a real value was never stored
  and the field was pinned at its default. Now `isNotNull`, guarded by a test.
- `MAURConfig.initWithDefaults` holds no authored value any more: every line reads
  a `#define` from the generated `ConfigDefaults.h`, including the
  `@"OtherNavigation"` string.
- `CONFIG_FIELDS` carries all thirteen; the three docs tables derive.

Device round trip, including each platform reporting the other's exclusive fields
as contract defaults, is asserted by the harness tests in
[On-device harness](016-device-harness.md).
