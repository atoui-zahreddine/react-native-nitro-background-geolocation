---
ticket: 001
title: Nitrogen's support for nested config structs
status: resolved
---

## Scope and method

Nitrogen version under test: **0.35.6**
(`packages/react-native-nitro-background-geolocation/node_modules/nitrogen/package.json:3`;
declared as `nitrogen: ^0.35.6` in
`packages/react-native-nitro-background-geolocation/package.json`).
Paired runtime: `react-native-nitro-modules ^0.35.6`.

Three evidence sources are used, and they are labelled per claim:

1. **Source** — the installed nitrogen TypeScript source at
   `packages/react-native-nitro-background-geolocation/node_modules/nitrogen/src/`.
   All `file:line` citations below are relative to that directory unless
   otherwise stated.
2. **Experiment** — nitrogen 0.35.6 actually run against throwaway specs. No
   tracked file in this repo was modified. Each experiment was a fresh scratch
   project in the session scratchpad containing only a `package.json`, a copy of
   this package's `nitro.json`, a `src/*.nitro.ts` spec, and a symlink to this
   package's `node_modules`; it was run with
   `node ./node_modules/nitrogen/lib/index.js`.
3. **Upstream / docs** — `nitro.margelo.com` and `mrousavy/nitro` at tag
   `v0.35.6`.

Baseline validity check (Experiment): copying this repo's real spec
`src/NitroBackgroundGeolocation.nitro.ts` into a scratch project and running
nitrogen 0.35.6 produced output **byte-identical** to the committed
`packages/react-native-nitro-background-geolocation/nitrogen/generated/`
(`diff -rq` reported no differences). Generation is therefore deterministic and
the scratch experiments below are a faithful stand-in for regenerating in-repo.

### Baseline shape today

The current spec deliberately avoids `?:` and instead uses `T | null` aliases
(`src/NitroBackgroundGeolocation.nitro.ts:125-131`,
e.g. `export type NullableString = string | null`). Because a `T | null` union is
not an optional, nitrogen classifies it as a **variant**
(`syntax/createType.ts:284-323`), and because the field is *also* declared `?:`,
the result is an optional-of-variant. Every one of the 27 `ConfigureOptions`
fields therefore lands natively as a double wrapper:

- Kotlin: `val stationaryRadius: Variant_NullType_Double?`
  (`nitrogen/generated/android/kotlin/com/margelo/nitro/nitrobackgroundgeolocation/ConfigureOptions.kt:29-31`)
- Swift: `Variant_NullType_Double?`
  (`nitrogen/generated/ios/swift/ConfigureOptions.swift:22`)
- Plus 7 extra generated variant types (`Variant_NullType_*.kt`,
  `JVariant_NullType_*.hpp/.cpp`) that exist only to encode "null".

This is the cost baseline that any nested proposal is measured against. A plain
`?:` field of a struct type produces a single, clean wrapper instead — see Q1.

---

## Q1. Does nitrogen support a struct field whose type is another struct? Optional nested structs? Arrays of structs? What does it emit in Kotlin and Swift?

**Answer: yes to all three, with no special handling needed. Nested structs,
optional nested structs, arrays of structs, and `Record<string, Struct>` all
work and all emit idiomatic Kotlin/Swift.** Nesting depth is unbounded as long
as the type graph is acyclic (see Q3).

**Confidence: high** — proved by running nitrogen, cross-checked against
nitrogen's source and against upstream's own test spec at the same version.

### Why it works (Source)

Struct fields are not special-cased; they go through the same recursive
`createType` entry point as top-level parameters:

- `syntax/createType.ts:337-359` — any `interface T {...}` or `type T = {...}`
  with a resolvable symbol becomes a `StructType`, whose properties come from
  `getInterfaceProperties`.
- `syntax/getInterfaceProperties.ts:28-33` — each property is turned into a
  named type via `createNamedType(language, prop.getName(), propType,
  prop.isOptional() || propType.isNullable())`, i.e. **full recursion into
  `createType` per field**. There is no scalar-only restriction anywhere.
- `syntax/createType.ts:184-188` — `isOptional` wraps whatever the field
  resolves to in `OptionalType`, including a `StructType`.
