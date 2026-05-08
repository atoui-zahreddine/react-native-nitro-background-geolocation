package com.margelo.nitro.nitrobackgroundgeolocation

import android.content.Context
import android.util.Log
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import com.marianhello.bgloc.BackgroundGeolocationFacade
import com.marianhello.bgloc.PluginDelegate
import com.marianhello.bgloc.PluginException
import com.marianhello.bgloc.data.BackgroundActivity
import com.marianhello.bgloc.data.BackgroundLocation
import org.json.JSONObject

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
class NitroBackgroundGeolocation : HybridNitroBackgroundGeolocationSpec(), PluginDelegate {

    companion object {
        private const val TAG = "NitroBGGeo"

        /**
         * Holds the application context so the facade can be constructed
         * without requiring a context in the HybridObject constructor.
         * Must be set once during app startup (e.g. from the ReactPackage).
         */
        @Volatile
        @JvmStatic
        var appContext: Context? = null
    }

    private val context: Context
        get() = appContext ?: throw IllegalStateException(
            "NitroBackgroundGeolocation: appContext has not been set. " +
            "Call NitroBackgroundGeolocation.appContext = context from your ReactPackage."
        )

    private val facade: BackgroundGeolocationFacade by lazy {
        BackgroundGeolocationFacade(context, this)
    }

    /** Name of the JS headless task registered via configure(). */
    private var headlessTaskName: String = ""

    // ---- Callback lists ----

    private val locationCallbacks = mutableListOf<(Location) -> Unit>()
    private val stationaryCallbacks = mutableListOf<(StationaryLocation) -> Unit>()
    private val activityCallbacks = mutableListOf<(Activity) -> Unit>()
    private val startCallbacks = mutableListOf<() -> Unit>()
    private val stopCallbacks = mutableListOf<() -> Unit>()
    private val errorCallbacks = mutableListOf<(BackgroundGeolocationError) -> Unit>()
    private val authorizationCallbacks = mutableListOf<(AuthorizationStatus) -> Unit>()
    private val foregroundCallbacks = mutableListOf<() -> Unit>()
    private val backgroundCallbacks = mutableListOf<() -> Unit>()
    private val abortRequestedCallbacks = mutableListOf<() -> Unit>()
    private val httpAuthorizationCallbacks = mutableListOf<() -> Unit>()

    // ================================================================
    //  HybridNitroBackgroundGeolocationSpec — Lifecycle
    // ================================================================

    override fun configure(options: ConfigureOptions): Promise<Unit> {
        return Promise.parallel {
            headlessTaskName = options.headlessTaskName
            val nativeConfig = ConfigMapper.toNativeConfig(options)
            facade.configure(nativeConfig)
            if (headlessTaskName.isNotEmpty()) {
                facade.registerHeadlessTask(headlessTaskName)
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
            ConfigMapper.toJsConfig(nativeConfig, headlessTaskName)
        }
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

    override fun getLogEntries(limit: Double, fromId: Double, minLevel: LogLevel): Promise<Array<LogEntry>> {
        return Promise.parallel {
            val levelName = when (minLevel) {
                LogLevel.TRACE -> "TRACE"
                LogLevel.DEBUG -> "DEBUG"
                LogLevel.INFO -> "INFO"
                LogLevel.WARN -> "WARN"
                LogLevel.ERROR -> "ERROR"
            }
            val entries = facade.getLogEntries(limit.toInt(), fromId.toInt(), levelName)
            entries.map { ConfigMapper.toJsLogEntry(it) }.toTypedArray()
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
        if (headlessTaskName.isEmpty()) return
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
                put("bearing", location.bearing)
                put("isFromMockProvider", location.isFromMockProvider)
                put("mockLocationsEnabled", location.areMockLocationsEnabled())
                if (eventName == "stationary") {
                    put("radius", location.radius)
                }
            }
            val intent = HeadlessTaskService.createIntent(
                context,
                headlessTaskName,
                eventName,
                params.toString()
            )
            context.startService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fire headless task", e)
        }
    }
}
