import { describe, expect, it } from 'vitest';
import { detectProfile } from '../profile';
import type { TrackPoint } from '../types';

/** Meters of latitude per degree (near-constant everywhere). */
const METERS_PER_DEGREE_LAT = 111_320;

/**
 * Build a track along a meridian where segment i is traveled at
 * `speedsKmh[i]`, one fix every `dtSeconds`.
 */
function makeTrack(
  speedsKmh: number[],
  { dtSeconds = 10, accuracy = 10 }: { dtSeconds?: number; accuracy?: number } = {}
): TrackPoint[] {
  const points: TrackPoint[] = [
    { latitude: 52, longitude: 5, time: 0, accuracy },
  ];
  for (const [i, speedKmh] of speedsKmh.entries()) {
    const meters = (speedKmh / 3.6) * dtSeconds;
    const prev = points[i]!;
    points.push({
      latitude: prev.latitude + meters / METERS_PER_DEGREE_LAT,
      longitude: prev.longitude,
      time: prev.time + dtSeconds * 1000,
      accuracy,
    });
  }
  return points;
}

const repeat = (speedKmh: number, count: number) =>
  Array<number>(count).fill(speedKmh);

describe('detectProfile', () => {
  it('classifies a steady walk as walking', () => {
    expect(detectProfile(makeTrack(repeat(5, 30)))).toEqual({
      profile: 'walking',
      confident: true,
    });
  });

  it('classifies a steady ride as biking', () => {
    expect(detectProfile(makeTrack(repeat(18, 30)))).toEqual({
      profile: 'biking',
      confident: true,
    });
  });

  it('classifies a drive as driving', () => {
    expect(detectProfile(makeTrack(repeat(60, 30)))).toEqual({
      profile: 'driving',
      confident: true,
    });
  });

  it('is not dragged into bike range by stop-and-go traffic', () => {
    // City driving: cruising at 50 km/h but stopped at lights a third of
    // the time. Dwell segments must be excluded, p85 stays in driving range.
    const speeds = [
      ...repeat(50, 10),
      ...repeat(0, 5),
      ...repeat(45, 10),
      ...repeat(0, 5),
      ...repeat(55, 10),
    ];
    expect(detectProfile(makeTrack(speeds))).toEqual({
      profile: 'driving',
      confident: true,
    });
  });

  it('picks the dominant profile on a mixed-mode track', () => {
    // Short walk to the car, then a long drive.
    const speeds = [...repeat(5, 8), ...repeat(60, 40)];
    expect(detectProfile(makeTrack(speeds))).toEqual({
      profile: 'driving',
      confident: true,
    });
  });

  it('ignores fixes with accuracy worse than 50 m', () => {
    // A clean walk plus garbage fixes that would read as driving if kept.
    const walk = makeTrack(repeat(5, 30));
    const garbage: TrackPoint[] = walk.slice(0, 10).map((p, i) => ({
      latitude: p.latitude + 0.01 * (i % 2 === 0 ? 1 : -1),
      longitude: p.longitude,
      time: p.time + 5000,
      accuracy: 80,
    }));
    expect(detectProfile([...walk, ...garbage])).toEqual({
      profile: 'walking',
      confident: true,
    });
  });

  it('defaults sparse tracks to walking, not confident', () => {
    expect(detectProfile(makeTrack(repeat(60, 5)))).toEqual({
      profile: 'walking',
      confident: false,
    });
  });

  it('defaults very short tracks to walking, not confident', () => {
    // 15 moving segments but well under 200 m in total.
    expect(detectProfile(makeTrack(repeat(2, 15), { dtSeconds: 5 }))).toEqual({
      profile: 'walking',
      confident: false,
    });
  });

  it('defaults an empty track to walking, not confident', () => {
    expect(detectProfile([])).toEqual({ profile: 'walking', confident: false });
  });

  it('tolerates out-of-order input', () => {
    const track = makeTrack(repeat(18, 30));
    const shuffled = [...track].reverse();
    expect(detectProfile(shuffled)).toEqual({
      profile: 'biking',
      confident: true,
    });
  });
});
