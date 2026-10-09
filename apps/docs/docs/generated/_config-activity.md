{/* GENERATED from the Config Contract. Do not edit. */}

| Field | Type | Default | Platforms | Units | Description |
| --- | --- | --- | --- | --- | --- |
| `activity.activitiesInterval` | `number` | `10000` | Android, iOS | ms | Rate of activity recognition in milliseconds. Larger values save battery but detect changes later.<br/>**Android:** Rate of the ActivityRecognition API.<br/>**iOS:** Rate of the motion detector. |
| `activity.stopOnStillActivity` | `boolean` | `true` | Android | — | Stop location updates when activity recognition reports STILL. Deprecated upstream. |
