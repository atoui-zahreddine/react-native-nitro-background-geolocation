---
id: 012
title: Retire the flat config surface
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: [011]
---

## Question

Nothing to decide — the contract with a flat surface still beside it is only
half the win. Close it out.

Done when:

- no flat configuration field, `Nullable*` alias or platform doc bullet survives
  where the contract now carries the fact
- the dead `ServiceMode` enum is gone from the public surface
- both example screens are re-sectioned onto the contract's seven groups — the
  "Intervals" and "iOS behavior" sections are gone — and their labels and
  formatters live in one shared app module instead of two copies, per
  [Contract-driven settings sections](015-contract-driven-sections.md)
- no app copy states a default, range or platform in prose; the five "Default X"
  subtitles interpolate from `CONFIG_FIELDS`
- the README's configuration section derives from the contract like the docs
  table, so the two cannot disagree
- a written check exists that fails when a field is added to the spec without a
  contract entry — otherwise the seventh copy reappears within a release
- the measured cost of adding a field is recorded in the resolution and compared
  against the five hand edits it took before this map

Then the destination is reached: the contract is the only place a configuration
fact is written.

## Resolution

## Resolution

**The destination is reached: the contract is the only place a configuration
fact is written.**

### What is gone

- Every flat field on `ConfigureOptions` — the root now carries exactly the seven
  groups, in both families.
- `NullableString`, `NullableNumber`, `NullableBoolean`,
  `NullableLocationProvider`, `NullableLocationAccuracy`. Only `NullableHeaders`
  and `NullableAnyMap` remain, because the two null-permitting fields derive
  their type from them.
- The dead `ServiceMode` enum, from the spec, the exports and the README.
- Every `**Default:**` / `**Platform:**` prose bullet that restated a config
  fact, including the ones on the `LocationProvider`, `LocationAccuracy` and
  `ActivityType` enum doc comments. The `**Platform:**` bullets that remain are on
  *methods* (`showAppSettings`, `onActivity`, …), which the contract does not
  cover.
- `HTTP_DEFAULTS`, replaced by `CONFIG_DEFAULTS` for every group, plus
  `LOCATION_OPTIONS_DEFAULTS`.

### Example app

Both screens are re-sectioned onto the seven groups in contract order; "Intervals"
and "iOS behavior" are gone. Labels, section titles, subtitles and formatters live
in one module, `apps/example/src/lib/config/fieldPresentation.ts`, used by both
screens. Ownership, units and order come from `CONFIG_FIELDS`; every row,
including the segmented ones, is disabled when the platform does not own it.
The `isForeign()` map, the `PlatformTag` literals, every `??` on a config value
and every "Default X" sentence are gone — **no app copy states a default, range
or platform**. Old flat snapshots stored by earlier app versions are upgraded on
read (`nestConfig`), and a field an old session never recorded shows "—" instead
of a made-up default.

### README

The configuration section is a generated block between
`<!-- CONFIG-CONTRACT:START -->` / `END` markers, written by the same generator as
the docs partials, so the README and the docs site cannot disagree. A test checks
that every field's dotted path appears in it.

### The written check against a seventh copy

`contract.test.ts` fails when:

- `ConfigureOptions` or `AppliedConfig` carries a key that is not a contract group
  (parsed from the spec **and** asserted at type level with `expectTypeOf`);
- a group type is not a mapped type over its contract (15 expected: 7 × 2 + 
  `LocationOptions`);
- a `Nullable*` scalar alias or `ServiceMode` comes back;
- `Config.getDefault()` or `MAURConfig.initWithDefaults` gains a literal default;
- a hand-written `Variant_` helper reappears.

A field cannot be added to a group without a contract entry, because the group
types are derived; and a field added at the root fails the first check.

### Measured cost of adding a field, now for every group

A throwaway `storage.maxDaysToPersist` entry was added and then reverted, with
the working tree restored byte-identical (verified by `cmp` on the full diff).

| | Before this map | Now |
| --- | --- | --- |
| Authored edits | 5 (spec interface + JSDoc, Kotlin mapper both directions, Swift mapper both directions, docs table, settings screen) | **1** contract entry |
| Generated changes | nitrogen only | 15 files: nitrogen structs, both mappers, both default tables, the ObjC header, the docs partial and the README block |
| Native storage | hand-added | 1 slot per platform |

The Kotlin compiler then names the Android slot exactly:

```
ConfigContractMapper.kt:90:48 Unresolved reference 'setMaxDaysToPersist'.
ConfigContractMapper.kt:139:36 Unresolved reference 'maxDaysToPersist'.
```

**One gap, recorded rather than hidden:** iOS does not fail the build. The
generated Swift writes a dictionary key, and `MAURConfig.fromDictionary` ignores
a key it does not know, so a missing Objective-C slot is silent — the write is
dropped and the read returns the contract default. The device harness catches
it instead: its "every owned scalar field round-trips" test writes a non-default
value to every field the platform owns, read from `CONFIG_FIELDS`, so a new field
without an Objective-C slot fails on the simulator with no new test written.
