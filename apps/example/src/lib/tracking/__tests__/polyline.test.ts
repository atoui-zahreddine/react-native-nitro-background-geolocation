import { describe, expect, it } from 'vitest';
import { decodePolyline, encodePolyline } from '../polyline';

describe('decodePolyline', () => {
  it('decodes the classic polyline5 reference vector', () => {
    // From the original Google polyline algorithm documentation.
    const decoded = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5);
    expect(decoded).toEqual([
      [-120.2, 38.5],
      [-120.95, 40.7],
      [-126.453, 43.252],
    ]);
  });

  it('round-trips polyline6 coordinates', () => {
    const coordinates: [number, number][] = [
      [5.121421, 52.090737],
      [5.123, 52.0912],
      [5.129876, 52.095432],
      [-73.985428, 40.748817],
    ];
    const decoded = decodePolyline(encodePolyline(coordinates));
    for (const [i, [lon, lat]] of decoded.entries()) {
      expect(lon).toBeCloseTo(coordinates[i]![0], 6);
      expect(lat).toBeCloseTo(coordinates[i]![1], 6);
    }
  });

  it('decodes an empty string to no coordinates', () => {
    expect(decodePolyline('')).toEqual([]);
  });

  it('handles negative deltas and sign changes', () => {
    const coordinates: [number, number][] = [
      [0.000001, -0.000001],
      [-0.000005, 0.000005],
      [0, 0],
    ];
    expect(decodePolyline(encodePolyline(coordinates))).toEqual(coordinates);
  });
});
