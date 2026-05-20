---
sidebar_position: 6
---

# Headless Tasks

Headless tasks run when the app process has been killed but background tracking continues. The native service spins up a lightweight JS context to execute the registered handler on each location, stationary, or activity event.

> **Platform:** Android only. iOS does not support killed-state JS execution — see [Native Continuation](./platform-quirks#ios-native-continuation) for the iOS pattern.

## How it works

When the app is killed but `stopOnTerminate: false` is set and you've called `registerHeadlessHandler`:

1. The Android service keeps tracking.
2. On each event, the service starts a fresh JS context.
3. It invokes your handler with a typed `HeadlessEvent` payload.

## Registration

Call `registerHeadlessHandler` **at module load** in your entry file — top-level, before `registerRootComponent` (Expo) or `AppRegistry.registerComponent` (bare RN). The native service re-runs your entry file in a fresh JS context per event; if registration is gated behind a React effect or any async work, it arrives too late.

```ts
// index.js
import { registerRootComponent } from 'expo';
import { registerHeadlessHandler } from 'react-native-nitro-background-geolocation';

import App from './src/App';

registerHeadlessHandler(async (event) => {
  switch (event.event) {
    case 'location':
      console.log('Location:', event.location.latitude, event.location.longitude);
      break;
    case 'stationary':
      console.log('Stationary:', event.location.radius);
      break;
    case 'activity':
      console.log('Activity:', event.activity.type);
      break;
  }
});

registerRootComponent(App);
```

The handler receives a typed discriminated union — narrow on `event.event` to access the correct payload.

```ts
type HeadlessEvent =
  | { event: 'location'; location: Location }
  | { event: 'stationary'; location: StationaryLocation }
  | { event: 'activity'; activity: Activity };
```

## Configuration

Nothing extra to set. As long as `stopOnTerminate: false` is configured, the library wires up the rest:

```ts
await BackgroundGeolocation.configure({
  stopOnTerminate: false,
  startOnBoot: true,
  // ... other options
});
```

> The library owns the headless task name internally — you do not pass a `headlessTaskName` option. The library registers `AppRegistry.registerHeadlessTask` against its own internal name when you call `registerHeadlessHandler`.

## Calling `registerHeadlessHandler` more than once

The latest call replaces the previous handler. There is one active handler at a time.

## Headless handler vs onLocation

Both fire simultaneously when the app is alive. The headless handler additionally fires when the app is killed.

| | `onLocation` | Headless handler |
|---|---|---|
| App foreground | Fires | Fires |
| App background | Fires | Fires |
| App killed | Does not fire | Fires (Android only) |
| Use case | UI updates, in-app logic | Background persistence, server sync |

## Constraints

- The headless handler runs in a fresh, short-lived JS context. Module-level state from your running app is **not** available.
- Long-running async work may be killed by the OS. Keep handlers fast (sub-second).
- If you only need to POST to a server, the plugin's built-in [HTTP posting](./http-posting) is usually a better fit — no JS round-trip required.

## Without a handler

`stopOnTerminate: false` is a valid configuration without `registerHeadlessHandler`. The native service keeps running and persisting locations; on the next app launch, drain them via `getLocations()` or `getValidLocationsAndDelete()`. This matches the iOS [Native Continuation](./platform-quirks#ios-native-continuation) pattern.
