---
id: 006
title: Profile detection heuristic (walking / biking / driving)
labels: [wayfinder:grilling]
status: closed
assignee:
blocked-by: [002]
---

## Question

Define the speed-heuristic classifier that runs at stop-time over the recorded
track and picks the profile used for map-matching. Decided already: speed
heuristics only, no OS activity recognition.

Grill through:

- Input hygiene: drop low-accuracy fixes, cap GPS-noise speed spikes, handle
  zero-speed dwell periods (traffic lights, breaks) so they don't drag the
  average down.
- Statistic(s) and thresholds: e.g. classify on a robust percentile (median /
  p85) of moving-speed — walking ≲ 7 km/h, biking ~7–25 km/h, driving above;
  validate thresholds against the map-matching service's costing expectations
  from [Keyless map-matching service per profile](002-keyless-map-matching-service.md).
- Ambiguity handling: mixed-mode tracks (walk then drive) — pick dominant
  profile for the whole track (simplest) or reject/segment? Recommendation:
  dominant profile, with the detected profile shown in the UI and manually
  overridable before re-snapping.
- Where it runs: pure TS function over the location array; unit-testable.

## Resolution

Resolved 2026-07-07 with the human. A pure, unit-testable TS function
`detectProfile(locations: Location[]): { profile, confident }`.

**Pipeline:**

1. Drop fixes with `accuracy > 50` m.
2. Compute segment speeds from consecutive points (haversine distance / Δ`time`)
   — more robust than the GPS `speed` field.
3. Drop dwell segments (< 1 km/h — traffic lights, breaks).
4. Classify on the **85th percentile** of remaining segment speeds:
   - `< 8 km/h` → **walking** (`pedestrian` costing)
   - `8–28 km/h` → **biking** (`bicycle`)
   - `> 28 km/h` → **driving** (`auto`)

   p85 ≈ cruising speed: robust to GPS spikes (unlike max) and to stop-heavy
   traffic (unlike mean/median, which drag driving tracks into bike range).

**Ambiguity policy:** one dominant profile for the whole track, shown as a
badge (🚶/🚴/🚗) on the stopped-state screen; tapping it overrides the profile
and re-snaps with the new costing. Tracks too sparse to classify (< 10 moving
segments or < 200 m total) default to walking with `confident: false` (badge
rendered as a guess). No segmentation, no confirmation dialog.