- `syntax/createType.ts:217-220` — arrays become `ArrayType(elementType)`,
  again with no restriction on the element type.
- `syntax/getReferencedTypes.ts:42-44` — the `struct` case recurses into
  `struct.properties`, so transitively-reachable structs are collected and get
  their own generated files.

### What it emitted (Experiment)

Spec used (scratch project `nitro-exp`):

```ts
export interface DeepLeaf   { leafFlag?: boolean; leafName?: string }
export interface InnerGroup { innerNumber?: number; deep?: DeepLeaf; requiredDeep: DeepLeaf }
export interface ItemStruct { itemId: string }
export interface NestedConfig {
  topLevelScalar?: number
  group?: InnerGroup
  requiredGroup: InnerGroup
  items?: ItemStruct[]
  requiredItems: ItemStruct[]
  nestedRecord?: Record<string, DeepLeaf>
}
export interface NestedTest extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  configure(options: NestedConfig): Promise<void>
  readConfig(): NestedConfig
}
```

Result: `🎉 Generated 1/1 HybridObject`, 39 files, exit 0, no warnings. One
`.kt` + `J*.hpp` + `.swift` + shared `.hpp` per struct — `DeepLeaf`,
`InnerGroup`, `ItemStruct`, `NestedConfig`.

**Kotlin** (generated `NestedConfig.kt`) — nested structs are plain nullable
data-class references; no boxing wrapper, no variant:

```kotlin
data class NestedConfig(
  val topLevelScalar: Double?,
  val group: InnerGroup?,
  val requiredGroup: InnerGroup,
  val items: Array<ItemStruct>?,
  val requiredItems: Array<ItemStruct>,
  val nestedRecord: Map<String, DeepLeaf>?
)
```

Note `Array<T>`, not `List<T>` (each field also carries `@DoNotStrip @Keep`;
`equals`/`hashCode` use `Objects.deepEquals` / `contentDeepHashCode`; a private
`fromCpp` factory is added in the companion object). Template:
`syntax/kotlin/KotlinStruct.ts:24-30,55-99`.

**Swift** (generated `NestedConfig.swift`) — the Swift type is a **typealias to
the C++ struct**, not a native Swift struct
(`syntax/swift/SwiftStruct.ts:45`), with a generated memberwise `init` and
`@inline(__always)` computed getters:

```swift
public typealias NestedConfig = margelo.nitro.nitrobackgroundgeolocation.NestedConfig

public extension NestedConfig {
  init(topLevelScalar: Double?, group: InnerGroup?, requiredGroup: InnerGroup,
       items: [ItemStruct]?, requiredItems: [ItemStruct],
       nestedRecord: Dictionary<String, DeepLeaf>?) { ... }

  @inline(__always) var group: InnerGroup? { return self.__group.value }
  @inline(__always) var requiredGroup: InnerGroup { return self.__requiredGroup }
  @inline(__always) var items: [ItemStruct]? { ... }
}
```

The optional-nested-struct getter is a one-liner (`self.__group.value`) because
Swift/C++ interop exposes `std::optional<T>.value` directly; only optional
*primitives* and collections need the `bridge.has_value_.../get_...` dance.

**C++ / JNI** — `shared/c++/NestedConfig.hpp` declares
`std::optional<InnerGroup> group`, `std::vector<ItemStruct> requiredItems`,
`std::optional<std::unordered_map<std::string, DeepLeaf>> nestedRecord`, with a
full `JSIConverter` specialisation (`fromJSI`/`toJSI`/`canConvert`) that
delegates per-field. `android/c++/JNestedConfig.hpp` does the JNI marshalling
and correctly guards nested optionals:
`group != nullptr ? std::make_optional(group->toCpp()) : std::nullopt` and
`value.group.has_value() ? JInnerGroup::fromCpp(value.group.value()) : nullptr`.
Arrays become `jni::JArrayClass<JItemStruct>`, records become
`jni::JMap<jni::JString, JDeepLeaf>` / `jni::JHashMap`.

### Upstream confirmation

`mrousavy/nitro` at tag `v0.35.6`,
`packages/react-native-nitro-test/src/specs/TestObject.nitro.ts`, exercises
exactly these shapes in its own test suite:

