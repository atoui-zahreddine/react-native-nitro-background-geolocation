---
id: 002
title: Decide provider and interval behavior changes
labels: [wayfinder:grilling]
status: closed
assignee:
blocked-by: [001]
---

## Question

With the upstream research in hand
([Why the Activity provider ignores distanceFilter](001-activity-distancefilter-research.md)),
decide what changes the library makes:

- **Activity provider**: enable `setSmallestDisplacement(distanceFilter)`, or
  keep it time/activity-driven and document that `distanceFilter` does not
  apply there?
- **Defaults**: keep or change `interval = 600000`, `fastestInterval = 120000`,
  `distanceFilter = 500`? The 10-minute default interval is what starved the
  field-test tracks.
- **Documentation**: clarify JSDoc in `NitroBackgroundGeolocation.nitro.ts` so
  the minTime-throttle semantics of `interval` (it caps point rate in every
  provider, including Distance mode) and per-provider option applicability are
  explicit.
- Note breaking-change/versioning implications for whatever changes.

**Context added post-001 (2026-07-12):** the dev now suspects the field
impression that started this map ("providers looked identical", "`interval:
30000` starved the track") may have been a misread — the app is working fine —
and a prior session confirmed the config reaches native correctly. Combined
with the 001 finding that the Activity provider's displacement gate was
intentionally disabled upstream, the live question for this ticket may be
"documentation-only vs any behavior change at all". Weigh whether the harsh
defaults (`interval = 600000`) still warrant a change independent of the
provider-distinctness premise.

## Resolution

Decided by grilling (2026-07-12). The field starvation was **real but not a
provider bug** — it was the 10-minute default `interval`. The providers
themselves behave correctly; the fix is a small defaults change plus
documentation. The map does **not** collapse to documentation-only.

**1. Defaults — lower them.** In `Config.java` (and the example settings
fallbacks that mirror it):

| Option | Old | New |
| --- | --- | --- |
| `interval` | 600000 (10 min) | **5000** (5 s) |
| `fastestInterval` | 120000 (2 min) | **1000** (1 s) |
| `distanceFilter` | 500 m | **50 m** |

`distanceFilter` is cross-platform (`Platform: all`), so its default must change
on **both** Android and iOS; `interval` / `fastestInterval` are Android-only.

**2. Activity provider — keep displacement disabled, document it.** Do not
enable `setSmallestDisplacement`. Replace the dead commented line at
`ActivityRecognitionLocationProvider.java:118` with a short doc note: the
Activity provider is time/activity-driven, and `distanceFilter` /
`stationaryRadius` do not apply there. No behavior change (per ticket 001).

**3. JSDoc — clarify `interval` semantics and per-provider applicability** in
`NitroBackgroundGeolocation.nitro.ts`: state that `interval` is an OS-level
`minTime` throttle applied in **every** provider (it caps point rate even in
Distance mode), and that the Activity provider ignores `distanceFilter`.

**4. Versioning — none.** The library is early-stage with no external
consumers; change the defaults directly with no changelog or migration/
breaking-change process.
