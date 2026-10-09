// GENERATED from the Config Contract. Do not edit.

import Foundation
import NitroModules

// Only fields iOS owns appear.

enum TrackingDefaults {
    static let locationProvider: LocationProvider = LocationProvider(fromString: "DISTANCE_FILTER")!
    static let desiredAccuracy: LocationAccuracy = LocationAccuracy(fromString: "MEDIUM")!
    static let stationaryRadius: Double = 50
    static let distanceFilter: Double = 50
    static let pauseLocationUpdates: Bool = false
    static let saveBatteryOnBackground: Bool = false
    static let activityType: ActivityType = ActivityType(fromString: "OtherNavigation")!
}

enum LifecycleDefaults {
    static let stopOnTerminate: Bool = true
}

enum ActivityDefaults {
    static let activitiesInterval: Double = 10000
}

enum NotificationDefaults {

}

enum HttpDefaults {
    static let url: String = ""
    static let syncUrl: String = ""
    static let syncThreshold: Double = 100
}

enum StorageDefaults {
    static let maxLocations: Double = 10000
}

enum DebugDefaults {
    static let debug: Bool = false
}

enum LocationOptionsDefaults {
    static let timeout: Double = 30000
    static let maximumAge: Double = 0
    static let enableHighAccuracy: Bool = false
}
