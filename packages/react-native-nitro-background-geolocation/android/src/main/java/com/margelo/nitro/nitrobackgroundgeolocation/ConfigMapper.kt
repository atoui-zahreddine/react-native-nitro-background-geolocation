package com.margelo.nitro.nitrobackgroundgeolocation

import com.marianhello.bgloc.Config
import com.marianhello.bgloc.data.BackgroundActivity
import com.marianhello.bgloc.data.BackgroundLocation
import com.marianhello.bgloc.data.HashMapLocationTemplate
import com.marianhello.bgloc.data.LocationTemplateFactory
import com.margelo.nitro.core.AnyMap
import java.util.HashMap

/**
 * Maps between Nitrogen-generated data classes and the Java facade types.
 */
object ConfigMapper {

    /**
     * Apply a Nitrogen [ConfigureOptions] struct to a resolved Java [Config].
     * Omitted fields are left unchanged, explicit `null` resets to defaults, and
     * iOS-only fields are ignored on Android.
     */
        val defaults = Config.getDefault()
    fun applyNativeConfig(config: Config, options: ConfigureOptions) {
        applyDouble(options.stationaryRadius, onValue = { config.setStationaryRadius(it.toFloat()) }, onNull = {
            config.setStationaryRadius(defaults.stationaryRadius ?: 50f)
        })
        applyDouble(options.distanceFilter, onValue = { config.setDistanceFilter(it.toInt()) }, onNull = {
            config.setDistanceFilter(defaults.distanceFilter)
        })
        applyLocationAccuracy(options.desiredAccuracy, onValue = { config.setDesiredAccuracy(it.value) }, onNull = {
            config.setDesiredAccuracy(defaults.desiredAccuracy)
        })
        applyBoolean(options.debug, onValue = { config.setDebugging(it) }, onNull = {
            config.setDebugging(defaults.isDebugging)
        })
        applyBoolean(options.stopOnTerminate, onValue = { config.setStopOnTerminate(it) }, onNull = {
            config.setStopOnTerminate(defaults.stopOnTerminate)
        })
        applyBoolean(options.startOnBoot, onValue = { config.setStartOnBoot(it) }, onNull = {
            config.setStartOnBoot(defaults.startOnBoot)
        })
        applyBoolean(options.startForeground, onValue = { config.setStartForeground(it) }, onNull = {
            config.setStartForeground(defaults.startForeground)
        })
        applyBoolean(options.notificationsEnabled, onValue = { config.setNotificationsEnabled(it) }, onNull = {
            config.setNotificationsEnabled(defaults.notificationsEnabled)
        })
        applyLocationProvider(options.locationProvider, onValue = { config.setLocationProvider(it.value) }, onNull = {
            config.setLocationProvider(defaults.locationProvider)
        })
        applyDouble(options.interval, onValue = { config.setInterval(it.toInt()) }, onNull = {
            config.setInterval(defaults.interval)
        })
        applyDouble(options.fastestInterval, onValue = { config.setFastestInterval(it.toInt()) }, onNull = {
            config.setFastestInterval(defaults.fastestInterval)
        })
        applyDouble(options.activitiesInterval, onValue = { config.setActivitiesInterval(it.toInt()) }, onNull = {
            config.setActivitiesInterval(defaults.activitiesInterval)
        })
        applyBoolean(options.stopOnStillActivity, onValue = { config.setStopOnStillActivity(it) }, onNull = {
            config.setStopOnStillActivity(defaults.stopOnStillActivity)
        })
        applyString(options.notificationTitle, onValue = { config.setNotificationTitle(it) }, onNull = {
            config.setNotificationTitle(defaults.notificationTitle)
        })
        applyString(options.notificationText, onValue = { config.setNotificationText(it) }, onNull = {
            config.setNotificationText(defaults.notificationText)
        })
        applyString(options.notificationIconColor, onValue = { config.setNotificationIconColor(it) }, onNull = {
            config.setNotificationIconColor(defaults.notificationIconColor)
        })
        applyString(options.notificationIconLarge, onValue = { config.setLargeNotificationIcon(it) }, onNull = {
            config.setLargeNotificationIcon(defaults.largeNotificationIcon)
        })
        applyString(options.notificationIconSmall, onValue = { config.setSmallNotificationIcon(it) }, onNull = {
            config.setSmallNotificationIcon(defaults.smallNotificationIcon)
        })
        applyString(options.url, onValue = { config.setUrl(it) }, onNull = {
            config.setUrl(defaults.url)
        })
        applyString(options.syncUrl, onValue = { config.setSyncUrl(it) }, onNull = {
            config.setSyncUrl(defaults.syncUrl)
        })
        applyDouble(options.syncThreshold, onValue = { config.setSyncThreshold(it.toInt()) }, onNull = {
            config.setSyncThreshold(defaults.syncThreshold)
        })
        applyHeaders(options.httpHeaders, onValue = { config.setHttpHeaders(HashMap(it)) }, onNull = {
            config.setHttpHeaders(null as HashMap<String, String>?)
        })
        applyDouble(options.maxLocations, onValue = { config.setMaxLocations(it.toInt()) }, onNull = {
            config.setMaxLocations(defaults.maxLocations)
        })
        applyAnyMap(options.postTemplate, onValue = {
            config.setTemplate(LocationTemplateFactory.fromHashMap(it.toHashMap()))
        }, onNull = {
            config.setTemplate(null)
        })
    }

