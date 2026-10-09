---
id: 016
title: On-device harness for the nitro configuration surface
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: [003]
---

## Question

Nothing to decide — stand up the second test tier, the one that exercises the
HybridObject itself on a simulator and an emulator. Every group slice on this map
asserts "configuring and reading back these fields works on a device", and that
is a manual check today.

Surfaced while resolving
[Test harness for the library package](003-package-test-harness.md), whose
criteria explicitly excluded a device, so the Node tier could not cover this.

Prior art: `react-native-mmkv` runs both tiers — `test: jest` in Node plus
`test:harness: react-native-harness` on real environments, with tests in
`example/__tests__/MMKV.harness.ts`, driven by `rn-harness.config.mjs`. Callstack
reports it found two previously unnoticed bugs on first integration.

Done when:

- `react-native-harness` runs against `apps/example` on an iOS simulator and an
  Android emulator, invoked by a documented command and wired into the Turborepo
  graph as a task distinct from `test`, so the Node tier stays device-free
- at least one harness test exercises the real configuration round trip:
  `configure()` a field, `getConfig()` it back, assert the value
- a foreign-owned write is asserted to be dropped, and the foreign field is
  asserted to read as its contract default per
  [the read decision](014-foreign-platform-reads.md)
- the resolution records the invocation, where harness tests live, and whether CI
  can run them, so the group slices can replace their manual device criteria with
  harness assertions

Note the ordering risk: the round-trip assertions this ticket wants are most
valuable *after* the contract exists, but standing the harness up first means the
group slices inherit an automated device check instead of a manual one. Doing it
before [the HTTP group](008-http-group.md) is the intent; it does not block it.

## Resolution

## Resolution

**The device tier runs, and it found two bugs on its first runs.** Eight harness
tests pass on an Android emulator and eight on an iOS simulator.

### Invocation

| | |
| --- | --- |
| Tool | `react-native-harness` 1.5.0 with `@react-native-harness/platform-android` and `platform-apple`, plus `jest` (the harness runner is Jest-based; the Node tier stays on Vitest) |
| Config | `apps/example/rn-harness.config.mjs`, `apps/example/jest.harness.config.mjs` |
| Tests live in | `apps/example/__tests__/*.harness.ts` |
| Run, app | `yarn workspace react-native-nitro-background-geolocation-example test:harness:ios` / `test:harness:android` |
| Run, root | `yarn turbo run test:harness` — an uncached task separate from `test`, so the Node tier stays device-free |
| Devices | iPhone 16 Pro / iOS 18.6 and the `bumbal-proof-api36-16kb` AVD by default; override with `HARNESS_IOS_DEVICE`, `HARNESS_IOS_VERSION`, `HARNESS_ANDROID_AVD` |

The harness uses the installed debug build, so build and install the app first
(`expo run:ios` / `expo run:android`, or the `xcodebuild` / `installDebug`
commands).

### What the tests assert

`__tests__/config.harness.ts` drives the real HybridObject:

- a shared field round-trips (`tracking.distanceFilter`, `tracking.desiredAccuracy`,
  `http.url`, `http.syncThreshold`);
- omitting a field leaves it unchanged;
- passing the published default resets a field (`activity.activitiesInterval` —
  the field the inverted iOS guard used to pin);
- `null` is a value on `httpHeaders` and `postTemplate`, and reads back as `null`;
- **every scalar field the platform owns round-trips** a non-default value, driven
  from `CONFIG_FIELDS` — this is what catches a missing native storage slot on
  iOS, where the build does not;
- every field of every group is present on a read;
- **a foreign write is dropped and every foreign field reads as its contract
  default**, driven from `CONFIG_FIELDS` so it covers whichever fields the running
  platform does not own.

The group slices' "works on a device" criteria are these assertions.

### Bugs it found

1. **Android read a `null` `httpHeaders` back as `{}`** — `Config.getHttpHeaders()`
   replaces unset headers with an empty map. The converter now reports empty as
   `null`.
2. **iOS did the same, and replaced a `null` `postTemplate` with the default
   template.** Fixed in the Swift converter, so both platforms agree.

### Setup costs, recorded

- **Expo serves from the monorepo root**, but the harness requests the entry
  bundle relative to the app, so the app never got a bundle. `metro.config.js`
  scopes `server.unstable_serverRoot` to the app only when `RN_HARNESS` is set.
- **The babel preset** `react-native-harness/babel-preset` is added; it is a
  no-op outside a harness run.
- **expo-dev-client shows its launcher** on launch. Its default `most-recent`
  mode reconnects to the last server, so a device only needs to be pointed at
  `localhost:8081` once. SDK 55's plugin has no default-URL option; while a run
  waits for Metro, open
  `exp+react-native-nitro-background-geolocation-example://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081`
  (`xcrun simctl openurl` / `adb shell am start -d`) to do it without a tap.
- **A stale APK can crash at launch** (`ClassNotFoundException` for an Expo
  class) and the harness reports it only as "crashed while preparing". Reinstall
  with `installDebug` before suspecting the tests.
- **Xcode 27 needs Expo SDK 57.** On SDK 55 it rejects pods that declare iOS 9.0
  or 13.4, and expo-router calls iOS 16 APIs while declaring 15.1. The example
  app is on SDK 57 (React Native 0.86.3, nitro 0.37.1), where every pod is at 15.1
  or above and the app at 16.4, so a plain prebuild builds. Run prebuild with the
  project's CLI (`yarn expo prebuild`): `npx expo` can pick up an old global
  `expo-cli`, which fails on the maplibre plugin.

### CI

Not wired yet. It is possible — the harness ships a GitHub Action and a `--ci`
mode — but it needs a macOS runner with a booted simulator, an Android emulator
runner, a debug build per platform, and the dev-client priming step above. That
is its own piece of work.
