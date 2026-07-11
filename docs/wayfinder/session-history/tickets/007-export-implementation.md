---
id: 007
title: Export implementation
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: [004, 005]
---

## Question

Implement session export per the decided bundle format
([Export bundle format](004-export-bundle-format.md)): serialize the stored
record to the bundle schema and hand it to the share sheet from the detail
view. Done when a real session exports and opens cleanly elsewhere.

## Resolution

Landed 2026-07-11 (commits `4567458` + follow-up), TDD, 53 vitest tests
green, tsc + lint clean.

- Pure codec `export.ts` (tested): `buildExportBundle` per the decided
  envelope (bundleVersion 1, app/library versions from the package.jsons,
  platform metadata) around the verbatim record; `exportFilename` →
  `bg-geo-session-<UTC start>-<profile>.json` with an `unprofiled` fallback.
- Thin IO `exportStore.ts`: writes the bundle to the cache dir via
  expo-file-system and hands it to the share sheet via newly-added
  `expo-sharing@~55.0.21`.
- The detail screen's Export pill (left disabled by the UI ticket) is wired:
  shows "Exporting…" while the share sheet is in flight; failures are logged,
  never thrown at the UI.

**Side discovery, worth knowing:** `.gitignore`'s bob pattern `lib/` had been
silently ignoring `apps/example/src/lib/` — the entire tracking pipeline
(including the earlier tracker-tab modules) had never actually been
committed. Fixed with a `!/apps/example/src/lib/` re-include; all 24 lib
files are now tracked. A stray `perho` line in `.gitignore` was removed in
the same fix.
