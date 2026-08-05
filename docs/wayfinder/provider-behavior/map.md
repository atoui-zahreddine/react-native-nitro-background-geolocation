---
title: Provider behavior and settings clarity
labels: [wayfinder:map]
---

# Provider behavior and settings clarity

## Destination

The three Android location providers behave distinctly and predictably — the
Activity provider's `distanceFilter` handling is decided and implemented,
`interval` semantics are documented and the defaults reconsidered — and every
row in the example app's settings screen carries a subtitle explaining what
the option does, its unit, and which providers honor it. This map carries
execution: it is done when the differences are verified on-device.

## Notes

- Born from Android field testing (train / bike / walking, July 2026):
  `interval: 30000` starved the track of points, and the Activity and Distance
  providers looked identical at a 1 s interval.
- Root-cause findings (session exploration, July 2026):
  - `interval` (milliseconds) is an OS-level throttle in **every** provider:
    passed as `minTime` to `requestLocationUpdates` in
    `DistanceFilterLocationProvider.java:242` and `RawLocationProvider.java:54`,
    and as the fused-request interval in
    `ActivityRecognitionLocationProvider.java:116-117`. Defaults are harsh:
    `interval = 600000` (10 min), `fastestInterval = 120000`,
    `distanceFilter = 500` (`Config.java:128-142`).
  - The Activity provider applies **no displacement filter** —
    `setSmallestDisplacement` is commented out at
    `ActivityRecognitionLocationProvider.java:118`. (Correction from ticket 001:
    the commented call used `stationaryRadius`, not `distanceFilter`; the disable
    was an intentional upstream bug workaround.)
  - Provider selection itself is wired correctly end-to-end
    (`LocationProviderFactory.java:29-46`).
- Distance provider field diagnosis (S21 biking session, 2026-07-22): the
  `distanceFilter` you set is a **base**, not the spacing. `calculateDistanceFilter`
  (`DistanceFilterLocationProvider.java:385-392`, and the identical iOS formula in
  `MAURDistanceFilterLocationProvider.m:481-490`) adds
  `(speed rounded to nearest 5 m/s)²`, so `distanceFilter: 25` produced a 50 m
  effective filter for the whole ride and `interval: 5000` never bound. Confirmed
  by replaying the state machine over the session's own native logs: 16/16 points
  reproduced exactly, including the `Updating distanceFilter: new=50 old=25` line.
  Three defects fixed off the back of it — coarse network fix seeded as point 0,
  no final flush on stop (lost 34 s / ~124 m of tail), and `!=` string identity
  comparison that failed to exclude the passive provider.
- The native code mirrors upstream mauron85/christocracy — check upstream
  history before changing behavior (see the research ticket).
- Subtitle copy source: the option matrix asset
  [004-option-matrix.md](../tracker-tab/assets/004-option-matrix.md);
  `RowShell` in `apps/example/src/app/settings.tsx` has no description slot
  yet and needs one.
- Skills to consult: `/grilling` + `/domain-modeling` for grilling tickets.
- Tracker mechanics: see `docs/agents/issue-tracker.md` (local markdown
  tracker).

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [Why the Activity provider ignores distanceFilter](tickets/001-activity-distancefilter-research.md) —
  the commented line uses `stationaryRadius` (not `distanceFilter`); it was an
  intentional upstream bug workaround (mauron85 commit `10503ed`, 2015,
  "seems buggy"); enabling it would suppress updates when stationary/slow and
  fight the provider's STILL-stop logic. Research leans **keep disabled +
  document**.
- [Decide provider and interval behavior changes](tickets/002-provider-interval-decisions.md) —
  field starvation was real but caused by the harsh 10-min default `interval`,
  not a provider bug. **Lower defaults** (`interval` 5000, `fastestInterval`
  1000, `distanceFilter` 50); **keep** the Activity displacement filter disabled
  and document it; **clarify JSDoc** on `interval`'s throttle role. No
  versioning process (early-stage, no consumers).
- [Provider fixes implementation](tickets/004-provider-fixes-implementation.md) —
  landed the defaults (Android `Config.java` + iOS `MAURConfig.m`), Activity
  doc comment, and JSDoc. **Corrected premise:** the field starvation came from
  the example's own `LONG_TRACKING_BASELINE` (`interval: 30000`), not the
  library default the example always overrides — so the baseline's interval was
  also lowered to 5000/1000. Typecheck + 53 tests green; native builds not run
  (see field verification).
- [Settings subtitle copy for all options](tickets/003-settings-subtitle-copy.md) —
  approved copy for all 27 settings rows ([asset](assets/003-settings-subtitle-copy.md)).
  Variable length, applicability in prose, per-choice glosses only for the
  provider picker. Ready for ticket 005 to implement.
- [Settings subtitles implementation](tickets/005-settings-subtitles-implementation.md) —
  `RowShell` gained a description slot (dims with the lock state); `SegmentedRow`
  shows the selected provider's gloss; all 27 rows carry their subtitle. Stale
  in-UI default fallbacks fixed to 50/5000/1000. Typecheck + lint green; visual
  check folds into the device QA pass.

## Not yet specified

<!-- iOS parity: resolved by ticket 002 — only `distanceFilter` (a cross-platform
     option) changes default, so iOS parity is just the 500→50 default; folded
     into [Provider fixes implementation](tickets/004-provider-fixes-implementation.md).
     `interval`/`fastestInterval` are Android-only, so no iOS work there. -->

- Whether the Raw provider needs distinct positioning or documentation — at
  the platform call it is close to Distance-without-elasticity/stationary.

## Out of scope

- **New provider types** — this effort fixes and explains the existing three.
- **Battery-optimization work beyond the defaults decision** — tuning for
  power draw is its own effort.

## Tickets

Open children live in [tickets/](tickets/); frontier = open, unassigned, all
`blocked-by` closed.

| Ticket | Type | Blocked by |
| --- | --- | --- |
| [Why the Activity provider ignores distanceFilter](tickets/001-activity-distancefilter-research.md) | research | — |
| [Decide provider and interval behavior changes](tickets/002-provider-interval-decisions.md) | grilling | 001 |
| [Settings subtitle copy for all options](tickets/003-settings-subtitle-copy.md) | grilling | 002 |
| [Provider fixes implementation](tickets/004-provider-fixes-implementation.md) | task | 002 |
| [Settings subtitles implementation](tickets/005-settings-subtitles-implementation.md) | task | 003 |
| [Field verification of provider distinctness](tickets/006-field-verification.md) | task | 004, 005 |
