package com.margelo.nitro.nitrobackgroundgeolocation

import com.marianhello.bgloc.Config
import com.margelo.nitro.nitrobackgroundgeolocation.generated.ConfigContractMapper
import com.marianhello.bgloc.data.BackgroundActivity
import com.marianhello.bgloc.data.BackgroundLocation

/**
 * Maps between Nitrogen-generated data classes and the Java facade types.
 */
object ConfigMapper {

    fun applyNativeConfig(config: Config, options: ConfigureOptions) {
        ConfigContractMapper.apply(config, options)
    }

    fun toJsConfig(config: Config): AppliedConfig = ConfigContractMapper.read(config)

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

    @Suppress("UNCHECKED_CAST")
    private fun locationAltitudeAccuracy(location: BackgroundLocation): Double {
        return if (location.hasVerticalAccuracy()) {
            location.verticalAccuracy.toDouble()
        } else {
            0.0
        }
    }
}
