---
ticket: 002
title: How peer libraries scope platform-only config
status: resolved
---

## Scope and method

Four library families were read at fixed commits. Every claim below cites a
repo-relative path; permalinks use these SHAs:

| Library | Repo | SHA read |
| --- | --- | --- |
| `react-native-nitro-geolocation` | `jingjing2222/react-native-nitro-geolocation` | `552c180fedfbcc722bcb0958e94f1d3eb1382b3b` |
| `expo-location` | `expo/expo` | `f0347c916e56e78112944cdfec3081ec90578de9` |
| transistorsoft RN plugin | `transistorsoft/react-native-background-geolocation` | `5e6e0b18a53bcd88fab1ace52dd8f04d0590ab42` (v5.4.0) |
| transistorsoft shipped types | npm `@transistorsoft/background-geolocation-types@5.2.2` | tarball, `dist/` |
| mauron85 RN plugin | `mauron85/react-native-background-geolocation` | `f0d434291cfae4a0e510e1e7a05d4e1e7508870e` |
| mauron85 Android core | `mauron85/background-geolocation-android` | `2693e07587eea08746004bd3e72dde276b04b4d2` |
| mauron85 iOS core | `mauron85/background-geolocation-ios` | `5149178c65322d04f4e9e47bd278b17cf0e4bd9a` |
| React Native core | `facebook/react-native` | `f2a250ad895ffd4478f0668f56867b78be21ea2f` |

Method: read the public option/config type declarations, then the native mapper
or JS guard that consumes them, then the published docs. Reads were verified
against native persistence code, not just types — that is where the round-trip
answers live. Nothing in this repo was modified; peer sources were cloned or
fetched into the session scratchpad.

The `mauron85/cordova-background-geolocation-plugin` repo named in the ticket no
longer exists under that name. Its Android and iOS cores live in
`mauron85/background-geolocation-android` and
`mauron85/background-geolocation-ios`, which the RN plugin consumes; those were
read instead. The Java and Objective-C cores read here are the *same* cores this
library vendors (`com.marianhello.bgloc.Config`, `MAURConfig`), so the mauron85
section below is effectively this library's own inheritance, upstream.

---

## 1. `react-native-nitro-geolocation`

Closest peer: same Nitro Modules toolchain, same domain, and it happens to have
both a foreground option surface and a background option surface — which use
**two different conventions**. That internal inconsistency is the most useful
finding in this section.

### Shape

**Foreground surface: flat, with prose tags.** `LocationRequestOptions` puts
every field at the root and marks ownership only in the doc comment
(`packages/react-native-nitro-geolocation/src/NitroGeolocation.nitro.ts:78-178`):

```ts
export interface LocationRequestOptions {
  timeout?: number;
  distanceFilter?: number;
  /** Android-only location granularity. */
  granularity?: AndroidGranularity;
  /** Android-only maximum batching delay in milliseconds. */
  maxUpdateDelay?: number;
  /** iOS-only activity type used to tune Core Location behavior. */
  activityType?: IOSActivityType;
  /** iOS-only setting for the background location indicator. */
  showsBackgroundLocationIndicator?: boolean;
  // ...
}
```

**Background surface: nested platform groups.** `BackgroundLocationOptions` has
`android` and `ios` sub-objects
(`packages/react-native-nitro-geolocation/src/background/types.ts:69-136`):

```ts
export interface BackgroundLocationOptions {
  trackingMode?: BackgroundTrackingMode;
  accuracy?: LocationAccuracyOptions;
  granularity?: AndroidGranularity;      // Android-only, still at the root
  interval?: number;
  distanceFilter?: number;
  waitForAccurateLocation?: boolean;     // Android-only, still at the root
  stopOnTerminate?: boolean;
  startOnBoot?: boolean;
  android?: AndroidBackgroundLocationOptions;
  ios?: IOSBackgroundLocationOptions;
  geofencing?: GeofencingOptions;
  activityRecognition?: ActivityRecognitionOptions;
  sync?: BackgroundHttpSyncOptions;
}

export interface AndroidBackgroundLocationOptions {
  locationProvider?: AndroidBackgroundProvider;
  foregroundService: AndroidForegroundServiceOptions;  // required inside an optional group
  requestNotificationPermission?: boolean;
  requestIgnoreBatteryOptimizations?: boolean;
}
```

