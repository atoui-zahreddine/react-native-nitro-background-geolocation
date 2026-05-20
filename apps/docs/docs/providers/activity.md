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
  locationProvider: LocationProvider.ACTIVITY,
  desiredAccuracy: LocationAccuracy.HIGH,
  interval: 10000,
  fastestInterval: 5000,
  activitiesInterval: 10000,
  stopOnStillActivity: true,
});
```

## Relevant options

- [`interval`](../configuration#options) — minimum time between location updates.
- [`fastestInterval`](../configuration#options) — fastest rate the app can handle updates.
- [`activitiesInterval`](../configuration#options) — how often activity recognition fires.
- [`stopOnStillActivity`](../configuration#options) — stop updates when the user is detected as STILL.

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
