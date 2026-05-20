package com.margelo.nitro.nitrobackgroundgeolocation

import android.app.Application
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.annotation.Keep
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import com.marianhello.bgloc.BackgroundGeolocationFacade
import com.marianhello.bgloc.Config
import com.marianhello.bgloc.PluginDelegate
import com.marianhello.bgloc.PluginException
import com.marianhello.bgloc.data.BackgroundActivity
import com.marianhello.bgloc.data.BackgroundLocation
import org.json.JSONObject
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Kotlin HybridObject that bridges Nitro's generated spec to the Java
 * [BackgroundGeolocationFacade].
 *
 * The class implements [PluginDelegate] so the facade can notify it of
 * location / activity / status changes which are then forwarded to the
 * JavaScript layer via the stored callback lists.
 */
@DoNotStrip
@Keep
class NitroBackgroundGeolocation :
    HybridNitroBackgroundGeolocationSpec(),
    PluginDelegate,
    DefaultLifecycleObserver,
    Application.ActivityLifecycleCallbacks {

    companion object {
        private const val TAG = "NitroBGGeo"

        /**
         * Library-owned headless task name. Must match `HEADLESS_TASK_NAME`
         * in the TypeScript headless module. Users do not interact with
         * this string — the JS-side `registerHeadlessHandler` API hides it.
         */
        const val LIB_TASK_NAME = "__rn-nitro-bg-geo-headless__"
    }

    private val context
        get() = NitroModules.applicationContext?.applicationContext
            ?: throw IllegalStateException(
                "NitroBackgroundGeolocation: NitroModules.applicationContext is null. " +
                "Ensure Nitro is installed before using this module."
            )

    private val application
        get() = context as? Application
            ?: throw IllegalStateException(
                "NitroBackgroundGeolocation: application context is not an Application."
            )

    private val facade: BackgroundGeolocationFacade by lazy {
        BackgroundGeolocationFacade(context, this)
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private val trackedActivities = mutableSetOf<Int>()
    private var lifecycleObserverRegistered = false
    private var activityCallbacksRegistered = false
    private var facadeDestroyed = false

    // ---- Callback lists ----

    private val locationCallbacks = CopyOnWriteArrayList<(Location) -> Unit>()
    private val stationaryCallbacks = CopyOnWriteArrayList<(StationaryLocation) -> Unit>()
    private val activityCallbacks = CopyOnWriteArrayList<(Activity) -> Unit>()
    private val startCallbacks = CopyOnWriteArrayList<() -> Unit>()
    private val stopCallbacks = CopyOnWriteArrayList<() -> Unit>()
    private val errorCallbacks = CopyOnWriteArrayList<(BackgroundGeolocationError) -> Unit>()
    private val authorizationCallbacks = CopyOnWriteArrayList<(AuthorizationStatus) -> Unit>()
    private val foregroundCallbacks = CopyOnWriteArrayList<() -> Unit>()
    private val backgroundCallbacks = CopyOnWriteArrayList<() -> Unit>()
    private val abortRequestedCallbacks = CopyOnWriteArrayList<() -> Unit>()
    private val httpAuthorizationCallbacks = CopyOnWriteArrayList<() -> Unit>()

    init {
        NitroModules.applicationContext?.currentActivity?.let { currentActivity ->
            trackedActivities.add(System.identityHashCode(currentActivity))
        }

        mainHandler.post {
            if (!lifecycleObserverRegistered) {
                ProcessLifecycleOwner.get().lifecycle.addObserver(this)
                lifecycleObserverRegistered = true
            }
            if (!activityCallbacksRegistered) {
                application.registerActivityLifecycleCallbacks(this)
                activityCallbacksRegistered = true
            }
        }
    }

    // ================================================================
    //  HybridNitroBackgroundGeolocationSpec — Lifecycle
    // ================================================================

    override fun configure(options: ConfigureOptions): Promise<Unit> {
        return Promise.parallel {
            val resolvedConfig = Config(facade.config)
            ConfigMapper.applyNativeConfig(resolvedConfig, options)

            // The library always owns the headless task name. The JS side
            // may or may not have a handler registered against it; if no
            // handler is bound, the headless runner is a safe no-op.
            HeadlessTaskRegistry.setTaskName(context, LIB_TASK_NAME)
            facade.reconfigure(resolvedConfig)
            if (facade.isRunning) {
                facade.registerHeadlessTask(ReactNativeHeadlessTaskRunner::class.java.name)
            }
        }
    }

    override fun start(): Promise<Unit> {
        return Promise.parallel {
            facade.start()
        }
    }

    override fun stop(): Promise<Unit> {
        return Promise.parallel {
            facade.stop()
        }
    }

    // ================================================================
    //  Location
    // ================================================================

    override fun getCurrentLocation(options: LocationOptions): Promise<Location> {
        return Promise.parallel {
            val timeout = options.timeout?.toInt() ?: 30000
            val maximumAge = options.maximumAge?.toLong() ?: 0L
            val enableHighAccuracy = options.enableHighAccuracy ?: false
            val bgLocation = facade.getCurrentLocation(timeout, maximumAge, enableHighAccuracy)
            ConfigMapper.toJsLocation(bgLocation)
        }
    }

    override fun getStationaryLocation(): Promise<StationaryLocation?> {
        return Promise.parallel {
            val bgLocation = facade.stationaryLocation
            bgLocation?.let { ConfigMapper.toJsStationaryLocation(it) }
        }
    }

    // ================================================================
    //  Status
    // ================================================================

    override fun checkStatus(): Promise<ServiceStatus> {
        return Promise.parallel {
            val isRunning = facade.isRunning
            val locationServicesEnabled = try {
                facade.locationServicesEnabled()
            } catch (e: PluginException) {
                false
            }
            val authStatus = when (facade.authorizationStatus) {
                BackgroundGeolocationFacade.AUTHORIZATION_AUTHORIZED -> AuthorizationStatus.AUTHORIZED
                else -> AuthorizationStatus.NOT_AUTHORIZED
            }
            ServiceStatus(
                isRunning = isRunning,
                locationServicesEnabled = locationServicesEnabled,
                authorization = authStatus
            )
        }
    }

    override fun getConfig(): Promise<ConfigureOptions> {
        return Promise.parallel {
            val nativeConfig = facade.config
            ConfigMapper.toJsConfig(nativeConfig)
        }
    }

    override fun showAppSettings() {
        BackgroundGeolocationFacade.showAppSettings(context)
    }

    override fun showLocationSettings() {
        BackgroundGeolocationFacade.showLocationSettings(context)
    }

    // ================================================================
    //  Storage
    // ================================================================

    override fun getLocations(): Promise<Array<Location>> {
        return Promise.parallel {
            facade.locations.map { ConfigMapper.toJsLocation(it) }.toTypedArray()
        }
    }

    override fun getValidLocations(): Promise<Array<Location>> {
        return Promise.parallel {
            facade.validLocations.map { ConfigMapper.toJsLocation(it) }.toTypedArray()
        }
    }

    override fun getValidLocationsAndDelete(): Promise<Array<Location>> {
        return Promise.parallel {
            facade.validLocationsAndDelete.map { ConfigMapper.toJsLocation(it) }.toTypedArray()
        }
    }

    override fun deleteLocation(locationId: Double): Promise<Unit> {
        return Promise.parallel {
            facade.deleteLocation(locationId.toLong())
        }
    }

    override fun deleteAllLocations(): Promise<Unit> {
        return Promise.parallel {
            facade.deleteAllLocations()
        }
    }

    // ================================================================
    //  Sync
    // ================================================================

    override fun forceSync(): Promise<Unit> {
        return Promise.parallel {
            facade.forceSync()
        }
    }

    // ================================================================
    //  Logging
    // ================================================================

    override fun getLogEntries(limit: Double, fromId: Double, minLevel: NativeLogLevel): Promise<Array<LogEntry>> {
        return Promise.parallel {
            val levelName = when (minLevel) {
                NativeLogLevel.TRACEVALUE -> "TRACE"
                NativeLogLevel.DEBUGVALUE -> "DEBUG"
                NativeLogLevel.INFOVALUE -> "INFO"
                NativeLogLevel.WARNVALUE -> "WARN"
                NativeLogLevel.ERRORVALUE -> "ERROR"
            }
            val entries = facade.getLogEntries(limit.toInt(), fromId.toInt(), levelName)
                ?: emptyList()
            entries.mapNotNull { it?.let(ConfigMapper::toJsLogEntry) }.toTypedArray()
        }
    }

    // ================================================================
    //  Event Subscriptions
    // ================================================================

    override fun onLocation(callback: (location: Location) -> Unit): () -> Unit {
        locationCallbacks.add(callback)
        return {
            locationCallbacks.remove(callback)
        }
    }

    override fun onStationary(callback: (location: StationaryLocation) -> Unit): () -> Unit {
        stationaryCallbacks.add(callback)
        return {
            stationaryCallbacks.remove(callback)
        }
    }

    override fun onActivity(callback: (activity: Activity) -> Unit): () -> Unit {
        activityCallbacks.add(callback)
        return {
            activityCallbacks.remove(callback)
        }
    }

    override fun onStart(callback: () -> Unit): () -> Unit {
        startCallbacks.add(callback)
        return {
            startCallbacks.remove(callback)
        }
    }

    override fun onStop(callback: () -> Unit): () -> Unit {
        stopCallbacks.add(callback)
        return {
            stopCallbacks.remove(callback)
        }
    }

    override fun onError(callback: (error: BackgroundGeolocationError) -> Unit): () -> Unit {
        errorCallbacks.add(callback)
        return {
            errorCallbacks.remove(callback)
        }
    }

    override fun onAuthorization(callback: (status: AuthorizationStatus) -> Unit): () -> Unit {
        authorizationCallbacks.add(callback)
        return {
            authorizationCallbacks.remove(callback)
        }
    }

    override fun onForeground(callback: () -> Unit): () -> Unit {
        foregroundCallbacks.add(callback)
        return {
            foregroundCallbacks.remove(callback)
        }
    }

    override fun onBackground(callback: () -> Unit): () -> Unit {
        backgroundCallbacks.add(callback)
        return {
            backgroundCallbacks.remove(callback)
        }
    }

    override fun onAbortRequested(callback: () -> Unit): () -> Unit {
        abortRequestedCallbacks.add(callback)
        return {
            abortRequestedCallbacks.remove(callback)
        }
    }

    override fun onHttpAuthorization(callback: () -> Unit): () -> Unit {
        httpAuthorizationCallbacks.add(callback)
        return {
            httpAuthorizationCallbacks.remove(callback)
        }
    }

    override fun removeAllListeners() {
        locationCallbacks.clear()
        stationaryCallbacks.clear()
        activityCallbacks.clear()
        startCallbacks.clear()
        stopCallbacks.clear()
        errorCallbacks.clear()
        authorizationCallbacks.clear()
        foregroundCallbacks.clear()
        backgroundCallbacks.clear()
        abortRequestedCallbacks.clear()
        httpAuthorizationCallbacks.clear()
    }

    // ================================================================
    //  Lifecycle observer (foreground/background/destroy)
    // ================================================================

    override fun onStart(owner: LifecycleOwner) {
        Log.d(TAG, "App entered foreground")
        facadeDestroyed = false
        facade.resume()
        foregroundCallbacks.forEach { it() }
    }

    override fun onStop(owner: LifecycleOwner) {
        Log.d(TAG, "App entered background")
        facade.pause()
        backgroundCallbacks.forEach { it() }
    }

    override fun dispose() {
        try {
            mainHandler.post {
                unregisterObservers()
                destroyFacade()
            }
        } catch (_: Throwable) {
        }
    }

    // ================================================================
    //  PluginDelegate implementation
    // ================================================================

    override fun onLocationChanged(location: BackgroundLocation) {
        val jsLocation = ConfigMapper.toJsLocation(location)
        locationCallbacks.forEach { it(jsLocation) }
        fireHeadlessTask("location", location)
    }

    override fun onStationaryChanged(location: BackgroundLocation) {
        val jsLocation = ConfigMapper.toJsStationaryLocation(location)
        stationaryCallbacks.forEach { it(jsLocation) }
        fireHeadlessTask("stationary", location)
    }

    override fun onActivityChanged(activity: BackgroundActivity) {
        val jsActivity = ConfigMapper.toJsActivity(activity)
        activityCallbacks.forEach { it(jsActivity) }
        fireHeadlessActivityTask(activity)
    }

    override fun onServiceStatusChanged(status: Int) {
        when (status) {
            BackgroundGeolocationFacade.SERVICE_STARTED -> {
                startCallbacks.forEach { it() }
            }
            BackgroundGeolocationFacade.SERVICE_STOPPED -> {
                stopCallbacks.forEach { it() }
            }
        }
    }

    override fun onAuthorizationChanged(authStatus: Int) {
        val status = when (authStatus) {
            BackgroundGeolocationFacade.AUTHORIZATION_AUTHORIZED -> AuthorizationStatus.AUTHORIZED
            else -> AuthorizationStatus.NOT_AUTHORIZED
        }
        authorizationCallbacks.forEach { it(status) }
    }

    override fun onError(error: PluginException) {
        val jsError = BackgroundGeolocationError(
            code = (error.code ?: 0).toDouble(),
            message = error.message ?: "Unknown error"
        )
        errorCallbacks.forEach { it(jsError) }
    }

    override fun onAbortRequested() {
        abortRequestedCallbacks.forEach { it() }
    }

    override fun onHttpAuthorization() {
        httpAuthorizationCallbacks.forEach { it() }
    }

    // ================================================================
    //  Headless task helper
    // ================================================================

    private fun fireHeadlessTask(eventName: String, location: BackgroundLocation) {
        try {
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
                if (location.hasVerticalAccuracy()) {
                    put("altitudeAccuracy", location.verticalAccuracy)
                }
                put("bearing", location.bearing)
                put("isFromMockProvider", location.isFromMockProvider)
                put("mockLocationsEnabled", location.areMockLocationsEnabled())
                if (eventName == "stationary") {
                    put("radius", location.radius)
                }
            }
            val intent = HeadlessTaskService.createIntent(
                context,
                LIB_TASK_NAME,
                eventName,
                params.toString()
            )
            context.startService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fire headless task", e)
        }
    }

    private fun fireHeadlessActivityTask(activity: BackgroundActivity) {
        try {
            val params = JSONObject().apply {
                put("confidence", activity.confidence)
                put("type", BackgroundActivity.getActivityString(activity.type))
            }
            val intent = HeadlessTaskService.createIntent(
                context,
                LIB_TASK_NAME,
                "activity",
                params.toString()
            )
            context.startService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fire headless activity task", e)
        }
    }

    private fun destroyFacade() {
        if (facadeDestroyed) return
        facadeDestroyed = true
        Log.d(TAG, "App activity destroyed")
        facade.destroy()
    }

    private fun unregisterObservers() {
        if (lifecycleObserverRegistered) {
            ProcessLifecycleOwner.get().lifecycle.removeObserver(this)
            lifecycleObserverRegistered = false
        }
        if (activityCallbacksRegistered) {
            application.unregisterActivityLifecycleCallbacks(this)
            activityCallbacksRegistered = false
        }
    }

    override fun onActivityCreated(activity: android.app.Activity, savedInstanceState: Bundle?) {
        trackedActivities.add(System.identityHashCode(activity))
    }

    override fun onActivityStarted(activity: android.app.Activity) {
        trackedActivities.add(System.identityHashCode(activity))
    }

    override fun onActivityResumed(activity: android.app.Activity) {
        trackedActivities.add(System.identityHashCode(activity))
    }

    override fun onActivityPaused(activity: android.app.Activity) = Unit

    override fun onActivityStopped(activity: android.app.Activity) = Unit

    override fun onActivitySaveInstanceState(activity: android.app.Activity, outState: Bundle) = Unit

    override fun onActivityDestroyed(activity: android.app.Activity) {
        trackedActivities.remove(System.identityHashCode(activity))
        if (activity.isChangingConfigurations) return
        if (trackedActivities.isEmpty()) {
            destroyFacade()
        }
    }
}
