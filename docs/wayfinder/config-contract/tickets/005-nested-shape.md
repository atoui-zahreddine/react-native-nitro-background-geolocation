---
id: 005
title: Nested config shape and platform ownership in types
labels: [wayfinder:grilling]
status: closed
assignee:
blocked-by: [001, 002, 013]
---

## Question

What does the public configuration shape look like once platform ownership is
expressed in types instead of doc prose?

- **Group by platform, or by domain?** The charting session assumed platform
  groups; the peer research says that is a genuine fork. The library with the
  most options grouped by **domain** (geolocation / http / app / logger /
  activity / persistence) and deliberately interleaved iOS-only and Android-only
  fields inside each group — and got an exact read round trip out of it, because
  there is no platform axis to go asymmetric on. The peer on this exact
  toolchain chose **platform** groups and immediately leaked Android-only fields
  into its shared root. Settle this first; the rest follows from it.
- **Groups**: which groups exist, and what are they called? Under domain
  grouping the cut is roughly HTTP / sync, notification, activity, storage, core;
  under platform grouping it is core plus `android` plus `ios`. Either way a
  field like `stationaryRadius` has to land in exactly one.
- **Platform ownership**: nested groups, per-platform types the caller picks, or
  a shared shape with platform-tagged fields? Does setting an iOS-only field on
  Android become a type error, a lint warning, or silently ignored as today?
  Note that **no peer library makes it a type error** — the strongest signals
  anyone ships are a platform-suffixed identifier and a runtime warning. Doing
  it at the type level is defensible but unprecedented, so it needs to survive
  the cross-platform-caller check below.
- **Ownership is not one relation but four.** Observed in the wild: exclusive to
  one platform; shared name with a different default per platform; shared name
  with a **different enum** per platform, which one peer solves with a
  per-platform value map rather than a shape split; and shared name with
  **different behaviour** per platform at the same type. A single `platform`
  column has no slot for the last two. Decide which relations the contract can
  express.
- **The inherited ownership data is already wrong.** The ancestor library
  documents `activitiesInterval` as Android-only in two places while it is a
  real iOS configuration property that gets serialised — and this repo inherited
  both the field and the claim. The platform column must be derived from what
  native actually reads, field by field, not copied from the existing prose or
  the docs table.
- **Cross-platform code**: an app that legitimately sets both platforms' fields
  in one object must stay pleasant to write. Check the proposed shape against
  the example app's settings screen before accepting it.
- **Reads**: does `getConfig()` return the same nested shape it accepts? Settle
  only the shape question here — what a read reports for a field the running
  platform does not own is now its own ticket,
  [How reads report fields the platform does not own](014-foreign-platform-reads.md),
  blocked on this one.
- **Is a foreign-owned write even constructible?** The reset grilling settled the
  runtime half — the mapper drops it and the generator warns, naming the field and
  its owner. The type-level half is this ticket's: does the shape make such a call
  a compile error, or merely warnable? Bear in mind no peer library makes it a
  type error.
- **Does `LocationOptions` become a group?** The reset grilling brought it into the
  contract and settled its semantics — two-state, with omission meaning "use the
  default for this call" rather than "unchanged", because its options are per-call
  rather than persisted. Only its group membership is open.
- **Naming**: any group or field name that is new to the domain goes into
  `CONTEXT.md` as part of resolving this.
- **Two naming hazards are now known** (from the nitrogen research, which found
  nitrogen silently permits both): field names that are reserved words in
  Kotlin, Swift, Java or C++ generate broken native code with no error, and a
  generic group type name like `Config` or `Options` risks a silent
  last-writer-wins collision — worse because generated Kotlin structs share a
  package with `ConfigMapper`. Whatever names this decision picks must survive
  both, and the contract needs a rule that keeps future names surviving them.