The nesting is **not clean**: `granularity` and `waitForAccurateLocation` are
Android-only but stay at the root, next to genuinely shared `interval` and
`distanceFilter`. Reading the type alone, you cannot tell which root fields are
shared and which are Android's — the `android` group's existence actively
implies the root is shared, and it isn't.

**A third pattern for divergent value types.** Where the *value* differs per
platform rather than the field's existence, it uses a per-platform-keyed value
object (`src/types.ts:28-31`):

```ts
export interface LocationAccuracyOptions {
  android?: AndroidAccuracyPreset;   // "high" | "balanced" | "low" | "passive"
  ios?: IOSAccuracyPreset;           // "best" | "nearestTenMeters" | ...
}
```

So one library uses three conventions: flat-plus-prose (foreground), nested
platform group (background), and per-platform value map (accuracy) — the last
consumed by *both* surfaces.

### Foreign-platform field: type error, warning, or ignored?

**Silently ignored, with one runtime exception.** Setting `ios: {...}` on Android
compiles and is accepted; the JS layer does no platform branching at all — there
is not a single `Platform.OS` check or `console.warn` in the package's `src/`
outside tests. The one runtime signal is the *inverse* case: Android throws if
its own group is missing
(`android/src/main/java/com/margelo/nitro/nitrogeolocation/background/NitroBackgroundLocationController.kt:598-604`):

```kotlin
private fun validate(options: BackgroundLocationOptions) {
    if (options.android?.foregroundService == null) {
        throw IllegalArgumentException(
            "Android background tracking requires android.foregroundService notification options"
        )
    }
}
```

Note what the type cannot express: `foregroundService` is required *inside*
`AndroidBackgroundLocationOptions`, but the group itself is optional, so
"forgot the android group entirely" is a runtime `IllegalArgumentException`, not
a compile error. iOS has no mirror validation — an `android`-only config starts
fine on iOS.

### How defaults are published

**Prose only, and duplicated into native.** Exactly one `@default` tag exists in
the whole foreground spec (`@default false` on the deprecated
`autoRequestPermission`); `src/background/types.ts` has zero. Defaults appear as
free text in doc comments ("Timeout in milliseconds (default: 600000 / 10
minutes)") and independently as literals in the native restore path — e.g.
`interval` defaults to `10_000f` and `fastestInterval` to `5_000f` in
`NitroBackgroundLocationController.kt:655-656`. Nothing reads defaults at
runtime; there is no `getDefaults()`.

### Do reads round-trip?

**Same type, lossy, and asymmetrically lossy per platform.** The getter is
declared to return exactly what the setter accepts
(`src/background/NitroBackgroundLocation.nitro.ts:27-30`):

```ts
configureBackgroundLocation(options: BackgroundLocationOptions): Promise<void>;
getBackgroundConfiguration(): Promise<BackgroundLocationOptions | undefined>;
```

In-process it echoes the caller's object verbatim, foreign group included
(`android/.../NitroBackgroundLocation.kt:34-36`, `ios/NitroBackgroundLocation.swift:78-82`).
After a process restart it goes through per-platform persistence and the foreign
group is dropped:

- Android `restoreConfig()` reconstructs with `ios = null` and
  `geofencing = null` (`NitroBackgroundLocationController.kt:752-782`), but
  *does* persist and restore `accuracy.ios` (`putString("accuracyIos", …)` at
  line 644, read back at 735-741).