    fun resolveHeadlessTaskName(currentValue: String, option: Variant_NullType_String?): String {
        return when (option) {
            null -> currentValue
            is Variant_NullType_String.First -> ""
            is Variant_NullType_String.Second -> option.value
        }
    }

    /**
     * Convert a Java [Config] back to a Nitrogen [ConfigureOptions].
     *
     * [headlessTaskName] must be supplied externally because it is not persisted
     * in the native Config.
     */
    fun toJsConfig(config: Config, headlessTaskName: String?): ConfigureOptions {
        return ConfigureOptions(
            headlessTaskName = headlessTaskName?.let { Variant_NullType_String.Second(it) },
            locationProvider = config.locationProvider?.let { Variant_NullType_LocationProvider.Second(intToLocationProvider(it)) },
            desiredAccuracy = config.desiredAccuracy?.let { Variant_NullType_LocationAccuracy.Second(intToLocationAccuracy(it)) },
            stationaryRadius = config.stationaryRadius?.toDouble()?.let { Variant_NullType_Double.Second(it) },
            debug = Variant_NullType_Boolean.Second(config.isDebugging),
            distanceFilter = config.distanceFilter?.toDouble()?.let { Variant_NullType_Double.Second(it) },
            stopOnTerminate = config.stopOnTerminate?.let { Variant_NullType_Boolean.Second(it) },
            startOnBoot = config.startOnBoot?.let { Variant_NullType_Boolean.Second(it) },
            interval = config.interval?.toDouble()?.let { Variant_NullType_Double.Second(it) },
            fastestInterval = config.fastestInterval?.toDouble()?.let { Variant_NullType_Double.Second(it) },
            activitiesInterval = config.activitiesInterval?.toDouble()?.let { Variant_NullType_Double.Second(it) },
            stopOnStillActivity = config.stopOnStillActivity?.let { Variant_NullType_Boolean.Second(it) },
            notificationsEnabled = config.notificationsEnabled?.let { Variant_NullType_Boolean.Second(it) },
            startForeground = config.startForeground?.let { Variant_NullType_Boolean.Second(it) },
            notificationTitle = config.notificationTitle?.let { Variant_NullType_String.Second(it) },
            notificationText = config.notificationText?.let { Variant_NullType_String.Second(it) },
            notificationIconColor = config.notificationIconColor?.let { Variant_NullType_String.Second(it) },
            notificationIconLarge = config.largeNotificationIcon?.let { Variant_NullType_String.Second(it) },
            notificationIconSmall = config.smallNotificationIcon?.let { Variant_NullType_String.Second(it) },
            activityType = null,             // iOS-only
            pauseLocationUpdates = null,     // iOS-only
            saveBatteryOnBackground = null,  // iOS-only
            url = config.url?.let { Variant_NullType_String.Second(it) },
            syncUrl = config.syncUrl?.let { Variant_NullType_String.Second(it) },
            syncThreshold = config.syncThreshold?.toDouble()?.let { Variant_NullType_Double.Second(it) },
            httpHeaders = config.httpHeaders?.let { headers ->
                @Suppress("UNCHECKED_CAST")
                (headers as? HashMap<String, String>)?.toMap()?.let { Variant_NullType_Map_String__String_.Second(it) }
            } ?: null,
            maxLocations = config.maxLocations?.toDouble()?.let { Variant_NullType_Double.Second(it) },
            postTemplate = extractPostTemplate(config)?.let { Variant_NullType_AnyMap.Second(it) }
        )
    }

