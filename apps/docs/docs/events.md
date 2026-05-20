---
sidebar_position: 4
---

# Events

All event methods take a callback and **return a disposer function** (`() => void`). Call the disposer to remove that specific listener.

```ts
const unsubscribe = BackgroundGeolocation.onLocation((location) => {
  console.log(location);
});

// Later
unsubscribe();
```

Use [`removeAllListeners()`](#removealllisteners) to clear every listener at once.

## Available events

| Method | Callback Signature | Description |
|---|---|---|
| `onLocation` | `(location: Location) => void` | Fired on each location update. |
| `onStationary` | `(location: StationaryLocation) => void` | Fired when the device becomes stationary. |
| `onActivity` | `(activity: Activity) => void` | Fired when detected activity changes. **Android only.** |
| `onStart` | `() => void` | Fired when tracking starts. |
| `onStop` | `() => void` | Fired when tracking stops. |
| `onError` | `(error: BackgroundGeolocationError) => void` | Fired on errors. |
| `onAuthorization` | `(status: AuthorizationStatus) => void` | Fired when authorization status changes. |
| `onForeground` | `() => void` | Fired when the app enters the foreground. **Android only.** |
| `onBackground` | `() => void` | Fired when the app enters the background. **Android only.** |
| `onAbortRequested` | `() => void` | Fired when the server signals that updates are not required. |
| `onHttpAuthorization` | `() => void` | Fired on HTTP authorization errors during posting. |

## Payload types

### Location

```ts
interface Location {
  id: number;
  provider: string;          // 'gps' | 'network' | 'passive' | 'fused'
  locationProvider: number;
  time: number;              // Unix ms
  latitude: number;
  longitude: number;
  accuracy: number;          // meters
  speed: number;             // m/s
  altitude: number;          // meters
  altitudeAccuracy: number;
  bearing: number;           // degrees
  isFromMockProvider: boolean;     // Android only
  mockLocationsEnabled: boolean;   // Android only
}
```

### StationaryLocation

Same as `Location` plus a `radius: number` (meters) that defines the stationary region.

### Activity

```ts
interface Activity {
  confidence: number;        // 0–100
  type: string;              // IN_VEHICLE | ON_BICYCLE | ON_FOOT | RUNNING | STILL | TILTING | UNKNOWN | WALKING
}
```

### BackgroundGeolocationError

```ts
interface BackgroundGeolocationError {
  code: number;
  message: string;
}
```

## removeAllListeners

```ts
BackgroundGeolocation.removeAllListeners();
```

Clears every listener registered through the event methods above. Use this in a tear-down path (component unmount, app close) when you don't track individual disposers.