- iOS `makeBackgroundOptions()` reconstructs with `android: nil` **and**
  `accuracy: nil, granularity: nil` (`ios/IOSBackgroundSerialization.swift:361-383`)
  — so iOS loses even the shared `accuracy` group that Android preserves.

Net: `getBackgroundConfiguration()` returns different information depending on
whether JS or the OS was restarted, and the two platforms lose different fields.
A caller cannot distinguish "not set", "not mine", and "lost on restore".

### Cost to a cross-platform caller

**Low, for the nested part.** One literal, both platforms set inline, no
`Platform.select`, no branching — from
`docs/docs/background/start-stop.md`:

```ts
await startBackgroundLocation({
  trackingMode: 'continuous',
  interval: 10_000,
  distanceFilter: 25,
  android: {
    foregroundService: {
      notificationTitle: 'Location tracking active',
      notificationText: 'Your location is being recorded',
    },
  },
});
```

The cost lands elsewhere: the caller must still learn from prose which *root*
fields are Android-only, must remember that omitting `android` is an Android
runtime throw, and cannot trust `getBackgroundConfiguration()` to give back what
was set.

---

## 2. `expo-location`

### Shape

**Purely flat, with a machine-readable prose tag.** Platform ownership is a
JSDoc `@platform` line and nothing else
(`packages/expo-location/src/Location.types.ts:104-131`):

```ts
export type LocationOptions = {
  /** @default LocationAccuracy.Balanced */
  accuracy?: LocationAccuracy;
  /**
   * @default true
   * @platform android
   */
  mayShowUserSettingsDialog?: boolean;
  /** @platform android */
  timeInterval?: number;
  distanceInterval?: number;
};
```

