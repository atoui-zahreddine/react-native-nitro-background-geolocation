---
id: 011
title: Storage, debug and LocationOptions on the contract
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: [009, 010]
---

## Question

Nothing to decide — migrate what remains: the `storage` group (maxLocations), the
`debug` group (debug), and the `LocationOptions` surface, which
[the shape decision](005-nested-shape.md) kept flat and separate rather than
making it a group. Retitled from "Core and storage groups" because the core
fields moved into `tracking` and `lifecycle`, migrated by
[the previous slice](010-ios-group.md).

Done when:

- no configuration field remains outside the contract, and `CONFIG_FIELDS` is
  complete — every field, every group, in declaration order
- `LocationOptions` derives from the contract as its own flat surface, with
  omission meaning "use this call's default" and no `AppliedConfig` twin
- both mappers' remaining hand-written variant helpers are gone, or the parity
  test covers every one that stays
- the session detail screen derives platform ownership from `CONFIG_FIELDS`
  instead of its per-row `platform:` literals, and its wrong `activitiesInterval`
  claim dies with them
- the docs table is entirely derived — every default in it matches native,
  verified rather than eyeballed
- configuring every field and reading it back works on both platforms

## Resolution

## Resolution

**No configuration field remains outside the contract.** `STORAGE_CONTRACT`
(`maxLocations`) and `DEBUG_CONTRACT` (`debug`) close out the seven groups, and
`CONFIG_FIELDS` is complete: 27 entries in declaration order, pinned by a test.

### `LocationOptions` is its own flat surface

`LOCATION_OPTIONS_CONTRACT` declares `timeout`, `maximumAge` and
`enableHighAccuracy`; `LocationOptions` is a mapped type over it, all optional,
with no `Config` twin. The generator emits `LocationOptionsDefaults` on both
platforms and both hybrid objects read them, so an omitted field means "this
call's default" from the same declaration. `LOCATION_OPTIONS_DEFAULTS` is
exported for callers.

**A divergent default was found here, which the config surface never had:** iOS
treated an omitted `timeout` as `Int32.max` and an omitted `maximumAge` as
`Int.max` — accept any cached fix, wait forever — while Android and the spec's
prose said `30000` and `0`. The contract converges on `30000` / `0`, a
behaviour change on iOS in the same spirit as `url` / `syncUrl` converging on
`""`.

### No hand-written variant helper survives

Every `applyString` / `applyDouble` / `applyBool` / `applyLocationProvider` /
`…Variant` helper in `ConfigMapper.kt` and `NitroBackgroundGeolocation.swift`
is gone, and a test fails if `Variant_` reappears in either file or in generated
code. The only remaining hand-written branching is the two converter escapes
(`ConfigConverters.kt` / `.swift`) for the two null-permitting fields. Nitrogen
now emits 2 variant types where the flat surface needed 7.

### The reads now agree across platforms on `null`

Writing the device tests exposed that iOS did not read `null` back as `null`:
the Objective-C core stores a null `httpHeaders` as an empty dictionary and a
null `postTemplate` as its default template. The Swift converter now reports
both as `null`, matching Android, so "set this to nothing" round-trips the same
way on both platforms.

### Session detail screen

Platform ownership comes from `CONFIG_FIELDS`; the per-row `platform:` literals
and the wrong Android-only `activitiesInterval` claim are gone. Details in
[Retire the flat config surface](012-retire-flat-surface.md).

### Docs, derived and verified

Every table on the configuration page is a generated partial, one per group plus
`getCurrentLocation` options. Verified rather than eyeballed: the native defaults
are no longer authored anywhere but the contract (`Config.getDefault()` and
`MAURConfig.initWithDefaults` read generated constants, and a test fails if a
literal returns), so the docs and native cannot disagree. The docs build itself
was broken: the HTTP partial from the tracer bullet carried an HTML comment that
MDX rejects, so the site had not built since then. The partials now carry an MDX
comment, a test guards it, and `docusaurus build` succeeds.

