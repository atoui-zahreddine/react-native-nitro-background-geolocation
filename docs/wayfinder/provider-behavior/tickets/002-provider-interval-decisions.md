---
id: 002
title: Decide provider and interval behavior changes
labels: [wayfinder:grilling]
status: open
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