The background surface extends the foreground one and adds more flat fields with
the same tags (`Location.types.ts:154-194`):
`showsBackgroundLocationIndicator` / `activityType` /
`pausesUpdatesAutomatically` are `@platform ios`;
`foregroundService?: LocationTaskServiceOptions` is an Android-only nested
*feature* group — and it carries **no `@platform` tag at all**. The published
reference confirms the omission: every other platform-scoped option renders
"Supported platforms: Android." or "Supported platforms: iOS.", while
`foregroundService` renders with no platform marker
(<https://docs.expo.dev/versions/latest/sdk/location/>). That is the flat-plus-prose
failure mode in its natural habitat: the tag is optional metadata, so it gets
forgotten, and nothing catches it.

`@platform` is not inert — Expo's docs pipeline turns it into the "Supported
platforms" line and platform pills. But it has zero effect on the type.

The read side does use nesting: `LocationPermissionResponse` groups
platform-specific detail (`Location.types.ts:482-512`):

```ts
export type LocationPermissionResponse = PermissionResponse & {
  ios?: PermissionDetailsLocationIOS;
  android?: PermissionDetailsLocationAndroid;
};
```

### Foreign-platform field: type error, warning, or ignored?

**Silently ignored.** Options are forwarded to native untouched, with no
filtering and no warning (`packages/expo-location/src/Location.ts:72-76`):

```ts
export async function getCurrentPositionAsync(
  options: LocationOptions = {}
): Promise<LocationObject> {
  return ExpoLocation.getCurrentPositionAsync(options);
}
```

For platform-scoped *functions* Expo does the same thing one level up — a
no-op return rather than a throw or warn (`Location.ts:50-59`):

```ts
/** @platform android */
export async function enableNetworkProviderAsync(): Promise<void> {
  if (Platform.OS === 'android') {
    return ExpoLocation.enableNetworkProviderAsync();
  }
}
```

The only warnings in the file are for web unavailability and Expo Go, not for
foreign-platform options.

### How defaults are published

**JSDoc `@default` tags in the type, propagated to docs.** `@default true`,
`@default false`, `@default LocationAccuracy.Balanced`,
`@default ActivityType.Other`. This is the one thing expo-location does better
than every other library here: the default lives adjacent to the field
declaration, so the docs table is generated from it rather than hand-copied.
Still not readable at runtime; several fields document only "Default value may
depend on `accuracy` option", i.e. the real default is in native code.

### Do reads round-trip?

**No getter exists.** There is no `getConfig` equivalent for
`LocationOptions` / `LocationTaskOptions`. The closest reads are
`hasStartedLocationUpdatesAsync(taskName): Promise<boolean>` and
`hasStartedGeofencingAsync(taskName): Promise<boolean>`
(`Location.ts:542`, `:634`). Options are write-only; the round-trip question is
sidestepped rather than answered.

### Cost to a cross-platform caller

**Lowest authoring cost, highest reading cost.** One flat literal, no grouping
ceremony. But the caller has no type-level signal at all — the ~10 platform-only
fields in `LocationOptions ∪ LocationTaskOptions` are indistinguishable from
shared ones in an IDE unless the doc comment is read, and at least one
(`foregroundService`) has no marker to read. Because there is no getter, a
caller who wants to display or diff effective config must keep its own copy.

---

## 3. The mauron85 / transistorsoft lineage

### 3a. mauron85 (this library's direct ancestor)

**Shape: flat, with a two-axis prose tag.** `ConfigureOptions` is a single flat
interface where each field carries a `Platform:` line *and* an orthogonal
`Provider:` line (`index.d.ts:18-...`):

```ts
export interface ConfigureOptions {
  /**
   * Start background service on device boot.
   *
   * Platform: Android
   * Provider: all
   *
   * @default false
   */
  startOnBoot?: boolean;

  /**
   * Platform: iOS
   * ...
   * @default "OtherNavigation"
   */
  activityType?: iOSActivityType;
}
```

The README repeats the same facts as a table with dedicated `Platform`,
`Provider*` and `Default` columns (`README.md:305-...`).

**Foreign-platform field: silently dropped, no warning.** The Android bridge
reads only keys it knows, key by key
(`android/lib/src/main/java/com/marianhello/bgloc/react/ConfigMapper.java:28-...`):

```java
public static Config fromMap(ReadableMap options) throws JSONException {
    Config config = new Config();
    if (options.hasKey("stationaryRadius")) config.setStationaryRadius(...);
    if (options.hasKey("interval")) config.setInterval(options.getInt("interval"));
    // ... no branch for activityType / pauseLocationUpdates / saveBatteryOnBackground
```

`com.marianhello.bgloc.Config` has no field for the iOS-only options at all
(`background-geolocation-android/src/main/java/com/marianhello/bgloc/Config.java:42-64`),
so they cannot even be stored. `MAURConfig` mirrors this — it has no `interval`,
`fastestInterval`, `startOnBoot`, `startForeground`, or `notification*`
properties (`background-geolocation-ios/BackgroundGeolocation/MAURConfig.h:22-37`).
Unknown keys vanish with no diagnostic on either side.

**Defaults: triplicated, and already drifted.** Three copies exist — JSDoc
`@default`, the README table's Default column, and `Config.getDefault()` in Java
(`Config.java:128-155`). Two disagree with the code:

| Field | JSDoc / README | `Config.getDefault()` |
| --- | --- | --- |
| `interval` | `60000` (`index.d.ts:111`) | `600000` (`Config.java:140`) |
| `startForeground` | `false` (README table) | `true` (`Config.java:145`) |

That is drift shipped in the ancestor whose config surface this library
inherited — the same failure the [config-contract map](../map.md) already
records for this repo.

**Reads: same declared shape, structurally a subset.** `getConfig` is typed as
returning `ConfigureOptions` (`index.d.ts:666-667`), but each platform's
serializer emits only its own keys:

- `ConfigMapper.toMap()` writes Android keys only (`ConfigMapper.java:94-...`).
- `MAURConfig.toDictionary` writes iOS keys only
  (`background-geolocation-ios/BackgroundGeolocation/MAURConfig.m:455-477`).

So on Android `getConfig()` returns an object where every iOS-only key is
*absent* — the optional-field type makes that indistinguishable from "not
configured". The README documents `getConfig` as the way to "check the actual
applied configuration", which is exactly the thing it cannot do for the foreign
half.

**Also worth noting:** the prose tags are not reliable even in the ancestor.
`activitiesInterval` is documented `Platform: Android` in both the README table
and `index.d.ts`, yet it is a real property on `MAURConfig`
(`MAURConfig.h:27`) and is serialized by `toDictionary` (`MAURConfig.m:460`).
Prose cannot be checked against native, so it rots.

### 3b. transistorsoft — the interesting case

This is the flat-with-prose approach at maximum scale, **and it has already
migrated away from flat** — but not to platform groups.

**v4 shape: flat, ~75 top-level fields.** `Config` is one interface with every
field at the root (`src/declarations/interfaces/Config.d.ts`, 2476 lines). The
doc block at the top of the file organises them into markdown tables titled
`### [Geolocation] iOS Options`, `### [Geolocation] Android Options`,
`### [Application] Android Options` etc. (`Config.d.ts:41-152`) — grouping exists
in the *prose*, not the type. Per-field markers are inconsistent in form:
`__`[iOS only]`__`, `[__iOS Only__]`, or an `### Android` sub-heading inside the
comment (`Config.d.ts:1728-1748`).

A nuance the flat shape enables: `useSignificantChangesOnly` documents an iOS
meaning *and* a different Android meaning in the same comment
(`Config.d.ts:1700-1726`). It is not platform-exclusive, it is
platform-divergent. Any scheme that assigns each field exactly one platform owner
has to have an answer for this class of field.

**v5 shape: compound config, grouped by DOMAIN — not by platform.** v5.0.0
introduced a nested `Config` whose sub-objects are functional areas. The shipped
type (`@transistorsoft/background-geolocation-types@5.2.2`,
`dist/core/config/Config.d.ts`):

```ts
export interface Config {
    reset?: boolean;
    logger?: LoggerConfig;
    geolocation?: GeoConfig;
    http?: HttpConfig;
    app?: AppConfig;
    persistence?: PersistenceConfig;
    activity?: ActivityConfig;
    authorization?: AuthorizationConfig;
    transistorAuthorizationToken?: TransistorAuthorizationToken;
}
```

And each group mixes both platforms' fields freely
(`dist/core/config/GeoConfig.d.ts`):

```ts
export interface GeoConfig {
    desiredAccuracy?: DesiredAccuracy;
    activityType?: ActivityType;                     // iOS only
    stationaryRadius?: number;                       // iOS only
    pausesLocationUpdatesAutomatically?: boolean;    // iOS only
    showsBackgroundLocationIndicator?: boolean;      // iOS only
    locationUpdateInterval?: number;                 // Android only
    fastestLocationUpdateInterval?: number;          // Android only
    deferTime?: number;                              // Android only
    allowIdenticalLocations?: boolean;               // Android only
    // ... shared fields interleaved
}
```

The migration guide's rationale is explicitly about domains, not platforms
(`help/MIGRATION-GUIDE-5.0.0.md`): "**Clarity:** Groups related settings together
(geolocation, HTTP, logging, app lifecycle, etc)." Platform ownership stayed
prose — it is a Notes column in the guide's mapping table (`activityType` →
"iOS only", `enableHeadless` → "Android only", `notification` → "Android only").
**The most-configurable library in this domain restructured its config and chose
not to make platform an axis of the structure.**

