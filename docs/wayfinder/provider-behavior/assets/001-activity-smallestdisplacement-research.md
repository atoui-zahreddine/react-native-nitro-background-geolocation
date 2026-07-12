# Research: the commented-out `setSmallestDisplacement` in `ActivityRecognitionLocationProvider`

Date: 2026-07-12
Scope: `packages/.../com/marianhello/bgloc/provider/ActivityRecognitionLocationProvider.java`, line ~118.

## Summary (the answer)

The commented line reads `// .setSmallestDisplacement(mConfig.getStationaryRadius());` — it references
**`stationaryRadius`** (default 50 m), **not** `distanceFilter`. It was deliberately disabled upstream by
Marian Hello on 2015-10-22 (released in mauron85 cordova plugin **v0.7.1**, commit `10503ed`) with the commit
message *"Android ANDROID_FUSED_LOCATION ditching setSmallestDisplacement(stationaryRadius) (seems buggy)"*.
So the removal was an **empirical bug workaround** ("seems buggy"), **not** a documented, reasoned design
statement that activity-driven updates should never be displacement-gated — the commit gives no precise
mechanism, and I found no issue thread pinning down the exact bug. `setSmallestDisplacement` is a hard
minimum-distance gate on the fused provider: while it is set, no location callback fires until the device has
physically moved that far, which is exactly the kind of behavior that would starve an activity-driven provider
that also self-stops on a STILL activity. Recommendation below leans toward **keeping it disabled** and
documenting why.

Confidence: origin commit and config-value identification are **documented fact** (verified in git history).
The *reason* beyond "seems buggy" is **inference**, stated as such.

---

## 1. Upstream history — why was it disabled?

### What the current code shows (documented fact)
`ActivityRecognitionLocationProvider.startTracking()` in this repo:

```java
LocationRequest locationRequest = LocationRequest.create()
        .setPriority(priority) // this.accuracy
        .setFastestInterval(mConfig.getFastestInterval())
        .setInterval(mConfig.getInterval());
// .setSmallestDisplacement(mConfig.getStationaryRadius());
```

The argument is `mConfig.getStationaryRadius()`. **Factual correction confirmed: it is `stationaryRadius`,
NOT `distanceFilter`.** (Source: this repo, `ActivityRecognitionLocationProvider.java:114-118`.)

### The identical line exists in the canonical upstream (documented fact)
`mauron85/background-geolocation-android` (the shared Android lib both the RN and Cordova wrappers depend on)
carries the same commented line, same `getStationaryRadius()` argument.
(Source: `github.com/mauron85/background-geolocation-android/blob/master/src/main/java/com/marianhello/bgloc/provider/ActivityRecognitionLocationProvider.java`.)

That repo's history does not explain the removal — its **first commit** is `2d2938d` (2018-02-28), a
restructure that imported the file already commented-out. `git log -L` on the line bottoms out at that
file-creation boundary. So the origin predates this repo. (Source: local clone; `git log --reverse`, `git log -L`.)

### The origin commit (documented fact)
The line was **actively removed and commented out** one layer up, in
`mauron85/cordova-plugin-background-geolocation`:

- Commit **`10503ed6e9fd884ba982e1c614b22d2bc407929d`**, author Marian Hello, date **2015-10-22**.
- Subject: **"Android ANDROID_FUSED_LOCATION ditching setSmallestDisplacement(stationaryRadius) (seems buggy)"**.
- `CHANGES.md` records it under **`[0.7.1] - 2015-10-21`**: *"Android ANDROID_FUSED_LOCATION ditching
  setSmallestDisplacement(stationaryRadius) (seems buggy)"*.
- At that time the class was named **`FusedLocationService.java`** (the `ANDROID_FUSED_LOCATION` provider);
  it was later renamed `ActivityRecognitionLocationProvider` during the android-lib refactor. The diff:

```diff
-                    .setPriority(translateDesiredAccuracy(config.getDesiredAccuracy())) // this.accuracy
+                    .setPriority(priority) // this.accuracy
                     .setFastestInterval(config.getFastestInterval())
-                    .setInterval(config.getInterval())
-                    .setSmallestDisplacement(config.getStationaryRadius());
+                    .setInterval(config.getInterval());
+                    // .setSmallestDisplacement(config.getStationaryRadius());
```

(Source: local clone of `mauron85/cordova-plugin-background-geolocation`; `git show 10503ed`,
`CHANGES.md:469`.)