- `Car.driver?: Person` (line 51) — optional nested struct
- `Car.passengers: Person[]` (line 52) — array of structs
- `WrappedJsStruct { value: JsStyleStruct; items: JsStyleStruct[] }` (lines
  69-71) — required nested struct + array of structs
- `MapWrapper { map: Record<string, string>; secondMap: SecondMapWrapper }`
  (lines 86-91) — nested struct alongside a record

So nested structs are a supported, upstream-tested feature, not an accident of
recursion.

### Docs (weak)

`https://nitro.margelo.com/docs/types` lists only
`..any interface | struct T | struct T | data class T`.
`https://nitro.margelo.com/docs/types/custom-structs` describes structs but is
**silent on nesting, optional nested structs, arrays of structs, and naming
rules**. It does add two relevant notes:
- Prefer `interface` over `type` — TypeScript may flatten a `type` alias and
  lose the symbol nitrogen needs to name the struct. (Matches
  `syntax/createType.ts:345-359`, which throws
  `Anonymous objects cannot be represented in C++!` when no alias symbol
  exists.)
- Structs use **eager** conversion — every field is converted on every
  crossing; the docs recommend a HybridObject instead for very large structs.
  For a config object crossed once per `configure()` call this is not a
  concern, but it does mean a nested config is copied whole, including groups
  the caller did not set.

---

## Q2. How does an optional nested struct with optional fields inside it arrive natively — nullable data class, nullable Swift struct, or flattened?

**Answer: it is *not* flattened. It arrives as a genuinely nullable nested type
on both platforms, and the inner optional fields stay independently optional.
There is no partial/`Partial<T>`-style collapsing and no "all-or-nothing"
degradation.**

**Confidence: high** (Experiment, direct file inspection).

Given `group?: InnerGroup` where
`InnerGroup { innerNumber?: number; deep?: DeepLeaf; requiredDeep: DeepLeaf }`:

| Layer | Emitted |
| --- | --- |
| C++ | `std::optional<InnerGroup> group;` inside `struct NestedConfig` |
| Kotlin | `val group: InnerGroup?` in `data class NestedConfig`, where `data class InnerGroup(val innerNumber: Double?, val deep: DeepLeaf?, val requiredDeep: DeepLeaf)` |
| Swift | `var group: InnerGroup? { self.__group.value }`, where `InnerGroup` is `typealias InnerGroup = margelo.nitro.…InnerGroup` |

So natively you get exactly the three-state distinction a config contract wants,
one level at a time:

- group absent → `options.group == null` (Kotlin) / `options.group == nil` (Swift)
- group present, field absent → `options.group.innerNumber == null`
- group present, field set → value

Caveat: this gives **two** states per field (absent / value), not three. The
current spec's `T | null` idiom exists precisely to encode a third "explicitly
null → reset to default" state, which `ConfigMapper.kt` relies on
(`android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/ConfigMapper.kt:23-45`,
`onValue`/`onNull` pairs). Plain `?:` optionals **cannot** express that. If
reset-to-default must survive, each leaf still needs `T | null` and therefore
still generates a `Variant_NullType_T?` — nesting changes the grouping, not the
nullability encoding. This is the single most consequential interaction between
the nesting decision and the existing mapper semantics.

Also note the Swift asymmetry worth knowing before writing mappers: a Swift
nested struct is a C++ struct behind a typealias, so it is a **value type with
no default init** — you construct it with the generated memberwise
`init(...)` and every argument must be supplied. You cannot build one field at a
time.

---

## Q3. Naming and depth constraints

**Confidence: high** for everything below (all Experiment-verified except where
noted).

### Hard, enforced constraints (nitrogen throws)

| Rule | Evidence |
| --- | --- |
| Struct name cannot start with `__` | `syntax/types/StructType.ts:22-26` |
| Field name cannot start with `__` | `syntax/createType.ts:112-117` |
| Empty structs rejected — *only when reachable* | `syntax/types/StructType.ts:27-31`. Experiment: an `interface Empty {}` that is declared but never referenced by a spec generated fine and silently produced nothing; the error only fires when the type is actually converted. |
| Anonymous inline objects rejected — must be a named `interface`/`type` | `syntax/createType.ts:354-359` |
| Inline string-literal unions rejected — must be extracted to a named alias | `syntax/createType.ts:297-303` |
| `cxxNamespace` / `androidNamespace` / `iosModuleName` may not be `core`, `nitro`, `NitroModules` | `config/NitroUserConfig.ts:6-10` (config-level, not per-type) |