A second observation about the shipped types: the published `.d.ts` files have
**no doc comments at all** — they are stripped in `dist/`. So for a v5 consumer,
platform ownership is not even in the prose the IDE shows; it is only in the
generated API docs and the migration table.

**Foreign-platform field: no type error; legacy flat config gets a runtime
warning.** Nothing rejects an iOS field on Android. The only runtime diagnostic
concerns the *flat vs compound* axis: "Using the legacy flat config will show
warnings at runtime, but will **not** result in an error"
(`MIGRATION-GUIDE-5.0.0.md`, Breaking Changes). Note the migration strategy —
both shapes accepted simultaneously, old one warns, no hard break.

**Defaults: docs-table only.** Defaults live in the markdown tables inside the
v4 `Config.d.ts` doc block (`__Default: `10`__` etc., `Config.d.ts:44-...`) and
in the generated API reference. There are no `@default` tags and the shipped v5
types carry no comments, so nothing machine-readable and nothing runtime-readable.

**Reads: exact round-trip by construction.** `State` is declared as a superset of
`Config` in both v4 and v5:

```ts
// v4: src/declarations/interfaces/State.d.ts
interface State extends Config { enabled: boolean; /* ... */ }

// v5: dist/core/api/State.d.ts
export interface State extends Config { enabled: boolean; isMoving: boolean; /* ... */ }
```

