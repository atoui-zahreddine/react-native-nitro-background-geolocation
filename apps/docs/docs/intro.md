---
sidebar_position: 1
---

# Introduction

`react-native-nitro-background-geolocation` is a high-performance background location tracker for React Native, built on [Nitro Modules](https://nitro.margelo.com/). It tracks the device's location in the foreground and background, batches updates, and posts them to a configured server.

## What it does

- Background location tracking on iOS and Android
- Multiple [Location Providers](./providers/distance-filter): distance-filter, activity-based, raw
- Built-in [HTTP posting](./http-posting) with batching and a configurable [Post Template](./configuration#posttemplate)
- [Headless tasks](./headless-tasks) on Android for execution after app termination
- iOS [native continuation](./platform-quirks#ios-native-continuation) for relaunch on location events
- TypeScript-first API with typed event subscriptions

## What it is not

- It is **not** a 1:1 port of `cordova-background-geolocation-plugin`. Functional parity is the goal; API shape follows Nitro idioms (sync where fast, Promises for I/O, typed enums for constants).
- It does **not** support the legacy React Native bridge — new architecture only.
- It does **not** auto-include location permissions — declare them yourself in `AndroidManifest.xml` and `Info.plist`.

See [Getting Started](./getting-started) to install and use it.
