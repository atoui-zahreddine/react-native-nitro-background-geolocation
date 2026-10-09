{/* GENERATED from the Config Contract. Do not edit. */}

| Field | Type | Default | Platforms | Units | Description |
| --- | --- | --- | --- | --- | --- |
| `lifecycle.stopOnTerminate` | `boolean` | `true` | Android, iOS | — | Stop tracking when the application is terminated.<br/>**Android:** `false` keeps the service alive and runs the headless task.<br/>**iOS:** `false` enables native continuation after the app is terminated. |
| `lifecycle.startOnBoot` | `boolean` | `false` | Android | — | Start the background service when the device boots. |