### Interpretation
- **Documented:** the disable was intentional, made by the maintainer, and attributed to buggy behavior.
- **Not documented:** the specific bug. "(seems buggy)" is the only rationale on record. There is no linked
  issue, test case, or description of *how* it misbehaved (e.g., points dropped, provider stuck, no updates
  while stationary). I searched issue threads and did not find a definitive one; `mauron85/cordova-plugin-
  background-geolocation#656` mentions tracking dropping out after ~20-30 min stationary and crashes in
  `startTracking`, but it does **not** discuss `setSmallestDisplacement` and postdates the change — so it is
  **not** evidence for the 2015 removal.
- **Inference (stated as inference):** given how `setSmallestDisplacement` works (Section 2), the most likely
  "bug" was that setting a nonzero displacement gate on the fused provider suppressed location callbacks when
  the user was stationary or moving slowly — the provider would appear to "miss points" or hang. This fits the
  maintainer's terse "seems buggy" and the general fused-provider gotcha, but I cannot prove it was the exact
  reason.

### Note on the christocracy original
The original `christocracy/cordova-plugin-background-geolocation` repo is now effectively empty (only a
`README.md`; the project became the commercial Transistor Software product), so its pre-2015 Android history
is not publicly retrievable. I therefore **cannot** confirm whether the line was ever active in Chris Scott's
original or was a mauron85 addition later ditched. What is verifiable is that in the mauron85 lineage the line
was active until v0.7.1 and commented out from then on. (Source: `github.com/christocracy/cordova-plugin-background-geolocation` — README-only.)

---

## 2. Fused-location behavior — implications of enabling it

### `stationaryRadius` vs `distanceFilter` in this library (documented fact)
From this repo's `Config.java` and upstream README:

- `stationaryRadius` (`Float`, default **50 m**): *"When stopped, the minimum distance the device must move
  beyond the stationary location for aggressive background-tracking to engage."* It is the radius of a
  stationary region and, per the docs, **applies to the `DISTANCE_FILTER_PROVIDER`**, not the activity/fused
  provider. (Source: upstream `README.md:243`, `DISTANCE_FILTER_PROVIDER.md:3`; `Config.java` defaults
  `stationaryRadius = 50f`.)
- `distanceFilter` (`Integer`, default **500 m**): *"The minimum distance (measured in meters) a device must
  move horizontally before an update event is generated."* This is the true minimum-displacement concept.
  (Source: upstream `README.md:245`; `Config.java` defaults `distanceFilter = 500`.)

So the commented call fed the **stationary-region radius (50 m)** into a **minimum-displacement** API — a
semantic mismatch. The parameter whose *meaning* matches `setSmallestDisplacement` is `distanceFilter`, yet the
code used `stationaryRadius`. Even ignoring the "buggy" claim, the wiring was arguably wrong.

### What `setSmallestDisplacement` does (documented fact)
`com.google.android.gms.location.LocationRequest.setSmallestDisplacement(float smallestDisplacementMeters)`
(newer equivalent: `LocationRequest.Builder.setMinUpdateDistanceMeters(float)`): *"Sets the minimum
displacement between location updates in meters. By default this is 0."* It is an **additional filter layered
on top of the time interval**: even after `interval`/`fastestInterval` elapses, the fused provider will not
deliver a location callback unless the device has moved at least the configured distance from the last
delivered fix. (Source: Google Play Services `LocationRequest` reference,
`developers.google.com/android/reference/com/google/android/gms/location/LocationRequest`; corroborated by
multiple SDK mirrors reproducing the same javadoc. The official page is JS-rendered and could not be scraped
verbatim; the "By default this is 0" wording is the canonical GMS javadoc.)

Interaction with the other request fields:
- `setInterval` / `setFastestInterval` set the **time** cadence; `setSmallestDisplacement` adds a **distance**
  precondition. Updates arrive no faster than `fastestInterval` **and** only after moving ≥ displacement.
  (Documented behavior / inference from the two contracts.)
- `setPriority` governs which sensors/accuracy are used; it does not remove the displacement gate. With low
  power / balanced priority, position noise can be large relative to a 50 m gate, making update timing erratic.
  (Inference from documented priority semantics.)

### Known gotchas (documented + inference)
- **Stationary / slow movement:** with a nonzero displacement, a stationary device produces **no** updates,
  and a slow walker gets updates only sporadically once the threshold is crossed. This is the well-known fused
  gotcha and the most plausible "seems buggy" symptom. (Documented behavior; the *link* to the 2015 removal is
  inference.)
