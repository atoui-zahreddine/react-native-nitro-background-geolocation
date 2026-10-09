import { Platform } from 'react-native';
import { afterEach, describe, expect, test } from 'react-native-harness';
import BackgroundGeolocation, {
  ActivityType,
  CONFIG_DEFAULTS,
  CONFIG_FIELDS,
  LocationAccuracy,
  ownsField,
  type ConfigFieldPath,
} from 'react-native-nitro-background-geolocation';

const platform = Platform.OS as 'android' | 'ios';
const ENUM_FIELDS: string[] = [
  'tracking.locationProvider',
  'tracking.desiredAccuracy',
  'tracking.activityType',
];

describe('configuration round trip through the HybridObject', () => {
  afterEach(async () => {
    await BackgroundGeolocation.configure(CONFIG_DEFAULTS);
  });

  test('a shared field reads back as written', async () => {
    await BackgroundGeolocation.configure({
      tracking: { distanceFilter: 37, desiredAccuracy: LocationAccuracy.HIGH },
      http: { url: 'https://example.test/locations', syncThreshold: 42 },
    });
    const config = await BackgroundGeolocation.getConfig();
    expect(config.tracking.distanceFilter).toBe(37);
    expect(config.tracking.desiredAccuracy).toBe(LocationAccuracy.HIGH);
    expect(config.http.url).toBe('https://example.test/locations');
    expect(config.http.syncThreshold).toBe(42);
  });

  test('omitting a field leaves it unchanged', async () => {
    await BackgroundGeolocation.configure({ storage: { maxLocations: 500 } });
    await BackgroundGeolocation.configure({ debug: { debug: true } });
    const config = await BackgroundGeolocation.getConfig();
    expect(config.storage.maxLocations).toBe(500);
    expect(config.debug.debug).toBe(true);
  });

  test('passing the published default resets a field', async () => {
    await BackgroundGeolocation.configure({
      activity: { activitiesInterval: 2000 },
    });
    await BackgroundGeolocation.configure({
      activity: {
        activitiesInterval: CONFIG_DEFAULTS.activity.activitiesInterval,
      },
    });
    const config = await BackgroundGeolocation.getConfig();
    expect(config.activity.activitiesInterval).toBe(
      CONFIG_DEFAULTS.activity.activitiesInterval
    );
  });

  test('null is a value on the two fields that permit it', async () => {
    await BackgroundGeolocation.configure({
      http: { httpHeaders: { A: '1' } },
    });
    expect((await BackgroundGeolocation.getConfig()).http.httpHeaders).toEqual({
      A: '1',
    });
    await BackgroundGeolocation.configure({
      http: { httpHeaders: null, postTemplate: { lat: '@latitude' } },
    });
    expect((await BackgroundGeolocation.getConfig()).http.postTemplate).toEqual(
      {
        lat: '@latitude',
      }
    );
    await BackgroundGeolocation.configure({
      http: { httpHeaders: null, postTemplate: null },
    });
    expect(
      (await BackgroundGeolocation.getConfig()).http.postTemplate
    ).toBeNull();
    expect(
      (await BackgroundGeolocation.getConfig()).http.httpHeaders
    ).toBeNull();
  });

  // Catches a field whose native storage slot is missing: iOS drops an unknown
  // dictionary key without a build error.
  test('every owned scalar field round-trips', async () => {
    const owned = (Object.keys(CONFIG_FIELDS) as ConfigFieldPath[]).filter(
      (path) => ownsField(platform, path)
    );
    const written: Record<string, Record<string, unknown>> = {};
    for (const path of owned) {
      const [group, field] = path.split('.') as [string, string];
      const fallback = CONFIG_FIELDS[path].default;
      const value =
        typeof fallback === 'boolean'
          ? !fallback
          : typeof fallback === 'string'
            ? 'harness'
            : typeof fallback === 'number' && !ENUM_FIELDS.includes(path)
              ? fallback + 7
              : undefined;
      if (value === undefined) continue;
      written[group] = { ...written[group], [field]: value };
    }
    await BackgroundGeolocation.configure(written);
    const config = (await BackgroundGeolocation.getConfig()) as any;
    for (const [group, fields] of Object.entries(written)) {
      for (const [field, value] of Object.entries(fields)) {
        expect([`${group}.${field}`, config[group][field]]).toEqual([
          `${group}.${field}`,
          value,
        ]);
      }
    }
  });

  test('every group is complete on a read', async () => {
    const config = await BackgroundGeolocation.getConfig();
    for (const path of Object.keys(CONFIG_FIELDS)) {
      const [group, field] = path.split('.') as [string, string];
      expect((config as any)[group][field]).not.toBeUndefined();
    }
  });
});

describe('fields the running platform does not own', () => {
  const foreign = (Object.keys(CONFIG_FIELDS) as ConfigFieldPath[]).filter(
    (path) => !ownsField(platform, path)
  );

  test('this platform has foreign fields to check', () => {
    expect(foreign.length).toBeGreaterThan(0);
  });

  test('a foreign write is dropped and the field reads as its default', async () => {
    await BackgroundGeolocation.configure({
      tracking: {
        interval: 60000,
        pauseLocationUpdates: true,
        activityType: ActivityType.Fitness,
      },
      notification: { notificationTitle: 'foreign write' },
    });
    const config = await BackgroundGeolocation.getConfig();
    for (const path of foreign) {
      const [group, field] = path.split('.') as [string, string];
      expect((config as any)[group][field]).toEqual(
        CONFIG_FIELDS[path].default
      );
    }
  });
});
