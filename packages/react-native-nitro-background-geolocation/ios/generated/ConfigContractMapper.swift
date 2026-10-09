// GENERATED from the Config Contract. Do not edit.

import Foundation
import NitroModules

/// Maps every config group between the public shape and the native dictionary.
/// A field iOS does not own is never written and reads as its contract default.
enum ConfigContractMapper {
    static func apply(_ options: ConfigureOptions, into dictionary: NSMutableDictionary) throws {
        if let tracking = options.tracking { try applyTracking(tracking, into: dictionary) }
        if let lifecycle = options.lifecycle { try applyLifecycle(lifecycle, into: dictionary) }
        if let activity = options.activity { try applyActivity(activity, into: dictionary) }
        if let http = options.http { try applyHttp(http, into: dictionary) }
        if let storage = options.storage { try applyStorage(storage, into: dictionary) }
        if let debug = options.debug { try applyDebug(debug, into: dictionary) }
    }

    static func read(_ dictionary: NSDictionary) throws -> AppliedConfig {
        return AppliedConfig(
            tracking: try readTracking(dictionary),
            lifecycle: try readLifecycle(dictionary),
            activity: try readActivity(dictionary),
            notification: try readNotification(dictionary),
            http: try readHttp(dictionary),
            storage: try readStorage(dictionary),
            debug: try readDebug(dictionary)
        )
    }

    private static func applyTracking(_ options: TrackingOptions, into dictionary: NSMutableDictionary) throws {
        ConfigConverters.apply(options.locationProvider.map(nativeValue), key: "locationProvider", into: dictionary)
        ConfigConverters.apply(options.desiredAccuracy.map(nativeValue), key: "desiredAccuracy", into: dictionary)
        ConfigConverters.apply(options.stationaryRadius, key: "stationaryRadius", into: dictionary)
        ConfigConverters.apply(options.distanceFilter, key: "distanceFilter", into: dictionary)
        ConfigConverters.apply(options.pauseLocationUpdates, key: "pauseLocationUpdates", into: dictionary)
        ConfigConverters.apply(options.saveBatteryOnBackground, key: "saveBatteryOnBackground", into: dictionary)
        ConfigConverters.apply(options.activityType.map({ $0.stringValue }), key: "activityType", into: dictionary)
    }

    private static func applyLifecycle(_ options: LifecycleOptions, into dictionary: NSMutableDictionary) throws {
        ConfigConverters.apply(options.stopOnTerminate, key: "stopOnTerminate", into: dictionary)
    }

    private static func applyActivity(_ options: ActivityOptions, into dictionary: NSMutableDictionary) throws {
        ConfigConverters.apply(options.activitiesInterval, key: "activitiesInterval", into: dictionary)
    }

    private static func applyHttp(_ options: HttpOptions, into dictionary: NSMutableDictionary) throws {
        ConfigConverters.apply(options.url, key: "url", into: dictionary)
        ConfigConverters.apply(options.syncUrl, key: "syncUrl", into: dictionary)
        ConfigConverters.apply(options.syncThreshold, key: "syncThreshold", into: dictionary)
        ConfigConverters.applyHeaders(options.httpHeaders, key: "httpHeaders", into: dictionary)
        try ConfigConverters.applyAnyMap(options.postTemplate, key: "postTemplate", into: dictionary)
    }

    private static func applyStorage(_ options: StorageOptions, into dictionary: NSMutableDictionary) throws {
        ConfigConverters.apply(options.maxLocations, key: "maxLocations", into: dictionary)
    }

    private static func applyDebug(_ options: DebugOptions, into dictionary: NSMutableDictionary) throws {
        ConfigConverters.apply(options.debug, key: "debug", into: dictionary)
    }

