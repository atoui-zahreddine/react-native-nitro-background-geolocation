---
title: Config contract
labels: [wayfinder:map]
---

# Config contract

## Destination

One declaration of every configuration field — name, group, platform owner,
type, default, null-reset behaviour and value range — that every consumer
derives from: the public nested TypeScript shape, both native mappers, the docs
table, and the example app's settings and session screens. The flat 27-field
`ConfigureOptions` surface is gone. This map carries execution: it is done when
the contract is the only place a configuration fact is written.

## Notes

- Born from the architecture review (August 2026) — the review's first
  candidate, and its highest-churn area. Adding one field today costs five hand
  edits plus nitrogen regeneration plus native plus docs.
- **The same facts are written six times**: the nitro spec's doc prose,
  `Config.getDefault()` (Java), `MAURConfig` (Objective-C), `ConfigMapper`
  (which re-hardcodes `stationaryRadius ?: 50f` instead of reading defaults),
  the docs configuration table, and the example settings screen's `??`
  fallbacks. Drift has already shipped: the docs table still lists
  `distanceFilter` 500, `interval` 600000, `fastestInterval` 120000 after the
  native defaults dropped to 50 / 5000 / 1000.
- **Platform ownership has no type-level existence.** It lives as
  `- **Platform:** Android` doc bullets, a `Platform` column in the docs table,
  the example app's `PlatformTag` / `isForeign()` map, and a third copy in the
  session detail screen. Nothing stops an app from setting an iOS-only field on
  Android.
- **Both public shape and internal truth change** (charting decision): nested
  groups *and* a single declaration. Nesting without a single source of truth
  would be churn for nothing.
- **Constraint metadata in, enforcement out** (charting decision): the contract
  carries min / max / step / units so docs and the example sliders derive from
  it, but nothing rejects or clamps at runtime. Enforcement needs the error
  surface decided first, and `BackgroundGeolocationError.code` is still a bare
  `number` — separate effort.
- **Breaking the public shape is acceptable**: no consumers and no versioning
  process (per [the provider-behavior map](../provider-behavior/map.md)).
- ADR-0002 stands — the mappers stay Kotlin and Swift, the Java and
  Objective-C cores are not rewritten.
