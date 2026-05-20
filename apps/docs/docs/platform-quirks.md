---
sidebar_position: 7
---

# Platform Quirks

Behavior differences between iOS and Android that you'll hit eventually.

## iOS Native Continuation

On iOS, `stopOnTerminate: false` does **not** mean "run JavaScript after the app is killed." iOS does not support that. Instead:

- Native location monitoring may continue after the app is terminated.
- The OS can relaunch the app on significant location changes.
- After relaunch, your JS code can inspect persisted native state via [`getLocations()`](./events) or `getValidLocations()`.

**The contract:** locations recorded while the app was terminated are available *after* the next launch, not during.

```ts
// After app launch
const pendingLocations = await BackgroundGeolocation.getLocations();
if (pendingLocations.length > 0) {
  console.log('Captured while terminated:', pendingLocations);
}
```

### Why not headless tasks on iOS?

iOS does not provide a public API to spawn a JS runtime after the app is killed. The OS does provide background app refresh and significant location change relaunches, but they wake your app, not a background JS context.

If you need killed-state event handling on iOS, the workaround is to do work *in your launch path* against persisted state.

### Validating on a real device

iOS simulator results for `stopOnTerminate: false` are inconclusive — Apple's docs explicitly state that significant location change relaunch behavior is not faithfully reproduced in the simulator. Validate on a physical device.

## Android Foreground Service

The Android implementation uses a foreground service with a persistent notification. This is what allows tracking to continue when the app is in the background or killed — without requiring `ACCESS_BACKGROUND_LOCATION`.

The notification is **not** optional on Android 8+. You can customize:

- Title (`notificationTitle`)
- Text (`notificationText`)
- Icon color (`notificationIconColor`)
- Small/large icon resource names

Setting `notificationsEnabled: false` is intended for development only — production apps must show a foreground service notification or risk being killed by the OS.

## Headless tasks: Android only

See [Headless Tasks](./headless-tasks). iOS uses [Native Continuation](#ios-native-continuation) instead.

## Activity Recognition: Android only

The `LocationProvider.ACTIVITY` provider and the `onActivity` event are Android-only features. On iOS they fall back to standard location monitoring with no activity payload.

## Settings helpers: Android only

`showAppSettings()` and `showLocationSettings()` open Android system settings. They are no-ops on iOS — iOS does not allow apps to deep-link to a specific Settings screen reliably across versions.

## Permissions

The library does **not** auto-include any permissions. Declare them yourself:

- Android: in `AndroidManifest.xml` ([list](./getting-started#required-permissions-android)).
- iOS: in `Info.plist` ([list](./getting-started#required-permissions-ios)).

If you use Expo, the bundled `app.plugin.js` sets the iOS keys and an Android content-provider authority during prebuild.