### **`ios` and `android` as names are safe**

Experiment (`nitro-exp2`, `nitro-exp6`), specifically testing the ticket's worry:

- **Fields** named `ios` / `android`: fine. Emitted
  `data class NamingConfig(val ios: IosOptions?, val android: AndroidOptions?)`
  and Swift `init(ios: IosOptions?, android: AndroidOptions?)` with
  `var ios: IosOptions? { self.__ios.value }`. No collision with the
  `HybridObject<{ ios: …; android: … }>` platform keys — those are read from the
  spec's type argument (`getPlatformSpecs.ts`), never from struct fields.
- **Types** named `Ios` / `Android`: also fine. Generated `Ios.kt`,
  `Android.kt`, `Ios.swift`, `Android.swift`, `data class Android(val a: Boolean?)`,
  `public typealias Ios = margelo.nitro.nitrobackgroundgeolocation.Ios`. Nothing
  collides with a generated symbol.

So a nested group named `ios`/`android` (or a type named `IosConfig`/`AndroidConfig`)
is not a hazard as far as nitrogen is concerned.

### **Unenforced constraint — reserved keywords are NOT escaped (real footgun)**

`escapedName` only calls `escapeCppName`
(`syntax/types/NamedWrappingType.ts:15-17` → `syntax/helpers.ts:41-51`), which
does nothing but replace non-`[A-Za-z0-9_]` characters with `_` and prefix a `_`
if the name does not start with a letter/underscore. **There is no keyword
escaping for C++, Kotlin, or Swift.**

Experiment (`nitro-exp3`) — a struct with fields named `object`, `class`, `fun`,
`val`, `var`, `internal`, `is`, `in`, `default`, `self`, `when`, `init`,
`operator`, `protocol`. Nitrogen reported `🎉 Generated 1/1 HybridObject`
with **no error and no warning**, and emitted code that cannot compile:

```kotlin
data class KeywordConfig(
  val object: String?,   // invalid Kotlin
  val class: String?,    // invalid Kotlin
  val val: String?,      // invalid Kotlin
  val fun: String?,      // invalid Kotlin
  ...
)
```

```swift
init(object: String?, class: String?, fun: String?, val: String?, var: String?,
     internal: String?, is: String?, in: String?, default: String?, self: String?,
     when: String?, init: String?, operator: String?, protocol: String?) { ... }
```

```cpp
std::optional<std::string> class    SWIFT_PRIVATE;   // invalid C++
std::optional<std::string> default  SWIFT_PRIVATE;   // invalid C++
std::optional<std::string> operator SWIFT_PRIVATE;   // invalid C++
```

The failure surfaces only later, as a native compile error. **The config
contract must therefore self-police field names against the union of C++,
Kotlin, and Swift keywords.** Names likely to be tempting in a geolocation
config and dangerous: `default`, `class`, `object`, `operator`, `internal`,
`is`, `in`, `when`, `self`, `init`, `protocol`, `extension`, `where`,
`template`, `namespace`, `private`, `public`, `static`, `final`, `typename`.

### Depth: unbounded, but must be acyclic

There is no depth counter anywhere in `createType`. Depth 3
(`NestedConfig → InnerGroup → DeepLeaf`) generated cleanly (Experiment,
`nitro-exp`).

However, a **self-referential struct crashes nitrogen**. Experiment
(`nitro-exp4`) with `interface TreeNode { label: string; child?: TreeNode }`:

```
❌  Failed to generate spec for RecursiveTest! RangeError: Maximum call stack size exceeded
🎉  Generated 0/1 HybridObjects
```

Cause (Source): `syntax/createType.ts:400-404` writes the type into the
`knownTypes` cache only *after* `get()` returns, so a cycle never hits the
cache at `createType.ts:176-182` and recurses forever. Recursive/tree-shaped
config is off the table.

### Casing transforms

