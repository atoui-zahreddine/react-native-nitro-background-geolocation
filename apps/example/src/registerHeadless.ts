import { registerHeadlessHandler } from 'react-native-nitro-background-geolocation';

// Runs in a headless JS context after the app is killed (stopOnTerminate:
// false). Must be registered before the router entry — index.js imports this
// module first, and ES module evaluation order guarantees it runs before
// expo-router/entry.
registerHeadlessHandler(async (event) => {
  switch (event.event) {
    case 'location':
      console.log('[HeadlessTask] location', event.location);
      break;
    case 'stationary':
      console.log('[HeadlessTask] stationary', event.location);
      break;
    case 'activity':
      console.log('[HeadlessTask] activity', event.activity);
      break;
  }
});
