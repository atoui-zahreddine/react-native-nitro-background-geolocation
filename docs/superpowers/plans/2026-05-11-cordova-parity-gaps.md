# Cordova Plugin Parity Gaps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do NOT add Co-Authored-By lines in git commits.

**Goal:** Close all functional gaps between the Cordova plugin and the Nitro module's Android implementation so the Nitro module has 100% feature parity.

**Architecture:** The Nitro module wraps `BackgroundGeolocationFacade` (Java) via a Kotlin `HybridObject`. The facade communicates with the location service via `LocalBroadcastManager` and a `PluginDelegate` interface. The gaps fall into four areas: (1) missing lifecycle management (`pause`/`resume`/`destroy`), (2) broken Cordova-native headless task registration, (3) missing API methods (`showAppSettings`, `showLocationSettings`), and (4) a missing `altitudeAccuracy` field on the Location type.

## iOS Direction

The task list below is Android-focused, but the current iOS parity direction has also been resolved and should guide any follow-up implementation work:

- First iOS milestone targets **Cordova parity**, not new iOS behavior design.
- `headlessTaskName` and headless JS delivery stay **Android-only** for the first milestone.
- iOS `stopOnTerminate: false` keeps **Cordova-style native continuation** semantics: native monitoring may continue, persisted data may appear after location-triggered relaunch, and killed-state JS replay is out of scope.
- The concrete missing iOS parity behavior is the Cordova `onFinishLaunching` location-relaunch path: when launched with `UIApplicationLaunchOptionsLocationKey` and `stopOnTerminate == false`, the library should restart tracking and switch to background mode.
- The iOS parity fix should stay **internal to the library**, not require host AppDelegate changes and not depend on Expo `TaskManager`.
- The preferred implementation shape is: minimal Objective-C bootstrap shim for host-agnostic startup, Swift-owned coordinator logic, one shared native owner around the existing facade, and bridge attachment as an opportunistic JS delegate rather than the source of native truth.
- Public docs should continue to describe iOS killed-state behavior as native continuation plus persisted state, not killed-state JS execution.

**Tech Stack:** Kotlin, TypeScript (Nitro `.nitro.ts` spec), React Native, Nitro Modules, `ProcessLifecycleOwner` (AndroidX Lifecycle)

