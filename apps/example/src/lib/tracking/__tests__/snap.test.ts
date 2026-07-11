import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodePolyline } from '../polyline';
import { downsample, snapToRoads } from '../snap';
import type { TrackPoint } from '../types';

function makePoints(count: number, accuracy = 10): TrackPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    latitude: 52 + i * 0.0001,
    longitude: 5 + i * 0.0001,
    time: i * 10_000,
    accuracy,
  }));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('downsample', () => {
  it('returns short inputs unchanged', () => {
    const input = [1, 2, 3];
    expect(downsample(input, 4000)).toEqual([1, 2, 3]);
  });

  it('caps long inputs and keeps endpoints and order', () => {
    const input = Array.from({ length: 10_000 }, (_, i) => i);
    const thinned = downsample(input, 4000);
    expect(thinned).toHaveLength(4000);
    expect(thinned[0]).toBe(0);
    expect(thinned[thinned.length - 1]).toBe(9999);
    for (let i = 1; i < thinned.length; i++) {
      expect(thinned[i]!).toBeGreaterThan(thinned[i - 1]!);
    }
  });
});

describe('snapToRoads', () => {
  it('fails typed on tracks with fewer than two accurate points', async () => {
    const result = await snapToRoads(makePoints(10, 80), 'walking');
    expect(result).toMatchObject({ ok: false, reason: 'too_few_points' });
  });

  it('POSTs the profile costing and client id, and decodes leg shapes', async () => {
    const legA: [number, number][] = [
      [5.1, 52.1],
      [5.2, 52.2],
    ];
    const legB: [number, number][] = [
      [5.2, 52.2],
      [5.3, 52.3],
    ];
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        trip: {
          legs: [{ shape: encodePolyline(legA) }, { shape: encodePolyline(legB) }],
          summary: { length: 12.345 },
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await snapToRoads(makePoints(20), 'biking');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://valhalla1.openstreetmap.de/trace_route');
    expect(init.headers['X-Client-Id']).toBe(
      'react-native-nitro-background-geolocation-example'
    );
    const body = JSON.parse(init.body);
    expect(body.costing).toBe('bicycle');
    expect(body.shape_match).toBe('map_snap');
    expect(body.shape).toHaveLength(20);
    expect(body.trace_options.gps_accuracy).toBe(10);

    // Legs concatenated without duplicating the shared boundary point.
    expect(result).toEqual({
      ok: true,
      geometry: {
        type: 'LineString',
        coordinates: [
          [5.1, 52.1],
          [5.2, 52.2],
          [5.3, 52.3],
        ],
      },
      distanceMeters: 12_345,
    });
  });

  it('maps profiles to Valhalla costings', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        trip: {
          legs: [{ shape: encodePolyline([[5.1, 52.1], [5.2, 52.2]]) }],
          summary: { length: 1 },
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await snapToRoads(makePoints(20), 'walking');
    await snapToRoads(makePoints(20), 'driving');

    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).costing).toBe('pedestrian');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).costing).toBe('auto');
  });

  it('downsamples oversized tracks before sending', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        trip: {
          legs: [{ shape: encodePolyline([[5.1, 52.1], [5.2, 52.2]]) }],
          summary: { length: 1 },
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await snapToRoads(makePoints(5000), 'driving');

    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).shape).toHaveLength(4000);
  });

  it('returns no_match for Valhalla error 442', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error_code: 442, error: 'No path could be found for input' },
          400
        )
      )
    );
    const result = await snapToRoads(makePoints(20), 'walking');
    expect(result).toMatchObject({
      ok: false,
      reason: 'no_match',
      message: 'No path could be found for input',
    });
  });

  it('returns rate_limited on HTTP 429', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('slow down', { status: 429 }))
    );
    const result = await snapToRoads(makePoints(20), 'walking');
    expect(result).toMatchObject({ ok: false, reason: 'rate_limited' });
  });

  it('returns bad_response on other HTTP errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('oops', { status: 500 }))
    );
    const result = await snapToRoads(makePoints(20), 'walking');
    expect(result).toMatchObject({ ok: false, reason: 'bad_response' });
  });

  it('returns network on fetch rejection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Network request failed'))
    );
    const result = await snapToRoads(makePoints(20), 'walking');
    expect(result).toMatchObject({
      ok: false,
      reason: 'network',
      message: 'Network request failed',
    });
  });

  it('returns timeout when the request is aborted', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));
    const result = await snapToRoads(makePoints(20), 'walking');
    expect(result).toMatchObject({ ok: false, reason: 'timeout' });
  });

  it('returns bad_response on malformed success bodies', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ unexpected: true }))
    );
    const result = await snapToRoads(makePoints(20), 'walking');
    expect(result).toMatchObject({ ok: false, reason: 'bad_response' });
  });
});
