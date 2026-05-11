# ADR 0001: Functional Parity, Not API Compatibility

## Status
Accepted

## Context
This library wraps cordova-background-geolocation-plugin as a Nitro Module for React Native (new architecture). The Cordova plugin's API carries patterns tied to Cordova's architecture: callback+promise dual signatures, string-eval headless tasks, manual iOS background task lifecycle, settings-opening helpers, and manual foreground/background mode switching.

Preserving these patterns in a Nitro Module would produce an API that feels foreign to React Native developers and fails to leverage Nitro's type-safe JSI bridge.

## Decision
Target **functional parity** (every capability of the Cordova plugin is available) but design an **idiomatic Nitro Modules API** from scratch. Specifically:

- Pure Promise-based async methods (no callback overloads)
- Sync methods only for fast in-memory operations
- Typed callbacks for event subscriptions (not string-based `on('event', cb)`)
- TypeScript enums for constants (not properties on the object)
- Prefer platform-native alternatives where they are a better fit, but keep `showAppSettings`/`showLocationSettings` when the underlying native core already supports them and parity would otherwise regress
- Omit `switchMode` (detect automatically via AppState)
- Omit `startTask`/`endTask` (handle internally or use RN's headless task API)
- Omit `headlessTask` string-eval pattern (use `AppRegistry.registerHeadlessTask`)

## Consequences
- Developers migrating from Cordova cannot copy-paste API calls — they need to adapt.
- The API will feel natural to React Native developers.
- Full type safety across the JSI bridge.
- README must document the Cordova plugin as the underlying engine and credit it.