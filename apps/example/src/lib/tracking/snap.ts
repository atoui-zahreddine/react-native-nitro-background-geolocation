import { MAX_ACCURACY_METERS } from './profile';
import { decodePolyline } from './polyline';
import type { Profile, SnapResult, TrackPoint } from './types';

const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/trace_route';
const CLIENT_ID = 'react-native-nitro-background-geolocation-example';
const TIMEOUT_MS = 30_000;
/** Valhalla accepts far more (5,000 verified live), but stay well under. */
export const MAX_SHAPE_POINTS = 4000;

const COSTING_BY_PROFILE: Record<Profile, string> = {
  walking: 'pedestrian',
  biking: 'bicycle',
  driving: 'auto',
};

/**
 * Thin a track to at most `max` points by uniform stride, always keeping the
 * first and last point.
 */
export function downsample<T>(points: readonly T[], max: number): T[] {
  if (points.length <= max) {
    return [...points];
  }
  const stride = (points.length - 1) / (max - 1);
  const result: T[] = [];
  for (let i = 0; i < max; i++) {
    result.push(points[Math.round(i * stride)]!);
  }
  return result;
}

function median(sortedAscending: number[]): number {
  const mid = Math.floor(sortedAscending.length / 2);
  return sortedAscending.length % 2 === 1
    ? sortedAscending[mid]!
    : (sortedAscending[mid - 1]! + sortedAscending[mid]!) / 2;
}

/**
 * Map-match a recorded track against Valhalla's road network with the costing
 * for the given profile. Never throws — every failure mode is returned as a
 * typed result so the UI can fall back to the raw trace.
 */
export async function snapToRoads(
  points: readonly TrackPoint[],
  profile: Profile
): Promise<SnapResult> {
  const usable = points
    .filter((p) => p.accuracy <= MAX_ACCURACY_METERS)
    .sort((a, b) => a.time - b.time);

  if (usable.length < 2) {
    return {
      ok: false,
      reason: 'too_few_points',
      message: 'Not enough accurate GPS points to match against roads.',
    };
  }

  const shapePoints = downsample(usable, MAX_SHAPE_POINTS);
  const accuracies = shapePoints.map((p) => p.accuracy).sort((a, b) => a - b);

  const body = {
    shape: shapePoints.map((p) => ({ lat: p.latitude, lon: p.longitude })),
    costing: COSTING_BY_PROFILE[profile],
    shape_match: 'map_snap',
    trace_options: {
      gps_accuracy: Math.max(5, Math.round(median(accuracies))),
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(VALHALLA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': CLIENT_ID,
      },
      body: JSON.stringify(body),
      // Cast: the react-native fetch typings declare their own AbortSignal
      // that is structurally incompatible with the DOM lib's.
      signal: controller.signal as NonNullable<RequestInit['signal']>,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        ok: false,
        reason: 'timeout',
        message: `Road matching timed out after ${TIMEOUT_MS / 1000}s.`,
      };
    }
    return {
      ok: false,
      reason: 'network',
      message:
        error instanceof Error ? error.message : 'Network request failed.',
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 429) {
      return {
        ok: false,
        reason: 'rate_limited',
        message: 'Road-matching service is rate limiting; try again shortly.',
      };
    }
    // Valhalla reports matching failures as 4xx with a JSON error body,
    // e.g. { error_code: 442, error: "No path could be found for input" }.
    let errorCode: number | undefined;
    let errorText: string | undefined;
    try {
      const errorBody = (await response.json()) as {
        error_code?: number;
        error?: string;
      };
      errorCode = errorBody?.error_code;
      errorText = errorBody?.error;
    } catch {
      // Non-JSON error body; fall through to bad_response.
    }
    if (errorCode === 442 || errorCode === 444) {
      return {
        ok: false,
        reason: 'no_match',
        message: errorText ?? 'The track could not be matched to any road.',
      };
    }
    return {
      ok: false,
      reason: 'bad_response',
      message: `Road-matching service returned HTTP ${response.status}${errorText ? `: ${errorText}` : '.'}`,
    };
  }

  try {
    const data = (await response.json()) as {
      trip: { legs: { shape: string }[]; summary?: { length?: number } };
    };
    const legs = data.trip.legs;
    const coordinates: [number, number][] = [];
    for (const leg of legs) {
      const legCoords = decodePolyline(leg.shape);
      // Consecutive legs share their boundary point; skip the duplicate.
      coordinates.push(...(coordinates.length > 0 ? legCoords.slice(1) : legCoords));
    }
    if (coordinates.length < 2) {
      return {
        ok: false,
        reason: 'bad_response',
        message: 'Road-matching service returned an empty route.',
      };
    }
    return {
      ok: true,
      geometry: { type: 'LineString', coordinates },
      distanceMeters: Math.round((data.trip.summary?.length ?? 0) * 1000),
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'bad_response',
      message: `Could not parse the road-matching response${error instanceof Error ? `: ${error.message}` : '.'}`,
    };
  }
}
