# Keyless map-matching service research

Research asset for
[Keyless map-matching service per profile](../tickets/002-keyless-map-matching-service.md).
Researched 2026-07-07; both candidate services probed live with curl.

## Decision: FOSSGIS Valhalla, `trace_route`

**Primary service: `https://valhalla1.openstreetmap.de/trace_route`** (POST,
JSON body). Keyless, free, full-planet graph, operated by FOSSGIS e.V.

- **Profiles**: `costing` field — `pedestrian` (walking), `bicycle` (biking),
  `auto` (driving). All three verified working live.
- **Long tracks in one request**: a 5,000-point shape was accepted in a single
  POST (verified live). No chunking/stitching machinery needed for realistic
  tracks; contrast with OSRM below.
- **Request shape** (verified):

  ```json
  {
    "shape": [{ "lat": 52.0907, "lon": 5.1214 }, …],
    "costing": "bicycle",
    "shape_match": "map_snap"
  }
  ```

  Useful extras: `trace_options.gps_accuracy` (meters),
  `trace_options.search_radius` (max 100 m),
  `trace_options.turn_penalty_factor` (docs suggest ~500 to smooth jittery
  pedestrian traces), `use_timestamps` when sending point times.
- **Response geometry**: each `trip.legs[i].shape` is an **encoded polyline
  with 6 decimal digits (polyline6)** — decode client-side (~15-line TS
  function) and feed the coordinate array to a MapLibre GeoJSON line source.
  Concatenate leg shapes if multiple legs appear.
- **Rate limits / policy**: 1 request/user/second, fair-use. FOSSGIS asks
  published apps to **send an identifying `X-Client-Id` header** and say hello
  in their GitHub Discussions. We should set
  `X-Client-Id: react-native-nitro-background-geolocation-example`.

## Runner-up: FOSSGIS OSRM (documented fallback, not used initially)

`https://routing.openstreetmap.de/routed-{car|bike|foot}/match/v1/{driving|bike|foot}/{lon,lat;…}?geometries=geojson&overview=full`

- All three profiles verified live (contrary to older lore that the OSRM demo
  is car-only — that applied to `router.project-osrm.org`; the FOSSGIS
  deployment runs per-profile servers).
- Returns **GeoJSON directly** (simpler than polyline6) and supports
  `radiuses`/`timestamps` params.
- **Hard limit verified live: >100 trace coordinates → `TooBig`.** Long tracks
  would need downsample + overlapping chunks + stitching at 1 req/s — the
  reason Valhalla wins for our long-tracking use case.
- Same fair-use policy family (1 req/s, attribution, valid user agent).

## Client-side preprocessing (applies regardless of service)

- Filter out fixes with terrible accuracy before matching (same hygiene the
  profile-detection heuristic needs).
- Downsample very long tracks to a sane point count (e.g. cap at ~4,000 points
  by distance-based thinning) — the plugin's `distanceFilter` already spaces
  points, so realistic tracks stay well under this.
- Send `gps_accuracy` derived from the track's typical accuracy.

## Failure policy

Matching is a **progressive enhancement**: on HTTP failure, timeout (suggest
~30 s), rate-limit response, or Valhalla error (e.g. `error_code` 442 "no path
could be found"), the UI keeps showing the raw GPS trace with a non-blocking
"couldn't snap to roads — showing raw GPS" notice and a retry action. Never
block the stopped-state route view on the network.

Sources:
- [Valhalla map-matching API reference](https://valhalla.github.io/valhalla/api/map-matching/api-reference/)
- [FOSSGIS Valhalla server announcement / policy](https://github.com/valhalla/valhalla/discussions/3373)
- [routing.openstreetmap.de about/usage policy](https://routing.openstreetmap.de/about.html)
- [OSRM API documentation](https://project-osrm.org/docs/v5.24.0/api/)
- Live curl probes against both services, 2026-07-07 (this document).
