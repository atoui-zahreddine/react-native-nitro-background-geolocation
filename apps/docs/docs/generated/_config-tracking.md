{/* GENERATED from the Config Contract. Do not edit. */}

| Field | Type | Default | Platforms | Units | Description |
| --- | --- | --- | --- | --- | --- |
| `tracking.locationProvider` | `LocationProvider` | `LocationProvider.DISTANCE_FILTER` | Android, iOS | — | Native provider strategy. See the provider pages for how each one behaves. |
| `tracking.desiredAccuracy` | `LocationAccuracy` | `LocationAccuracy.MEDIUM` | Android, iOS | — | Desired accuracy in meters. Lower accuracy usually reduces power drain.<br/>**Android:** Maps to a fused location request priority.<br/>**iOS:** Maps to a CLLocationAccuracy tier. |
| `tracking.stationaryRadius` | `number` | `50` | Android, iOS | m | Radius in meters the device must leave before aggressive tracking resumes after it stops. |
| `tracking.distanceFilter` | `number` | `50` | Android, iOS | m | Base distance in meters between updates. Elastic: the Distance Filter provider adds a speed penalty, so points thin out as speed increases.<br/>**Android:** The Activity provider ignores it; use interval to control its cadence. |
| `tracking.interval` | `number` | `5000` | Android | ms | Minimum time between updates, applied by the OS in every Android provider. Caps the point rate regardless of movement. |
| `tracking.fastestInterval` | `number` | `1000` | Android | ms | Fastest rate the app accepts updates when other apps request locations faster than interval. |
| `tracking.pauseLocationUpdates` | `boolean` | `false` | iOS | — | Let the system pause location updates automatically. |
| `tracking.saveBatteryOnBackground` | `boolean` | `false` | iOS | — | Reduce accuracy in the background to save battery. |
| `tracking.activityType` | `ActivityType` | `ActivityType.OtherNavigation` | iOS | — | Journey hint CoreLocation uses to decide when to pause updates. Not activity recognition. |
