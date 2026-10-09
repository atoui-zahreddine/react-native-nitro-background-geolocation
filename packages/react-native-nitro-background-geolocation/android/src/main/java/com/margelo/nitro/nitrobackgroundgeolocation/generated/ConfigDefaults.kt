// GENERATED from the Config Contract. Do not edit.
package com.margelo.nitro.nitrobackgroundgeolocation.generated

import com.marianhello.bgloc.data.LocationTemplate
import java.util.HashMap

// Values are in the type the Java core stores, so Config.getDefault() can read
// them directly. Only fields Android owns appear.

object TrackingDefaults {
    @JvmField val locationProvider = 0
    @JvmField val desiredAccuracy = 100
    @JvmField val stationaryRadius = 50f
    @JvmField val distanceFilter = 50
    @JvmField val interval = 5000
    @JvmField val fastestInterval = 1000
}

object LifecycleDefaults {
    @JvmField val stopOnTerminate = true
    @JvmField val startOnBoot = false
}

object ActivityDefaults {
    @JvmField val activitiesInterval = 10000
    @JvmField val stopOnStillActivity = true
}

object NotificationDefaults {
    @JvmField val notificationsEnabled = true
    @JvmField val startForeground = true
    @JvmField val notificationTitle = "Background tracking"
    @JvmField val notificationText = "ENABLED"
    @JvmField val notificationIconColor = ""
    @JvmField val notificationIconLarge = ""
    @JvmField val notificationIconSmall = ""
}

object HttpDefaults {
    @JvmField val url = ""
    @JvmField val syncUrl = ""
    @JvmField val syncThreshold = 100
    @JvmField val httpHeaders = null as HashMap<String, String>?
    @JvmField val postTemplate = null as LocationTemplate?
}

object StorageDefaults {
    @JvmField val maxLocations = 10000
}

object DebugDefaults {
    @JvmField val debug = false
}

object LocationOptionsDefaults {
    @JvmField val timeout = 30000
    @JvmField val maximumAge = 0L
    @JvmField val enableHighAccuracy = false
}