Informed by [Nitrogen's support for nested config structs](001-nitrogen-nested-structs.md)
— nesting is confirmed possible at arbitrary depth, and `ios` / `android` are
safe group names — and by
[How peer libraries scope platform-only config](002-peer-platform-scoping.md).
Blocked additionally on
[Native build check for a nested struct group](013-nested-build-check.md),
because nesting is so far verified at codegen level only.

## Resolution

**Groups divide by domain. Platform ownership is contract metadata, never shape.**
The fork the peer research opened is settled toward transistorsoft's answer, not
toward `react-native-nitro-geolocation`'s — no `android` / `ios` group exists at
any level of the public shape.

### The shape

Seven groups, no scalars at the root. Group struct name is
`PascalCase(key) + Options` on the input side, `+ Config` on the output side.

| Group key | Fields | Platform owners |
| --- | --- | --- |
| `tracking` | locationProvider, desiredAccuracy, stationaryRadius, distanceFilter, interval, fastestInterval, pauseLocationUpdates, saveBatteryOnBackground, activityType | shared + 2 Android + 3 iOS, interleaved |
| `lifecycle` | stopOnTerminate, startOnBoot | shared + 1 Android |
| `activity` | activitiesInterval, stopOnStillActivity | both + Android |
| `notification` | notificationsEnabled, startForeground, notificationTitle, notificationText, notificationIconColor, notificationIconLarge, notificationIconSmall | all Android |
| `http` | url, syncUrl, syncThreshold, httpHeaders, postTemplate | all shared |
| `storage` | maxLocations | shared |
| `debug` | debug | shared |

Placements that were live questions:

- **`activityType` in `tracking`, not `activity`.** `activity` means activity
  *recognition*; `activityType` is a CoreLocation journey hint with no
  recognition in it. Same word, two concepts — kept apart deliberately.
- **`storage` and `debug` are one-field groups**, not root scalars. A mixed root
  is what let the peer library leak; both groups have obvious room to grow.
- **`lifecycle` split out of `tracking`**, keeping `tracking` at 9 rather than 11.
- **`tracking`'s 9 are not split further.** The tempting cut — an Android
  throttle group plus an iOS power group — is platform grouping in a domain
  costume, so it was rejected.

### Two type families, one contract

`getConfig()` stops returning the type it accepts.

| | Input | Output |
| --- | --- | --- |
| Top level | `ConfigureOptions` (name kept) | `AppliedConfig` |
| Groups | `TrackingOptions`, `HttpOptions`, … every field optional, group itself optional | `TrackingConfig`, `HttpConfig`, … every field required, group required |

Symmetric in shape and keys, asymmetric in optionality. This is what deletes the
sixth copy of the defaults: the example settings screen carries **27 `??`
fallbacks**, one per field, purely because a read cannot distinguish "unset" from
"native defaulted it and did not say". `AppliedConfig` makes
`config.tracking.distanceFilter` a plain number. Cost is 14 group structs plus 2
roots instead of 7 plus 1 — all generated, and more of a construct
[the build check](013-nested-build-check.md) already proved compiles. The
prototype confirms it for the HTTP group.

### Platform ownership metadata

Per contract entry:

```ts
platforms: ['android', 'ios']            // required, non-empty; both = shared
default: 50 | { android: 50, ios: 60 }   // literal, or per-platform override
platformNotes?: { android?: string; ios?: string }
```

This covers three of the four relations the peer research found: exclusivity by
list length, divergent default by the `default` union, divergent behaviour by
`platformNotes` — the only honest slot, since divergent behaviour is not
expressible in a type. Divergent **enum** gets no slot and went to the map's fog:
zero instances in this repo.

`platforms` is derived field by field from what native reads. Two inherited
claims were checked and are wrong:

- `activitiesInterval` is documented Android-only in three places, yet
  `MAURConfig` defaults it to `10000` and reads it — it is `['android', 'ios']`.
- `CONTEXT.md` called the **Activity Provider** Android only, while iOS ships
  `MAURActivityLocationProvider` and dispatches `ACTIVITY_PROVIDER` at
  `MAURBackgroundGeolocationFacade.m:312`. Fixed in the glossary as part of this
  resolution.

Relation-by-relation, measured rather than assumed: **divergent defaults do not
exist** in this repo — iOS `init` and `Config.getDefault()` agree on every shared
field (50 / 50 / 100 / false / 10000 / true / 10000 / 100 / DISTANCE_FILTER), and
the only divergence, `url` / `syncUrl` as `nil` versus `""`, was already
converged by [the reset ticket](006-null-reset-semantics.md). Divergent
*behaviour* is the common case: `stationaryRadius` and `distanceFilter` (iOS
elastic filter versus Android `minTime` throttling), `stopOnTerminate` (Android
headless versus iOS native continuation), `desiredAccuracy`
(`CLLocationAccuracy` versus fused priority), and activity recognition
(SOMotionDetector versus the ActivityRecognition API).

### A foreign-owned write is not a compile error

`configure({ tracking: { pauseLocationUpdates: true } })` compiles on Android.
The mapper drops it and the dev-mode warning names the field and its owner, as
the reset ticket settled. Platform is metadata, not shape, so the type has no
opinion — and no peer library ships a type error here. Duplicating the
enforcement in the type would make the runtime warning dead code. Whether a
*read* on the non-owning platform reports the field, and with what value, is
[How reads report fields the platform does not own](014-foreign-platform-reads.md)
— now unblocked, and forced into a real answer by `AppliedConfig` making every
field required.

### `activityType` becomes an enum

`decodeActivityType` (`MAURConfig.m:363`) accepts four strings case-insensitively
and falls through to `CLActivityTypeOther`, so the field ships today as an
untyped `string` where a typo is a silent behaviour change, and `Other` is
reachable only by typo. It becomes
`ActivityType { AutomotiveNavigation, OtherNavigation, Fitness, Other }` with
default `OtherNavigation` — the real native default, which the spec currently
describes only as "native platform default". `CLActivityTypeAirborne` is
unmapped; that is a native capability gap, sent to the map's fog.

### Naming rules the contract carries

- Group struct name is `PascalCase(key) + Options` / `+ Config`, **never** bare
  `Config` or `Options` — kills the silent last-writer-wins struct collision the
  [nitrogen research](001-nitrogen-nested-structs.md) found, which is sharper
  here because generated Kotlin structs share a package with `ConfigMapper`.
- The generator rejects any group or field name that is a reserved word in
  Kotlin, Swift, Java or C++. None of the seven keys is.

### `LocationOptions` is a separate surface, not a group

The contract declares two surfaces: the persisted config (7 groups, two type
families) and the per-call location request (flat, one family, name kept). A
group under `configure()` would imply the per-call options persist, and its
omission rule already contradicts its would-be siblings — omission means
"default for this call", not "unchanged". No `AppliedConfig` twin, because
nothing reads it back. Both surfaces still take defaults, ranges and prose from
the same declaration.

### Consumers re-cut, contract does not bend

The example settings screen's seven hand-written sections are already
domain-grouped with two exceptions, and both were rejected rather than adopted:
"iOS behavior" is a platform section — the thing this ticket ruled out — and
"Intervals" groups by unit rather than concern, seating `activitiesInterval`
(both platforms) beside `interval` / `fastestInterval` (Android OS throttles),
which is a plausible source of the mislabelling. `stopOnStillActivity` under
"Lifecycle" is also wrong: it is recognition deciding to stop updates, not
process lifecycle. So the settings screen and the session detail screen
re-section onto the contract's groups as part of the migration tasks. Whether the
contract *carries* the display titles and field order — instead of both screens
hand-copying them — graduated out of the fog into
[Contract-driven settings sections](015-contract-driven-sections.md).

New domain terms recorded in `CONTEXT.md`: **Platform Owner**, **Applied
Config**, **Activity Type**, and the seven group names under **Config Group**.
