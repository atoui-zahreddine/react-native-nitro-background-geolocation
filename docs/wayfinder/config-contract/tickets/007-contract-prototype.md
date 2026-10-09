---
id: 007
title: Contract declaration prototype for the HTTP group
labels: [wayfinder:prototype]
status: closed
assignee:
blocked-by: [004, 005, 006]
---

## Question

The three decisions above are easier to judge concretely than in the abstract.
Build a throwaway that shows the HTTP / sync group written once and everything
falling out of it, so the shape can be reacted to before four groups are
migrated behind it.

Show, for that group only:

- the contract entry per field, with every column the decisions call for — which
  now includes a per-platform **native key**, an optional **converter reference**,
  and the field's **description prose**, so an entry is several lines rather than
  one. Whether that stays readable at 27 fields is a large part of what this
  prototype is testing.
- the public nested type a caller sees, and what autocomplete looks like
- the derived defaults **as a published value callers can reach**, since reset is
  now expressed by passing a default explicitly rather than by passing `null`
- the derived docs row
- the generated mapper output for the group, both directions
- one deliberately awkward field: something the HTTP group shares with the
  Android foreground service, or a field whose default differs per platform

**One part of this is now load-bearing rather than a formality.** The build check
proved a mapped type over a `const` resolves through nitrogen and keeps its struct
name — which is what lets the contract *be* the spec. It did not prove that still
holds once each entry carries defaults, ranges, native keys, converters and
description prose, because the mapped type then has to pick one field out of a
much richer entry. Regenerate against the real spec as part of this prototype and
confirm the derived struct is still named and correctly typed.

Throwaway, not the implementation. Link it from this ticket. The question being
answered is whether the declaration reads well enough that adding a field is
obvious to someone who has never seen it — if it needs a paragraph of
explanation, the shape is wrong.

## Resolution

**The declaration reads well and everything derives from it — but only after five
defects the prototype found, one of them load-bearing.** The shape is approved for
implementation with those five corrections baked in.

Prototype lives on the throwaway branch **`prototype/007-contract-declaration`**
(commit `24e7dae`, 444 lines across `contract.ts`, `emit.ts`, `run.ts`,
`caller.ts`). Run it with
`node docs/wayfinder/config-contract/assets/007-contract-prototype/run.ts`
after checking that branch out. Main keeps only this decision.

### Readability at scale: it holds

Five HTTP fields took ~62 authored lines, so **~12 lines per entry** — description
prose and the per-platform native binding are most of it. Extrapolated to 27
fields that is roughly 330 lines in one file, which is smaller than the single
`ConfigureOptions` interface it replaces (224 lines) plus `Config.getDefault()`
plus `MAURConfig`'s init plus `ConfigMapper`. Adding a field is one entry; nothing
in the entry requires knowing how the generator works.

### The five findings

1. **`as const` breaks derivation — the load-bearing one.** With `as const`,
   `default: ''` narrows to the literal type `''`, so the derived field type is
   `''`: no caller can set a URL, and nitrogen rejects the optional form outright
   with `Inline union types ("" | undefined) are not supported by Nitrogen!`.
   The contract must **not** be `as const`; plain object literal widens
   `''` to `string` and `100` to `number`, which is exactly what deriving the
   field type from its default requires.
2. **A nullable field still needs a named type alias.** Nitrogen refuses inline
   unions, so `httpHeaders` cannot be `Record<string, string> | null` inline — it
   needs `NullableHeaders`. The reset decision deleted most `Nullable*` aliases;
   the two null-permitting fields keep theirs.
3. **`null` as a permitted value must be declared, not inferred.** A `nullable:
   true` flag is required, because the generated Kotlin cannot use `?.let` for
   these fields — that skips an explicit null and makes "set this to nothing"
   unreachable. The mapper has to branch on the nitro variant
   (`First` → set null, `Second` → set value, `null` → leave unchanged).
4. **A null default needs a declared native type.** Emitting `val httpHeaders =
   null` gives Kotlin `Nothing?`, and Swift `static let httpHeaders = nil` does
   not compile at all. So the entry carries `nativeType` per platform for
   null-defaulting fields, and the generator throws when one is missing rather
   than emitting broken native code.
5. **Converters are per platform, and silence is dangerous.** Declaring only
   Android's converter for `httpHeaders` made the emitter produce a
   plausible-but-wrong `apply(...)` Swift call instead of `applyHeaders(...)`. The
   generator now refuses to emit a plain `apply` for a field with a declared
   native type. A sixth, cosmetic one: a union type in the docs table breaks the
   markdown cell, so pipes need escaping.

### The nitrogen check passes, with real evidence

Spiked into the real spec, regenerated, compiled, reverted.

- **Both type families generate correctly.** `SpikeHttpOptions` gives
  `val url: String?`, `val syncThreshold: Double?`; `SpikeHttpConfig` gives
  `val url: String`, `val syncThreshold: Double`. Nesting holds too:
  `SpikeRootOptions.http: SpikeHttpOptions?` versus
  `SpikeRootConfig.http: SpikeHttpConfig`. Named structs, no flattening, Swift
  typealiases for all four.
- **The C++ compiles.** `buildCMakeDebug[arm64-v8a]` produced a
  `libnitrobackgroundgeolocation.so` containing 1076 Spike symbols, including
  `registerHybridMethod<…, SpikeRootOptions>` and `… SpikeRootConfig`. Worth
  recording how this was verified: `:app:assembleDebug` reported BUILD SUCCESSFUL
  while leaving a `.so` three weeks stale — the app build does **not** recompile
  the library's C++, so a green app build is not evidence that generated C++
  compiles. Use the `buildCMake*` task and check the symbols.
- **Caveat carried forward:** in the required family, `httpHeaders` still emits as
  `NullableHeaders?` in Kotlin and `std::optional<std::variant<NullType, …>>` in
  C++. Nitro models a null-permitting field as optional regardless of the `-?`
  modifier, so **`AppliedConfig` cannot make the two nullable fields structurally
  required at the native boundary**. TypeScript consumers still see them as
  required-but-nullable; the guarantee that they are always populated is the
  generator's job, not the type's.

### Revert verified

Spec restored from a pre-spike snapshot and confirmed byte-identical by SHA-256
(`a3ea4e9a…`), the Kotlin bridge stubs removed, nitrogen re-run leaving
`nitrogen/generated` untouched in git, and no `Spike` file or symbol left in the
tree.

### Two unrelated defects fixed on the way

Both caused by this session's own harness work, caught by the pre-commit hook:
`vitest.config.ts` was being compiled into `lib/typescript/`, and the prototype
files were unformatted. `tsconfig.build.json` now excludes both the test
directories and `vitest.config.ts`.

### Measured cost of adding a field

One contract entry, plus one native storage slot per platform. Everything else —
public types, published defaults, both mappers in both directions, native default
constants, the docs row, the spec doc comment — regenerates. Down from five hand
edits plus nitrogen plus native plus docs.
