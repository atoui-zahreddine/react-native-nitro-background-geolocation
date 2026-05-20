# First-party Headless Task Registration

Replace the user-managed Android headless task name (`headlessTaskName` option + manual `AppRegistry.registerHeadlessTask` call) with a library-owned task and a typed registration API: `BackgroundGeolocation.registerHeadlessHandler(fn)`. The library owns the task name internally; the user only writes a callback.

## Context

Today, enabling killed-state JS execution on Android requires the user to do three coordinated things:

1. Pick a magic string (`"BackgroundLocationTask"`).
2. Pass it as `configure({ headlessTaskName: 'BackgroundLocationTask' })`.
3. Call `AppRegistry.registerHeadlessTask('BackgroundLocationTask', () => async ({ event, params }) => { ... })` at module load time.

Steps 1 and 2 are a string-coupling hazard (typos silently break killed-state execution). Step 3 leaks the framework primitive (`AppRegistry`) into user code and hands the user a raw `params: string` payload they must `JSON.parse`. The decision in [ADR 0001](./0001-functional-parity-not-api-compatibility.md) was to provide an idiomatic Nitro API; the current headless surface fails that bar.

## Decision

Expose a single first-party registration entrypoint:

```ts
BackgroundGeolocation.registerHeadlessHandler(handler);
```

The handler receives a typed discriminated union, so each event type carries its own payload:

```ts
type HeadlessEvent =
  | { event: 'location'; location: Location }
  | { event: 'stationary'; location: StationaryLocation }
  | { event: 'activity'; activity: Activity };

function registerHeadlessHandler(
  handler: (event: HeadlessEvent) => void | Promise<void>
): void;
```

Internally the library:

1. Calls `AppRegistry.registerHeadlessTask(LIB_TASK_NAME, () => async (data) => handler(parse(data)))` where `LIB_TASK_NAME` is a constant the library controls.
2. Persists `LIB_TASK_NAME` to native storage (`HeadlessTaskRegistry`) so the native service knows what task to invoke after killed-state events.
3. Removes the `headlessTaskName` field from the public `ConfigureOptions` surface. (Kept as an internal/persisted value, not user-facing.)

`registerHeadlessHandler` must be called at module load time (top-level in `index.js`), same constraint as today's `AppRegistry.registerHeadlessTask`. Documented prominently.

## Considered Options

- **Keep the current `headlessTaskName` + `AppRegistry` flow.** Lowest churn. Rejected because it shifts framework primitives onto the user and leaves the magic-string typo hazard in place — a recurring DX bug in similar libraries.
- **Library handles killed-state events entirely natively (no JS callback at all).** Killed-state work would be limited to whatever the native side does (HTTP posting, DB writes). Rejected because users routinely want custom JS logic for queueing, dispatching, or local DB writes that aren't a simple HTTP POST.
- **Auto-register a library task only when `stopOnTerminate: false` is set.** Considered, but the registration must happen at JS module load — before `configure()` is ever called. Coupling it to a config flag inverts the time-ordering. Coupling it to the handler call (which is at module load) is correct.

## Consequences

- **Breaking change to the public API surface.** Users on `headlessTaskName` + `AppRegistry.registerHeadlessTask(...)` must migrate. Since the library is pre-1.0 (`0.1.0`) this is acceptable.
- **`registerHeadlessHandler` must run at module load.** Same constraint as `AppRegistry.registerHeadlessTask` today — documented in [Headless Tasks](../../apps/docs/docs/headless-tasks.md).
- **iOS behavior unchanged.** iOS already does not run JS while killed; `registerHeadlessHandler` is a no-op there. Documented in [Platform Quirks](../../apps/docs/docs/platform-quirks.md).
- **`stopOnTerminate: false` without a registered handler** continues to be a valid configuration. The native service keeps running; users drain accumulated locations via `getLocations()` on next launch (the "Native Continuation"-style pattern).
- **Future-friendly to typed payloads.** The wire format between native and JS becomes an internal contract instead of a documented string protocol the user parses.
