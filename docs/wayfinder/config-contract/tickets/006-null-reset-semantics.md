---
id: 006
title: Null-reset semantics across both option shapes
labels: [wayfinder:grilling]
status: closed
assignee:
blocked-by: [004]
---

## Question

**This is the map's highest-value grilling, not a follow-on.** The nitrogen
research established that the third state — explicit `null` means restore the
default — is what forces the `T | null` aliases, which generate a separate
variant type per resettable leaf, about twenty files today. Nesting reorganises
the shape without touching that. Reset semantics drive mapper complexity far
more than the shape does, and the two decisions are orthogonal.

`ConfigureOptions` documents a tri-state contract — omitted means unchanged,
`null` means restore the native default — via `Nullable*` type aliases.
`LocationOptions` uses plain optional numbers with no reset semantics and no
mention of the asymmetry. Settle one rule.

- Does `null` mean reset on **every** field, or are there fields where reset is
  meaningless and `null` should not be accepted at all?
- "Restore the native default" — whose default, when the two platforms differ?
  Where defaults live is now settled: the contract authors them and generates them
  into native, so this is a contract-data question — does an entry carry one
  default or one per platform, and does a reset on a divergent field restore the
  running platform's value or a single canonical one?
- What happens when `null` is sent for a field the running platform does not
  own? Today the mappers silently skip it.
- Does `LocationOptions` gain the same tri-state, drop optionality in favour of
  explicit values, or stay deliberately different with the difference documented?
- Does the contract encode reset behaviour per field, so the mappers stop
  hand-writing an `onNull` branch each? There are 24 such branches today, one of
  which re-hardcodes its default rather than reading it.
- What does `configure()` do with an entirely empty object — no-op, or reset all?

## Resolution

**The third state is deleted.** Two states only: a field omitted is unchanged, a
field present is set to that value. Reset becomes explicit —
`configure({ distanceFilter: defaults.distanceFilter })` — which is expressible
because the contract publishes defaults to JS as real values, and because every
default in `Config.getDefault()` and `MAURConfig` is a plain literal with nothing
computed or device-derived.

What that removes: roughly 20 generated variant types, the 24 Kotlin `onNull`
branches and their Swift equivalents, every `Nullable*` alias, and the per-field
reset column the contract would otherwise have carried. It also removes a
distinction callers get wrong, since omitted-versus-`null` is invisible at a call
site where a variable happens to be `undefined`.

Accepted cost: reset is less discoverable — a caller reaches for the published
defaults rather than typing `null`. A separate `resetConfig(fields)` method was
rejected as a 29th member on an interface this map's neighbours want smaller.

### `null` is now a value, not a signal

It appears in the type of exactly two fields — `httpHeaders` and `postTemplate` —
because their native slots are genuinely nullable and their defaults genuinely
are null. Everywhere else `null` is not in the type, so passing it fails at
compile time instead of silently resetting. This deletes the "is a reset
meaningful for this field" question rather than answering it 27 times.

Those two fields also gain something they could not previously express: "set this
to nothing", which was indistinguishable from "reset this" while `null` was
overloaded.

### One default per field, with room for two

The contract carries a single default. The only divergence in the codebase today
is `url` and `syncUrl` at `""` on Android versus `nil` on iOS — an accident of two
hand-maintained files, not a design — so **both converge on `""`**, which is a
real behaviour change on iOS and is called out in the HTTP group slice. Every
other shared default already agrees across platforms: `stationaryRadius` 50,
`distanceFilter` 50, `desiredAccuracy` 100, `maxLocations` 10000, `syncThreshold`
100, `stopOnTerminate` true, `debug` false.

The contract *supports* a per-platform default but the column stays empty until a
genuine case appears. Inviting one now means 27 entries carrying a mostly-blank
second value.

### `configure({})` is a documented no-op

Under two states an empty object has nothing to set. Reset-everything would be a
separate explicit operation, and nothing has asked for one.

### Writes to a foreign-owned field warn

The mapper keeps dropping them, but the generator emits a **dev-mode warning
naming the field and its owning platform**. Silent dropping is exactly what let
the ancestor's incorrect `activitiesInterval` ownership survive for years. Only
the write-side silence is fixed here — the type-level question of whether such a
call is even constructible belongs to
[Nested config shape and platform ownership in types](005-nested-shape.md), and
what a *read* returns belongs to
[How reads report fields the platform does not own](014-foreign-platform-reads.md).

### `LocationOptions` joins the contract, with a stated asymmetry

Two-state like everything else, and its three defaults get published. But
omission means something different and that difference is now explicit rather
than inherited: `configure()` merges into persisted state, so an omitted field is
**unchanged**; `getCurrentLocation()` options are per-call, so an omitted field
**takes its default for that call**. Same two states, different meaning, stated
in the interface. Whether it becomes a contract group or stays a separate shape
is group-membership and rides with the shape grilling.

### Evidence found while resolving

`activitiesInterval` has an iOS default of `10000` in this repo's own
`MAURConfig`. The peer research inferred the Android-only claim was wrong from the
ancestor library; it is now confirmed from our source, and our spec, docs table
and example app all still say Android.
