---
sidebar_position: 2
---

# Activity Provider

`LocationProvider.ACTIVITY` is an activity-aware provider that combines fused location updates with Android's activity recognition API. It tracks more aggressively when the device is moving (walking, driving) and less when it's still.

## Platform

- **Android only.** This provider uses Google Play Services activity recognition. On iOS it falls back to standard location monitoring.

## Configuration

```ts
import BackgroundGeolocation, {
  LocationProvider,
  LocationAccuracy,
} from 'react-native-nitro-background-geolocation';

await BackgroundGeolocation.configure({
  tracking: {
    locationProvider: LocationProvider.ACTIVITY,
    desiredAccuracy: LocationAccuracy.HIGH,
    interval: 10000,
    fastestInterval: 5000,
  },
  activity: {
    activitiesInterval: 10000,
    stopOnStillActivity: true,
  },
});
```

## Relevant options

- [`tracking.interval`](../configuration#tracking) — minimum time between location updates.
- [`tracking.fastestInterval`](../configuration#tracking) — fastest rate the app can handle updates.
- [`activity.activitiesInterval`](../configuration#activity) — how often activity recognition fires.
- [`activity.stopOnStillActivity`](../configuration#activity) — stop updates when the user is detected as STILL.

## Subscribing to activities

Use [`onActivity`](../events) to receive activity changes:

```ts
BackgroundGeolocation.onActivity((activity) => {
  console.log(activity.type, activity.confidence);
});
```

Activity types include `IN_VEHICLE`, `ON_BICYCLE`, `ON_FOOT`, `RUNNING`, `STILL`, `TILTING`, `UNKNOWN`, `WALKING`.

## Permissions

Add `ACTIVITY_RECOGNITION` to your Android manifest:

```xml
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
```
