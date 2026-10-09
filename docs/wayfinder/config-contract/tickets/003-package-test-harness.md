---
id: 003
title: Test harness for the library package
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: []
---

## Question

Nothing to decide — the library package has no test runner at all, and every
execution slice on this map claims to be tested. Stand the harness up first.

Done when:

- a test command runs inside the library package and is wired into the Turborepo
  task graph, so it runs from the repo root too
- at least one real test passes against existing code, not a placeholder — the
  headless payload parser is the obvious first target, since it is pure and
  currently unguarded
- the harness runs with no device, simulator or native build

Record in the resolution: the runner chosen, how it is invoked, and where tests
live, so later slices do not each re-invent a convention.

## Resolution

**Runner: Vitest 4.1.10, matching the example app exactly.** The package had no
runner, but the repo already had a convention — `apps/example` runs Vitest with
`test: "vitest run"`, `environment: 'node'` and an
`src/**/__tests__/**/*.test.ts` include. The library now mirrors it rather than
introducing a second style.

### Conventions later slices should follow

| | |
| --- | --- |
| Runner | `vitest` `^4.1.10`, devDependency of the library package |
| Invoke, package | `yarn workspace react-native-nitro-background-geolocation test` (`test:watch` for the loop) |
| Invoke, repo root | `yarn turbo run test` — runs the library and the example app together |
| Tests live in | `packages/react-native-nitro-background-geolocation/src/__tests__/<module>.test.ts` |
| Config | `packages/react-native-nitro-background-geolocation/vitest.config.ts` |
| Globals | none — import `describe` / `it` / `expect` / `vi` from `vitest` explicitly |
| `__DEV__` | injected by `define: { __DEV__: 'true' }`, since Metro is not there to provide it |
| Mocking native | `vi.mock('react-native', …)` with `vi.hoisted` for the shared spies |

`turbo.json` gained a `test` task with `src/**`, `vitest.config.ts` and
`package.json` as inputs and no outputs, so it caches on source changes and runs
from the root.

### The real test that passes

`src/__tests__/headless.test.ts` — 7 tests, 138 ms, no device, no simulator, no
native build. It covers `registerHeadlessHandler` and the payload parser through
the public API rather than by exporting an internal:

- registration uses `HEADLESS_TASK_NAME`, asserted against the literal the
  Kotlin side matches on
- iOS is a no-op
- all three event discriminants (`location`, `stationary`, `activity`) parse and
  narrow
- an unknown event rejects instead of delivering a wrong shape
- malformed JSON propagates rather than being swallowed

### Publishing stays clean

`tsconfig.build.json` excludes `src/**/__tests__/**`, and
`react-native-builder-bob` already excludes test directories from the module
target — a full `prepare` compiled 3 files and emitted nothing under `lib`
matching `__tests__`. Nitrogen re-ran with zero diff.

### What this harness deliberately does not cover

Native behaviour. Every group slice on this map asserts that configuring and
reading back works *on a device*, and that is manual today — the example app's
own Vitest config says as much in a comment: only the pure-TS tracking pipeline
is unit-tested, "screens and native integration are exercised on-device". The
peer that solved this is `react-native-mmkv`, which runs both tiers: `test:
jest` in Node plus `test:harness: react-native-harness` on simulators and
emulators, with tests in `example/__tests__/MMKV.harness.ts`. That second tier is
now its own ticket,
[On-device harness for the nitro configuration surface](016-device-harness.md).
