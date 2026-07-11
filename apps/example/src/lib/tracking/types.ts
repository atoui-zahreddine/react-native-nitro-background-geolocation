/**
 * Minimal structural subset of the plugin's `Location` that the tracking
 * pipeline needs. Keeping the dependency structural (instead of importing the
 * plugin type) keeps this module pure TS and unit-testable off-device.
 */
export interface TrackPoint {
  /** Latitude in degrees. */
  latitude: number;
  /** Longitude in degrees. */
  longitude: number;
  /** UTC timestamp in milliseconds. */
  time: number;
  /** Estimated accuracy in meters. */
  accuracy: number;
}

export type Profile = 'walking' | 'biking' | 'driving';

export interface ProfileDetection {
  profile: Profile;
  /**
   * False when the track was too sparse to classify (fewer than 10 moving
   * segments or under 200 m) and the walking default was used.
   */
  confident: boolean;
}

/** GeoJSON LineString with [lon, lat] positions (MapLibre source format). */
export interface LineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export type SnapFailureReason =
  /** Fewer than two usable points after accuracy filtering. */
  | 'too_few_points'
  /** Request did not complete within the timeout. */
  | 'timeout'
  /** Network-level failure (offline, DNS, connection reset). */
  | 'network'
  /** HTTP 429 from the service. */
  | 'rate_limited'
  /** Valhalla could not match the trace to the road network. */
  | 'no_match'
  /** Unexpected status code or malformed response body. */
  | 'bad_response';

export type SnapResult =
  | {
      ok: true;
      geometry: LineString;
      /** Matched route length in meters, as reported by the service. */
      distanceMeters: number;
    }
  | {
      ok: false;
      reason: SnapFailureReason;
      message: string;
    };