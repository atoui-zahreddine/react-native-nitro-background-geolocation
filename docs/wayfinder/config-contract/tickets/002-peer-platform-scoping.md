---
id: 002
title: How peer libraries scope platform-only config
labels: [wayfinder:research]
status: closed
assignee:
blocked-by: []
---

## Question

How do comparable libraries express "this option only exists on one platform",
and what does that cost their callers?

- `react-native-nitro-geolocation` — the closest peer, same Nitro toolchain.
- `expo-location`, and the transurgeon/mauron85 lineage this library inherits
  from, for contrast.
- React Native core's own pattern for platform-scoped options.

For each, record: nested groups versus flat with prose, whether a foreign-
platform field is a type error or silently ignored, how defaults are published,
and whether reads (`getConfig`-equivalent) round-trip the same shape they
accept.

The output is a comparison, not a recommendation — the shape decision is
[Nested config shape and platform ownership in types](005-nested-shape.md).

Findings land in [research/peer-platform-scoping.md](../research/peer-platform-scoping.md).

## Resolution

Eight surfaces across five libraries examined; full comparison in
[research/peer-platform-scoping.md](../research/peer-platform-scoping.md).

**Nobody makes a foreign-platform field a type error.** Not one of the eight
surfaces. The strongest signals anyone ships are a platform-suffixed identifier
(`PermissionsAndroid`) and a runtime warning. Whatever this library does with
type-level ownership, it will be doing it alone — which is an argument for care,
not an argument against.

**The two closest comparables point in opposite directions.**

- `react-native-nitro-geolocation` — same toolchain — adopted nested
  `android?:` / `ios?:` groups and **immediately leaked**: `granularity`,
  `waitForAccurateLocation` and the `maxUpdate*` fields are Android-only yet sit
  at the root beside genuinely shared fields. Its round trip is worse: the
  getter echoes the foreign group in-process, drops it after a process restart,
  and does so asymmetrically — Android preserves the iOS accuracy value, iOS
  discards both accuracy and granularity.
- transistorsoft — the library with the most options, ~75 — restructured for v5
  and grouped by **domain** (geolocation / http / app / logger / activity /
  persistence), explicitly *not* by platform, interleaving iOS-only and
  Android-only fields inside each group. Its `State extends Config` gives an
  exact round trip, precisely because there is no platform axis to go
  asymmetric on.

So platform grouping is not the obvious answer the charting session assumed. It
is one of two live options, and the peer that tried it is the one with the
leaks.

**Prose tags rot, demonstrably.** `expo-location`'s `foregroundService` is
Android-only and carries no platform tag at all — missing in the source and in
the rendered reference. And this library's own ancestor documents
`activitiesInterval` as Android-only in two places while it is a real
`MAURConfig` property that `toDictionary` serialises. **That means this repo's
inherited platform ownership is already wrong for at least one field** — the
same field whose iOS null guard is inverted. The contract's platform column
cannot be copied from the existing prose; it has to be derived from what native
actually reads.

**"Platform-exclusive" is not the only relation, so a single `platform` column
is too narrow.** Four distinct cases appear in the wild:

- exclusive to one platform
- shared name, different default per platform
- shared name, **different enum** per platform — nitro-geolocation solves this
  with a per-platform value map (`{ android?, ios? }`) rather than a shape split
- shared name, **different behaviour** per platform, same type: transistorsoft's
  `useSignificantChangesOnly`

**Defaults**: only `expo-location` publishes them adjacent to the field, as
`@default` annotations. Everyone else duplicates or omits. And transistorsoft's
shipped v5 type declarations have all doc comments **stripped**, so platform
ownership is not even in IDE hover for its consumers — a warning about relying
on prose that ships through a build step.

Fed into [Nested config shape and platform ownership in types](005-nested-shape.md),
which now has a domain-versus-platform grouping fork to settle, and it graduated
the round-trip question out of the map's fog into
[How reads report fields the platform does not own](014-foreign-platform-reads.md).
