---
id: 004
title: Provider fixes implementation
labels: [wayfinder:task]
status: open
assignee:
blocked-by: [002]
---

## Question

Apply the decided changes
([Decide provider and interval behavior changes](002-provider-interval-decisions.md))
in `packages/react-native-nitro-background-geolocation`: Activity-provider
`distanceFilter` handling, any default changes in `Config.java` (mirrored in
the example settings fallbacks), and the JSDoc clarifications in
`NitroBackgroundGeolocation.nitro.ts`. Build green on both platforms;
existing tests pass.

## Resolution