Struct names and field names are passed through **verbatim** (modulo
`escapeCppName`). Casing transforms apply **only to enum members**:

- Kotlin: member names uppercased — `syntax/kotlin/KotlinEnum.ts:9`
  (`${m.name.toUpperCase()}`), and `syntax/types/EnumType.ts:44,64`
  (`escapeCppName(name).toUpperCase()`).
- Swift: `toLowerCamelCase` — `syntax/swift/SwiftEnum.ts:16,21`,
  `utils.ts:106-118`.
- C++: original name plus `SWIFT_NAME(lowerCamelCase)` —
  `syntax/c++/CppEnum.ts:44`.

So a TS field `notificationIconColor` stays `notificationIconColor` in Kotlin,
Swift, and C++. No snake_case or SCREAMING_CASE surprises for struct fields.

### Bonus hazard found: cross-spec name collisions are silent

Experiment (`nitro-exp5`): two spec files each declaring a *different*
`interface Shared`. Nitrogen reported `🎉 Generated 2/2 HybridObjects` with no
warning, and the second definition silently overwrote the first — the single
generated `Shared.kt` contained only `fromB`/`other`, so `ATest`'s
`Shared` was wrong. Source: `utils.ts:83-93` `deduplicateFiles`, whose own
comment reads *"If content differs, you are f\*cked."*

Low risk today (this package has exactly one `.nitro.ts` file), but it means
nested group type names live in one flat global namespace per module. Generic
names like `Options`, `Config`, `Android`, `Ios` are a latent trap if a second
spec is ever added.

### Related hazard: generated structs share the implementation's Kotlin package

Generated Kotlin structs land in
`com.margelo.nitro.nitrobackgroundgeolocation`
(`syntax/kotlin/KotlinStruct.ts:16,170`) — the **same package** as the
hand-written `ConfigMapper.kt`, `NitroBackgroundGeolocation.kt`, etc. A group
type named `Config` would sit next to `ConfigMapper.kt`'s
`import com.marianhello.bgloc.Config`, and a group type named `Location` next to
`BackgroundLocation` usage. Kotlin resolves explicit imports ahead of
same-package declarations, so this shadows rather than errors — which is worse
than an error. **Not verified by compiling** (no Android build was run); flagged
as a naming rule to adopt, not a proven breakage. Confidence: medium.

---

## Q4. Does nitrogen expose anything that could *emit* the mapper code from a declaration, or is a separate codegen step the only route?

**Answer: nitrogen has no plugin system, no custom templates, and no
post-generate hook. A separate codegen step is the only supported route. But
nitrogen's own type graph is importable from Node, so that separate step does
not have to re-parse TypeScript itself.**

**Confidence: high** (Source + Experiment for the importability; docs
corroborate the absence of a plugin API).

### No extension point exists

- The complete `nitro.json` schema is `config/NitroUserConfig.ts:143-224`:
  `cxxNamespace`, `ios.iosModuleName`, `android.androidNamespace`,
  `android.androidCxxLibName`, `autolinking`, `ignorePaths`,
  `gitAttributesGeneratedFlag`. **No `plugins`, `templates`, `hooks`,
  `postGenerate`, or output-override field.** The object is a strict Zod schema,
  so unknown keys are not silently accepted as extension points.
- The CLI surface is `index.ts:20-94`: the default command (`basePath`, `--out`,
  `--config`, `--log-level`) and `nitrogen init <moduleName>`. Nothing else.
- Grepping the whole of `nitrogen/src` for
  `plugin|template|hook|postgenerate|post-generate` returns only C++ template
  mentions and the `nitrogen init` scaffolding-template machinery
  (`init.ts:33-53,141-158`). No user-facing generator extension.
- Docs confirm the absence: `https://nitro.margelo.com/docs/nitrogen` describes
  only `nitro.json` and `npx nitrogen`, with no plugin/template/hook mechanism.

The nearest thing to an escape hatch is `CustomType<T, 'Name', { include }>`
(`syntax/getCustomTypeConfig.ts`, `syntax/types/CustomType.ts`), which lets a
spec reference a hand-written native type. It is **not** a code emitter, and it
is **C++-only** — `CustomType.getCode` throws for `swift` and `kotlin`
(`syntax/types/CustomType.ts:26-35`). It cannot generate a Kotlin data class or
a Swift mapper.

