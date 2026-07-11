---
id: 002
title: What survives app kill
labels: [wayfinder:task]
status: closed
assignee:
blocked-by: []
---

## Question

Device test (HITL): with the JS-assembly approach, what is lost when the app
is killed (or the device reboots) mid-session?

- Locations and native logs persist natively (SQLite), so they should survive —
  verify on-device.
- Events are broadcast-only: JS listeners miss everything while the app is
  dead. Quantify the gap (which events, how often in a realistic
  walk-with-kill scenario) by comparing the JS-captured timeline against the
  native log slice for the same window.
- Decide: is the gap acceptable (events reconstructable well enough from the
  log slice), or does the library need native event persistence? The answer
  gates the session store implementation and either dissolves or graduates the
  "native event persistence" fog on the map.

## Resolution

Resolved 2026-07-11 by code audit (Android native + example wiring) rather
than a physical kill test; the residual empirical check is folded into
[Session store implementation](005-session-store-implementation.md)'s
on-device acceptance.

**What survives process death (Android):**

- **Locations — survive and keep accruing.** `LocationServiceImpl` is
  `START_STICKY` (`onStartCommand`, lines 272-299): when the OS restarts the
  killed service with a null intent it calls `start()` and tracking resumes;
  `onTaskRemoved` keeps the service alive on swipe-away when
  `stopOnTerminate: false`. All fixes land in native SQLite regardless of JS.
- **Logs — survive.** The SQLite log appender runs in the service process and
  resumes with the sticky restart; `getLogEntries()` reads it after relaunch.
  Service lifecycle ("Stopping self" / "Continue running in background",
  restarts) is itself logged, so the log slice doubles as a lifecycle record.
- **Events — partially, via headless.** JS listeners die with the app, but the
  already-registered headless handler (`registerHeadless.ts`) receives
  `location`, `stationary`, and `activity` events in a fresh JS context while
  the app is dead (`runHeadlessTask` dispatch at `LocationServiceImpl.java:570/600/624`).
  Events headless does NOT carry (start/stop/error/authorization/
  foreground/background) cannot occur meaningfully while the app is dead or
  are reconstructable from the native log slice.

**Decision: the gap is acceptable — no native event persistence needed.**
The JS-assembly approach stands. Enhancement folded into the store
implementation: extend the headless handler from log-only to appending
`stationary`/`activity` events to a spool file that recovery merges into the
`recovered` session's events timeline. Caveat recorded: a user-initiated
force-stop from system settings halts everything until next launch (Android
platform rule) — out of anyone's control, and the recovery path still
finalizes the partial session.

This dissolves the map's "native event persistence" fog item.
