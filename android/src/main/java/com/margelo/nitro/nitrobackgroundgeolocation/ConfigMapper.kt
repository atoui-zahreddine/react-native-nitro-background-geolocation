package com.margelo.nitro.nitrobackgroundgeolocation

import com.marianhello.bgloc.Config
import com.marianhello.bgloc.data.BackgroundActivity
import com.marianhello.bgloc.data.BackgroundLocation
import com.marianhello.bgloc.data.HashMapLocationTemplate
import com.marianhello.bgloc.data.LocationTemplateFactory

/**
 * Maps between Nitrogen-generated data classes and the Java facade types.
 */
object ConfigMapper {

    /**
     * Convert a Nitrogen [ConfigureOptions] struct to a Java [Config].
     *
     * Fields that are iOS-only (activityType, pauseLocationUpdates, saveBatteryOnBackground)
     * are silently ignored because [Config] has no corresponding setters.
     */
    fun toNativeConfig(options: ConfigureOptions): Config {
        val config = Config()

        options.stationaryRadius?.let { config.setStationaryRadius(it.toFloat()) }
        options.distanceFilter?.let { config.setDistanceFilter(it.toInt()) }
        options.desiredAccuracy?.let { config.setDesiredAccuracy(it.value) }
        options.debug?.let { config.setDebugging(it) }
        options.stopOnTerminate?.let { config.setStopOnTerminate(it) }
        options.startOnBoot?.let { config.setStartOnBoot(it) }
        options.startForeground?.let { config.setStartForeground(it) }
        options.notificationsEnabled?.let { config.setNotificationsEnabled(it) }
        options.locationProvider?.let { config.setLocationProvider(it.value) }
        options.interval?.let { config.setInterval(it.toInt()) }
        options.fastestInterval?.let { config.setFastestInterval(it.toInt()) }
        options.activitiesInterval?.let { config.setActivitiesInterval(it.toInt()) }
        options.stopOnStillActivity?.let { config.setStopOnStillActivity(it) }
        options.notificationTitle?.let { config.setNotificationTitle(it) }
        options.notificationText?.let { config.setNotificationText(it) }
        options.notificationIconColor?.let { config.setNotificationIconColor(it) }
        options.notificationIconLarge?.let { config.setLargeNotificationIcon(it) }
        options.notificationIconSmall?.let { config.setSmallNotificationIcon(it) }
        options.url?.let { config.setUrl(it) }
        options.syncUrl?.let { config.setSyncUrl(it) }
        options.syncThreshold?.let { config.setSyncThreshold(it.toInt()) }
        options.httpHeaders?.let { config.setHttpHeaders(HashMap(it)) }
        options.maxLocations?.let { config.setMaxLocations(it.toInt()) }
        options.postTemplate?.let { config.setTemplate(LocationTemplateFactory.fromHashMap(HashMap(it))) }

        return config
    }

    /**
     * Convert a Java [Config] back to a Nitrogen [ConfigureOptions].
     *
     * [headlessTaskName] must be supplied externally because it is not persisted
     * in the native Config.
     */
    fun toJsConfig(config: Config, headlessTaskName: String): ConfigureOptions {
        return ConfigureOptions(
            headlessTaskName = headlessTaskName,
            locationProvider = config.locationProvider?.let { intToLocationProvider(it) },
            desiredAccuracy = config.desiredAccuracy?.let { intToLocationAccuracy(it) },
            stationaryRadius = config.stationaryRadius?.toDouble(),
            debug = config.isDebugging,
            distanceFilter = config.distanceFilter?.toDouble(),
            stopOnTerminate = config.stopOnTerminate,
            startOnBoot = config.startOnBoot,
            interval = config.interval?.toDouble(),
            fastestInterval = config.fastestInterval?.toDouble(),
            activitiesInterval = config.activitiesInterval?.toDouble(),
            stopOnStillActivity = config.stopOnStillActivity,
            notificationsEnabled = config.notificationsEnabled,
            startForeground = config.startForeground,
            notificationTitle = config.notificationTitle,
            notificationText = config.notificationText,
            notificationIconColor = config.notificationIconColor,
            notificationIconLarge = config.largeNotificationIcon,
            notificationIconSmall = config.smallNotificationIcon,
            activityType = null,             // iOS-only
            pauseLocationUpdates = null,     // iOS-only
            saveBatteryOnBackground = null,  // iOS-only
            url = config.url,
            syncUrl = config.syncUrl,
            syncThreshold = config.syncThreshold?.toDouble(),
            httpHeaders = config.httpHeaders?.let { headers ->
                @Suppress("UNCHECKED_CAST")
                (headers as? HashMap<String, String>)?.toMap()
            },
            maxLocations = config.maxLocations?.toDouble(),
            postTemplate = extractPostTemplate(config)
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
    private fun extractPostTemplate(config: Config): Map<String, String>? {
        if (!config.hasTemplate()) return null
        val template = config.template
        if (template is HashMapLocationTemplate) {
            val map = template.toMap() as? Map<*, *> ?: return null
            val result = mutableMapOf<String, String>()
            for ((key, value) in map) {
                if (key is String && value is String) {
                    result[key] = value
                }
            }
            return result
        }
        return null
    }
}
