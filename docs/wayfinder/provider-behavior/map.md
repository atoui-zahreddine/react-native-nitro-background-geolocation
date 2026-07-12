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

## Not yet specified

- iOS parity of any behavior changes — field testing covered Android only;
  what (if anything) needs the same treatment on iOS becomes ticketable once
  the behavior changes are decided.
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
