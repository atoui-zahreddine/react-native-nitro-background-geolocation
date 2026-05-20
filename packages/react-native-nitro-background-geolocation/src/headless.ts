import { AppRegistry, Platform } from 'react-native';
import type {
  Location,
  StationaryLocation,
  Activity,
} from './NitroBackgroundGeolocation.nitro';

/**
 * Internal name of the library-owned headless task. Must match
 * [`LIB_TASK_NAME`](../android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/NitroBackgroundGeolocation.kt)
 * on the Android side. Users do not interact with this string.
 */
export const HEADLESS_TASK_NAME = '__rn-nitro-bg-geo-headless__';

/**
 * Typed payload delivered to the headless handler. The `event` field
 * is a discriminant — narrow on it to access the correct payload.
 */
export type HeadlessEvent =
  | { event: 'location'; location: Location }
  | { event: 'stationary'; location: StationaryLocation }
  | { event: 'activity'; activity: Activity };

export type HeadlessHandler = (event: HeadlessEvent) => void | Promise<void>;

interface RawHeadlessPayload {
  event: string;
  params: string;
}

function parseHeadlessPayload(raw: RawHeadlessPayload): HeadlessEvent {
  const params = JSON.parse(raw.params);
  switch (raw.event) {
    case 'location':
      return { event: 'location', location: params as Location };
    case 'stationary':
      return { event: 'stationary', location: params as StationaryLocation };
    case 'activity':
      return { event: 'activity', activity: params as Activity };
    default:
      throw new Error(
        `Unknown background-geolocation headless event: ${raw.event}`
      );
  }
}

let appHasBooted = false;
if (typeof AppRegistry.runApplication === 'function') {
  const originalRunApplication = AppRegistry.runApplication.bind(AppRegistry);
  AppRegistry.runApplication = ((
    ...args: Parameters<typeof AppRegistry.runApplication>
  ) => {
    appHasBooted = true;
    return originalRunApplication(...args);
  }) as typeof AppRegistry.runApplication;
}

/**
 * Register a handler that fires on background geolocation events when
 * the app process is no longer running.
 *
 * **Must be called at module load time** — top-level in your entry
 * file (e.g. `index.js`), before `registerRootComponent`. The native
 * service spawns a fresh JS context per event and re-runs your entry
 * file to find this registration; if the call is gated behind a React
 * effect or any async work, registration arrives too late.
 *
 * Calling this function more than once replaces the previous handler.
 *
 * iOS does not support killed-state JS execution. On iOS this is a
 * no-op. Use `getLocations()` or `getValidLocationsAndDelete()` on
 * the next app launch instead.
 */
export function registerHeadlessHandler(handler: HeadlessHandler): void {
  if (Platform.OS !== 'android') return;

  if (__DEV__ && appHasBooted) {
    console.warn(
      '[react-native-nitro-background-geolocation] registerHeadlessHandler ' +
        'was called after the app started rendering. Call it at module load ' +
        '(top-level in index.js) so it runs in killed-state JS contexts too.'
    );
  }

  AppRegistry.registerHeadlessTask(
    HEADLESS_TASK_NAME,
    () => async (rawData: RawHeadlessPayload) => {
      await handler(parseHeadlessPayload(rawData));
    }
  );
}
