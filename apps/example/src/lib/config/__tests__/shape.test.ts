import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  AppRegistry: { registerHeadlessTask: vi.fn() },
  Platform: { OS: 'ios' },
}));
vi.mock('react-native-nitro-modules', () => ({ NitroModules: {} }));

const { ActivityType, CONFIG_DEFAULTS, LocationProvider } =
  await import('react-native-nitro-background-geolocation');
const { applyOptions, nestConfig, readField } = await import('../shape');

describe('nestConfig', () => {
  it('keeps a nested config as is', () => {
    const nested = {
      tracking: { distanceFilter: 25 },
      http: { url: 'https://example.com', httpHeaders: null },
      debug: { debug: true },
    };
    expect(nestConfig(nested)).toEqual(nested);
  });

  it('lifts a flat snapshot from an older build into its groups', () => {
    expect(
      nestConfig({
        locationProvider: LocationProvider.RAW,
        distanceFilter: 25,
        stopOnStillActivity: false,
        url: 'https://example.com',
        httpHeaders: { Authorization: 'x' },
        maxLocations: 500,
        debug: true,
      })
    ).toEqual({
      tracking: { locationProvider: LocationProvider.RAW, distanceFilter: 25 },
      activity: { stopOnStillActivity: false },
      http: { url: 'https://example.com', httpHeaders: { Authorization: 'x' } },
      storage: { maxLocations: 500 },
      debug: { debug: true },
    });
  });

  it('reads a flat activityType name as the enum member', () => {
    expect(nestConfig({ activityType: 'Fitness' }).tracking).toEqual({
      activityType: ActivityType.Fitness,
    });
  });

  it('drops values that do not match the contract type', () => {
    expect(
      nestConfig({
        distanceFilter: null,
        activityType: 'Walking',
        tracking: { interval: '5000' },
      })
    ).toEqual({});
  });

  it('accepts a mix of flat fields and nested groups', () => {
    const nested = nestConfig({
      distanceFilter: 25,
      http: { syncThreshold: 10 },
      url: 'ignored once the group is nested',
    });
    expect(readField(nested, 'tracking.distanceFilter')).toBe(25);
    expect(nested.http).toEqual({ syncThreshold: 10 });
  });
});

describe('applyOptions', () => {
  it('overrides only the given fields and keeps every group complete', () => {
    const applied = applyOptions(CONFIG_DEFAULTS, {
      tracking: { distanceFilter: 25 },
    });
    expect(applied.tracking).toEqual({
      ...CONFIG_DEFAULTS.tracking,
      distanceFilter: 25,
    });
    expect(applied.http).toEqual(CONFIG_DEFAULTS.http);
    expect(CONFIG_DEFAULTS.tracking.distanceFilter).not.toBe(25);
  });
});
