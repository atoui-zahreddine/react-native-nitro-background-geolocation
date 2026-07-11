import { describe, expect, it } from 'vitest';
import {
  buildSessionRecord,
  filterLogWindow,
  mergeEventTimelines,
  summarizeRecord,
  type SessionEvent,
  type SessionLogEntry,
} from '../history';
import type { TrackPoint } from '../types';

function logEntry(
  timestamp: number,
  level: string,
  id = timestamp
): SessionLogEntry {
  return { id, timestamp, level, message: `m${id}`, stackTrace: '' };
}

function point(time: number, overrides: Partial<TrackPoint> = {}): TrackPoint {
  return { latitude: 52, longitude: 5, accuracy: 10, time, ...overrides };
}

describe('filterLogWindow', () => {
  it('keeps entries inside the session window plus the margin', () => {
    const entries = [
      logEntry(400, 'DEBUG'), // before window - margin
      logEntry(980, 'DEBUG'), // inside leading margin
      logEntry(1_500, 'INFO'),
      logEntry(2_010, 'WARN'), // inside trailing margin
      logEntry(3_000, 'ERROR'), // after window + margin
    ];
    const kept = filterLogWindow(entries, {
      startedAt: 1_000,
      stoppedAt: 2_000,
      marginMs: 30,
    });
    expect(kept.map((e) => e.timestamp)).toEqual([980, 1_500, 2_010]);
  });

  it('excludes TRACE entries regardless of window', () => {
    const kept = filterLogWindow(
      [logEntry(1_100, 'TRACE'), logEntry(1_200, 'DEBUG')],
      { startedAt: 1_000, stoppedAt: 2_000, marginMs: 0 }
    );
    expect(kept.map((e) => e.level)).toEqual(['DEBUG']);
  });

  it('returns entries in timestamp order', () => {
    const kept = filterLogWindow(
      [logEntry(1_500, 'INFO'), logEntry(1_100, 'DEBUG')],
      { startedAt: 1_000, stoppedAt: 2_000, marginMs: 0 }
    );
    expect(kept.map((e) => e.timestamp)).toEqual([1_100, 1_500]);
  });
});

describe('mergeEventTimelines', () => {
  it('merges live and headless events into one timeline ordered by time', () => {
    const live: SessionEvent[] = [
      { at: 100, type: 'start' },
      { at: 900, type: 'stop' },
    ];
    const headless: SessionEvent[] = [
      { at: 500, type: 'activity', payload: { type: 'ON_BICYCLE' } },
    ];
    const merged = mergeEventTimelines(live, headless);
    expect(merged.map((e) => e.at)).toEqual([100, 500, 900]);
  });

  it('tags headless events and leaves live events untagged', () => {
    const merged = mergeEventTimelines(
      [{ at: 100, type: 'start' }],
      [{ at: 200, type: 'stationary' }]
    );
    expect(merged[0]?.headless).toBeUndefined();
    expect(merged[1]?.headless).toBe(true);
  });
});

describe('buildSessionRecord', () => {
  const input = {
    startedAt: 1_000,
    stoppedAt: 61_000,
    recovered: false,
    config: { distanceFilter: 25 },
    points: [point(1_000), point(31_000), point(61_000)],
    logs: [logEntry(1_100, 'DEBUG')],
    events: [{ at: 1_000, type: 'start' } satisfies SessionEvent],
  };

  it('assembles a version-1 record with derived stats', () => {
    const record = buildSessionRecord(input);
    expect(record.version).toBe(1);
    expect(record.id).toBe('1000');
    expect(record.startedAt).toBe(1_000);
    expect(record.stoppedAt).toBe(61_000);
    expect(record.stats.pointCount).toBe(3);
    expect(record.stats.durationMs).toBe(60_000);
    expect(record.snap).toBeNull();
  });

  it('marks recovered records', () => {
    expect(buildSessionRecord({ ...input, recovered: true }).recovered).toBe(
      true
    );
  });
});

describe('summarizeRecord', () => {
  it('reduces a record to its list-row summary', () => {
    const record = buildSessionRecord({
      startedAt: 1_000,
      stoppedAt: 61_000,
      recovered: true,
      config: {},
      points: [point(1_000), point(61_000)],
      logs: [],
      events: [],
    });
    const summary = summarizeRecord(record);
    expect(summary).toEqual({
      id: '1000',
      startedAt: 1_000,
      stoppedAt: 61_000,
      recovered: true,
      profile: null,
      distanceMeters: record.stats.distanceMeters,
      durationMs: 60_000,
      pointCount: 2,
    });
  });

  it('carries the profile once a snap has been attached', () => {
    const record = buildSessionRecord({
      startedAt: 1_000,
      stoppedAt: 2_000,
      recovered: false,
      config: {},
      points: [],
      logs: [],
      events: [],
    });
    const withSnap = {
      ...record,
      snap: {
        profile: 'biking' as const,
        confident: true,
        result: null,
      },
    };
    expect(summarizeRecord(withSnap).profile).toBe('biking');
  });
});
