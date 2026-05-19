# iOS Follow-Up Plan — Post-Implementation Resume Notes

> Purpose: capture what remains from the original iOS implementation plan, what was proven in this session, and what should be resumed next.

## Original Plan Status

The original session plan in `/memories/session/plan.md` had six high-level goals:

1. Confirm scope for the first iOS milestone.
2. Reuse the existing Objective-C core from the Cordova plugin.
3. Build a Swift Nitro bridge around that core.
4. Preserve lifecycle behavior internally without exposing Cordova-only APIs.
5. Add iOS build wiring so Swift can interoperate with the copied ObjC core.
6. Validate through the Expo CNG example app on iOS.

### Completed

- Scope was fixed to the full current Nitro iOS surface, with one explicit decision to keep `onActivity` Android-only for now.
- The reusable iOS Objective-C core was copied into `ios/common/BackgroundGeolocation` and treated as the active source of truth.
- The Swift bridge in `ios/NitroBackgroundGeolocation.swift` was implemented against the copied core.
- Internal lifecycle handling was added so iOS foreground/background maps to the native engine without exposing `switchMode()` publicly.
- App terminate handling was wired through `facade.onAppTerminate()`.
- Podspec/build wiring was updated so the Swift bridge can see the copied ObjC core.
- Expo CNG iOS capability wiring was added through `app.plugin.js`, not by editing generated native output.
- The example app builds and runs on iOS.
- The iOS stop bug was fixed in `ios/common/BackgroundGeolocation/MAURBackgroundGeolocationFacade.m`.
- False transient `1003` error paths were reduced in:
  - `ios/common/BackgroundGeolocation/MAURDistanceFilterLocationProvider.m`
  - `ios/common/BackgroundGeolocation/MAURLocationManager.m`

### Not Fully Closed

- Killed-state native persistence on iOS is not yet validated on a **physical device** (simulator results are inconclusive per Apple documentation).

### Resolved Since Original Session

- **Bootstrap shim added** (`ios/NitroBackgroundGeolocationBootstrap.m`): ObjC `+load` class that handles `UIApplicationLaunchOptionsLocationKey` relaunch, foreground/background mode switching, and `onAppTerminate` — all before JS is available.
- **Facade is now a singleton** (`MAURBackgroundGeolocationFacade.sharedInstance`): bootstrap and Swift bridge share the same instance.
- **Lifecycle observers removed from Swift bridge**: `NitroBackgroundGeolocation.swift` no longer registers `NotificationCenter` observers — the bootstrap owns all lifecycle handling.
- **Example app persistence diagnostics added**: on-launch log restore via `getLogEntries()`, status restore via `checkStatus()`, and a "Stored Locations" button showing total/pending-sync counts with recent entries.
- **iOS semantics documented**: `CONTEXT.md` defines "Native Continuation" and explicitly states `stopOnTerminate: false` means native continuation, not headless JS. Cordova parity plan updated with iOS Direction section.
- **Validation workflow**: see `docs/ios-killed-state-validation.md`.

## What This Session Proved

### Verified behavior

- `stopOnTerminate: false` is persisted natively on iOS. The `configuration` table row stored `stop_terminate = 0`.
- The native location database exists and is written at:
  - `Library/cordova_bg_geolocation.db`
- The example app can be installed in a Release build and launched directly by bundle ID.
- After starting tracking, terminating the app, and manually triggering simulator location changes, the location row count did not increase.

### Latest observed result

- Pre-kill database row count: `38`
- Post-kill database row count after simulator location movement: `38`

This means the current iOS implementation is not validated for killed-state persistence in practice.

## Internet Findings To Carry Forward

- Apple documents that `startMonitoringSignificantLocationChanges()` should relaunch a terminated app when a new significant event arrives.
- Apple also documents that this path is coarse and OS-driven: roughly 500m+ movement, not expected more often than about every 5 minutes.
- Developer reports show this area is noisy in practice:
  - some developers report simulator-based success using `Freeway Drive`
  - others report release/device-only failures
  - others report long wake delays after termination even on real devices
- Conclusion: simulator results are useful signals, but they are not conclusive proof either way.

## Remaining Work From The Original iOS Plan

