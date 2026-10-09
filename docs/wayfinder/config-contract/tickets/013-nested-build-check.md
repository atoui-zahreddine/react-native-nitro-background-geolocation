---
id: 013
title: Native build check for a nested struct group
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: []
---

## Question

Nothing to decide — close the gap the nitrogen research left open. Nesting is
proven at codegen level only; nobody has compiled it. If nested optional structs
do not build on both platforms, the whole shape decision changes, so verify
before deciding rather than after migrating four groups.

Done when:

- a throwaway nested group with an optional nested struct and at least one
  optional leaf inside it is added to the spec, regenerated, and **built** —
  Gradle for Android, Xcode for iOS
- the generated Kotlin data class and Swift struct are both readable and
  writable from the existing mapper code, not just present
- a value set through the nested group survives a round trip to native and back
- the throwaway is reverted; nothing from this check lands on `main`

Record in the resolution: whether it built clean, any nitrogen output that needed
hand-fixing, and whether the reset-carrying leaf (`T | null`) behaved the same
nested as it does flat.

### Also spike: does nitrogen resolve a derived struct type?

Added by the mechanism grilling, which is otherwise decided and waiting only on
this answer. The question is whether the contract can *be* the spec — declared as
a `const … as const` in the `.nitro.ts` file with the struct type derived from it
by mapped types — instead of the contract generating a separate spec file.

- Declare a small struct as a `const` object and derive its type with a mapped
  type. Does nitrogen resolve it, and does the generated Kotlin and Swift keep
  the **named** struct symbol, or does it flatten to an anonymous type?
- Try the same with an optional leaf carrying the `T | null` reset variant, since
  that is the shape every resettable field needs.
- Does the derived type survive the nitrogen version pinned here specifically?

If it resolves and keeps its name, the whole spec-generation stage disappears and
the contract is one file with nothing between it and nitrogen. If it flattens or
fails, the mechanism falls back to generating the spec from the contract as a
committed first stage. Report which, with the generated output as evidence — this
is the last open question on
[Where the contract lives and how the mappers derive from it](004-contract-mechanism.md).

Split out of
[Nitrogen's support for nested config structs](001-nitrogen-nested-structs.md),
which verified codegen but explicitly not compilation.

## Resolution

**Both platforms build clean, and the spike passes — the contract can be the
spec.** Nothing needed hand-fixing.

### Nesting compiles on both platforms

A throwaway group carrying an optional nested struct, an array of nested structs,
and a reset-carrying leaf was added to the spec, regenerated, and built:

- **Android** — `BUILD SUCCESSFUL` in 1m43s. Kotlin, Java and the JNI C++ all
  compiled through the NDK. Generated as `val ios: SpikeLeaf?`,
  `val android: SpikeLeaf?`, `val items: Array<SpikeLeaf>?`.
- **iOS** — `BUILD SUCCEEDED`, zero errors, for both `arm64` and `x86_64`.
  Verified against build products rather than the log: object files exist for
  every generated struct, and the Swift stub that reads `options.android?.plainLeaf`
  and `options.items` compiled alongside them. Swift emits a typealias to the C++
  struct with a memberwise initialiser.

The reset-carrying leaf lands as `Variant_NullType_Double?` **nested exactly as it
does flat** — nesting changes nothing about it. Now moot, since the reset grilling
deleted the third state, but it confirms nesting was never the thing driving that
cost.

### The spike passes: nitrogen resolves derived struct types and keeps their names

Both derived forms were tested in one run and both worked:

- a mapped type over an interface → emitted as `data class SpikeDerived(val
  distanceFilter: Double?, val url: String?)`
- a mapped type over `typeof` a **runtime `const` living in the `.nitro.ts` file**
  → emitted as a named `data class SpikeFromConst`

No flattening, no anonymous types, no loss of the struct symbol — and the presence
of a runtime `const` in the spec file did not disturb nitrogen at all. Both got
proper Swift typealiases and compiled on both platforms.

**So the spec-generation stage disappears.** The Config Contract is declared as a
`const` in the spec file and the public struct types derive from it by mapped
types. One authored file with nothing between it and nitrogen; the fallback branch
in
[Where the contract lives and how the mappers derive from it](004-contract-mechanism.md)
is not needed.

Caveat worth carrying: this proves the *derived shape* resolves. It does not prove
that a contract carrying defaults, ranges, native keys, converters and description
prose still derives cleanly once those extra columns are present — the mapped type
has to pick one field out of a richer entry. That is exactly what
[Contract declaration prototype for the HTTP group](007-contract-prototype.md) is
for, and it is now a load-bearing part of that prototype rather than a formality.

### Unrelated finding: iOS cannot be built here without a locale override

`pod install` fails on this machine with `Unicode Normalization not appropriate
for ASCII-8BIT (Encoding::CompatibilityError)` — CocoaPods 1.16.2 against Ruby
4.0.1. It succeeds with `LANG` and `LC_ALL` set to a UTF-8 locale. Nothing to do
with this spike; it will hit anyone building iOS in this repo, and it is worth
recording somewhere a contributor will find it.

### Revert verified

The spec file was restored by editing out the additions rather than by checkout,
since it carried unrelated uncommitted work; it now matches a byte-for-byte
snapshot taken beforehand. The generated directory and both bridge files were
reverted, the untracked generated spike files removed, and nitrogen re-run
afterwards produced **zero diff**, confirming its output is deterministic. The
working tree is back to exactly its pre-spike state.