### But: nitrogen's parser is reusable from your own script

`nitrogen/package.json` has `"type": "module"`, `"main": "lib/index"`, and
**no `exports` field**, so deep imports into `nitrogen/lib/**` are permitted.
The parsing layer is exported, not private-by-construction:
`lib/syntax/createType.js` exports `createType`, `createNamedType`,
`getAllKnownTypes`, `addKnownType`; `lib/syntax/getReferencedTypes.js` exports
`getReferencedTypes`; `lib/nitrogen.js` exports `runNitrogen`.

Experiment — a ~15-line script in a scratch project, importing nitrogen's
internals and pointed at this repo's real spec (with a nested group added),
successfully walked the type graph:

```
root struct: ConfigureOptions fields: 28
all reachable structs: ConfigureOptions, NestedGroups, IosConfig, AndroidConfig
groups kind: optional -> kotlin: NestedGroups? | swift: NestedGroups? | c++: std::optional<NestedGroups>
```

That is, a mapper generator can reuse `createType` + `getReferencedTypes` and
ask each field for `getCode('kotlin')` / `getCode('swift')` / `getCode('c++')`
and `kind` — no bespoke TypeScript parsing, and the type names it produces are
guaranteed to match what nitrogen emitted.

Caveats: this is an **unversioned private API** (nothing in nitrogen's
changelog or docs promises `lib/**` stability), it requires `ts-morph` as a peer
in the script's resolution scope, and importing it triggers nitrogen's
`nitro.json` loading (`🔧 Loading nitro.json config...`), so the script must run
from the package root. Treat it as a convenience with a pinned nitrogen version,
not a stable contract.

---

## Q5. Regeneration blast radius

**Answer: nitrogen rewrites every generated file on every run, but generation is
deterministic, so the *git* diff is tightly scoped to the changed type plus a
small, additive set of index-like files. Adding a nested group touched 16 files:
9 new + 7 modified, all additive, ~180 changed lines, and the Android CMake was
not touched.**

**Confidence: high** (Experiment on the real spec + repo git history).

### Mechanics (Source)

- `nitrogen.ts:161-170` writes every file for every spec on every run;
  `writeFile.ts:24` is an unconditional `fs.writeFile`. There is no
  content-hash short-circuit — every file's mtime changes.
- `index.ts:101,122-146` diffs the pre-run file list against the written list
  and **deletes** files no longer generated, printing
  `‼️ Added N files … you need to run pod install/sync gradle`.
- Because output is deterministic (proved by the byte-identical baseline check
  above), unchanged files are rewritten with identical bytes and git shows
  nothing. **mtime churn is total; git churn is scoped.**

### Measured blast radius (Experiment)

Starting from a byte-identical reproduction of the committed output, adding one
nested group to `ConfigureOptions`:

```ts
export interface IosConfig     { pausesLocationUpdatesAutomatically?: boolean; activityType?: string }
export interface AndroidConfig { notificationTitle?: string; startForeground?: boolean }
export interface NestedGroups  { ios?: IosConfig; android?: AndroidConfig }
export interface ConfigureOptions { groups?: NestedGroups; /* …27 existing fields… */ }
```

**9 new files** (3 structs × 3 outputs):

```
shared/c++/{NestedGroups,IosConfig,AndroidConfig}.hpp
android/c++/{JNestedGroups,JIosConfig,JAndroidConfig}.hpp
android/kotlin/.../{NestedGroups,IosConfig,AndroidConfig}.kt
ios/swift/{NestedGroups,IosConfig,AndroidConfig}.swift
```

**7 modified files**, with measured line deltas:

