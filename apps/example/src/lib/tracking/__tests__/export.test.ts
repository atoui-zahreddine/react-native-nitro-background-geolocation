import { describe, expect, it } from 'vitest';
import { buildExportBundle, exportFilename } from '../export';
import { buildSessionRecord } from '../history';

const record = buildSessionRecord({
  startedAt: Date.UTC(2026, 6, 11, 8, 12, 30),
  stoppedAt: Date.UTC(2026, 6, 11, 9, 3, 0),
  recovered: false,
  config: { distanceFilter: 25 },
  points: [],
  logs: [],
  events: [],
});

describe('buildExportBundle', () => {
  it('wraps the record verbatim in a versioned self-describing envelope', () => {
    const bundle = buildExportBundle(record, {
      exportedAt: 1_800_000_000_000,
      appVersion: '1.0.0',
      libraryVersion: '1.0.1',
      platform: { os: 'android', osVersion: '35', device: 'Pixel 8a' },
    });
    expect(bundle).toEqual({
      bundleVersion: 1,
      exportedAt: 1_800_000_000_000,
      app: { name: 'example', version: '1.0.0' },
      library: {
        name: 'react-native-nitro-background-geolocation',
        version: '1.0.1',
      },
      platform: { os: 'android', osVersion: '35', device: 'Pixel 8a' },
      session: record,
    });
    expect(bundle.session).toBe(record);
  });
});

describe('exportFilename', () => {
  it('derives a filesystem-safe name from start time (UTC) and profile', () => {
    const withSnap = {
      ...record,
      snap: { profile: 'walking' as const, confident: true, result: null },
    };
    expect(exportFilename(withSnap)).toBe(
      'bg-geo-session-2026-07-11T0812-walking.json'
    );
  });

  it('falls back to "unprofiled" when no snap is attached', () => {
    expect(exportFilename(record)).toBe(
      'bg-geo-session-2026-07-11T0812-unprofiled.json'
    );
  });
});
