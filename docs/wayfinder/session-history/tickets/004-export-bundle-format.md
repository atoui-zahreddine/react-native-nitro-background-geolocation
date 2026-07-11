---
id: 004
title: Export bundle format
labels: [wayfinder:grilling]
status: closed
assignee:
blocked-by: [001]
---

## Question

What does an exported session bundle look like, and how is it shared?

- JSON schema for the bundle (likely the stored record itself, versioned, plus
  app/library version metadata so a shared bundle is self-describing for
  debugging).
- Share mechanism from the detail view (native share sheet with a file, e.g.
  via `expo-sharing`), and filename convention.
- Whether the bundle should be directly re-importable/viewable, or is a
  one-way debugging artifact for now.

## Resolution

Grilled 2026-07-11.

**Bundle = envelope + record, JSON only, one-way.**

```jsonc
{
  "bundleVersion": 1,
  "exportedAt": 0,                    // UTC ms
  "app": { "name": "example", "version": "…" },
  "library": { "name": "react-native-nitro-background-geolocation", "version": "…" },
  "platform": { "os": "android", "osVersion": "…", "device": "…" },
  "session": { /* the stored session record verbatim (its own version: 1) */ }
}
```

- The session record travels **verbatim** — it is already versioned and
  complete (points, snap, config snapshot, logs, events). No trimming: full
  logs are the point of the feature.
- **JSON only for now** — GPX stays in the map's fog until a real need
  appears.
- **One-way** — no in-app import; a shared bundle is read outside the app.
- Mechanics: write the bundle to the cache dir and hand it to the native
  share sheet via `expo-sharing`; filename
  `bg-geo-session-<startedAt ISO, filesystem-safe>-<profile>.json`
  (e.g. `bg-geo-session-2026-07-11T0812-walking.json`).
