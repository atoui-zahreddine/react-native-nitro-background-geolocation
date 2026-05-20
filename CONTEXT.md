# Background Geolocation — Domain Language

## Glossary

| Term | Definition |
|---|---|
| **Location** | A geographic position fix with coordinates, accuracy, speed, altitude, bearing, and timestamp. |
| **Stationary Location** | A Location with an additional radius, representing where the device is considered "at rest." |
| **Location Provider** | The strategy used to determine location updates: Distance Filter, Activity-based, or Raw. |
| **Distance Filter Provider** | Tracks location by requiring the device to move a minimum distance before firing an update. |
| **Activity Provider** | Uses activity recognition (walking, driving, still) to adjust tracking aggressiveness. Android only. |
| **Raw Provider** | Emits location updates at a fixed time interval regardless of movement or activity. |
| **Stationary Radius** | The minimum distance (meters) the device must move beyond a stationary location before aggressive tracking re-engages. |
| **Foreground Mode** | Plugin operation mode when the app is visible to the user. |
| **Background Mode** | Plugin operation mode when the app is not visible. Core purpose of the library. |
| **Headless Task** | Code that executes when the app process has been killed but background tracking continues (Android). |
| **Native Continuation** | iOS behavior where native location monitoring continues after app termination and persisted data may become available after a location-triggered relaunch, without killed-state JS execution. |
| **Sync** | The process of batching and POSTing stored locations to a configured server URL. |
| **Force Sync** | Immediately posts all pending locations, ignoring the sync threshold. |
| **Sync Threshold** | Number of pending locations that triggers an automatic sync batch. |
| **Post Template** | A customizable JSON template controlling the shape of HTTP POST bodies sent during sync. |

## Repository Structure

**Monorepo**:
A multi-workspace repository managed by Yarn workspaces and Turborepo, containing the library, example app, and documentation site.
_Avoid_: single-package repo, flat repo

**Package**:
A publishable npm library workspace living under `packages/`. Currently only `react-native-nitro-background-geolocation`.
_Avoid_: module (ambiguous with Nitro Modules)

**App**:
A non-publishable workspace under `apps/` — the example React Native app or the Docusaurus docs site.
_Avoid_: project, demo

## Design Principles

- **Functional parity with cordova-background-geolocation-plugin** — every capability is available, but the API is not a 1:1 copy.
- **Idiomatic Nitro Modules API** — sync methods for fast in-memory operations, Promises for I/O, typed callbacks for events, TypeScript enums for constants.
- **New Architecture only** — targets React Native's new architecture (Fabric/TurboModules) via Nitro Modules (JSI bridge). No Legacy Bridge support.
- **Cordova patterns mostly dropped** — no callback+promise dual signatures, no string-eval headless tasks, no manual background task start/end, no manual foreground/background switching (detected automatically via app lifecycle). Android settings-opening helpers are exposed because the native core already supports them and they close a real parity gap.
- **Copied native code** — the Cordova plugin's `common/` native code (core logic) is copied into the Nitro module. The Cordova-specific bridge wrappers (`CDVBackgroundGeolocation`) are replaced with Nitro HybridObject implementations. The Cordova plugin directory is a reference, not a build dependency.
- **Singleton via TypeScript wrapper** — the HybridObject is instantiated once lazily; a TypeScript wrapper exposes a static-style API (`BackgroundGeolocation.start()`).
- **Headless tasks are Android-only in the first milestone** — the native side fires headless JS events on Android using the task name from `headlessTaskName`. Users register handlers via `AppRegistry.registerHeadlessTask` (bare RN) or `TaskManager.defineTask` (Expo). The library does not depend on either runtime, and iOS does not promise killed-state JS execution.
- **iOS `stopOnTerminate: false` means native continuation, not headless JS** — on iOS, the library follows Cordova-style semantics: native monitoring may continue after termination and the app may be relaunched by a location event, but JS is expected to inspect persisted native state after relaunch rather than run while the app is terminated.
- **Permissions are the user's responsibility** — the library does not auto-include location permissions. Users declare them in `AndroidManifest.xml` and `Info.plist`.
- **Native code stays in original languages** — Java (Android) and Objective-C (iOS) core code is kept as-is. Only the Nitro bridge layer is written in Kotlin/Swift. Gradual migration may happen over time.
- **Event subscriptions return disposers** — each `onX(callback)` method returns a `() => void` function to unsubscribe. No string-based event names.
- **Constants are TypeScript enums** — `LocationProvider`, `LocationAccuracy`, `AuthorizationStatus`, etc. are enums generated by Nitrogen, not properties on the HybridObject.
- **Typed where possible, AnyMap where necessary** — `httpHeaders` uses `Record<string, string>`, `postTemplate` uses `AnyMap` (arbitrary user-defined JSON shape).
- **Debug sounds kept** — `debug: true` config option emits audible sounds for lifecycle events during field testing.