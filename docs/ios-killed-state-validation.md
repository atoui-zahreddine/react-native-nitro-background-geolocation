# iOS Killed-State Validation Workflow

Repeatable steps for validating that `stopOnTerminate: false` produces native continuation on iOS. Physical device required — simulator results are inconclusive per Apple documentation.

## Prerequisites

- Physical iPhone connected or wireless debugging enabled
- Xcode installed
- Example app source ready (`example/`)

## Build a Release app (no Metro dependency)

```bash
cd example

# Generate native project if using Expo CNG
npx expo prebuild --platform ios --clean

# Build Release configuration
npx expo run:ios --configuration Release --device
```

After install completes, **kill Metro and any Expo dev-client process**. The Release app must run standalone without a dev server.

## Validation steps

1. **Launch the app** by tapping its icon (not via Expo CLI).
2. **Tap Configure** — ensure `stopOnTerminate: false` is set (default in example app).
3. **Tap Start Tracking** — wait for at least 2-3 location entries in the log.
4. **Tap Stored Locations** — note the total count (e.g. "Stored: 42 total, 42 pending sync").
5. **Kill the app** — swipe up from the app switcher. Do not use Stop Tracking.
6. **Move** — walk or drive far enough to trigger significant-location change (~500m+). Wait at least 5 minutes.
7. **Reopen the app** by tapping its icon.
8. **Tap Stored Locations** again — compare the total count.

## Expected result

If native continuation is working:
- The stored location count **increased** between step 4 and step 8.
- On-launch logs may show native debug entries from the killed period.
- `checkStatus()` may show `isRunning: true` immediately after relaunch.

If the count did not increase:
- Check native logs via Xcode Console (filter by the app's process name) for `onAppTerminate`, `startMonitoringSignificantLocationChanges`, and `didFinishLaunchingWithOptions` with location key.
- Verify the bootstrap shim loaded: search for `NitroBackgroundGeolocationBootstrap` in Xcode Console.
- Ensure the device was not in Low Power Mode (throttles background location).
- Ensure Location Services authorization is "Always", not "While Using".

## Why simulator is insufficient

Apple's significant-location-change API behavior in the simulator does not match real hardware. The simulator may not relaunch a terminated app on simulated location changes. A passing simulator test is encouraging but not proof; a failing simulator test is not evidence of a bug.
