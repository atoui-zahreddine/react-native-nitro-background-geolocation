---
id: 003
title: Settings subtitle copy for all options
labels: [wayfinder:grilling]
status: open
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
