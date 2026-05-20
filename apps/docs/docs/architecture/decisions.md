---
sidebar_position: 1
---

# Architecture Decisions

This project records architectural decisions as ADRs in the [`docs/adr/`](https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/tree/main/docs/adr) directory of the repository.

## Current ADRs

- [ADR 0001: Functional parity, not API compatibility](https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/blob/main/docs/adr/0001-functional-parity-not-api-compatibility.md)
- [ADR 0002: Keep original native languages](https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/blob/main/docs/adr/0002-keep-original-native-languages.md)
- [ADR 0003: Monorepo with Yarn workspaces](https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/blob/main/docs/adr/0003-monorepo-with-yarn-workspaces.md)

## Design principles at a glance

- **Functional parity** with `cordova-background-geolocation-plugin`, not 1:1 API compatibility.
- **Idiomatic Nitro Modules API** — sync methods for fast in-memory work, Promises for I/O, typed callbacks for events, TypeScript enums for constants.
- **New Architecture only** — Fabric / TurboModules via Nitro Modules (JSI bridge). No legacy bridge.
- **Native code stays in original languages** — Java (Android) and Objective-C (iOS) core code is kept as-is; only the Nitro bridge layer is written in Kotlin/Swift.
- **Permissions are the user's responsibility** — the library does not auto-include location permissions.
- **Event subscriptions return disposers** — each `onX(callback)` returns a `() => void` to unsubscribe; no string-based event names.
- **Singleton via TypeScript wrapper** — the HybridObject is instantiated once lazily; the TS wrapper exposes a static-style API.
