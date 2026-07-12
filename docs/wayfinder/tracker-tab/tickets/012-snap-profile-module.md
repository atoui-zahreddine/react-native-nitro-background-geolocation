---
id: 012
title: Snap-and-profile TS module
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: []
---

## Question

Implement the pure-TS pipeline (no UI, unit-tested) combining
[Profile detection heuristic (walking / biking / driving)](006-profile-detection-heuristic.md)
and [Keyless map-matching service per profile](002-keyless-map-matching-service.md):

- `detectProfile(locations)` — accuracy filter (>50 m), haversine segment
  speeds, dwell removal (<1 km/h), p85 classification at 8 / 28 km/h;
  `{profile, confident}` with sparse-track fallback (<10 moving segments or
  <200 m → walking, not confident).
- `snapToRoads(locations, profile)` — downsample to ≤4,000 points, POST
  Valhalla `trace_route` (`map_snap`, costing map walking→pedestrian /
  biking→bicycle / driving→auto, `gps_accuracy`,
  `X-Client-Id: react-native-nitro-background-geolocation-example`, ~30 s
  timeout), decode polyline6 leg shapes, concatenate → GeoJSON LineString.
  Typed error results for the fallback UI (never throws into the screen).
- Unit tests: profile classification fixtures (walk/bike/drive/mixed/sparse),
  polyline6 decoding, downsampling.

Independent of the app scaffold — can be built and tested in parallel.

## Resolution

Resolved 2026-07-07. Module lives at `apps/example/src/lib/tracking/`
(barrel: `index.ts`); 26 unit tests pass, typecheck and lint clean, and a
live end-to-end probe against the real Valhalla instance matched a short
Utrecht walk through `snapToRoads()` (probe test removed after passing).

**Files:**

- `types.ts` — `TrackPoint` (structural `{latitude, longitude, time,
  accuracy}` subset of the plugin's `Location`, so the module stays pure TS
  with no plugin import), `Profile`, `ProfileDetection`, `LineString`,
  `SnapResult` (discriminated on `ok`) with `SnapFailureReason` =
  `too_few_points | timeout | network | rate_limited | no_match |
  bad_response`.
- `profile.ts` — `detectProfile()` exactly per
  [Profile detection heuristic](006-profile-detection-heuristic.md):
  accuracy ≤ 50 m, defensive time-sort, haversine/Δt segment speeds
  (skipping Δt ≤ 0), dwell < 1 km/h dropped, p85 at 8 / 28 km/h; sparse
  guard (< 10 moving segments or < 200 m) → walking, `confident: false`.
- `polyline.ts` — `decodePolyline`/`encodePolyline` (precision param,
  default 6); decode returns `[lon, lat]` ready for GeoJSON. Encoder exists
  for test fixtures and is exported.
- `snap.ts` — `snapToRoads(points, profile)`: same accuracy filter + sort,
  uniform-stride `downsample()` to ≤ 4,000 keeping endpoints, POST
  `trace_route` with costing walking→`pedestrian` / biking→`bicycle` /
  driving→`auto`, `shape_match: "map_snap"`,
  `trace_options.gps_accuracy` = median accuracy (min 5),
  `X-Client-Id: react-native-nitro-background-geolocation-example`, 30 s
  AbortController timeout. Legs decoded and concatenated dropping the
  shared boundary point; returns `{ok: true, geometry, distanceMeters}`
  (from `trip.summary.length` km). Never throws — every failure path maps
  to a typed reason (429 → `rate_limited`; Valhalla `error_code` 442/444 →
  `no_match`; abort → `timeout`; fetch rejection → `network`; anything
  else → `bad_response`).

**Test setup deviation:** the repo had no test runner, so `vitest@^4.1.10`
was added to the example app (`yarn test` → `vitest run`;
`vitest.config.ts` scopes to `src/lib/**/__tests__`). Tests cover the
polyline5 reference vector + polyline6 round-trips, all profile fixtures
(walk/bike/drive, stop-and-go traffic, mixed-mode dominance, accuracy
filtering, sparse/short/empty/out-of-order tracks), downsampling, request
shape, and every failure mapping (fetch mocked via `vi.stubGlobal`).

**Type note:** react-native's fetch typings clash with the DOM lib
(`AbortSignal`, `response.json(): unknown`) — handled with one localized
cast and typed response shapes in `snap.ts`.

