import type { Profile, ProfileDetection, TrackPoint } from './types';

/** Fixes with worse accuracy than this are ignored entirely. */
export const MAX_ACCURACY_METERS = 50;
/** Segments slower than this are dwell (traffic lights, breaks) and dropped. */
export const DWELL_SPEED_KMH = 1;
/** p85 moving speed below this → walking. */
const WALKING_MAX_KMH = 8;
/** p85 moving speed below this → biking; above → driving. */
const BIKING_MAX_KMH = 28;
/** Sparse-track guards: below either, default to walking, not confident. */
const MIN_MOVING_SEGMENTS = 10;
const MIN_DISTANCE_METERS = 200;

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineMeters(a: TrackPoint, b: TrackPoint): number {
  const toRad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * toRad;
  const dLon = (b.longitude - a.longitude) * toRad;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(a.latitude * toRad) * Math.cos(b.latitude * toRad) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/** Linear-interpolated percentile; `q` in [0, 1]. */
function percentile(sortedAscending: number[], q: number): number {
  const pos = (sortedAscending.length - 1) * q;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) {
    return sortedAscending[lower]!;
  }
  return (
    sortedAscending[lower]! * (upper - pos) + sortedAscending[upper]! * (pos - lower)
  );
}

/**
 * Classify the transport profile of a recorded track from speed alone.
 *
 * Pipeline (per the design ticket): drop fixes with accuracy > 50 m, compute
 * segment speeds from haversine distance / Δtime, drop dwell segments
 * (< 1 km/h), then classify the 85th percentile of the remaining speeds at
 * the 8 / 28 km/h boundaries. Tracks too sparse to classify default to
 * walking with `confident: false`.
 */
export function detectProfile(points: readonly TrackPoint[]): ProfileDetection {
  const usable = points
    .filter((p) => p.accuracy <= MAX_ACCURACY_METERS)
    .sort((a, b) => a.time - b.time);

  const movingSpeedsKmh: number[] = [];
  let totalMeters = 0;

  for (let i = 1; i < usable.length; i++) {
    const dtSeconds = (usable[i]!.time - usable[i - 1]!.time) / 1000;
    if (dtSeconds <= 0) {
      continue;
    }
    const meters = haversineMeters(usable[i - 1]!, usable[i]!);
    totalMeters += meters;
    const speedKmh = (meters / dtSeconds) * 3.6;
    if (speedKmh >= DWELL_SPEED_KMH) {
      movingSpeedsKmh.push(speedKmh);
    }
  }

  if (
    movingSpeedsKmh.length < MIN_MOVING_SEGMENTS ||
    totalMeters < MIN_DISTANCE_METERS
  ) {
    return { profile: 'walking', confident: false };
  }

  movingSpeedsKmh.sort((a, b) => a - b);
  const p85 = percentile(movingSpeedsKmh, 0.85);

  let profile: Profile;
  if (p85 < WALKING_MAX_KMH) {
    profile = 'walking';
  } else if (p85 <= BIKING_MAX_KMH) {
    profile = 'biking';
  } else {
    profile = 'driving';
  }

  return { profile, confident: true };
}
