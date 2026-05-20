# First-Party Headless Task Registration — API Sketch

> **Status: ✅ Implemented** — landed in commit `fa00b3a feat(headless): replace user-managed headlessTaskName with first-party API` on branch `chore/monorepo-restructure`. See [ADR 0004](../../adr/0004-first-party-headless-task-registration.md) for the decision rationale.

## TypeScript API surface

```ts
// packages/react-native-nitro-background-geolocation/src/index.tsx

export type HeadlessEvent =
  | { event: 'location'; location: Location }
  | { event: 'stationary'; location: StationaryLocation }
  | { event: 'activity'; activity: Activity };

export type HeadlessHandler = (event: HeadlessEvent) => void | Promise<void>;

/**
 * Register a handler that fires on background geolocation events when
 * the app process is no longer running (Android only).
 *
 * **Must be called at module load time** — top-level in your entry file
 * (e.g. `index.js`), before `registerRootComponent`. The native side
 * spawns a fresh JS context per event and re-runs your entry file to
 * find this registration.
 *
 * iOS does not support killed-state JS execution. On iOS this is a
 * no-op; use `getLocations()` on next app launch instead.
 */
export function registerHeadlessHandler(handler: HeadlessHandler): void;
```

`ConfigureOptions.headlessTaskName` is **removed** from the public type. Internally the library uses a fixed `LIB_TASK_NAME` constant.

## Wiring sketch

```ts
// packages/react-native-nitro-background-geolocation/src/headless.ts (new file)

import { AppRegistry, Platform } from 'react-native';

const LIB_TASK_NAME = '__rn-nitro-bg-geo-headless__';

export function registerHeadlessHandler(handler: HeadlessHandler): void {
  if (Platform.OS !== 'android') return;

  AppRegistry.registerHeadlessTask(LIB_TASK_NAME, () => async (rawData: any) => {
    const event = parseHeadlessPayload(rawData); // typed union
    await handler(event);
  });
}

function parseHeadlessPayload(raw: { event: string; params: string }): HeadlessEvent {
  const params = JSON.parse(raw.params);
  switch (raw.event) {
    case 'location':
      return { event: 'location', location: params as Location };
    case 'stationary':
      return { event: 'stationary', location: params as StationaryLocation };
    case 'activity':
      return { event: 'activity', activity: params as Activity };
    default:
      throw new Error(`Unknown headless event: ${raw.event}`);
  }
}
```

## Native side changes

`NitroBackgroundGeolocation.kt`:

- Remove the `headlessTaskName` resolution from `configure()`.
- Hardcode `LIB_TASK_NAME = "__rn-nitro-bg-geo-headless__"` at the file top.
- The conditional in configure becomes:

```kotlin
if (facade.isRunning) {
    // We always register the library-owned task name. The JS side may
    // or may not have a handler bound; if it doesn't, the headless
    // runner will be a no-op.
    facade.registerHeadlessTask(ReactNativeHeadlessTaskRunner::class.java.name)
}
```

- `HeadlessTaskRegistry.setTaskName(context, LIB_TASK_NAME)` is always set during configure(), so it survives app death.

iOS native code: no change required.

## Migration

Users previously doing:

```ts
// OLD — index.js
import { AppRegistry } from 'react-native';

AppRegistry.registerHeadlessTask(
  'MyTask',
  () => async ({ event, params }) => {
    const parsed = JSON.parse(params);
    console.log(event, parsed);
  }
);

// OLD — App.tsx
await BackgroundGeolocation.configure({
  headlessTaskName: 'MyTask',
  /* ... */
});
```

migrate to:

```ts
// NEW — index.js
import { registerHeadlessHandler } from 'react-native-nitro-background-geolocation';

registerHeadlessHandler((event) => {
  switch (event.event) {
    case 'location':
      console.log(event.location.latitude);
      break;
    case 'stationary':
      console.log(event.location.radius);
      break;
    case 'activity':
      console.log(event.activity.type);
      break;
  }
});

// NEW — App.tsx
await BackgroundGeolocation.configure({
  /* no headlessTaskName */
});
```

## Resolved decisions

- **Single handler with replace semantics.** Calling `registerHeadlessHandler` twice replaces the previous handler. Multi-handler dispatch complicates error handling and lifetime for no real benefit.
- **Dev-mode warning on late registration.** When `__DEV__` is true and `registerHeadlessHandler` is called after the first `AppRegistry.runApplication`, emit `console.warn`. Production builds skip the check.
- **No `headlessTaskName` escape hatch.** The field is removed from `ConfigureOptions` entirely. If a real need surfaces, we re-add as an internal option.

## Out of scope

- Multi-handler dispatch.
- Synchronous vs async return contract (handler may return Promise; native side awaits it within Android's headless task timeout).
- Cross-platform iOS API equivalent — iOS doesn't support killed-state JS; documented as no-op.
