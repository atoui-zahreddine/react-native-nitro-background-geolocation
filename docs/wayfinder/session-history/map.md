---
title: Session history in the example app
labels: [wayfinder:map]
---

# Session history in the example app

## Destination

Browsable session history in `apps/example`: every tracking session is saved
with its raw route, snapped result, detected profile, stats, the exact config
snapshot it ran with, a slice of the native logs, and an events timeline. A
history list opens from the Tracker tab with a per-session detail view;
sessions are exportable as a JSON bundle and kept until manually deleted.
This map carries execution: it is done when history works on-device.

## Notes

- Born from Android field testing (train / bike / walking, July 2026): the
  absence of history made it impossible to compare runs or debug afterwards.
  This redraws the tracker-tab map's out-of-scope boundary — fresh effort, not
  a resumption of [the tracker-tab map](../tracker-tab/map.md).
- **Assemble from existing persistence** (charting decision): slice
  `getLocations()` + `getLogEntries()` by session time-window, record events
  from JS listeners. New native surface only if something proves uncapturable
  (pending the app-kill test ticket).
- The native log DB (`logback.db`) keeps only **7 days** — logs must be copied
  into the session record when the session stops, not referenced lazily.
- The existing session engine **prunes stored locations at next start**
  (tracker-tab decisions [007](../tracker-tab/tickets/007-long-tracking-lifecycle.md),
  [010](../tracker-tab/tickets/010-session-engine.md)) — history capture must
  land before that prune.
- Session capture decisions from the charting grill: capture route + points,
  config snapshot, native logs, events timeline; keep all sessions until
  manually deleted; export as JSON bundle.
- Skills to consult: `/grilling` + `/domain-modeling` for grilling tickets,
  `/prototype` for the UI prototype ticket.
- Tracker mechanics: see `docs/agents/issue-tracker.md` (local markdown
  tracker).

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [Session record schema and storage](tickets/001-session-record-schema.md) — one JSON file per session (documents dir) + AsyncStorage summary index; versioned record with config snapshot (captured at start into the anchor), DEBUG+ uncapped log slice, all-listener events timeline; written at clean stop and by kill-recovery (always before prune); discard deletes from history.
- [What survives app kill](tickets/002-app-kill-survival.md) — code audit: locations and logs survive (sticky service restarts itself), and the existing headless handler already delivers location/stationary/activity events while dead; gap acceptable, **no native event persistence needed** — headless spool-file enhancement folded into the store implementation.
- [History UI prototype](tickets/003-history-ui-prototype.md) — approved as-is: clock button off the Tracker, list = index summaries with RECOVERED badges, detail = one screen with Overview / Config / Logs / Events tabs, config-diff amber dots kept, inline-confirm delete; full spec in the ticket, artifact linked there.
- [Export bundle format](tickets/004-export-bundle-format.md) — versioned envelope (app/library/platform metadata) around the verbatim session record; JSON only, one-way (no import), shared via expo-sharing from the cache dir.

## Not yet specified

- GPX or other alternate export formats beyond the JSON bundle.
- Storage-growth handling if keep-all-sessions becomes heavy in practice.

## Out of scope

- **Syncing history to a server** — history is local debugging tooling for the
  example app.
- **iOS-specific history features beyond parity** — the effort targets the
  shared TS layer; platform-specific extras are not chased.

## Tickets

Open children live in [tickets/](tickets/); frontier = open, unassigned, all
`blocked-by` closed.

| Ticket | Type | Blocked by |
| --- | --- | --- |
| [Session store implementation](tickets/005-session-store-implementation.md) | task | 001 ✓, 002 ✓ |
| [History UI implementation](tickets/006-history-ui-implementation.md) | task | 003 ✓, 005 |
| [Export implementation](tickets/007-export-implementation.md) | task | 004 ✓, 005 |
