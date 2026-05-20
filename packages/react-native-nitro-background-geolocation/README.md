# react-native-nitro-background-geolocation

A React Native background geolocation module built with Nitro Modules.

This package supports the React Native New Architecture only.

## Installation

```sh
npm install react-native-nitro-background-geolocation react-native-nitro-modules
```

## Quick Start

```ts
import BackgroundGeolocation, {
  LocationAccuracy,
  LocationProvider,
} from 'react-native-nitro-background-geolocation';

await BackgroundGeolocation.configure({
  locationProvider: LocationProvider.DISTANCE_FILTER,
  desiredAccuracy: LocationAccuracy.HIGH,
  distanceFilter: 10,
  startOnBoot: true,
  stopOnTerminate: false,
  notificationsEnabled: true,
  startForeground: true,
});

const unsubscribe = BackgroundGeolocation.onLocation((location) => {
  console.log(location.latitude, location.longitude);
});

await BackgroundGeolocation.start();

// Later
unsubscribe();
await BackgroundGeolocation.stop();
```

## Headless Events

On Android, use `registerHeadlessHandler` to receive events when the app is killed.

```ts
import { registerHeadlessHandler } from 'react-native-nitro-background-geolocation';

registerHeadlessHandler(async (event) => {
  if (event.event === 'location') {
    console.log(event.location.latitude, event.location.longitude);
  }
});
```

## Documentation

- Full documentation: https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation#readme
- Example app: https://github.com/atoui-zahreddine/react-native-nitro-background-geolocation/tree/main/apps/example

## License

MIT AND Apache-2.0