**Important build notes:**
- After changing the `.nitro.ts` spec, run `npx nitro-codegen` from the project root to regenerate the C++/Kotlin bridge code
- Build and test using `npx expo prebuild --platform android --clean && npx expo run:android` from the `example/` directory — do NOT run Gradle directly
- The example app is at `example/` with entry point `example/index.js` and main component `example/src/App.tsx`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/NitroBackgroundGeolocation.nitro.ts` | Modify | Add `altitudeAccuracy` to `Location`/`StationaryLocation`, add `showAppSettings()`, `showLocationSettings()` methods |
| `src/index.tsx` | Modify | Forward new methods through singleton wrapper |
| `android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/NitroBackgroundGeolocation.kt` | Modify | Add lifecycle observer, implement new methods, fix headless task registration, call `facade.pause()`/`resume()`/`destroy()` |
| `android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/ConfigMapper.kt` | Modify | Map `altitudeAccuracy` field |
| `android/build.gradle` | Modify | Add `androidx.lifecycle:lifecycle-process` dependency |
| `README.md` | Modify | Document new methods |
| `example/src/App.tsx` | Modify | Add buttons for `showAppSettings`/`showLocationSettings` to verify they work |

---

### Task 1: Add lifecycle management (pause/resume/destroy)

**Context:** The Cordova plugin calls `facade.pause()` on `onPause`, `facade.resume()` on `onResume`, and `facade.destroy()` on `onDestroy`. These calls are critical because:
- `pause()` sets `mIsPaused = true` and calls `mService.startForeground()` — ensuring the service stays alive when the app goes to background
- `resume()` sets `mIsPaused = false` and calls `mService.stopHeadlessTask()` — stops the Cordova-native headless runner when the app comes back
- `destroy()` unregisters broadcast receivers and, if `stopOnTerminate: false`, calls `mService.startHeadlessTask()` — enables the Cordova-native headless task system when the Activity is killed

The Nitro module never calls any of these. We need to observe app lifecycle using AndroidX `ProcessLifecycleOwner`.

**Files:**
- Modify: `android/build.gradle`
- Modify: `android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/NitroBackgroundGeolocation.kt`

- [ ] **Step 1: Add lifecycle-process dependency**

In `android/build.gradle`, add to the `dependencies` block:

```gradle
implementation "androidx.lifecycle:lifecycle-process:2.8.7"
```

- [ ] **Step 2: Implement DefaultLifecycleObserver in NitroBackgroundGeolocation.kt**

Add these imports at the top of `NitroBackgroundGeolocation.kt`:

```kotlin
import android.os.Handler
import android.os.Looper
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
```

Change the class declaration to also implement `DefaultLifecycleObserver`:

```kotlin
class NitroBackgroundGeolocation : HybridNitroBackgroundGeolocationSpec(), PluginDelegate, DefaultLifecycleObserver {
```

Add an `init` block that registers the lifecycle observer on the main thread (ProcessLifecycleOwner requires main thread):

```kotlin
init {
    Handler(Looper.getMainLooper()).post {
        ProcessLifecycleOwner.get().lifecycle.addObserver(this)
    }
}
```

Add the lifecycle callback methods after the `removeAllListeners()` method, before the `PluginDelegate implementation` section:

```kotlin
// ================================================================
//  Lifecycle observer (foreground/background/destroy)
// ================================================================

override fun onStart(owner: LifecycleOwner) {
    Log.d(TAG, "App entered foreground")
    facade.resume()
    foregroundCallbacks.forEach { it() }
}

override fun onStop(owner: LifecycleOwner) {
    Log.d(TAG, "App entered background")
    facade.pause()
    backgroundCallbacks.forEach { it() }
}
```

**Note:** `DefaultLifecycleObserver.onStart` has signature `onStart(owner: LifecycleOwner)` while the existing `onStart` event subscription method has signature `onStart(callback: () -> Unit): () -> Unit`. These are different overloads so there is no conflict. However, the existing `HybridNitroBackgroundGeolocationSpec` already generates an `onStart` method. To avoid conflicts, keep the lifecycle methods and check at build time — if there's a name collision, rename the lifecycle methods to `onAppStart`/`onAppStop` and call them from private wrappers. The Kotlin compiler will differentiate by parameter types.

- [ ] **Step 3: Add cleanup in the HybridObject's dispose/destructor**

Override `finalize()` or Nitro's memory release to call `facade.destroy()` when the HybridObject is garbage collected. Add after the lifecycle observer methods:

```kotlin
override fun onDestroy(owner: LifecycleOwner) {
    Log.d(TAG, "App process destroyed")
    ProcessLifecycleOwner.get().lifecycle.removeObserver(this)
    facade.destroy()
}
```

- [ ] **Step 4: Build and verify**

```bash
cd example && npx expo prebuild --platform android --clean && npx expo run:android
```

Check logcat for:
- `NitroBGGeo: App entered foreground` when opening the app
- `NitroBGGeo: App entered background` when pressing home
- No crashes

- [ ] **Step 5: Commit**

```bash
git add android/build.gradle android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/NitroBackgroundGeolocation.kt
git commit -m "feat: add lifecycle management (pause/resume/destroy) via ProcessLifecycleOwner"
```

---

### Task 2: Fix Cordova-native headless task registration

**Context:** The facade's `registerHeadlessTask(className)` passes a string to `TaskRunnerFactory.getTaskRunner(className)` which does `Class.forName(className).newInstance()`. The current code passes `"BackgroundGeolocationHeadlessTask"` — a JS task name, not a Java class. This causes a silent `ClassNotFoundException` inside `LocationServiceImpl.startHeadlessTask()`.

This means the service's built-in headless task runner (`runHeadlessTask()` in `LocationServiceImpl`) never works. The Nitro module's `fireHeadlessTask()` (which uses React Native's `HeadlessJsTaskService`) is what actually delivers events — and it works fine.

The fix: **stop calling `facade.registerHeadlessTask()`** with the JS task name. The Cordova-native headless system uses a Java `TaskRunner` class for in-process JS evaluation (via `JsEvaluator`/WebView) which is a Cordova-specific mechanism. In the Nitro module, we use React Native's `HeadlessJsTaskService` instead — our `fireHeadlessTask()` method already handles this correctly.

**Files:**
- Modify: `android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/NitroBackgroundGeolocation.kt`

- [ ] **Step 1: Remove the facade.registerHeadlessTask call**

In `NitroBackgroundGeolocation.kt`, in the `configure()` method, remove these lines:

```kotlin
if (headlessTaskName.isNotEmpty()) {
    facade.registerHeadlessTask(headlessTaskName)
}
```

The `headlessTaskName` field is still stored and used by `fireHeadlessTask()` — that's the correct mechanism for React Native.

- [ ] **Step 2: Build and verify**

```bash
cd example && npx expo run:android
```

Configure the plugin and start tracking. Check logcat — headless task events should still appear via `[HeadlessTask]` logs from `ReactNativeJS`. There should be no `ClassNotFoundException` or `Headless task start failed` in the logs.

- [ ] **Step 3: Commit**

```bash
git add android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/NitroBackgroundGeolocation.kt
git commit -m "fix: remove broken Cordova-native headless task registration

The facade.registerHeadlessTask() expects a Java class name for Cordova's
in-process JS evaluator, not a React Native task name. Headless events are
correctly delivered via HeadlessJsTaskService.fireHeadlessTask() instead."
```

---

### Task 3: Add `altitudeAccuracy` to Location types

**Context:** The Cordova plugin's event docs list `altitudeAccuracy` as a location field. The native `BackgroundLocation` class has `verticalAccuracy` (and `hasVerticalAccuracy`). The Nitro module's `Location` and `StationaryLocation` interfaces are missing this field.

**Files:**
- Modify: `src/NitroBackgroundGeolocation.nitro.ts`
- Modify: `android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/ConfigMapper.kt`

- [ ] **Step 1: Add `altitudeAccuracy` to the TypeScript spec**

In `src/NitroBackgroundGeolocation.nitro.ts`, add `altitudeAccuracy` to both `Location` and `StationaryLocation` interfaces.

In the `Location` interface, after the `altitude` field:

```typescript
export interface Location {
  id: number;
  provider: string;
  locationProvider: number;
  time: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  altitude: number;
  altitudeAccuracy: number;
  bearing: number;
  isFromMockProvider: boolean;
  mockLocationsEnabled: boolean;
}
```

In the `StationaryLocation` interface, after the `altitude` field:

```typescript
export interface StationaryLocation {
  id: number;
  provider: string;
  locationProvider: number;
  time: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  altitude: number;
  altitudeAccuracy: number;
  bearing: number;
  isFromMockProvider: boolean;
  mockLocationsEnabled: boolean;
  radius: number;
}
```

- [ ] **Step 2: Run Nitrogen codegen**

```bash
cd /Users/user/IdeaProjects/react-native-nitro-background-geolocation && npx nitro-codegen
```

This regenerates the C++/Kotlin bridge code to include the new field.

- [ ] **Step 3: Update ConfigMapper.kt**

In `ConfigMapper.kt`, update `toJsLocation()` to include the new field. The `BackgroundLocation` class exposes `verticalAccuracy` as a float field (check `hasVerticalAccuracy`). Add after the `altitude` mapping:

```kotlin
fun toJsLocation(location: BackgroundLocation): Location {
    return Location(
        id = (location.locationId ?: 0L).toDouble(),
        provider = location.provider ?: "",
        locationProvider = (location.locationProvider ?: 0).toDouble(),
        time = location.time.toDouble(),
        latitude = location.latitude,
        longitude = location.longitude,
        accuracy = location.accuracy.toDouble(),
        speed = location.speed.toDouble(),
        altitude = location.altitude,
        altitudeAccuracy = if (location.hasVerticalAccuracy()) location.verticalAccuracy.toDouble() else 0.0,
        bearing = location.bearing.toDouble(),
        isFromMockProvider = location.isFromMockProvider,
        mockLocationsEnabled = location.areMockLocationsEnabled()
    )
}
```

Do the same for `toJsStationaryLocation()`:

```kotlin
fun toJsStationaryLocation(location: BackgroundLocation): StationaryLocation {
    return StationaryLocation(
        id = (location.locationId ?: 0L).toDouble(),
        provider = location.provider ?: "",
        locationProvider = (location.locationProvider ?: 0).toDouble(),
        time = location.time.toDouble(),
        latitude = location.latitude,
        longitude = location.longitude,
        accuracy = location.accuracy.toDouble(),
        speed = location.speed.toDouble(),
        altitude = location.altitude,
        altitudeAccuracy = if (location.hasVerticalAccuracy()) location.verticalAccuracy.toDouble() else 0.0,
        bearing = location.bearing.toDouble(),
        isFromMockProvider = location.isFromMockProvider,
        mockLocationsEnabled = location.areMockLocationsEnabled(),
        radius = location.radius.toDouble()
    )
}
```

**Note:** Access the field via `location.verticalAccuracy` (it's a public float field, not a getter method). Check the `BackgroundLocation.java` source — the field is named `verticalAccuracy` at line 31 and `hasVerticalAccuracy` at line 37. If the compiler requires getter syntax, use `location.getVerticalAccuracy()` and `location.hasVerticalAccuracy()`.

- [ ] **Step 4: Update headless task params**

In `NitroBackgroundGeolocation.kt`, update `fireHeadlessTask()` to include `altitudeAccuracy` in the JSON. After the `"altitude"` put:

```kotlin
val params = JSONObject().apply {
    put("id", location.locationId)
    put("provider", location.provider)
    put("locationProvider", location.locationProvider)
    put("time", location.time)
    put("latitude", location.latitude)
    put("longitude", location.longitude)
    put("accuracy", location.accuracy)
    put("speed", location.speed)
    put("altitude", location.altitude)
    put("altitudeAccuracy", if (location.hasVerticalAccuracy()) location.verticalAccuracy else 0.0f)
    put("bearing", location.bearing)
    put("isFromMockProvider", location.isFromMockProvider)
    put("mockLocationsEnabled", location.areMockLocationsEnabled())
    if (eventName == "stationary") {
        put("radius", location.radius)
    }
}
```

- [ ] **Step 5: Build and verify**

```bash
cd example && npx expo prebuild --platform android --clean && npx expo run:android
```

Start tracking and check that location events include `altitudeAccuracy` in both the `onLocation` callback and the headless task log.

- [ ] **Step 6: Commit**

```bash
git add src/NitroBackgroundGeolocation.nitro.ts android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/ConfigMapper.kt android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/NitroBackgroundGeolocation.kt nitrogen/
git commit -m "feat: add altitudeAccuracy field to Location and StationaryLocation types"
```

---

### Task 4: Add `showAppSettings()` and `showLocationSettings()` methods

**Context:** The Cordova plugin exposes `showAppSettings()` (opens the app's permission settings) and `showLocationSettings()` (opens the system location settings). Both are static methods on `BackgroundGeolocationFacade` that create an Intent and start an Activity. These are useful for guiding users to enable permissions or location services.

**Files:**
- Modify: `src/NitroBackgroundGeolocation.nitro.ts`
- Modify: `src/index.tsx`
- Modify: `android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/NitroBackgroundGeolocation.kt`
- Modify: `README.md`

- [ ] **Step 1: Add methods to the TypeScript spec**

In `src/NitroBackgroundGeolocation.nitro.ts`, add to the `NitroBackgroundGeolocation` interface in the "Status" section, after `getConfig()`:

```typescript
// Settings
showAppSettings(): void;
showLocationSettings(): void;
```

- [ ] **Step 2: Run Nitrogen codegen**

```bash
cd /Users/user/IdeaProjects/react-native-nitro-background-geolocation && npx nitro-codegen
```

- [ ] **Step 3: Implement in NitroBackgroundGeolocation.kt**

Add a new section after the Status section in `NitroBackgroundGeolocation.kt`:

```kotlin
// ================================================================
//  Settings
// ================================================================

override fun showAppSettings() {
    BackgroundGeolocationFacade.showAppSettings(context)
}

override fun showLocationSettings() {
    BackgroundGeolocationFacade.showLocationSettings(context)
}
```

- [ ] **Step 4: Forward methods in index.tsx**

In `src/index.tsx`, add to the `BackgroundGeolocation` object, after the `getConfig` entry:

```typescript
// Settings
showAppSettings: forward('showAppSettings'),
showLocationSettings: forward('showLocationSettings'),
```

- [ ] **Step 5: Update README.md**

In `README.md`, add a new "Settings" row to the API Reference section, after the "Status" table:

```markdown
### Settings

| Method | Signature | Description |
|--------|-----------|-------------|
| `showAppSettings` | `() => void` | Open the app's system settings page (for changing permissions). |
| `showLocationSettings` | `() => void` | Open the system location settings page (for enabling location services). |
```

- [ ] **Step 6: Build and verify**

```bash
cd example && npx expo prebuild --platform android --clean && npx expo run:android
```

To test: add temporary buttons in `example/src/App.tsx` that call `BackgroundGeolocation.showAppSettings()` and `BackgroundGeolocation.showLocationSettings()`. Verify each opens the correct Android settings screen.

- [ ] **Step 7: Commit**

```bash
git add src/NitroBackgroundGeolocation.nitro.ts src/index.tsx android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/NitroBackgroundGeolocation.kt README.md nitrogen/
git commit -m "feat: add showAppSettings() and showLocationSettings() methods"
```

---

### Task 5: Add activity events to headless task

**Context:** The Cordova plugin's `LocationServiceImpl` fires headless tasks for three event types: `location`, `stationary`, and `activity` (see `LocationServiceImpl.java:601`). The Nitro module's `fireHeadlessTask()` only handles `location` and `stationary`. Activity events (detected activity type changes like WALKING, DRIVING, STILL) are dispatched via `onActivityChanged` callbacks but never reach the headless task.

**Files:**
- Modify: `android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/NitroBackgroundGeolocation.kt`

- [ ] **Step 1: Add fireHeadlessActivityTask helper method**

In `NitroBackgroundGeolocation.kt`, add a new method after the existing `fireHeadlessTask` method:

```kotlin
private fun fireHeadlessActivityTask(activity: BackgroundActivity) {
    if (headlessTaskName.isEmpty()) return
    try {
        val params = JSONObject().apply {
            put("confidence", activity.confidence)
            put("type", BackgroundActivity.getActivityString(activity.type))
        }
        val intent = HeadlessTaskService.createIntent(
            context,
            headlessTaskName,
            "activity",
            params.toString()
        )
        context.startService(intent)
    } catch (e: Exception) {
        Log.e(TAG, "Failed to fire headless activity task", e)
    }
}
```

**Note:** You need to add this import at the top of the file if not already present:

```kotlin
import com.marianhello.bgloc.data.BackgroundActivity
```

(This import already exists in the current file.)

- [ ] **Step 2: Call it from onActivityChanged**

Update `onActivityChanged` to fire the headless task:

```kotlin
override fun onActivityChanged(activity: BackgroundActivity) {
    val jsActivity = ConfigMapper.toJsActivity(activity)
    activityCallbacks.forEach { it(jsActivity) }
    fireHeadlessActivityTask(activity)
}
```

- [ ] **Step 3: Build and verify**

```bash
cd example && npx expo run:android
```

Start tracking with `ACTIVITY` provider. Move the device or use the emulator's extended controls to simulate activity changes. Check logcat for `[HeadlessTask] activity` logs.

- [ ] **Step 4: Commit**

```bash
git add android/src/main/java/com/margelo/nitro/nitrobackgroundgeolocation/NitroBackgroundGeolocation.kt
git commit -m "feat: fire headless task for activity events

The Cordova plugin fires headless tasks for location, stationary, and
activity events. The Nitro module was missing activity events."
```

---

### Task 6: Update example app and final documentation

**Context:** Add test buttons for the new settings methods and update the README to document all changes from this plan.

**Files:**
- Modify: `example/src/App.tsx`
- Modify: `README.md`

- [ ] **Step 1: Add settings buttons to example app**

In `example/src/App.tsx`, add a new button row after the existing "Get Location" button row (after line 257):

```tsx
<View style={styles.buttonRow}>
  <TouchableOpacity
    style={[styles.button, styles.configButton]}
    onPress={() => {
      BackgroundGeolocation.showAppSettings();
      addLog('Opened app settings');
    }}
  >
    <Text style={styles.buttonText}>App Settings</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.button, styles.statusButton]}
    onPress={() => {
      BackgroundGeolocation.showLocationSettings();
      addLog('Opened location settings');
    }}
  >
    <Text style={styles.buttonText}>Location Settings</Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 2: Update README documentation**

