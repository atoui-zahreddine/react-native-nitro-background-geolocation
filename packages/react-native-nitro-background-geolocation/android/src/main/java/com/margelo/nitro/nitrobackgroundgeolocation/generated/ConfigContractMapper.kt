// GENERATED from the Config Contract. Do not edit.
package com.margelo.nitro.nitrobackgroundgeolocation.generated

import com.marianhello.bgloc.Config
import com.margelo.nitro.nitrobackgroundgeolocation.ActivityConfig
import com.margelo.nitro.nitrobackgroundgeolocation.ActivityOptions
import com.margelo.nitro.nitrobackgroundgeolocation.ActivityType
import com.margelo.nitro.nitrobackgroundgeolocation.AppliedConfig
import com.margelo.nitro.nitrobackgroundgeolocation.ConfigConverters
import com.margelo.nitro.nitrobackgroundgeolocation.ConfigureOptions
import com.margelo.nitro.nitrobackgroundgeolocation.DebugConfig
import com.margelo.nitro.nitrobackgroundgeolocation.DebugOptions
import com.margelo.nitro.nitrobackgroundgeolocation.HttpConfig
import com.margelo.nitro.nitrobackgroundgeolocation.HttpOptions
import com.margelo.nitro.nitrobackgroundgeolocation.LifecycleConfig
import com.margelo.nitro.nitrobackgroundgeolocation.LifecycleOptions
import com.margelo.nitro.nitrobackgroundgeolocation.LocationAccuracy
import com.margelo.nitro.nitrobackgroundgeolocation.LocationProvider
import com.margelo.nitro.nitrobackgroundgeolocation.NotificationConfig
import com.margelo.nitro.nitrobackgroundgeolocation.NotificationOptions
import com.margelo.nitro.nitrobackgroundgeolocation.StorageConfig
import com.margelo.nitro.nitrobackgroundgeolocation.StorageOptions
import com.margelo.nitro.nitrobackgroundgeolocation.TrackingConfig
import com.margelo.nitro.nitrobackgroundgeolocation.TrackingOptions

/**
 * Maps every config group between the public shape and the Java config. A field
 * Android does not own is never written and reads as its contract default.
 */
object ConfigContractMapper {
    fun apply(config: Config, options: ConfigureOptions) {
        options.tracking?.let { applyTracking(config, it) }
        options.lifecycle?.let { applyLifecycle(config, it) }
        options.activity?.let { applyActivity(config, it) }
        options.notification?.let { applyNotification(config, it) }
        options.http?.let { applyHttp(config, it) }
        options.storage?.let { applyStorage(config, it) }
        options.debug?.let { applyDebug(config, it) }
    }

    fun read(config: Config) = AppliedConfig(
        tracking = readTracking(config),
        lifecycle = readLifecycle(config),
        activity = readActivity(config),
        notification = readNotification(config),
        http = readHttp(config),
        storage = readStorage(config),
        debug = readDebug(config),
    )

    private fun applyTracking(config: Config, options: TrackingOptions) {
        options.locationProvider?.let { config.setLocationProvider(it.value) }
        options.desiredAccuracy?.let { config.setDesiredAccuracy(it.value) }
        options.stationaryRadius?.let { config.setStationaryRadius(it.toFloat()) }
        options.distanceFilter?.let { config.setDistanceFilter(it.toInt()) }
        options.interval?.let { config.setInterval(it.toInt()) }
        options.fastestInterval?.let { config.setFastestInterval(it.toInt()) }
    }

    private fun applyLifecycle(config: Config, options: LifecycleOptions) {
        options.stopOnTerminate?.let { config.setStopOnTerminate(it) }
        options.startOnBoot?.let { config.setStartOnBoot(it) }
    }

    private fun applyActivity(config: Config, options: ActivityOptions) {
        options.activitiesInterval?.let { config.setActivitiesInterval(it.toInt()) }
        options.stopOnStillActivity?.let { config.setStopOnStillActivity(it) }
    }

