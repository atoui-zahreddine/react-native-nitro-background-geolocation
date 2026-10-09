---
id: 001
title: Nitrogen's support for nested config structs
labels: [wayfinder:research]
status: closed
assignee:
blocked-by: []
---

## Question

What does nitrogen actually allow and emit for a nested object passed to a
HybridObject method? The nested public shape depends on the answer, and so does
whether the native mappers can be generated.

- Does nitrogen support a struct field whose type is another struct? Optional
  nested structs? Arrays of structs? What does it emit in Kotlin and in Swift
  for each?
- How does an optional nested struct with optional fields inside it arrive on
  the native side — nullable data class, nullable Swift struct, or flattened?
- Are there naming or depth constraints (reserved names, collisions between a
  group named `ios` and generated symbols)?
- What is regeneration's blast radius: does adding a nested group rewrite files
  beyond the ones for the changed spec?
- Does nitrogen expose anything that could *emit* the mapper code from a
  declaration, or is a separate codegen step the only route?

Read the installed nitrogen version's own source and the generated output under
`nitrogen/`, plus the Nitro Modules documentation. Confirm claims against the
generated files in this repo, not just the docs.

Findings land in [research/nitrogen-nested-structs.md](../research/nitrogen-nested-structs.md).

## Resolution

Nesting is not the constraint. Nitrogen 0.35.6 supports it fully; the real
findings are three hazards it does *not* protect against, and one discovery that
reorders this map's priorities. Full evidence in
[research/nitrogen-nested-structs.md](../research/nitrogen-nested-structs.md).

**Nesting works, at arbitrary depth.** Struct fields recurse through the same
type constructor as any other field, so struct-in-struct, optional nested
structs, arrays of structs and records of structs all generate. Verified by
regenerating rather than by reading docs: Kotlin emits `val group: InnerGroup?`
inside a data class, Swift emits a typealias to the C++ struct with a memberwise
initialiser and inlined getters. Nothing is flattened, and inner optionals stay
independently optional. Self-referential structs crash nitrogen with a stack
overflow, so no tree-shaped configuration — irrelevant here.

**Group names `ios` and `android` are safe.** The collision worry in the
question was unfounded. Casing transforms apply only to enum members; struct and
field names pass through verbatim.

**Nitrogen has no emission hook.** No plugins, templates or post-generate step
anywhere in its config schema or CLI. A separate codegen step is the only route
to generated mappers — but nitrogen's type parser is importable, and a short
script can walk the real spec's type graph and read per-language type names off
it. So a custom generator would not have to re-derive naming rules. That makes
generation cheaper than assumed, and it is now a live option for
[Where the contract lives and how the mappers derive from it](004-contract-mechanism.md).

**Regeneration is additive and scoped.** Output is rewritten wholesale but
deterministic, so the diff stays small: a three-group nested section touched 16
files, nine new and seven modified, roughly 180 lines, all additive, and did not
touch the Android CMake. Consistent with `fa00b3a` in history.

### Three hazards the contract has to absorb

- **No keyword escaping, and it fails silently.** A struct with fields named
  `class`, `val`, `fun`, `default` or `operator` reports success and emits
  `val class: String?` in Kotlin. Escaping only sanitises non-alphanumerics.
  Breakage surfaces much later as a native compile error. The contract must
  police field names against the reserved words of Kotlin, Swift, Java and C++.
- **Cross-spec struct name collisions are silent last-writer-wins.** Two
  declarations of the same struct name both report success while one overwrites
  the other; nitrogen's own source comments the hazard. Low risk with a single
  spec file, but it makes generic group type names like `Config` or `Options` a
  latent trap — worse because generated Kotlin structs share a package with
  `ConfigMapper`.
- **Reset semantics cost more than nesting does.** Plain optionals give two
  states, absent and value. The mapper depends on a third — explicit `null`
  means restore the default — which is what forces the `T | null` aliases and
  generates a `Variant_NullType_T` file per leaf, about twenty of them today.
  Nesting reorganises the shape without removing that need. **The per-leaf reset
  decision drives mapper complexity far more than the nesting decision, and the
  two are orthogonal** — so
  [Null-reset semantics across both option shapes](006-null-reset-semantics.md)
  is the higher-value grilling, not the follow-on it looked like when charted.

### Caveat

Everything above is codegen-level. No Gradle or Xcode build was run against
nested output, so "it compiles on device" is unverified. Ticketed separately as
[Native build check for a nested struct group](013-nested-build-check.md).
