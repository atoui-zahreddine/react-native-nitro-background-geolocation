{/* GENERATED from the Config Contract. Do not edit. */}

| Field | Type | Default | Platforms | Units | Description |
| --- | --- | --- | --- | --- | --- |
| `http.url` | `string` | `""` | Android, iOS | — | Server URL that receives immediate HTTP POSTs for recorded locations. Empty disables posting. |
| `http.syncUrl` | `string` | `""` | Android, iOS | — | Server URL that receives batched retries for locations that previously failed to post. |
| `http.syncThreshold` | `number` | `100` | Android, iOS | 1–1000 locations | Number of failed locations to batch together before syncing to syncUrl. |
| `http.httpHeaders` | `Record<string, string> \| null` | `null` | Android, iOS | — | HTTP headers sent with every location POST. Pass null to send none. |
| `http.postTemplate` | `AnyMap \| null` | `null` | Android, iOS | — | Custom POST body template for url and syncUrl. Supports placeholders such as @latitude. Pass null for the native default template. |
