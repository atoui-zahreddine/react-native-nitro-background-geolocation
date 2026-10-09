---
id: 014
title: How reads report fields the platform does not own
labels: [wayfinder:grilling]
status: closed
assignee:
blocked-by: [005]
---

## Question

Today both mappers stub the foreign platform's fields to `null` / `nil` on the
way back out, so a caller cannot tell "not set" from "not mine". Settle what a
read returns.

- Does the read return **exactly** the shape it accepts? transistorsoft gets an
  exact round trip by having its state type extend its config type — and gets it
  because it has no platform axis.
- What does a foreign-owned field read as: absent, `null`, or the value the
  caller wrote and this platform ignored?
- Is a written-then-ignored value **retained**? The same-toolchain peer echoes
  the foreign group in-process, loses it after a process restart, and is
  asymmetric about which fields survive — a caller cannot predict what a read
  gives back. Decide deliberately rather than inheriting that.
- If a foreign field is retained, where does it live, given the native
  configuration objects have no slot for the other platform's options?
- Does the example app's session detail screen — which shows a config snapshot —
  need to distinguish "not mine" visually, and does that push the answer?

Graduated out of the map's *Not yet specified* by
[How peer libraries scope platform-only config](002-peer-platform-scoping.md),
which showed the round trip is where platform grouping actually breaks. Blocked
on [Nested config shape and platform ownership in types](005-nested-shape.md),
since what a read returns depends on what the shape is.

## Resolution

**A foreign-owned field reads as its contract default, and a foreign write is
never retained.** The read payload carries values only; ownership lives in a
generated runtime export.

### What a read returns

`AppliedConfig` has every field required — see
[Nested config shape and platform ownership in types](005-nested-shape.md) — so
the old answer is no longer available. Today both mappers collapse "not mine"
and "not set" into the same value: Android hardcodes 3 `null`s for the iOS-only
fields at `ConfigMapper.kt:122`, and iOS hardcodes 11 `nil`s at
`NitroBackgroundGeolocation.swift:476`, while reading `activitiesInterval` back
— a third confirmation that the field is shared, not Android-only.

From now on, reading `tracking.interval` on iOS returns `5000`, its contract
default. Rejected alternatives:

- **Retain the written-but-ignored value.** This is the same-toolchain peer's
  behaviour and its worst property: it echoes foreign values in-process, drops
  them after a process restart, and is asymmetric about which survive, so a
  caller cannot predict a read. Reproducing it honestly would need real
  cross-platform storage, since neither `Config` nor `MAURConfig` has a slot for
  the other platform's options.
- **Omit wholly-foreign groups.** Making `notification` optional on iOS
  reintroduces the `??` fallbacks the shape decision just deleted, and it cannot
  help the mixed `tracking` group at all.

Reporting the default is the truthful answer rather than a convenient one: under
[the reset decision](006-null-reset-semantics.md) a foreign write is dropped and
warned, so nothing is set, so the default is what is in effect. It also makes
reads deterministic and restart-stable, and gives `AppliedConfig` a useful
property — two platforms differ only in the fields each actually owns. Exclusive
fields cannot have a divergent per-platform default, so the `default: { android,
ios }` union never makes this ambiguous.

### Ownership lives in `CONFIG_FIELDS`

The contract generates a plain-TypeScript runtime export — deliberately **not**
part of the nitro spec, so it never crosses JSI and costs nothing to consult in a
render path:

```ts
export const CONFIG_FIELDS = {
  'tracking.interval': {
    platforms: ['android'],
    default: 5000,
    min: 0, max: 60000, step: 1000, units: 'ms',
    description: 'Minimum time interval between location updates…',
  },
  // …one entry per field
} as const;
```

Dotted-path keys (`group.field`): both example screens iterate rows, the docs
table needs a stable per-field anchor, and a bare `interval` is ambiguous where
`tracking.interval` is not.

This is what finally deletes the duplicated ownership data the map's Notes
called out: the settings screen's `PlatformTag` / `isForeign()` map, the session
detail screen's per-row `platform:` literals at
`apps/example/src/app/session/[id].tsx:378-513` — which carry the wrong
`activitiesInterval` claim — and the docs table's Platform column. The
hand-written slider bounds go the same way, since `min` / `max` / `step` ride in
the same entry.

### No ownership marker in the read payload

`getConfig()` returns plain values. A consumer asking "does this platform own
this field" consults `CONFIG_FIELDS`, which needs no native call and can happen
before any read. Wrapping each value as `{ value, owned }` would double the
payload and force every consumer through an unwrap for a fact that is static per
build.

So the session detail screen keeps its platform pill and the settings screen
keeps dimming foreign rows — both now reading `CONFIG_FIELDS` instead of their
own copy. The visual need was real; it just does not push on the read shape.
