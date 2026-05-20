---
sidebar_position: 3
---

# Raw Provider

`LocationProvider.RAW` emits location updates as the native sensor delivers them, with minimal provider-side processing. Use this when you want every fix the OS produces, regardless of movement or activity.

## When to use

- Fleet tracking where every position matters
- Mapping or surveying use cases
- Custom filtering on the JS side

## Caveats

- **Battery cost is higher** than `DISTANCE_FILTER` or `ACTIVITY`. Use only when needed.
- Update cadence depends on `interval` and `fastestInterval`.

## Configuration

```ts
import BackgroundGeolocation, {
  LocationProvider,
  LocationAccuracy,
} from 'react-native-nitro-background-geolocation';

await BackgroundGeolocation.configure({
  locationProvider: LocationProvider.RAW,
  desiredAccuracy: LocationAccuracy.HIGH,
  interval: 5000,
  fastestInterval: 5000,
});
```