    private static func readTracking(_ dictionary: NSDictionary) throws -> TrackingConfig {
        return TrackingConfig(
            locationProvider: LocationProvider(native: dictionary["locationProvider"]) ?? TrackingDefaults.locationProvider,
            desiredAccuracy: LocationAccuracy(native: dictionary["desiredAccuracy"]) ?? TrackingDefaults.desiredAccuracy,
            stationaryRadius: ConfigConverters.readDouble(dictionary, key: "stationaryRadius", fallback: TrackingDefaults.stationaryRadius),
            distanceFilter: ConfigConverters.readDouble(dictionary, key: "distanceFilter", fallback: TrackingDefaults.distanceFilter),
            interval: 5000,
            fastestInterval: 1000,
            pauseLocationUpdates: ConfigConverters.readBool(dictionary, key: "pauseLocationUpdates", fallback: TrackingDefaults.pauseLocationUpdates),
            saveBatteryOnBackground: ConfigConverters.readBool(dictionary, key: "saveBatteryOnBackground", fallback: TrackingDefaults.saveBatteryOnBackground),
            activityType: (dictionary["activityType"] as? String).flatMap { ActivityType(fromString: $0) } ?? TrackingDefaults.activityType
        )
    }

    private static func readLifecycle(_ dictionary: NSDictionary) throws -> LifecycleConfig {
        return LifecycleConfig(
            stopOnTerminate: ConfigConverters.readBool(dictionary, key: "stopOnTerminate", fallback: LifecycleDefaults.stopOnTerminate),
            startOnBoot: false
        )
    }

    private static func readActivity(_ dictionary: NSDictionary) throws -> ActivityConfig {
        return ActivityConfig(
            activitiesInterval: ConfigConverters.readDouble(dictionary, key: "activitiesInterval", fallback: ActivityDefaults.activitiesInterval),
            stopOnStillActivity: true
        )
    }

    private static func readNotification(_ dictionary: NSDictionary) throws -> NotificationConfig {
        return NotificationConfig(
            notificationsEnabled: true,
            startForeground: true,
            notificationTitle: "Background tracking",
            notificationText: "ENABLED",
            notificationIconColor: "",
            notificationIconLarge: "",
            notificationIconSmall: ""
        )
    }

    private static func readHttp(_ dictionary: NSDictionary) throws -> HttpConfig {
        return HttpConfig(
            url: ConfigConverters.readString(dictionary, key: "url", fallback: HttpDefaults.url),
            syncUrl: ConfigConverters.readString(dictionary, key: "syncUrl", fallback: HttpDefaults.syncUrl),
            syncThreshold: ConfigConverters.readDouble(dictionary, key: "syncThreshold", fallback: HttpDefaults.syncThreshold),
            httpHeaders: ConfigConverters.readHeaders(dictionary, key: "httpHeaders"),
            postTemplate: try ConfigConverters.readAnyMap(dictionary, key: "postTemplate")
        )
    }

    private static func readStorage(_ dictionary: NSDictionary) throws -> StorageConfig {
        return StorageConfig(
            maxLocations: ConfigConverters.readDouble(dictionary, key: "maxLocations", fallback: StorageDefaults.maxLocations)
        )
    }

    private static func readDebug(_ dictionary: NSDictionary) throws -> DebugConfig {
        return DebugConfig(
            debug: ConfigConverters.readBool(dictionary, key: "debug", fallback: DebugDefaults.debug)
        )
    }
}

private extension LocationProvider {
    init?(native value: Any?) {
        switch (value as? NSNumber)?.intValue {
        case 0: self.init(fromString: "DISTANCE_FILTER")
        case 1: self.init(fromString: "ACTIVITY")
        case 2: self.init(fromString: "RAW")
        default: return nil
        }
    }
}

private func nativeValue(_ value: LocationProvider) -> NSNumber {
    switch value.stringValue {
    case "DISTANCE_FILTER": return 0
    case "ACTIVITY": return 1
    case "RAW": return 2
    default: return 0
    }
}

private extension LocationAccuracy {
    init?(native value: Any?) {
        switch (value as? NSNumber)?.intValue {
        case 0: self.init(fromString: "HIGH")
        case 100: self.init(fromString: "MEDIUM")
        case 1000: self.init(fromString: "LOW")
        case 10000: self.init(fromString: "PASSIVE")
        default: return nil
        }
    }
}

private func nativeValue(_ value: LocationAccuracy) -> NSNumber {
    switch value.stringValue {
    case "HIGH": return 0
    case "MEDIUM": return 100
    case "LOW": return 1000
    case "PASSIVE": return 10000
    default: return 0
    }
}
