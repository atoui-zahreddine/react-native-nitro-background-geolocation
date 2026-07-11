import { PermissionsAndroid, Platform } from 'react-native';

type AndroidPermission =
  (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS];

/**
 * Request the runtime permissions a tracking session needs.
 *
 * Android: fine location (required) plus activity recognition (SDK 29+) and
 * notifications (SDK 33+, for the foreground-service notification). No
 * ACCESS_BACKGROUND_LOCATION — the foreground service covers background
 * recording with while-in-use permission.
 *
 * iOS: nothing to do here — the plugin's `start()` triggers the native
 * Always-authorization prompt itself.
 */
export async function requestTrackingPermissions(): Promise<{
  granted: boolean;
}> {
  if (Platform.OS !== 'android') {
    return { granted: true };
  }

  const permissions: AndroidPermission[] = [
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ];
  if (Platform.Version >= 29) {
    permissions.push(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
  }
  if (Platform.Version >= 33) {
    permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  try {
    const results = await PermissionsAndroid.requestMultiple(permissions);
    return {
      granted:
        results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED,
    };
  } catch {
    return { granted: false };
  }
}
