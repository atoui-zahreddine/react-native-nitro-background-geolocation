import { DWELL_SPEED_KMH, haversineMeters, MAX_ACCURACY_METERS } from './profile';
import type { TrackPoint } from './types';

export interface SessionStats {
  /** Number of recorded points (before accuracy filtering). */
  pointCount: number;
  /** Distance covered while moving, in meters. */
  distanceMeters: number;
  /** Time spent moving (dwell excluded), in seconds. */
  movingSeconds: number;
  /** Average speed while moving, km/h; 0 when the track has no movement. */
  avgMovingSpeedKmh: number;
}

/**
 * Rebuild a session's route from the plugin's SQLite store: everything
 * recorded at or after the session anchor, in time order, deduplicated by
 * database id (live `onLocation` appends can overlap a SQLite re-sync).
 */
export function filterSessionPoints<T extends TrackPoint & { id?: number }>(
  locations: readonly T[],
  startedAt: number
): T[] {
  const seen = new Set<number>();
  return locations
    .filter((l) => {
      if (l.time < startedAt) {
        return false;
      }
      if (l.id !== undefined) {
        if (seen.has(l.id)) {
          return false;
        }
        seen.add(l.id);
      }
      return true;
    })
    .sort((a, b) => a.time - b.time);
}

/**
 * Live/summary stats for a session track. Uses the same hygiene as profile
 * detection: fixes over 50 m accuracy ignored, sub-1 km/h segments counted as
 * dwell (excluded from distance and moving time, so breaks don't drag the
 * average down or accumulate GPS-noise distance).
 */
export function deriveStats(points: readonly TrackPoint[]): SessionStats {
  const usable = points
    .filter((p) => p.accuracy <= MAX_ACCURACY_METERS)
    .sort((a, b) => a.time - b.time);

  let distanceMeters = 0;
  let movingSeconds = 0;

  for (let i = 1; i < usable.length; i++) {
    const dtSeconds = (usable[i]!.time - usable[i - 1]!.time) / 1000;
    if (dtSeconds <= 0) {
      continue;
    }
    const meters = haversineMeters(usable[i - 1]!, usable[i]!);
    const speedKmh = (meters / dtSeconds) * 3.6;
    if (speedKmh >= DWELL_SPEED_KMH) {
      distanceMeters += meters;
      movingSeconds += dtSeconds;
    }
  }

  return {
    pointCount: points.length,
    distanceMeters,
    movingSeconds,
    avgMovingSpeedKmh:
      movingSeconds > 0 ? (distanceMeters / movingSeconds) * 3.6 : 0,
  };
}
