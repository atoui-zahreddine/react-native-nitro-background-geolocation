---
sidebar_position: 5
---

# HTTP Posting

The plugin can post recorded locations to your server. Configure a `url` and locations will be POSTed as they are recorded; configure a `syncUrl` and locations that previously failed to post can be batched and retried.

## Quick start

```ts
await BackgroundGeolocation.configure({
  url: 'https://your-server.com/locations',
  syncUrl: 'https://your-server.com/sync',
  syncThreshold: 100,
  httpHeaders: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json',
  },
});
```

## Default body

By default each POST contains a single Location object serialized as JSON. Override the shape with [`postTemplate`](./configuration#posttemplate):

```ts
await BackgroundGeolocation.configure({
  url: 'https://your-server.com/locations',
  postTemplate: {
    lat: '@latitude',
    lon: '@longitude',
    timestamp: '@time',
    accuracy: '@accuracy',
    deviceId: 'fixed-device-id',
  },
});
```

Placeholders: `@latitude`, `@longitude`, `@time`, `@accuracy`, `@speed`, `@altitude`, `@bearing`, `@provider`, `@id`.

`postTemplate` accepts both object and array shapes, and nested values.

## Sync vs immediate post

| | `url` | `syncUrl` |
|---|---|---|
| When | Immediately for each new location | Batch retries for locations that failed `url` posts |
| Trigger | Each location event | When pending count exceeds `syncThreshold`, or `forceSync()` is called |
| Body | Single object (or `postTemplate` applied to one location) | Array of objects |

## forceSync

Force an immediate batch sync, ignoring `syncThreshold`:

```ts
await BackgroundGeolocation.forceSync();
```

## Server response signals

- **HTTP 200/204** — location accepted and removed from storage.
- **HTTP 401/403** — fires [`onHttpAuthorization`](./events). Locations are kept for retry.
- **HTTP `285`** — fires [`onAbortRequested`](./events). The plugin treats this as "server has enough data, stop posting for now."
- **Network failure or 5xx** — location remains in local storage and is retried via `syncUrl`.

## Pulling stored locations manually

If your server is unavailable and you want to drain the queue in JS:

```ts
const locations = await BackgroundGeolocation.getValidLocationsAndDelete();
await sendToMyServer(locations);
```

This atomically reads and marks them deleted so they aren't returned again.