`ready()` and `setConfig()` take `Config`; `getState()` returns `State`. This is
the cleanest read/write symmetry of any library surveyed — obtained for free
because the shape is one flat (or one domain-grouped) bag with no platform axis
to go asymmetric. What it reports for foreign-platform fields is not documented
and was not verifiable from this repo (the native `TSLocationManager` binaries
are closed-source and not in the repo).

**Cost to a cross-platform caller:** v4 costs nothing to author and a lot to
read — ~75 undifferentiated fields, ownership only in prose whose markers are
not uniform. v5 costs one extra level of nesting and a one-time migration, buys
navigability by domain, and buys **nothing** on the platform axis: you still
cannot tell from `GeoConfig` which half of it applies to you.

---

## 4. React Native core

RN core has two distinct conventions, applied to two different things.

### 4a. Platform-scoped *options / props*: per-platform interfaces, merged flat

RN authors platform-specific props in separate named interfaces, then merges
them into the single public props type via `extends`
(`packages/react-native/Libraries/Components/TextInput/TextInput.d.ts:115-321` iOS,
`:323-425` Android, `:540-549` the merge):

```ts
/** IOS Specific properties for TextInput */
export interface TextInputIOSProps {
  clearButtonMode?: 'never' | 'while-editing' | 'unless-editing' | 'always' | undefined;
  // ...
}

/** Android Specific properties for TextInput */
export interface TextInputAndroidProps {
  /** @platform android */
  cursorColor?: ColorValue | null | undefined;
  // ...
}

export interface TextInputProps
  extends ViewProps, TextInputIOSProps, TextInputAndroidProps, AccessibilityProps { ... }
```

The same pattern appears for views
(`Libraries/Components/View/ViewPropTypes.d.ts:27-142`: `TVViewPropsIOS`,
`ViewPropsIOS`, `ViewPropsAndroid`, merged into `ViewProps`) and for text styles
(`Libraries/StyleSheet/StyleSheetTypes.d.ts:547-562`: `TextStyleIOS`,
`TextStyleAndroid`, merged into `TextStyle`).

The crucial detail: **the grouping is an authoring convenience, not part of the
caller-facing contract.** `TextInputProps` is flat. A caller never writes
`ios: {...}`. Platform ownership survives into the caller's view only as the
`@platform ios` / `@platform android` JSDoc tag, which reactnative.dev renders as
a platform badge. Fields that were never split out are simply flat with a tag —
`ViewStyle.elevation` carries `@platform android`
(`StyleSheetTypes.d.ts:484-491`) and `ViewStyle.borderCurve` carries
`@platform ios` (`:458-462`), both directly on `ViewStyle`.

- **Foreign-platform field:** no type error, no warning, silently ignored by the
  host platform's renderer.
- **Defaults:** prose in the doc comment ("The default value is false"), no
  `@default` convention, not readable at runtime.
- **Round-trip:** not applicable — props are write-only; there is no
  `getProps()`.

### 4b. Platform-scoped *APIs*: name-suffixed module + runtime `console.warn`