    private fun applyNotification(config: Config, options: NotificationOptions) {
        options.notificationsEnabled?.let { config.setNotificationsEnabled(it) }
        options.startForeground?.let { config.setStartForeground(it) }
        options.notificationTitle?.let { config.setNotificationTitle(it) }
        options.notificationText?.let { config.setNotificationText(it) }
        options.notificationIconColor?.let { config.setNotificationIconColor(it) }
        options.notificationIconLarge?.let { config.setLargeNotificationIcon(it) }
        options.notificationIconSmall?.let { config.setSmallNotificationIcon(it) }
    }

    private fun applyHttp(config: Config, options: HttpOptions) {
        options.url?.let { config.setUrl(it) }
        options.syncUrl?.let { config.setSyncUrl(it) }
        options.syncThreshold?.let { config.setSyncThreshold(it.toInt()) }
        ConfigConverters.applyHeaders(config, options.httpHeaders)
        ConfigConverters.applyLocationTemplate(config, options.postTemplate)
    }

    private fun applyStorage(config: Config, options: StorageOptions) {
        options.maxLocations?.let { config.setMaxLocations(it.toInt()) }
    }

    private fun applyDebug(config: Config, options: DebugOptions) {
        options.debug?.let { config.setDebugging(it) }
    }

    private fun readTracking(config: Config) = TrackingConfig(
        locationProvider = LocationProvider.values().firstOrNull { it.value == (config.locationProvider ?: TrackingDefaults.locationProvider) } ?: LocationProvider.DISTANCE_FILTER,
        desiredAccuracy = LocationAccuracy.values().firstOrNull { it.value == (config.desiredAccuracy ?: TrackingDefaults.desiredAccuracy) } ?: LocationAccuracy.MEDIUM,
        stationaryRadius = (config.stationaryRadius ?: TrackingDefaults.stationaryRadius).toDouble(),
        distanceFilter = (config.distanceFilter ?: TrackingDefaults.distanceFilter).toDouble(),
        interval = (config.interval ?: TrackingDefaults.interval).toDouble(),
        fastestInterval = (config.fastestInterval ?: TrackingDefaults.fastestInterval).toDouble(),
        pauseLocationUpdates = false,
        saveBatteryOnBackground = false,
        activityType = ActivityType.OTHERNAVIGATION,
    )

    private fun readLifecycle(config: Config) = LifecycleConfig(
        stopOnTerminate = (config.stopOnTerminate ?: LifecycleDefaults.stopOnTerminate),
        startOnBoot = (config.startOnBoot ?: LifecycleDefaults.startOnBoot),
    )

    private fun readActivity(config: Config) = ActivityConfig(
        activitiesInterval = (config.activitiesInterval ?: ActivityDefaults.activitiesInterval).toDouble(),
        stopOnStillActivity = (config.stopOnStillActivity ?: ActivityDefaults.stopOnStillActivity),
    )

    private fun readNotification(config: Config) = NotificationConfig(
        notificationsEnabled = (config.notificationsEnabled ?: NotificationDefaults.notificationsEnabled),
        startForeground = (config.startForeground ?: NotificationDefaults.startForeground),
        notificationTitle = (config.notificationTitle ?: NotificationDefaults.notificationTitle),
        notificationText = (config.notificationText ?: NotificationDefaults.notificationText),
        notificationIconColor = (config.notificationIconColor ?: NotificationDefaults.notificationIconColor),
        notificationIconLarge = (config.largeNotificationIcon ?: NotificationDefaults.notificationIconLarge),
        notificationIconSmall = (config.smallNotificationIcon ?: NotificationDefaults.notificationIconSmall),
    )

    private fun readHttp(config: Config) = HttpConfig(
        url = (config.url ?: HttpDefaults.url),
        syncUrl = (config.syncUrl ?: HttpDefaults.syncUrl),
        syncThreshold = (config.syncThreshold ?: HttpDefaults.syncThreshold).toDouble(),
        httpHeaders = ConfigConverters.readHeaders(config),
        postTemplate = ConfigConverters.readLocationTemplate(config),
    )

    private fun readStorage(config: Config) = StorageConfig(
        maxLocations = (config.maxLocations ?: StorageDefaults.maxLocations).toDouble(),
    )

    private fun readDebug(config: Config) = DebugConfig(
        debug = (config.isDebugging ?: DebugDefaults.debug),
    )
}
