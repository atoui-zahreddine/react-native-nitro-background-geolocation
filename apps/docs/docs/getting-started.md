---
sidebar_position: 2
---

# Getting Started

## Installation

```bash
yarn add react-native-nitro-background-geolocation react-native-nitro-modules
```

iOS (with CocoaPods):

```bash
cd ios && pod install
```

`react-native-nitro-modules` is a required peer dependency.

## Required Permissions (Android)

Add the following to your `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />

<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

> **Note:** `ACCESS_BACKGROUND_LOCATION` is **not** required. The plugin uses a foreground service with a persistent notification, which keeps location access active even when the app is in the background or killed.

## Required Permissions (iOS)

Add the following to your `Info.plist`:

```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app uses your location in the background to continue tracking.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses your location while tracking is active.</string>
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
</array>
```

If you use Expo, the bundled config plugin sets the iOS keys and the Android content-provider authority for you. Add it to `app.json`:

```json
{
  "expo": {
    "plugins": ["react-native-nitro-background-geolocation/app.plugin.js"]
  }
}
```

## Basic usage

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
  notificationTitle: 'Tracking active',
  url: 'https://your-server.com/locations',
  httpHeaders: { Authorization: 'Bearer YOUR_TOKEN' },
});

const unsubscribe = BackgroundGeolocation.onLocation((location) => {
  console.log('New location', location);
});

await BackgroundGeolocation.start();

// Later
unsubscribe();
await BackgroundGeolocation.stop();
```

See [Configuration](./configuration) for the full list of options.

## Method contract

`configure()` is **required before `start()`** — `start()` uses the configured provider, URL, intervals, and notification text.

Most other methods do **not** require `configure()` first. They read native/persisted state, which is useful after app relaunch (especially with `stopOnTerminate: false` — see [Platform Quirks](./platform-quirks#ios-native-continuation)).

| Method | Needs `configure()` first? |
|---|---|
| `getLocations`, `getValidLocations`, `getValidLocationsAndDelete` | No — reads from local storage |
| `getLogEntries`, `checkStatus`, `getConfig` | No |
| `getCurrentLocation`, `getStationaryLocation` | No |
| `deleteLocation`, `deleteAllLocations` | No |
| `start`, `forceSync` | **Yes** |
| All `onX(...)` event subscriptions | No |
| `removeAllListeners`, `stop` | No |

### Relaunch flow example

After the app is relaunched (manually or by an OS location event), you can drain any locations recorded while it was inactive **before** reconfiguring:

```ts
import BackgroundGeolocation from 'react-native-nitro-background-geolocation';

// 1. Drain anything captured while the app was inactive
const pending = await BackgroundGeolocation.getValidLocationsAndDelete();
if (pending.length > 0) {
  await sendToYourServer(pending);
}

// 2. Resume tracking
await BackgroundGeolocation.configure({ /* ... */ });
await BackgroundGeolocation.start();
```