- **Compounding with this provider's STILL logic:** `onLocationChanged` here calls `handleStationary(location)`
  **and `stopTracking()`** when `lastActivity == STILL` (`ActivityRecognitionLocationProvider.java:98-102`), and
  the activity receiver restarts tracking only on a non-STILL detected activity (`:258-265`). If
  `setSmallestDisplacement` were enabled, the two gates would **compound**: after a stop, the fused provider is
  torn down; when activity resumes, tracking restarts but the *first* fixes near the old position could be
  swallowed by the displacement gate until the user moves ≥ threshold — delaying the very re-engagement the
  activity signal is meant to trigger, and risking dropped points during slow starts. (Inference grounded in
  the file's control flow + documented displacement semantics.)
- **Doze / background:** in Doze/background the OS already batches and throttles fused updates; adding a
  displacement gate stacks another suppression on top, which can make "no updates for a long time while parked"
  worse. (Inference from documented Doze behavior; not tied to a specific cite for this library.)

---

## 3. Recommendation for the decision ticket

The human decides; here are the tradeoffs plainly.

**Option A — leave it disabled (recommended default), and document it.**
- Rationale: the activity/fused provider is intentionally **time- and activity-driven**. It relies on
  `interval`/`fastestInterval` for cadence and on the ActivityRecognition STILL/active signal for start/stop.
  A displacement gate is redundant with, and can fight, that model (Section 2). The upstream maintainer already
  ditched it as "buggy," and the argument that was wired (`stationaryRadius`, a stationary-region radius) is
  semantically the wrong knob for `setSmallestDisplacement` anyway.
- Cost: no server-side de-duplication of near-stationary points at the provider level; consumers who want
  distance-based thinning must do it downstream (or use the `DISTANCE_FILTER_PROVIDER`, which is the provider
  actually designed around `stationaryRadius`/`distanceFilter`).
- Action: replace the dangling comment with a short doc note ("displacement filtering intentionally not applied
  in the activity provider; it is time/activity-driven — use DISTANCE_FILTER_PROVIDER or downstream filtering
  for distance thinning") so future readers don't re-enable it blindly.

**Option B — enable `setSmallestDisplacement`, but only with `distanceFilter` (not `stationaryRadius`).**
- If distance-based thinning on this provider is genuinely wanted, the correct config value is **`distanceFilter`**
  (the documented minimum-displacement knob), **not** `stationaryRadius`. Re-using `stationaryRadius` would
  repeat the original mistake.
- Cost / risk: reintroduces the stationary/slow-move suppression and the compounding with the STILL-stop logic
  (Section 2). Needs on-device testing (stationary, slow walk, stop→resume) before shipping. Given Doze
  stacking, expect longer gaps when parked.
- Only choose this if product needs provider-level distance thinning AND accepts the suppression behavior.

**Not recommended:** enabling it with `stationaryRadius` as written — wrong semantics and the exact form the
maintainer flagged as buggy.

---

## Sources

- This repo: `ActivityRecognitionLocationProvider.java:98-102, 114-118, 258-265`; `Config.java` (`stationaryRadius`,
  `distanceFilter`, defaults `50f` / `500`, `DISTANCE_FILTER_PROVIDER=0`, `ACTIVITY_PROVIDER=1`).
- `mauron85/cordova-plugin-background-geolocation`: commit `10503ed` (2015-10-22, "ditching
  setSmallestDisplacement(stationaryRadius) (seems buggy)"); `CHANGES.md` `[0.7.1] - 2015-10-21`;
  `README.md:243,245`; `DISTANCE_FILTER_PROVIDER.md:3`.
- `mauron85/background-geolocation-android`: first commit `2d2938d` (2018-02-28) imports the file already
  commented; master `.../provider/ActivityRecognitionLocationProvider.java`.
- `mauron85/cordova-plugin-background-geolocation` issue #656 (crashes / stationary dropout — NOT about
  smallestDisplacement, postdates the change; cited only to rule out).
- `christocracy/cordova-plugin-background-geolocation`: README-only today; original Android history not
  publicly retrievable.
- Google Play Services `LocationRequest` reference (`developers.google.com/android/reference/com/google/android/gms/location/LocationRequest`,
  `setSmallestDisplacement` / `LocationRequest.Builder.setMinUpdateDistanceMeters`): "minimum displacement
  between location updates in meters. By default this is 0." (page JS-rendered; wording is canonical GMS javadoc,
  corroborated across SDK mirrors).
