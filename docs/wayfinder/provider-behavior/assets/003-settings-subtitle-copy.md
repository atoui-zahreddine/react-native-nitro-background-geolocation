# Settings subtitle copy

Deliverable for
[Settings subtitle copy for all options](../tickets/003-settings-subtitle-copy.md).
Implementation is [ticket 005](../tickets/005-settings-subtitles-implementation.md).

Keyed to the rows in `apps/example/src/app/settings.tsx` (27 control rows,
grouped by its `Section`s). Semantics reflect the decisions in
[ticket 002](../tickets/002-provider-interval-decisions.md).

## Presentation rules (decided in 003)

- **Length:** variable, no hard cap — each row gets what it needs; simple rows
  stay short, tricky ones (interval, distanceFilter) carry the caveat.
- **Applicability:** in prose. Which *provider* honors an option is written into
  the subtitle text. Which *OS* is already shown by the existing platform pill
  next to the label — do **not** repeat "(Android)" / "(iOS)" in prose.
- **Per-choice descriptions:** only the **Location provider** picker gets a line
  per choice (Distance / Activity / Raw). All other segmented rows (Desired
  accuracy, Activity type) get a single row subtitle.

## Copy

### Section 1 — Provider & accuracy

- **Location provider** — row: `How locations are collected. Each provider trades points against battery differently.`
  - **Distance** — `Elastic distance filtering with stationary detection. Balanced points vs battery — the best all-round default.`
  - **Activity** — `Fused, motion-driven updates (walking, driving, still). Paced by Update interval; does not use Distance filter.`
  - **Raw** — `Unfiltered OS fixes at the update interval. Most points and highest battery use; no stationary detection.`
- **Desired accuracy** — `Precision requested from the OS. Higher accuracy costs battery, and the device may still return coarser fixes.`
- **Distance filter** — `Minimum distance moved before a point is recorded. Applies to the Distance provider only — the Activity provider ignores it. Default 50 m.`
- **Stationary radius** — `While stopped, how far you must move before aggressive tracking re-engages. Used by the Distance provider's stationary detection. Default 50 m.`
- **Debug (sounds & notifications)** — `Plays sounds and shows debug notifications on tracking events. For development only.`

### Section 2 — Lifecycle

- **Stop on app terminate** — `When on, tracking stops if the app is killed. Turn off to keep recording after the app is swiped away.`
- **Start on boot** — `Resume tracking automatically after the device restarts.`
- **Stop on still activity** — `Pause updates when the device is detected as still. Deprecated upstream — leave on unless you need fixes while stationary.`

### Section 3 — Intervals

- **Update interval** — `Target time between updates. An OS-level floor applied to every provider — it caps the point rate even in Distance mode. Raise to save battery, lower for denser tracks. Default 5000 ms (5 s).`
- **Fastest interval** — `Fastest rate the app will accept updates when another app requests locations faster. Sets the tightest spacing between points. Default 1000 ms.`
- **Activities interval** — `How often motion type is sampled (walking, driving, still). Larger values save battery but slow detection. Default 10000 ms.`

### Section 4 — Foreground notification

- **Notifications enabled** — `Show the persistent tracking notification. Required for reliable background tracking.`
- **Start foreground service** — `Run tracking as a foreground service — this is what keeps location flowing without background-location permission.`
- **Notification title** — `Title shown on the tracking notification.`
- **Notification text** — `Body text shown on the tracking notification.`
- **Icon color** — `Accent color for the notification icon, as a #RRGGBB hex value.`
- **Large icon (resource name)** — `Drawable resource name for the notification's large icon.`
- **Small icon (resource name)** — `Drawable resource name for the status-bar icon. Falls back to the app icon if unset.`

### Section 5 — iOS behavior

- **Activity type** — `Tells iOS your motion type so it tunes GPS and auto-pause. Match it to how you're moving (driving, navigation, fitness).`
- **Pause location updates** — `Let iOS pause updates when it thinks you've stopped moving. Saves battery but can miss slow movement.`
- **Save battery on background** — `Reduce update frequency while the app is in the background to save power.`

### Section 6 — HTTP sync

- **Post URL** — `Endpoint each recorded location is POSTed to. Leave blank to record on-device only.`
- **Sync URL** — `Endpoint for batched uploads, triggered by Sync threshold. Leave blank to disable syncing.`
- **Sync threshold** — `Number of locations to buffer before a batch is synced to the Sync URL.`
- **HTTP headers** (advanced) — `Custom headers sent with every location request, e.g. Authorization.`
- **Post template** (advanced) — `Reshape the request body as JSON using @latitude, @longitude, and other placeholders. Leave blank for the default payload.`

### Section 7 — Storage

- **Max stored locations** — `How many locations to keep on-device before the oldest are dropped.`

## Notes for implementation (005)

- Defaults quoted above are the **native** defaults from
  `NitroBackgroundGeolocation.nitro.ts`. The example app seeds some rows from
  `LONG_TRACKING_BASELINE` (e.g. `stationaryRadius: 25`), so the *displayed
  value* may differ from the quoted default — that's expected; the subtitle
  describes the option, not the current value.
- OS applicability is conveyed by the existing platform pill, so prose omits it.
  Provider applicability (Distance vs Activity) appears only where it matters:
  `distanceFilter`, `stationaryRadius`, and the provider choices themselves.