Update the headless task documentation in `README.md` to mention that the headless task receives `location`, `stationary`, and `activity` events:

In the "Receiving Location Updates" section, update the headless task description to clarify it handles multiple event types. Replace the heading "Headless Tasks" paragraph with:

```markdown
### 2. Headless Tasks

Headless tasks fire on every location, stationary, and activity event regardless of app state — including when the app is killed. The native service starts a lightweight JS context to execute the task. The data arrives as an object with `event` and `params` fields.

The `event` field is one of: `"location"`, `"stationary"`, or `"activity"`.
```

- [ ] **Step 3: Build and verify the full flow**

```bash
cd example && npx expo prebuild --platform android --clean && npx expo run:android
```

Test the complete flow:
1. Open app → "App entered foreground" in logcat
2. Tap Configure → "Configured successfully" in app logs
3. Tap Start Tracking → location updates in app logs AND `[HeadlessTask]` in logcat
4. Tap App Settings → Android app settings screen opens
5. Tap Location Settings → Android location settings screen opens
6. Press Home → "App entered background" in logcat, tracking continues
7. Return to app → "App entered foreground" in logcat

- [ ] **Step 4: Commit**

```bash
git add example/src/App.tsx README.md
git commit -m "docs: update example app and README with settings buttons and event types"
```

---

## Summary of Changes

| Gap | Task | Fix |
|-----|------|-----|
| No lifecycle management (pause/resume/destroy) | Task 1 | `ProcessLifecycleOwner` + `DefaultLifecycleObserver` |
| Broken Cordova-native headless task registration | Task 2 | Remove `facade.registerHeadlessTask()` call |
| Missing `altitudeAccuracy` on Location | Task 3 | Add field to spec, ConfigMapper, and headless params |
| Missing `showAppSettings()`/`showLocationSettings()` | Task 4 | Expose facade's static methods via the spec |
| Missing activity events in headless task | Task 5 | Add `fireHeadlessActivityTask()` method |
| Example app and docs don't cover new features | Task 6 | Add settings buttons, document event types |