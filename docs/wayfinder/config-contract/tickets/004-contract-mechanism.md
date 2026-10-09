---
id: 004
title: Where the contract lives and how the mappers derive from it
labels: [wayfinder:grilling]
status: closed
assignee:
blocked-by: [001]
---

## Question

The contract is one declaration of every field: name, group, platform owner,
type, default, null-reset behaviour, range metadata. Where does it live, and how
do the four consumers stay honest against it?

- **Home**: a TypeScript declaration in the library package, a data file the
  build reads, or the native defaults promoted to the source of truth with
  TypeScript deriving at runtime? Defaults exist natively today
  (`Config.getDefault()`, `MAURConfig`), so one option is to delete the
  TypeScript copy rather than generate it.
- **Native mappers**: generated from the declaration, or still hand-written with
  a parity test that fails when they drift? Generation costs a codegen step for
  two languages and generated files in git; a parity test costs a fixture the
  native suites read. Both stop the drift — decide which seam is worth having.
- **Docs**: is the configuration table generated, checked, or hand-maintained
  with a test asserting the defaults match?
- **Relationship to nitrogen**: does the contract feed the nitro spec, or sit
  beside it? A spec regenerated from the contract is one edit per field; a spec
  hand-kept beside it is two.
- **Adding a field afterwards**: walk the exact sequence and count the edits.
  If it is not one edit plus regeneration, say why that is acceptable.

What nitrogen permits is now known — see
[Nitrogen's support for nested config structs](001-nitrogen-nested-structs.md).
Two findings bear directly on this decision:

- Nitrogen has **no emission hook** of any kind, so generated mappers mean a
  separate codegen step. But its type parser is **importable**, and a short
  script can walk the real spec's type graph and read per-language type names off
  it — so a custom generator would not re-derive naming rules, and generation is
  cheaper than it looked when this was charted. Weigh it against the parity-test
  option on that basis.
- Nitrogen silently emits broken native code for field names that are reserved
  words in Kotlin, Swift, Java or C++, and silently resolves duplicate struct
  names last-writer-wins. Whichever mechanism wins has to **police field and
  group names**, because nitrogen will not.

## Resolution

**One authored file. Everything else is generated.** The Config Contract is
authored in TypeScript in the library package and is the sole source of truth;
the term is now in `CONTEXT.md`.

### Home: TypeScript is sole truth, native defaults are derived

Not a split. `Config.getDefault()` and `MAURConfig` stop holding authored values
and read them from a generated constants file instead. A neutral data file was
rejected — TypeScript types cannot come from JSON without generation anyway, so
it collapses into the same design with a fourth artifact nobody edits naturally.
A native-owns-defaults split with a parity test was rejected because a mirror
kept honest by a test is still two authored places: adding a field stays two
edits and the honesty is a check someone can skip. Generating a constants file
does not conflict with ADR-0002, which forbids rewriting the Java and
Objective-C cores, not emitting a constant into them.

Accepted cost: generated code lands inside the vendored ancestor packages, and
someone reading `Config.getDefault()` no longer sees the values there.

### Mappers: generated both directions, with declared escapes

The contract carries a per-platform **native key** and an optional **converter
reference** per field. The generator emits the mechanical majority; `postTemplate`
and `httpHeaders` declare custom converters. This deletes roughly 350 lines per
platform — 24 apply calls, 27 reverse lines and 7 duplicated variant helpers in
Kotlin, plus the Swift equivalent — and absorbs the three name mismatches
(`notificationIconLarge`/`largeNotificationIcon`,
`notificationIconSmall`/`smallNotificationIcon`, `debug`/`isDebugging`) as
contract data rather than hand-written lines.

Forcing every field through the contract with no escape hatch was rejected:
`postTemplate` is an arbitrary nested map, and making it expressible would
distort the contract to serve the generator.

The usual risk with a hand-rolled generator — re-deriving nitrogen's emitted type
names — is already dead, because nitrogen's type parser is importable. **Do not
build the generator before the prototype validates the declaration**, or the
generator's convenience starts shaping the contract instead of the reverse.

### Docs: committed generated partial

The generator emits a markdown table fragment that the docs page imports.
Committed deliberately, so a PR changing a default shows the docs row change
beside it. Generating at docs-build time was rejected as unreviewable; a
hand-written table with a drift test was rejected because it detects drift
instead of preventing it and still needs a human to fix the table.

Two consequences:

- **The contract carries prose.** It must hold each field's description text for
  the table's Description column, which also means the nitro spec's doc comments
  derive from the contract and field descriptions stop existing in three places.
  Each contract entry is therefore several lines, not one.
- **The README stops duplicating the table** and links to the docs page. Two
  rendered copies of the same table is the duplication this map exists to kill,
  even when both are generated.

### Relationship to the nitro spec: pending a spike, both branches specified

The preferred design is for the contract to **be** the spec — declared as a
`const … as const` in the `.nitro.ts` file with the struct type derived by mapped
types, so nothing sits between the contract and nitrogen. The risk is that
nitrogen prefers `interface` over `type` because flattening loses the named
symbol, and a mapped-type-derived shape is exactly that case.

Spiked rather than guessed, inside
[Native build check for a nested struct group](013-nested-build-check.md), which
is running nitrogen anyway:

- **If the derived type resolves and keeps its struct name** — the contract is one
  file, no spec-generation stage exists.
- **If it flattens or fails** — the contract generates the spec as a committed
  first stage, and the chain is contract → generated spec → nitrogen → generated
  native types, with the contract separately emitting native defaults, both
  mappers and the docs table. Two generators in sequence.

Nothing else waits on this; it selects between two fully specified branches.

### Cost of adding a field afterwards: three edits, drift impossible

One contract entry, plus hand-adding the storage slot to `Config` and
`MAURConfig`. Down from five. The generator deliberately **stops at the mapper**:
generating into the vendored classes would put it in charge of their `Parcelable`
and `ContentValues` plumbing, and a generated holder the vendored config delegates
to would mean two configuration storages per platform with no clear answer as to
which one persistence reads.

Three edits with drift structurally impossible is the win, not one edit. And the
failure mode is a feature: a contract entry with no native slot fails the native
compile **loudly**, in contrast to nitrogen, which silently emits broken code for
a reserved-word field name.