| File | Δ lines | Nature of change |
| --- | --- | --- |
| `ios/NitroBackgroundGeolocation-Swift-Cxx-Bridge.hpp` | +84 / −15 | new `std::optional<IosConfig>`-style helper specialisations; the "−15" is diff-hunk alignment, not real deletion |
| `ios/swift/ConfigureOptions.swift` | +13 / −2 | one new init param + one new getter |
| `android/c++/JConfigureOptions.hpp` | +11 / −1 | one new JNI field + marshalling |
| `android/c++/JHybridNitroBackgroundGeolocationSpec.cpp` | +12 / −0 | 3 forward declarations + 6 `#include`s only |
| `ios/c++/HybridNitroBackgroundGeolocationSpecSwift.hpp` | +11 / −2 | forward declarations + includes |
| `android/kotlin/.../ConfigureOptions.kt` | +8 / −3 | one new data-class property |
| `ios/NitroBackgroundGeolocation-Swift-Cxx-Umbrella.hpp` | +9 / −0 | forward declarations + includes |
| `shared/c++/ConfigureOptions.hpp` | +9 / −2 | one new field + `JSIConverter` lines |

**Not touched:** `android/nitrobackgroundgeolocation+autolinking.cmake`,
`+autolinking.gradle`, `nitrobackgroundgeolocationOnLoad.{cpp,hpp,kt}`,
`HybridNitroBackgroundGeolocationSpec.{kt,swift,cpp,hpp}`,
`NitroBackgroundGeolocation+autolinking.rb`, `.gitattributes`, and every
unrelated struct/enum/variant file (`Location.kt`, `LogEntry.kt`,
`Variant_NullType_*`, …).

The CMake staying clean is worth calling out: struct additions produce only
`.hpp`/`.kt`/`.swift`, and the CMake source list only enumerates `.cpp` files.
Contrast with commit `fa00b3a` below, where a *variant* type was added/removed
and the CMake did change by 2 lines.

### Corroboration from git history

