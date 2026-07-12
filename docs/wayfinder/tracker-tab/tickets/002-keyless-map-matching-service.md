---
id: 002
title: Keyless map-matching service per profile
labels: [wayfinder:research]
status: closed
assignee:
blocked-by: []
---

## Question

Which free, keyless map-matching (snap-to-road) service do we call, and how does
it handle the three profiles (walking, biking, driving)?

To resolve:

- Evaluate the public OSRM demo server (`router.project-osrm.org` `/match`) —
  note it is widely reported to serve the **driving profile only**; confirm.
- Evaluate the FOSSGIS public Valhalla instance (`valhalla1.openstreetmap.de`
  `/trace_route` or `/trace_attributes`) — supports `costing` of `auto`,
  `bicycle`, `pedestrian`; check usage policy, rate limits, max points per
  request.
- Any other keyless candidates.
- How to handle long tracks: point count limits per request, downsampling or
  chunking strategy, and stitching chunked responses back into one route.
- Response geometry format (polyline5/polyline6/GeoJSON) and how it maps onto a
  MapLibre line source.
- Failure behavior: what the UI should do when the service is down or the track
  is rejected (fall back to showing the raw route).

Deliverable: a linked markdown summary naming the chosen service, request
shape per profile, chunking rules, and fallback policy.

## Resolution

Resolved 2026-07-07 — full detail in
[the research summary](../assets/002-map-matching-research.md); both services
probed live.

- **Chosen: FOSSGIS Valhalla** — `POST https://valhalla1.openstreetmap.de/trace_route`
  with `costing` of `pedestrian` / `bicycle` / `auto` and
  `shape_match: "map_snap"`. Keyless; 1 req/s fair use; send an
  `X-Client-Id: react-native-nitro-background-geolocation-example` header.
- **Long tracks fit one request** (5,000 points verified live) — no chunking
  needed; still downsample extreme tracks (~4,000-point cap) and pre-filter
  low-accuracy fixes.
- Response legs carry **polyline6-encoded** shapes → decode client-side into a
  MapLibre GeoJSON line source.
- **Fallback policy**: snapping is progressive enhancement — on any
  failure/timeout show the raw GPS trace with a notice + retry, never block.
- Runner-up documented: FOSSGIS OSRM per-profile match endpoints return GeoJSON
  directly but reject >100 coordinates per request (verified `TooBig`), which
  kills it for long tracking.
