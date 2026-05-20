---
sidebar_position: 6
---

# Headless Tasks

Headless tasks run when the app process has been killed but background tracking continues. The native service spins up a lightweight JS context to execute the registered task with each location, stationary, or activity event.

> **Platform:** Android only in the first milestone. iOS does not support killed-state JS execution — see [Native Continuation](./platform-quirks#ios-native-continuation) for the iOS pattern.

## How it works

When the app is killed but `stopOnTerminate: false` is set:

1. The Android service keeps tracking.
2. On each event, the service spins up a JS context.
3. It invokes the headless task you registered under `headlessTaskName`.
4. The task receives `{ event, params }` where `event` is `"location"`, `"stationary"`, or `"activity"` and `params` is the serialized payload.

## Registration

Register the task in your entry file **before** `registerRootComponent` (Expo) or before `AppRegistry.registerComponent` (bare RN).

### Bare React Native

```ts
// index.js
import { AppRegistry } from 'react-native';

AppRegistry.registerHeadlessTask(
  'BackgroundLocationTask',
  () => async ({ event, params }) => {
    console.log('Headless event:', event, params);
    // Persist or POST as needed
  }
);
```

### Expo (with expo-task-manager)

```ts
// index.js or App.tsx — must run at module load
import { AppRegistry } from 'react-native';

AppRegistry.registerHeadlessTask(
  'BackgroundLocationTask',
  () => async ({ event, params }) => {
    console.log('Headless event:', event, params);
  }
);
```

The library does not depend on `expo-task-manager` — you can also use `TaskManager.defineTask` if you prefer the Expo API.

## Configure with the task name

```ts
await BackgroundGeolocation.configure({
  headlessTaskName: 'BackgroundLocationTask',
  stopOnTerminate: false,
  startOnBoot: true,
});
```

The name must match what you passed to `registerHeadlessTask`.

## Headless vs onLocation

Both fire simultaneously when the app is alive. The headless task additionally fires when the app is killed.

| | `onLocation` | Headless Task |
|---|---|---|
| App foreground | Fires | Fires |
| App background | Fires | Fires |
| App killed | Does not fire | Fires (Android only) |
| Data | Typed `Location` object | `{ event, params }` |
| Use case | UI updates, in-app logic | Background persistence, server sync |

## Constraints

- Each headless task invocation runs in a short-lived JS context. Don't rely on module-level state surviving between events.
- Long-running async work may be killed by the OS. Keep tasks fast (sub-second).
- If you need to post to a server, the plugin's built-in [HTTP posting](./http-posting) is usually a better fit — no JS round-trip required.