- All three live configuration bugs are **fixed**: the fresh-install
  `getConfig()` crash (`MAURConfig.toDictionary`'s one unguarded line), the
  inverted null guard that pinned `activitiesInterval` on iOS, and `ConfigMapper`
  re-hardcoding `stationaryRadius` (deleted with the hand-written mapping).
- Two test tiers: Vitest in Node (`yarn turbo run test`) and
  `react-native-harness` on a simulator and an emulator
  (`yarn turbo run test:harness`, needs an installed debug build).
- **Generated mappers must never name a nitro variant type** (from the HTTP
  slice): the same field derives `Variant_NullType_*` on the write side and keeps
  the `Nullable*` alias on the read side. Generated code calls a converter escape;
  the hand-written escape carries the platform signature and the null-as-value
  branching.
- Regenerate derived artifacts with `yarn workspace react-native-nitro-background-geolocation generate:config`.
- **The inherited platform ownership is already wrong, confirmed in this repo.**
  `activitiesInterval` is documented Android-only in the spec, the docs table and
  the example app, while `MAURConfig` gives it an iOS default of `10000` — the same
  field whose iOS null guard is inverted. The contract's platform column must be
  derived from what native actually reads, field by field, never copied from the
  existing prose or the docs table.
- **Nitrogen polices nothing** (from the nitrogen research): field names that are
  reserved words in Kotlin, Swift, Java or C++ generate broken native code with
  no error, and duplicate struct names resolve last-writer-wins silently. Name
  policing is the contract's job.
- **A green app build is not evidence that generated C++ compiles** (from the
  prototype). `:app:assembleDebug` reported BUILD SUCCESSFUL while leaving the
  library's `.so` three weeks stale. Use
  `:react-native-nitro-background-geolocation:buildCMakeDebug[<abi>]` and check
  the symbols in the built `.so`. Treat the earlier build check's JNI claim with
  that in mind.
- Skills to consult: `/grilling` + `/domain-modeling` for grilling tickets,
  `/prototype` for the prototype ticket, `/research` for research tickets,
  `/codebase-design` for the contract's interface.
- Tracker mechanics: see `docs/agents/issue-tracker.md` (local markdown
  tracker).

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [Nitrogen's support for nested config structs](tickets/001-nitrogen-nested-structs.md) — nesting works at arbitrary depth (optional nested structs, arrays, records) and `ios` / `android` are safe group names, so shape is unconstrained; regeneration is additive and small. But nitrogen has **no emission hook** (generated mappers mean a separate codegen step, made cheap by its importable type parser), it silently emits broken code for reserved-word field names and silently resolves duplicate struct names, and — the finding that reordered this map — **explicit-null reset, not nesting, is what drives mapper complexity**, so the null-reset grilling outranks the shape grilling. Compilation of nested output is still unverified.
- [How peer libraries scope platform-only config](tickets/002-peer-platform-scoping.md) — **no peer makes a foreign-platform field a type error**; the strongest signals shipped anywhere are a platform-suffixed identifier and a runtime warning. Platform grouping is a genuine fork, not the default: the peer with the most options regrouped by **domain** and got an exact read round trip precisely because it has no platform axis, while the peer on this exact toolchain chose platform groups and leaked Android-only fields into its shared root with an asymmetric, restart-lossy getter. Ownership is four relations, not one (exclusive, divergent default, divergent enum, divergent behaviour). Prose tags rot provably — including this repo's own inherited `activitiesInterval` claim.
- [Where the contract lives and how the mappers derive from it](tickets/004-contract-mechanism.md) — **one authored file in TypeScript, everything else generated**: native defaults (so `Config.getDefault()` and `MAURConfig` stop holding authored values), both mappers in both directions via per-field native keys and converter escapes for `postTemplate` and `httpHeaders`, and a committed docs table partial. The contract carries description prose, so the spec's doc comments derive from it too and the README links instead of duplicating. Adding a field costs three edits — one contract entry plus a native storage slot on each platform — with drift structurally impossible; the generator deliberately stops short of the vendored classes' persistence plumbing. Whether the contract *is* the spec or generates it is spiked in the build check, with both branches specified.
- [Null-reset semantics across both option shapes](tickets/006-null-reset-semantics.md) — **the third state is deleted**: omitted means unchanged, present means set, and reset becomes passing a published default explicitly, which works because every native default is a plain literal. Removes ~20 generated variant types, 24 Kotlin reset branches plus the Swift equivalents, every `Nullable*` alias, and a contract column. `null` survives as a *value* on `httpHeaders` and `postTemplate` only. One default per field — `url`/`syncUrl` converge on `""`, a behaviour change on iOS. `configure({})` is a documented no-op. Foreign-owned writes are still dropped but now warn in dev, naming the field and its owner. `LocationOptions` joins the contract with omission explicitly meaning "use this call's default" rather than "unchanged".
- [Native build check for a nested struct group](tickets/013-nested-build-check.md) — **both platforms build clean and the spike passes**. Android `BUILD SUCCESSFUL` including the JNI C++; iOS `BUILD SUCCEEDED` for arm64 and x86_64, verified against object files rather than the log. Nitrogen resolves a mapped type over a runtime `const` living in the spec file and **keeps the struct name**, so the spec-generation stage disappears: the contract is one file with nothing between it and nitrogen. Nesting compiles unchanged, reset leaves nest exactly as they sit flat, nitrogen's output is deterministic (re-run produced zero diff). Remaining risk moved into the prototype — the derived type must still resolve once entries carry defaults, ranges, native keys, converters and prose.
- [Nested config shape and platform ownership in types](tickets/005-nested-shape.md) — **groups divide by domain, platform ownership is metadata, and no `android` / `ios` group exists at any level of the public shape.** Seven groups (tracking, lifecycle, activity, notification, http, storage, debug), no root scalars, `PascalCase(key) + Options` / `+ Config` struct names plus a reserved-word check to kill nitrogen's silent collisions. Two type families from the one contract: an all-optional `ConfigureOptions` for writes and a fully-populated `AppliedConfig` for reads, which is what deletes the example app's 27 `??` fallbacks — the sixth copy of the defaults. Per-entry metadata is `platforms` + a `default` that may diverge per platform + `platformNotes`, covering three of the four ownership relations; divergent enums have no slot and no instances. Measured, not assumed: **divergent defaults do not exist here**, divergent *behaviour* is the common case, and two inherited ownership claims are wrong (`activitiesInterval`, and the glossary's Android-only Activity Provider). A foreign-owned write stays a compile-time non-error, warned at runtime. `activityType` becomes a four-member enum defaulting to `OtherNavigation`; `LocationOptions` stays a separate flat surface. Consumers re-cut onto the contract's groups — "iOS behavior" and "Intervals" die as sections.

- [How reads report fields the platform does not own](tickets/014-foreign-platform-reads.md) — **a foreign-owned field reads as its contract default, and a foreign write is never retained.** `AppliedConfig` made `null` unavailable, and reporting the default is the truthful answer under the reset decision: the write was dropped, so nothing is set. Deterministic and restart-stable, unlike the same-toolchain peer's in-process echo that dies asymmetrically on restart; retention was rejected because neither native config object has a slot for the other platform's options. Ownership moves out of the read payload into `CONFIG_FIELDS` — a generated plain-TypeScript export, not part of the nitro spec, so consulting it costs no JSI crossing — keyed by dotted `group.field` path and carrying platforms, default, min/max/step/units and description. That single export deletes the settings screen's `isForeign()` map, the session screen's per-row `platform:` literals (which hold the wrong `activitiesInterval` claim), the docs table's Platform column and the hand-written slider bounds. Read payloads stay plain values — no `{ value, owned }` wrapper for a fact that is static per build.

- [Contract-driven settings sections](tickets/015-contract-driven-sections.md) — **the contract carries structure, not presentation.** Group and field order come from declaration order in the authored file, with no explicit ordinal, and `CONFIG_FIELDS` keeps every factual column — but no `label` and no group `title`, because a library should not publish UI copy for a demo app or need a release to reword a slider. The two example screens' duplicated labels and formatters move into one shared app module; their duplicated platform tags die into `CONFIG_FIELDS`. Two prose fields survive with a boundary instead of a merge: the contract's `description` is reference prose for docs and hover (`distanceFilter`'s holds a speed/spacing table, unfit for a mobile row), the app's subtitle is task-oriented UI copy, and **app copy never states a default, range or platform** — those interpolate. That rule kills a seventh copy of the defaults already hiding in 5 subtitles as "Default 50 m." prose.

- [Test harness for the library package](tickets/003-package-test-harness.md) — **Vitest 4.1.10, mirroring the example app rather than inventing a style** — same runner, version, `environment: 'node'` and `src/**/__tests__/**/*.test.ts` include, so the repo has one convention instead of two. `yarn workspace … test` in the package, `yarn turbo run test` from the root via a new cached turbo task. Tests live in `src/__tests__/<module>.test.ts`, no globals, `__DEV__` supplied by `define`, native mocked with `vi.mock('react-native')` plus `vi.hoisted`. First real test is 7 passing cases over `registerHeadlessHandler` and the headless payload parser through the public API — task name against the literal Kotlin matches on, iOS no-op, all three discriminants, unknown event and malformed JSON both rejecting — in 138 ms with no device or native build. Publishing stays clean: `tsconfig.build.json` excludes tests, bob already did, a full `prepare` emitted nothing under `lib`, nitrogen diffed to zero. **Native behaviour is deliberately uncovered** — that tier is now its own ticket, following `react-native-mmkv`, which runs Jest in Node *and* `react-native-harness` on devices.

- [Contract declaration prototype for the HTTP group](tickets/007-contract-prototype.md) — **the declaration works and everything derives from it, after five defects the prototype found.** ~12 authored lines per entry, so ~330 for all 27 — smaller than the interface it replaces alone. The load-bearing one: **`as const` breaks derivation**, narrowing `default: ''` to the literal `''` so no caller can set a URL and nitrogen refuses the optional form as an inline union — the contract must be a plain object literal. Also: null-permitting fields keep a named `Nullable*` alias, declare `nullable: true` (the mapper must branch on the nitro variant, since `?.let` makes "set to nothing" unreachable), and declare a per-platform `nativeType` (a bare `null` default gives Kotlin `Nothing?` and does not compile in Swift at all); converters are per platform, and a missing one silently emitted a wrong Swift call, so the generator now refuses. Nitrogen check passes with evidence: both families generate correctly (`Options` nullable, `Config` required, nested both ways, named structs, Swift typealiases) and the C++ compiles — 1076 Spike symbols in a freshly built `.so`. Two cautions recorded: `:app:assembleDebug` goes green **without** recompiling the library's C++, and nitro models a null-permitting field as optional regardless of `-?`, so `AppliedConfig` cannot make those two fields structurally required natively. Spec restored byte-identical by SHA-256; prototype on branch `prototype/007-contract-declaration`.

- [Contract module and the HTTP group end to end](tickets/008-http-group.md) — **the tracer bullet is through, and the cost is measured: 1 contract edit + 1 native storage slot per platform.** A throwaway field proved it — one entry changed 64 files across the two generators, and the compiler then named the only hand work left (`Unresolved reference 'setRequestTimeout'`). The contract is authored in the spec file; `HttpOptions`/`HttpConfig`/`AppliedConfig`, both native mappers, both native default constants, `CONFIG_FIELDS` and the committed docs partial all derive from it. The five flat HTTP fields are gone, `getConfig()` returns `AppliedConfig`, `Config.getDefault()` reads `HttpDefaults` instead of literals, and — since Swift constants are invisible to Objective-C — a generated `HttpDefaults.h` removes the last authored copy from `MAURConfig`. The fresh-install crash is fixed: `MAURConfig.toDictionary` was the one line without a nil guard. Android `BUILD SUCCESSFUL` including JNI C++ (verified by `.so` symbols), iOS `BUILD SUCCEEDED` with object files for arm64 and x86_64. 92 tests pass, and the generator refuses to emit for a reserved word, a missing native key or a null default without a declared native type. **Finding for the remaining slices:** the same field's null variant is named `Variant_NullType_*` on the write side but keeps the `Nullable*` alias on the read side — so generated mappers must never name a variant type; the converter escape carries the signature.

- [Notification group on the contract](tickets/009-android-group.md) — **the seven Android-owned notification fields live only in the contract**, and the re-hardcoded `stationaryRadius` default died with the hand-written mapping rather than being corrected. The generator went group-generic here, so the notification, tracking/lifecycle/activity and storage/debug slices landed together. iOS owns none of the group, so the generated Swift has no apply step for it and reads its seven defaults.

- [Tracking, lifecycle and activity groups on the contract](tickets/010-ios-group.md) — **thirteen fields with ownership taken from the native cores** (`activitiesInterval` is both), divergent behaviour recorded as `platformNotes`, and `activityType` an `ActivityType` enum stored by name on iOS. Integer-stored enums get generated codecs keyed by member name, so no generated code depends on how nitrogen spells a Swift case. The inverted `activitiesInterval` guard is fixed, and `MAURConfig.initWithDefaults` holds no authored value.

- [Storage, debug and LocationOptions on the contract](tickets/011-core-storage-groups.md) — **no field remains outside the contract**; `CONFIG_FIELDS` has all 27. `LocationOptions` derives from its own contract, and doing so **found the one divergent default in the repo**: iOS treated an omitted `timeout` / `maximumAge` as "forever" / "any cached fix", now converged on `30000` / `0`. No hand-written variant helper survives (nitrogen emits 2 variant types instead of 7). The docs site had not built since the tracer bullet — MDX rejects the HTML comment in the partial — and builds again.

- [Retire the flat config surface](tickets/012-retire-flat-surface.md) — **destination reached.** The flat fields, the scalar `Nullable*` aliases, `ServiceMode` and every prose default/platform bullet are gone; both example screens sit on the seven groups with one shared presentation module and no app copy stating a default, range or platform; the README's configuration section is a generated block. **Adding a field now costs 1 authored edit + 1 native slot per platform** (15 generated files follow), against 5 hand edits before. Kotlin names the missing Android slot; **iOS does not**, because an unknown dictionary key is dropped silently — the device harness's every-field round trip covers that gap.

- [On-device harness for the nitro configuration surface](tickets/016-device-harness.md) — **8 harness tests pass on both an iOS simulator and an Android emulator**, and they found that both platforms read a `null` `httpHeaders` back as `{}` (iOS also replaced a `null` `postTemplate` with its default template) — fixed in the converters. Setup cost: Expo serves Metro from the monorepo root (scoped to the app under `RN_HARNESS`), and expo-dev-client's launcher needs one deep link to `localhost:8081` per device. CI is possible but not wired.

## Not yet specified

- How the breaking shape change is communicated, given no versioning or
  changelog process exists yet.
- How the contract would express a **divergent enum** per platform (the fourth
  ownership relation from the peer research — a shared field name whose value set
  differs by platform). Zero instances in this repo today, so no slot is
  designed; revisit when a field needs one.
- Whether `activityType` gains an `Airborne` member. `decodeActivityType` maps
  four strings and CoreLocation has five cases, so `CLActivityTypeAirborne` is
  unreachable today. Needs a native decoder change, not just a contract entry.

- Running the device harness in CI: needs a macOS runner with a simulator, an
  emulator runner, a debug build per platform and the dev-client deep-link step.

## Out of scope

- **Typed error codes** — `LocationErrorCode` exists but
  `BackgroundGeolocationError.code` is a bare `number`. Related, but it is the
  error surface, not the configuration surface.
- **Runtime enforcement of constraints** — metadata only; see Notes.
- **Splitting the HybridObject into modules** — the 28-member interface is real
  friction, but it is a different seam.
- **Event Hub, Pace Policy, Sync policy** — the review's other candidates.
- **Rewriting the Java / Objective-C cores** — ADR-0002.

## Tickets

All children are closed. Open children would live in [tickets/](tickets/).

| Ticket | Type | Blocked by |
| --- | --- | --- |
| — | — | — |
