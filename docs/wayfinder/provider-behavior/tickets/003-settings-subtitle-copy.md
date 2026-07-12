---
id: 003
title: Settings subtitle copy for all options
labels: [wayfinder:grilling]
status: closed
assignee:
blocked-by: [002]
---

## Question

Write the subtitle for every row in the example app's settings screen (all 28
options): what the option does, its unit, when it takes effect, and which
providers honor it — so a user in the field understands where each setting is
used.

- Source of truth: the option matrix asset
  [004-option-matrix.md](../../tracker-tab/assets/004-option-matrix.md), updated
  to reflect the semantics decided in
  [Decide provider and interval behavior changes](002-provider-interval-decisions.md)
  (e.g. whether Activity honors `distanceFilter`, interval's throttle role).
- Decide the presentation rules: length budget per subtitle, how provider
  applicability is phrased (prose vs badges next to the existing platform
  pills), and whether segmented options (like the provider picker itself) get
  per-choice descriptions.

## Resolution

Copy approved by the dev (2026-07-12). Full text for all 27 settings rows:
[003-settings-subtitle-copy.md](../assets/003-settings-subtitle-copy.md).

**Presentation rules decided:**
- **Length:** variable, no hard cap — simple rows stay short, tricky ones carry
  the caveat.
- **Applicability:** in prose. Provider applicability (Distance vs Activity) is
  written into the subtitle; OS applicability stays on the existing platform
  pill (prose does not repeat "(Android)"/"(iOS)").
- **Per-choice descriptions:** only the Location provider picker gets a line per
  choice (Distance / Activity / Raw); other segmented rows get one subtitle.

Semantics reflect ticket 002 (Activity ignores `distanceFilter`; `interval` is
an OS throttle on every provider; new defaults). The option matrix
[004-option-matrix.md](../../tracker-tab/assets/004-option-matrix.md) was
updated to the new defaults (`distanceFilter` 50, `interval` 5000,
`fastestInterval` 1000). Convention note for 005: subtitles describe the option
and quote **native** defaults, which may differ from the example's seeded value
(e.g. `stationaryRadius` shows 25 but the copy says 50).
