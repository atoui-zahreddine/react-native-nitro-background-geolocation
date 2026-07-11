import { registerHeadlessHandler } from 'react-native-nitro-background-geolocation';
import { appendSpoolEvent } from './lib/tracking/spoolStore';

// Runs in a headless JS context after the app is killed (stopOnTerminate:
// false). Must be registered before the router entry — index.js imports this
// module first, and ES module evaluation order guarantees it runs before
// expo-router/entry.
//
// Locations need no handling here: they land in the plugin's native SQLite
// store regardless. Stationary/activity events are spooled to a JSONL file
// that kill-recovery merges into the recovered session's events timeline.
registerHeadlessHandler(async (event) => {
  switch (event.event) {
    case 'location':
      console.log('[HeadlessTask] location', event.location);
      break;
    case 'stationary':
      console.log('[HeadlessTask] stationary', event.location);
      await appendSpoolEvent({
        at: event.location.time ?? Date.now(),
        type: 'stationary',
        payload: {
          latitude: event.location.latitude,
          longitude: event.location.longitude,
        },
      });
      break;
    case 'activity':
      console.log('[HeadlessTask] activity', event.activity);
      await appendSpoolEvent({
        at: Date.now(),
        type: 'activity',
        payload: event.activity,
      });
      break;
  }
});
