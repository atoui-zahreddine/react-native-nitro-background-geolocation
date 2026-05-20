---
sidebar_position: 1
---

# Distance Filter Provider

`LocationProvider.DISTANCE_FILTER` is the classic battery-friendly background provider. It uses stationary detection plus an elastic distance filter to balance battery, data usage, and tracking fidelity.

## How it works

- When the device is moving, locations are emitted as it travels at least `distanceFilter` meters between fixes.
- When the device is stationary, the provider switches to lower-power monitoring and emits a `stationary` event.
- When the device moves more than `stationaryRadius` meters from the stationary location, aggressive tracking re-engages.

This is the default provider and the right choice for most apps that need to track a user's movements over time without draining the battery.

## Configuration

```ts
import BackgroundGeolocation, {
  LocationProvider,
  LocationAccuracy,
} from 'react-native-nitro-background-geolocation';

await BackgroundGeolocation.configure({
  locationProvider: LocationProvider.DISTANCE_FILTER,
  desiredAccuracy: LocationAccuracy.HIGH,
  distanceFilter: 50,
  stationaryRadius: 50,
  stopOnTerminate: false,
  startOnBoot: true,
});
```

## Relevant options

- [`distanceFilter`](../configuration#options) — minimum distance between updates.
- [`stationaryRadius`](../configuration#options) — radius before stationary detection triggers.
- [`desiredAccuracy`](../configuration#options) — accuracy tier.

## When not to use it

- If you need updates at a fixed time interval regardless of movement, use [`RAW`](./raw).
- If you want updates only when the user is actively moving (walking, driving), use [`ACTIVITY`](./activity).