When a whole capability belongs to one platform, RN gives it a
platform-suffixed module name — `PermissionsAndroid`, `ToastAndroid`,
`ActionSheetIOS`, `TouchableNativeFeedback` — and guards each method at runtime
(`Libraries/PermissionsAndroid/PermissionsAndroid.js:174-183`):

```js
check(permission: Permission): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.warn('"PermissionsAndroid" module works only for Android platform.');
    return Promise.resolve(false);
  }
  invariant(NativePermissionsAndroid, 'PermissionsAndroid is not installed correctly.');
  return NativePermissionsAndroid.checkPermission(permission);
}
```

So the *name* carries ownership (visible at every call site, unmissable), and the
wrong-platform signal is a `console.warn` plus a benign return value — never a
type error and never a throw. The guard is repeated per method (five copies in
that one file).

### 4c. The caller-side escape hatch: `Platform.select`

RN's answer for "the value differs per platform" is a caller-side selector, typed
so that a `default` key makes it total
(`Libraries/Utilities/Platform.d.ts`):

```ts
select<T>(
  specifics:
    | ({[platform in PlatformOSType]?: T} & {default: T})
    | {[platform in PlatformOSType]: T},
): T;
select<T>(specifics: {[platform in PlatformOSType]?: T}): T | undefined;
```

Note that RN pushes platform branching to the *value*, and leaves the *option
key* flat. `LocationAccuracyOptions { android?, ios? }` in
`react-native-nitro-geolocation` is the same idea inverted — the library owns the
selection instead of the caller.

Also relevant: `Platform` itself is typed as a **discriminated union** of
`PlatformIOSStatic | PlatformAndroidStatic | ...` keyed on `OS`. RN is willing to
make platform a type-level discriminant for *reading* device facts
(`Platform.isPad` narrows only after `Platform.OS === 'ios'`), while keeping it
out of the *writing* surface entirely. That asymmetry is deliberate and worth
weighing.

---

## Comparison

| | nitro-geolocation (fg) | nitro-geolocation (bg) | expo-location | mauron85 | transistorsoft v4 | transistorsoft v5 | RN core props | RN core APIs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Shape** | flat + prose | nested `android`/`ios` groups (leaky) | flat + `@platform` | flat + `Platform:` prose | flat + prose (~75 fields) | nested by **domain**, not platform | flat public type, per-platform interfaces merged via `extends` | platform-suffixed module name |
| **Platform in the type?** | no | partly | no | no | no | no | authoring only, not caller-facing | yes, in the identifier |
| **Foreign field** | silently ignored | silently ignored (own group missing → Android throws) | silently ignored | silently **dropped** by native mapper, no diagnostic | silently ignored | silently ignored (legacy *flat* config warns) | silently ignored | `console.warn` + benign return |
| **Defaults published** | prose, duplicated in native literals | prose (0 `@default`), duplicated in native | **`@default` JSDoc**, generated into docs | JSDoc + README + Java `getDefault()` — 3 copies, 2 drifted | docs tables in the doc block | docs only (shipped `.d.ts` has no comments) | prose in doc comments | prose |
| **Runtime-readable defaults** | no | no | no | no (`getConfig` returns *applied*, not defaults) | no | no | no | n/a |
| **Read round-trip** | n/a (`setConfiguration` is write-only, no getter) | same type, **lossy after restart**, asymmetric per platform | **no getter at all** | same declared type, structurally a per-platform subset | `State extends Config` — exact | `State extends Config` — exact | n/a | n/a |
| **Foreign fields on read** | n/a | present in-process, gone after restore | n/a | **absent** (indistinguishable from unset) | undocumented (closed native) | undocumented | n/a | n/a |
| **Caller cost, cross-platform** | learn prose; no structure to help | one literal, both platforms inline; but must still learn which *root* fields are Android's | lowest to write, no signal to read, one field has no marker at all | prose + drifted defaults + subset reads | prose at scale; grouping only in comments | one nesting level; domain navigable, platform still invisible | zero (flat), badge in docs | zero ambiguity at the call site |

