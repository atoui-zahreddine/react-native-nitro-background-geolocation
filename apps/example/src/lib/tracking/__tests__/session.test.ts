import { describe, expect, it } from 'vitest';
import { deriveStats, filterSessionPoints } from '../session';
import type { TrackPoint } from '../types';

const METERS_PER_DEGREE_LAT = 111_320;

function point(
  time: number,
  overrides: Partial<TrackPoint & { id: number }> = {}
): TrackPoint & { id?: number } {
  return { latitude: 52, longitude: 5, accuracy: 10, time, ...overrides };
}

describe('filterSessionPoints', () => {
  it('keeps only points at or after the anchor, in time order', () => {
    const anchor = 1_000;
    const filtered = filterSessionPoints(
      [point(2000), point(500), point(1000), point(1500)],
      anchor
    );
    expect(filtered.map((p) => p.time)).toEqual([1000, 1500, 2000]);
  });

  it('deduplicates by database id', () => {
    const filtered = filterSessionPoints(
      [
        point(1000, { id: 1 }),
        point(2000, { id: 2 }),
        point(2000, { id: 2 }),
        point(3000, { id: 3 }),
      ],
      0
    );
    expect(filtered.map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it('keeps points without ids even when duplicated', () => {
    expect(filterSessionPoints([point(1000), point(1000)], 0)).toHaveLength(2);
  });

  it('returns empty for an empty store', () => {
    expect(filterSessionPoints([], 0)).toEqual([]);
  });
});

describe('deriveStats', () => {
  it('returns zeros for empty and single-point tracks', () => {
    expect(deriveStats([])).toEqual({
      pointCount: 0,
      distanceMeters: 0,
      movingSeconds: 0,
      avgMovingSpeedKmh: 0,
    });
    expect(deriveStats([point(0)])).toMatchObject({
      pointCount: 1,
      distanceMeters: 0,
      avgMovingSpeedKmh: 0,
    });
  });

  it('computes distance and average moving speed for a steady track', () => {
    // 10 segments of 50 m every 10 s → 500 m in 100 s = 18 km/h.
    const points: TrackPoint[] = Array.from({ length: 11 }, (_, i) =>
      point(i * 10_000, {
        latitude: 52 + (i * 50) / METERS_PER_DEGREE_LAT,
      })
    );
    const stats = deriveStats(points);
    expect(stats.pointCount).toBe(11);
    expect(stats.distanceMeters).toBeCloseTo(500, -1);
    expect(stats.movingSeconds).toBeCloseTo(100, 5);
    expect(stats.avgMovingSpeedKmh).toBeCloseTo(18, 1);
  });

  it('excludes dwell from moving time so breaks do not drag the average', () => {
    // 5 moving segments (50 m / 10 s), then a 10-minute standstill, then 5 more.
    const moving1: TrackPoint[] = Array.from({ length: 6 }, (_, i) =>
      point(i * 10_000, { latitude: 52 + (i * 50) / METERS_PER_DEGREE_LAT })
    );
    const afterBreakStart = 5 * 10_000 + 600_000;
    const moving2: TrackPoint[] = Array.from({ length: 5 }, (_, i) =>
      point(afterBreakStart + (i + 1) * 10_000, {
        latitude:
          52 + (5 * 50 + (i + 1) * 50) / METERS_PER_DEGREE_LAT,
      })
    );
    const stats = deriveStats([...moving1, ...moving2]);
    // The bridge segment across the break (50 m in 610 s ≈ 0.3 km/h) is
    // dwell: its distance and time are both excluded, so the average stays
    // at cruising speed instead of collapsing toward zero.
    expect(stats.distanceMeters).toBeCloseTo(450, -1);
    expect(stats.movingSeconds).toBeCloseTo(90, 5);
    expect(stats.avgMovingSpeedKmh).toBeCloseTo(18, 1);
  });

  it('ignores low-accuracy fixes', () => {
    // A 1 km GPS jump with terrible accuracy must not count as distance.
    const points = [
      point(0),
      point(10_000, { latitude: 52.01, accuracy: 120 }),
      point(20_000, { latitude: 52 + 50 / METERS_PER_DEGREE_LAT }),
    ];
    const stats = deriveStats(points);
    expect(stats.distanceMeters).toBeLessThan(60);
    expect(stats.pointCount).toBe(3);
  });

  it('skips zero-duration segments', () => {
    const points = [point(10_000), point(10_000, { latitude: 52.001 })];
    expect(deriveStats(points).distanceMeters).toBe(0);
  });
});