`git log --stat -- packages/react-native-nitro-background-geolocation/nitrogen`
shows only two commits: `26a505c` (monorepo restructure — the whole tree added
at once) and `fa00b3a` ("feat(headless): replace user-managed headlessTaskName
with first-party API"). `fa00b3a` is the only real spec-change data point, and
it matches the experiment: **8 files, 59 insertions, 109 deletions** — the same
set (`JConfigureOptions.hpp`, `JHybridNitroBackgroundGeolocationSpec.cpp`,
`ConfigureOptions.kt`, `Swift-Cxx-Bridge.hpp` (88 lines, again the noisiest),
`HybridNitroBackgroundGeolocationSpecSwift.hpp`, `ConfigureOptions.swift`,
`shared/c++/ConfigureOptions.hpp`) plus `+autolinking.cmake` (2 lines, because a
variant `.cpp` disappeared).

### Practical notes

- `Swift-Cxx-Bridge.hpp` is always the noisiest file. It is purely mechanical
  and reviewers can skip it.
- `nitrogen/generated/.gitattributes` marks output `linguist-generated`
  (`config/NitroUserConfig.ts:217-223`, default `true`), so GitHub collapses
  these diffs by default.
- Every run prints the "run `pod install` / sync gradle" nudge whenever the file
  *set* changes — which adding nested groups does (9 new files). Nested groups
  are not a "regenerate and go" change on iOS; the pod file list must be
  refreshed.

---

## Consequences for the config contract

### Ruled IN

1. **A nested public config shape is fully viable.** `ConfigureOptions` can
   carry `ios?: IosConfig`, `android?: AndroidConfig`, or any grouping, at
   arbitrary finite depth, with optional groups and optional leaves. Nitrogen
   generates real nullable nested types on both platforms — nothing is
   flattened, nothing is dropped, and no hand-written glue is required to make
   the *transport* work. Upstream tests the same shapes at this exact version.
2. **Group names `ios` and `android` are safe**, as fields and as type names.
   The ticket's collision worry is unfounded.
3. **Arrays of structs and `Record<string, Struct>` are available** if the
   contract wants list- or map-shaped config sections.
4. **Nesting improves the native ergonomics versus today's baseline.** A plain
   `group?: IosConfig` yields `IosConfig?` in Kotlin and Swift, versus today's
   `Variant_NullType_Double?` per scalar. Grouping also shrinks the generated
   surface: 3 groups cost 9 new files, whereas today's 7 nullable scalar shapes
   cost ~20 `Variant_NullType_*` files.
5. **Regeneration is safe to do often.** Scoped, additive git diffs (~16 files,
   ~180 lines for a 3-group addition); no broad rewrite; output is
   byte-reproducible, so a stale-codegen check in CI is trivial.
6. **A mapper generator can reuse nitrogen's own parser.** Importing
   `nitrogen/lib/syntax/createType.js` + `getReferencedTypes.js` gives the
   exact type graph nitrogen used, including per-language type names via
   `getCode('kotlin'|'swift'|'c++')`. This removes the main risk of a separate
   codegen step (drifting from nitrogen's naming).

### Ruled OUT

1. **Nitrogen will not emit the mappers.** No plugin, no template, no hook, no
   `nitro.json` extension point. `CustomType` is C++-only and is a
   type-reference escape hatch, not an emitter. **A separate codegen script (or
   continued hand-writing) is the only route** — this settles the ticket's last
   question definitively.
2. **No recursive / tree-shaped config.** A self-referential struct crashes
   nitrogen with a stack overflow. No `children?: Group[]` of the same type.
3. **Plain `?:` optionals cannot express "explicitly null → reset to default".**
   That third state is exactly what `ConfigMapper.kt`'s `onValue`/`onNull`
   pairs consume today. Nesting reorganises the shape but does **not** remove
   the need for `T | null` on any leaf that must support reset — those leaves
   will keep generating `Variant_NullType_T?`. **The contract must decide
   per-leaf whether reset-to-default is required**; this is the decision that
   most affects mapper complexity, and it is orthogonal to nesting.
4. **Empty groups are illegal.** A group interface must have ≥1 field, so no
   placeholder `ios?: {}` sections.
5. **No anonymous inline groups.** `ios?: { pauses?: boolean }` is rejected;
   every group needs its own named `interface`.

### Rules the contract must enforce itself (nitrogen will not)

1. **Keyword blocklist for field names.** Nitrogen does zero keyword escaping
   and emits uncompilable Kotlin/Swift/C++ with no warning. Ban at minimum:
   `class`, `object`, `fun`, `val`, `var`, `internal`, `is`, `in`, `when`,
   `default`, `self`, `init`, `operator`, `protocol`, `extension`, `where`,
   `template`, `namespace`, `private`, `public`, `static`, `final`, `typename`.
   Worth a lint rule or a check in the mapper generator.
2. **No `__` prefix** on struct names or field names.
3. **Distinctive group type names.** Struct type names are one flat namespace
   per Nitro module, cross-spec collisions are resolved by silent
   last-writer-wins (`utils.ts:83-93`), and generated Kotlin structs share the
   implementation's package. Prefer `IosConfig` / `AndroidConfig` /
   `HttpConfig` over `Ios` / `Android` / `Config`; specifically avoid `Config`
   and `Location`, which already appear as imports/types in
   `ConfigMapper.kt` and the generated output.
4. **Prefer `interface` over `type`** for every group, per upstream docs — a
   `type` alias can be flattened by TypeScript and lose the symbol nitrogen
   needs to name the struct.
5. **Budget for `pod install` / gradle sync** whenever groups are added or
   removed, since the generated file set changes.

### Could NOT determine

- **Whether the generated nested code actually compiles on device.** Everything
  above is codegen-level. No Xcode or Gradle build was run in a scratch project
  (that would require the full pod/gradle scaffolding), and no tracked file in
  this repo was modified, so the nested spec was never built here. The emitted
  C++/Kotlin/Swift reads as correct and upstream tests these shapes at v0.35.6,
  so risk is low — but "it compiles" is unverified. **Recommended follow-up:
  land one throwaway nested group on a branch and run both native builds before
  committing to a nested contract.**
- **The exact Kotlin/Swift shadowing behaviour** for a generated struct named
  the same as an import in `ConfigMapper.kt` (e.g. `Config`). Reasoned from
  Kotlin's resolution order (explicit import beats same-package), not compiled.
  Treated as a naming rule, not a proven defect.
- **Long-term stability of the `nitrogen/lib/**` deep imports** used by the
  proposed mapper generator. There is no `exports` field today and the
  functions are exported, so it works on 0.35.6; nitrogen makes no stability
  promise. Pin the nitrogen version if the generator depends on it.
- **Whether upstream has a stated position on nested-struct performance at
  depth.** The docs mention eager conversion generally but give no guidance on
  depth or field-count thresholds.