### 1. Finish validation of terminated-state behavior on a physical device

This is the most important remaining item from the original plan's validation step.

- Build and install on a physical iPhone.
- Configure with `stopOnTerminate: false`.
- Start tracking.
- Kill the app.
- Move far enough to trigger significant-change or stationary-region exit logic.
- Re-open the app and compare native DB row count before and after.
- Capture native logs around `onAppTerminate`, `startMonitoringStationaryRegion`, `startMonitoringSignificantLocationChanges`, relaunch, and first persisted row.

Exit criterion:
- A real device shows new rows in `cordova_bg_geolocation.db` after app termination and movement.

### 2. Add a stronger native verification surface to the example app

The current example is weak for post-terminate debugging because JS is gone while the app is dead.

Add a minimal diagnostic surface in `example/src/App.tsx`:

- button to read `getLocations()` count
- button to read `getValidLocations()` count
- log panel entry showing persisted row count after launch
- optional one-shot `checkStatus()` + `getConfig()` diagnostic action

Exit criterion:
- After relaunch, the app can show whether native persistence happened without requiring direct SQLite inspection.

### 3. Re-check the iOS terminate path against the failed persistence result

The native terminate path is implemented, but the failed simulator run means it should be re-audited with fresh eyes.

Focus files:

- `ios/common/BackgroundGeolocation/MAURBackgroundGeolocationFacade.m`
- `ios/common/BackgroundGeolocation/MAURDistanceFilterLocationProvider.m`
- `ios/common/BackgroundGeolocation/MAURLocationManager.m`

Questions to answer:

- Is `onTerminate` always reached on app kill in the current app lifecycle path?
- Does `onTerminate` reliably call `startMonitoringSignificantLocationChanges` when `isStarted && !stopOnTerminate`?
- Is any provider/config state lost before the handoff to significant-change monitoring?
- Does relaunch require additional re-registration earlier in app startup than the current bridge provides?

Exit criterion:
- Either a concrete native bug is identified and patched, or the team has high confidence the remaining gap is simulator/OS behavior rather than library wiring.

### 4. Document the supported iOS semantics clearly

This should be written into README/docs before considering the iOS work truly finished.

Document explicitly:

- `headlessTaskName` is Android-only
- on iOS, `stopOnTerminate: false` means native continuation and possible OS relaunch, not guaranteed JS execution while terminated
- terminated-state wake-up is driven by iOS significant-location/geofence behavior and can be delayed
- simulator validation is advisory; physical device validation is required for confidence

Exit criterion:
- README/docs describe the real platform contract without overpromising killed-state JS behavior on iOS.

### 5. Create a repeatable non-dev-server iOS validation workflow

This session showed that `expo run:ios --configuration Release` still restarted Metro and reopened the dev-client URL, even though the Release app was installed.

Follow-up work:

- document the exact command flow for building Release and then launching the installed bundle directly
- avoid relying on the auto-opened dev-client deep link during terminated-state validation
- record the validation workflow in repo memory/docs for future sessions

Exit criterion:
- A future worker can reproduce the iOS validation flow without rediscovering how to avoid Metro contamination.

## Recommended Resume Order

1. ~~Add the example-app persistence diagnostics.~~ **DONE** — "Stored Locations" button + on-launch log/status restore.
2. ~~Re-audit the iOS terminate path with those diagnostics in place.~~ **DONE** — lifecycle moved to `NitroBackgroundGeolocationBootstrap.m`, facade is singleton.
3. Run the killed-state test on a **physical device**. See `docs/ios-killed-state-validation.md`.
4. ~~Update README/docs with the final supported semantics.~~ **DONE** — `CONTEXT.md` updated, cordova parity plan has iOS Direction section.
5. ~~Record the final iOS validation workflow in repo memory.~~ **DONE** — `docs/ios-killed-state-validation.md`.

## Known Non-iOS Follow-Up Worth Remembering

There are Android-side lifecycle changes already present in the tree that are not build-clean and should not be forgotten when resuming broader parity work. Current editor diagnostics show unresolved compile errors in:

- `android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/NitroBackgroundGeolocation.kt`

Those Android issues are separate from the iOS follow-up above, but they should be treated as existing unfinished work in the repository.