---

## Trade-offs observed

**1. Nobody surveyed makes a foreign-platform field a type error.** Not one of
the eight surfaces above. The strongest signals anyone ships are
(a) RN's platform-suffixed *identifier*, which puts ownership in the call site's
text, and (b) RN's per-method `console.warn`. Nested platform groups —
`options.ios.foo` — are the closest anyone gets to structural ownership, and even
there nothing stops you writing the group on the wrong platform. If this library
wants a type error, it would be doing something no peer does; that is a signal
about cost, not necessarily about wisdom.

**2. Domain grouping and platform grouping are different axes, and the peer with
the most options picked domain.** transistorsoft's v5 restructure is the single
most relevant data point in this research: a library with ~75 flat config
options, after years of maintaining flat-plus-prose, grouped into
`geolocation` / `http` / `app` / `logger` / `activity` / `persistence` and left
platform in the prose. `GeoConfig` deliberately interleaves iOS-only and
Android-only fields. A decision-maker choosing platform groups should be able to
say why domain grouping is insufficient here — the peer evidence points the other
way.

**3. Nested platform groups leak, and the leak is worse than no groups.**
`react-native-nitro-geolocation` is the cautionary case: once `android`/`ios`
groups exist, the *absence* of a field from them reads as "shared" — yet
`granularity`, `waitForAccurateLocation`, `maxUpdateAge`, `maxUpdateDelay` and
`maxUpdates` are all Android-only and all sit at the root. Partial nesting
creates a false negative that flat-plus-prose does not. Whoever adopts groups
must commit to them completely or the structure actively misinforms.

**4. Platform-exclusive is not the only relation, and a single-owner model has to
account for the others.** At least three exist in the corpus:
*exclusive* (`enableHeadless` — Android only), *divergent value type*
(nitro-geolocation's `LocationAccuracyOptions`, where both platforms have the
concept but the enums differ), and *divergent semantics with a shared name*
(transistorsoft's `useSignificantChangesOnly`, documented with distinct iOS and
Android behaviour). A contract with one `platform` field per option handles the
first case and must decide what it does with the other two.

**5. Read round-trip and platform nesting pull against each other.** The two
libraries with clean round-trips (transistorsoft v4 and v5) have no platform axis
in the shape at all — `State extends Config` is exact precisely because there is
one bag. The library with platform groups
(`react-native-nitro-geolocation`) has the *declared* round-trip but loses the
foreign group on restore, and loses different fields on each platform. The
mauron85 ancestor declares a round-trip its mappers cannot honour. If a nested
platform shape is chosen, "what does the reader return for the group it does not
own" needs an explicit answer — the [map](../map.md) already lists this as
unspecified, and no peer has solved it. `undefined` for "not mine" collides with
`undefined` for "unset" in every library here.

**6. Defaults adjacent to the declaration is the one practice with a clear
winner.** expo-location's `@default` JSDoc is the only mechanism in the corpus
that keeps the default next to the field and generates the docs table from it.
Every library that maintains a separate table has drifted or will: mauron85's
Java code disagrees with both its JSDoc and its README on `interval` and
`startForeground`; this repo's map records the same class of drift. Note the limit
though — `@default` is still a comment, still not runtime-readable, and expo has
fields whose real default is computed in native ("may depend on `accuracy`").
None of the eight surfaces expose defaults at runtime.

**7. Migration precedent: accept both shapes, warn on the old one, do not break.**
transistorsoft shipped the compound config as additive — legacy flat config
"remains fully supported", emits a runtime warning, and is documented as
deprecated rather than removed, with a full flat→compound mapping table.
[Ticket 012](../tickets/012-retire-flat-surface.md) plans an outright retirement,
which this repo can afford (no consumers, per the map). The peer precedent is
useful mainly as evidence that a dual-accept phase is the conventional cost when
you *cannot* afford a break.
