---
id: 009
title: Notification group on the contract
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: [008]
---

## Question

Nothing to decide — repeat the HTTP group's pattern for the `notification` group:
the seven foreground-service notification fields. Retitled from "Android group"
because [the shape decision](005-nested-shape.md) abolished platform groups; this
group happens to be wholly Android-owned, which is metadata on its entries, not
its name.

Done when:

- all seven notification fields are declared in the contract and reachable only
  through `notification` in the public shape
- the Kotlin mapper reads their defaults from the contract, and the re-hardcoded
  `stationaryRadius` default in `ConfigMapper` is gone rather than corrected
- `CONFIG_FIELDS` carries their entries, and the docs table rows derive from them
  including the platform column
- the example settings screen's notification rows lose their `??` fallbacks and
  their copy of the platform map
- the segmented rows that currently bypass the platform check honour
  `CONFIG_FIELDS` ownership like every other row
- configuring and reading back these fields works on an Android device, and a
  read on iOS reports each one's contract default per
  [the read decision](014-foreign-platform-reads.md)

## Resolution

**Done — the seven notification fields live only in the contract.** The slice ran
together with the tracking/lifecycle/activity slice and the storage/debug slice,
because the HTTP generator had to become group-generic first, and once it was,
each remaining group cost only its contract entries.

- `NOTIFICATION_CONTRACT` declares all seven fields with `platforms: ['android']`;
  `ConfigureOptions.notification` / `AppliedConfig.notification` derive from it.
  The flat fields are gone.
- The Kotlin mapper is generated (`ConfigContractMapper.kt`), and
  `Config.getDefault()` reads `NotificationDefaults` instead of literals. The
  re-hardcoded `stationaryRadius ?: 50f` in `ConfigMapper` died with the whole
  hand-written mapping — `ConfigMapper` now delegates config to the generated
  mapper and keeps only the location, activity and log converters. Not corrected:
  deleted.
- The two names that differ from native — `notificationIconLarge` /
  `notificationIconSmall` versus `largeNotificationIcon` / `smallNotificationIcon`
  — are per-field native keys, guarded by a test.
- iOS owns none of the group, so the generated Swift mapper has no apply step for
  it at all, and its read returns the seven contract defaults
  (`notificationTitle: "Background tracking"`, …), per the read decision.
- `CONFIG_FIELDS` carries the seven entries; the docs table
  (`_config-notification.md`) derives them, platform column included.
- The example screens: see
  [Retire the flat config surface](012-retire-flat-surface.md), which re-sectioned
  both screens in one pass.

Device round trip is asserted by the harness tests in
[On-device harness](016-device-harness.md) rather than by hand.