    /**
     * Convert a [BackgroundLocation] to a Nitrogen [Location] struct.
     */
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
            altitudeAccuracy = locationAltitudeAccuracy(location),
            bearing = location.bearing.toDouble(),
            isFromMockProvider = location.isFromMockProvider,
            mockLocationsEnabled = location.areMockLocationsEnabled()
        )
    }

    /**
     * Convert a [BackgroundLocation] to a Nitrogen [StationaryLocation] struct.
     */
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
            altitudeAccuracy = locationAltitudeAccuracy(location),
            bearing = location.bearing.toDouble(),
            isFromMockProvider = location.isFromMockProvider,
            mockLocationsEnabled = location.areMockLocationsEnabled(),
            radius = location.radius.toDouble()
        )
    }

    /**
     * Convert a [BackgroundActivity] to a Nitrogen [Activity] struct.
     */
    fun toJsActivity(activity: BackgroundActivity): Activity {
        return Activity(
            confidence = activity.confidence.toDouble(),
            type = BackgroundActivity.getActivityString(activity.type)
        )
    }

    /**
     * Convert a Java [com.marianhello.logging.LogEntry] to a Nitrogen [LogEntry] struct.
     */
    fun toJsLogEntry(entry: com.marianhello.logging.LogEntry): LogEntry {
        return LogEntry(
            id = (entry.id ?: 0).toDouble(),
            timestamp = (entry.timestamp ?: 0L).toDouble(),
            level = entry.level ?: "",
            message = entry.message ?: "",
            stackTrace = entry.stackTrace ?: ""
        )
    }

    // ---- private helpers ----

    private fun intToLocationAccuracy(value: Int): LocationAccuracy {
        return when (value) {
            0 -> LocationAccuracy.HIGH
            100 -> LocationAccuracy.MEDIUM
            1000 -> LocationAccuracy.LOW
            10000 -> LocationAccuracy.PASSIVE
            else -> LocationAccuracy.MEDIUM
        }
    }

    private fun intToLocationProvider(value: Int): LocationProvider {
        return when (value) {
            0 -> LocationProvider.DISTANCE_FILTER
            1 -> LocationProvider.ACTIVITY
            2 -> LocationProvider.RAW
            else -> LocationProvider.DISTANCE_FILTER
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun extractPostTemplate(config: Config): AnyMap? {
        if (!config.hasTemplate()) return null
        val template = config.template
        if (template is HashMapLocationTemplate) {
            val map = template.toMap() as? Map<*, *> ?: return null
            val result = mutableMapOf<String, Any?>()
            for ((key, value) in map) {
                if (key is String) {
                    result[key] = value
                }
            }
            return AnyMap.fromMap(result, false)
        }
        return null
    }

    private fun locationAltitudeAccuracy(location: BackgroundLocation): Double {
        return if (location.hasVerticalAccuracy()) {
            location.verticalAccuracy.toDouble()
        } else {
            0.0
        }
    }

    private inline fun applyString(
        option: Variant_NullType_String?,
        onValue: (String) -> Unit,
        onNull: () -> Unit
    ) {
        when (option) {
            null -> Unit
            is Variant_NullType_String.First -> onNull()
            is Variant_NullType_String.Second -> onValue(option.value)
        }
    }

    private inline fun applyDouble(
        option: Variant_NullType_Double?,
        onValue: (Double) -> Unit,
        onNull: () -> Unit
    ) {
        when (option) {
            null -> Unit
            is Variant_NullType_Double.First -> onNull()
            is Variant_NullType_Double.Second -> onValue(option.value)
        }
    }

    private inline fun applyBoolean(
        option: Variant_NullType_Boolean?,
        onValue: (Boolean) -> Unit,
        onNull: () -> Unit
    ) {
        when (option) {
            null -> Unit
            is Variant_NullType_Boolean.First -> onNull()
            is Variant_NullType_Boolean.Second -> onValue(option.value)
        }
    }

    private inline fun applyHeaders(
        option: Variant_NullType_Map_String__String_?,
        onValue: (Map<String, String>) -> Unit,
        onNull: () -> Unit
    ) {
        when (option) {
            null -> Unit
            is Variant_NullType_Map_String__String_.First -> onNull()
            is Variant_NullType_Map_String__String_.Second -> onValue(option.value)
        }
    }

    private inline fun applyAnyMap(
        option: Variant_NullType_AnyMap?,
        onValue: (AnyMap) -> Unit,
        onNull: () -> Unit
    ) {
        when (option) {
            null -> Unit
            is Variant_NullType_AnyMap.First -> onNull()
            is Variant_NullType_AnyMap.Second -> onValue(option.value)
        }
    }

    private inline fun applyLocationProvider(
        option: Variant_NullType_LocationProvider?,
        onValue: (LocationProvider) -> Unit,
        onNull: () -> Unit
    ) {
        when (option) {
            null -> Unit
            is Variant_NullType_LocationProvider.First -> onNull()
            is Variant_NullType_LocationProvider.Second -> onValue(option.value)
        }
    }

    private inline fun applyLocationAccuracy(
        option: Variant_NullType_LocationAccuracy?,
        onValue: (LocationAccuracy) -> Unit,
        onNull: () -> Unit
    ) {
        when (option) {
            null -> Unit
            is Variant_NullType_LocationAccuracy.First -> onNull()
            is Variant_NullType_LocationAccuracy.Second -> onValue(option.value)
        }
    }
}
