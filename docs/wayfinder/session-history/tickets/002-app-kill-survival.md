---
id: 002
title: What survives app kill
labels: [wayfinder:task]
status: open
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
