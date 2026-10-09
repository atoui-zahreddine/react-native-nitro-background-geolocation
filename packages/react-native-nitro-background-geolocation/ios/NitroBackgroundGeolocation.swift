import Foundation
import NitroModules
import UIKit

final class NitroBackgroundGeolocation: HybridNitroBackgroundGeolocationSpec {
    private final class DelegateProxy: NSObject, MAURProviderDelegate {
        weak var owner: NitroBackgroundGeolocation?

        init(owner: NitroBackgroundGeolocation) {
            self.owner = owner
        }

        func onAuthorizationChanged(_ authStatus: MAURLocationAuthorizationStatus) {
            owner?.emitAuthorization(status: authStatus)
        }

        func onLocationChanged(_ location: MAURLocation) {
            owner?.emitLocation(location)
        }

        func onStationaryChanged(_ location: MAURLocation) {
            owner?.emitStationary(location)
        }

        func onLocationPause() {
        }

        func onLocationResume() {
        }

        func onActivityChanged(_ activity: MAURActivity) {
            owner?.emitActivity(activity)
        }

        func onAbortRequested() {
            owner?.emitAbortRequested()
        }

        func onHttpAuthorization() {
            owner?.emitHttpAuthorization()
        }

        func onError(_ error: Error) {
            owner?.emitError(error as NSError)
        }
    }

    private enum BridgeError: LocalizedError {
        case deallocated
        case operationFailed(String, String)

        var errorDescription: String? {
            switch self {
            case .deallocated:
                return "NitroBackgroundGeolocation was deallocated before the operation completed."
            case .operationFailed(let method, let message):
                return "NitroBackgroundGeolocation iOS \(method) failed: \(message)"
            }
        }
    }

    private let facade = MAURBackgroundGeolocationFacade.sharedInstance()!
    private lazy var delegateProxy = DelegateProxy(owner: self)

    private var locationCallbacks: [UUID: (Location) -> Void] = [:]
    private var stationaryCallbacks: [UUID: (StationaryLocation) -> Void] = [:]
    private var activityCallbacks: [UUID: (Activity) -> Void] = [:]
    private var startCallbacks: [UUID: () -> Void] = [:]
    private var stopCallbacks: [UUID: () -> Void] = [:]
    private var errorCallbacks: [UUID: (BackgroundGeolocationError) -> Void] = [:]
    private var authorizationCallbacks: [UUID: (AuthorizationStatus) -> Void] = [:]
    private var foregroundCallbacks: [UUID: () -> Void] = [:]
    private var backgroundCallbacks: [UUID: () -> Void] = [:]
    private var abortRequestedCallbacks: [UUID: () -> Void] = [:]
    private var httpAuthorizationCallbacks: [UUID: () -> Void] = [:]

    override init() {
        super.init()

        facade.delegate = delegateProxy
    }

    deinit {
        facade.delegate = nil
    }

    func configure(options: ConfigureOptions) throws -> Promise<Void> {
        Promise.parallel { [weak self] in
            guard let self else {
                throw BridgeError.deallocated
            }

            let config = try Self.makeNativeConfig(from: options)
            do {
                try self.facade.configure(config)
            } catch {
                throw Self.makeOperationError(method: "configure", error: error as NSError)
            }
        }
    }

    func start() throws -> Promise<Void> {
        Promise.parallel { [weak self] in
            guard let self else {
                throw BridgeError.deallocated
            }

            do {
                try self.facade.start()
            } catch {
                throw Self.makeOperationError(method: "start", error: error as NSError)
            }
            self.startCallbacks.values.forEach { $0() }
        }
    }

    func stop() throws -> Promise<Void> {
        Promise.parallel { [weak self] in
            guard let self else {
                throw BridgeError.deallocated
            }

            do {
                try self.facade.stop()
            } catch {
                throw Self.makeOperationError(method: "stop", error: error as NSError)
            }
            self.stopCallbacks.values.forEach { $0() }
        }
    }

    func getCurrentLocation(options: LocationOptions) throws -> Promise<Location> {
        Promise.parallel { [weak self] in
            guard let self else {
                throw BridgeError.deallocated
            }

            let timeout = Int32(options.timeout ?? LocationOptionsDefaults.timeout)
            let maximumAge = Int(options.maximumAge ?? LocationOptionsDefaults.maximumAge)
            let enableHighAccuracy = options.enableHighAccuracy ?? LocationOptionsDefaults.enableHighAccuracy

            do {
                let location = try self.facade.getCurrentLocation(
                    timeout,
                    maximumAge: maximumAge,
                    enableHighAccuracy: enableHighAccuracy
                )
                return Self.makeLocation(from: location)
            } catch {
                throw Self.makeOperationError(method: "getCurrentLocation", error: error as NSError)
            }
        }
    }

    func getStationaryLocation() throws -> Promise<StationaryLocation?> {
        Promise.parallel { [weak self] in
            guard let self else {
                throw BridgeError.deallocated
            }

            guard let location = self.facade.getStationaryLocation() else {
                return nil
            }
            return Self.makeStationaryLocation(from: location)
        }
    }

    func checkStatus() throws -> Promise<ServiceStatus> {
        Promise.parallel { [weak self] in
            guard let self else {
                throw BridgeError.deallocated
            }

            return ServiceStatus(
                isRunning: self.facade.isStarted(),
                locationServicesEnabled: self.facade.locationServicesEnabled(),
                authorization: Self.makeAuthorizationStatus(from: self.facade.authorizationStatus())
            )
        }
    }

    func getConfig() throws -> Promise<AppliedConfig> {
        Promise.parallel { [weak self] in
            guard let self else {
                throw BridgeError.deallocated
            }

            return try Self.makeAppliedConfig(from: self.facade.getConfig())
        }
    }

    func showAppSettings() throws {
        facade.showAppSettings()
    }

    func showLocationSettings() throws {
        facade.showLocationSettings()
    }

    func getLocations() throws -> Promise<[Location]> {
        Promise.parallel { [weak self] in
            guard let self else {
                throw BridgeError.deallocated
            }

            return self.facade.getLocations().map(Self.makeLocation)
        }
    }

    func getValidLocations() throws -> Promise<[Location]> {
        Promise.parallel { [weak self] in
            guard let self else {
                throw BridgeError.deallocated
            }

            return self.facade.getValidLocations().map(Self.makeLocation)
        }
    }

    func getValidLocationsAndDelete() throws -> Promise<[Location]> {
        Promise.parallel { [weak self] in
            guard let self else {
                throw BridgeError.deallocated
            }

            return self.facade.getValidLocationsAndDelete().map(Self.makeLocation)
        }
    }

    func deleteLocation(locationId: Double) throws -> Promise<Void> {
        Promise.parallel { [weak self] in
            guard let self else {
                throw BridgeError.deallocated
            }

            do {
                try self.facade.deleteLocation(NSNumber(value: Int64(locationId)))
            } catch {
                throw Self.makeOperationError(method: "deleteLocation", error: error as NSError)
            }
        }
    }

    func deleteAllLocations() throws -> Promise<Void> {
        Promise.parallel { [weak self] in
            guard let self else {
                throw BridgeError.deallocated
            }

            do {
                try self.facade.deleteAllLocations()
            } catch {
                throw Self.makeOperationError(method: "deleteAllLocations", error: error as NSError)
            }
        }
    }

    func forceSync() throws -> Promise<Void> {
        Promise.parallel { [weak self] in
            guard let self else {
                throw BridgeError.deallocated
            }

            self.facade.forceSync()
        }
    }

    func getLogEntries(limit: Double, fromId: Double, minLevel: NativeLogLevel) throws -> Promise<[LogEntry]> {
        Promise.parallel { [weak self] in
            guard let self else {
                throw BridgeError.deallocated
            }

            let entries = self.facade.getLogEntries(
                Int(limit),
                fromLogEntryId: Int(fromId),
                minLogLevelFrom: Self.makeNativeLogLevelName(minLevel)
            )

            return Self.makeLogEntries(from: entries ?? [])
        }
    }

    func onLocation(callback: @escaping (Location) -> Void) throws -> () -> Void {
        registerCallback(callback, storage: \ .locationCallbacks)
    }

    func onStationary(callback: @escaping (StationaryLocation) -> Void) throws -> () -> Void {
        registerCallback(callback, storage: \ .stationaryCallbacks)
    }

    func onActivity(callback: @escaping (Activity) -> Void) throws -> () -> Void {
        registerCallback(callback, storage: \ .activityCallbacks)
    }

    func onStart(callback: @escaping () -> Void) throws -> () -> Void {
        registerCallback(callback, storage: \ .startCallbacks)
    }

    func onStop(callback: @escaping () -> Void) throws -> () -> Void {
        registerCallback(callback, storage: \ .stopCallbacks)
    }

    func onError(callback: @escaping (BackgroundGeolocationError) -> Void) throws -> () -> Void {
        registerCallback(callback, storage: \ .errorCallbacks)
    }

    func onAuthorization(callback: @escaping (AuthorizationStatus) -> Void) throws -> () -> Void {
        registerCallback(callback, storage: \ .authorizationCallbacks)
    }

    func onForeground(callback: @escaping () -> Void) throws -> () -> Void {
        registerCallback(callback, storage: \ .foregroundCallbacks)
    }

    func onBackground(callback: @escaping () -> Void) throws -> () -> Void {
        registerCallback(callback, storage: \ .backgroundCallbacks)
    }

    func onAbortRequested(callback: @escaping () -> Void) throws -> () -> Void {
        registerCallback(callback, storage: \ .abortRequestedCallbacks)
    }

    func onHttpAuthorization(callback: @escaping () -> Void) throws -> () -> Void {
        registerCallback(callback, storage: \ .httpAuthorizationCallbacks)
    }

    func removeAllListeners() throws {
        locationCallbacks.removeAll()
        stationaryCallbacks.removeAll()
        activityCallbacks.removeAll()
        startCallbacks.removeAll()
        stopCallbacks.removeAll()
        errorCallbacks.removeAll()
        authorizationCallbacks.removeAll()
        foregroundCallbacks.removeAll()
        backgroundCallbacks.removeAll()
        abortRequestedCallbacks.removeAll()
        httpAuthorizationCallbacks.removeAll()
    }

    private func registerCallback<T>(_ callback: T, storage: ReferenceWritableKeyPath<NitroBackgroundGeolocation, [UUID: T]>) -> () -> Void {
        let id = UUID()
        self[keyPath: storage][id] = callback
        return { [weak self] in
            self?[keyPath: storage].removeValue(forKey: id)
        }
    }

    private func emitLocation(_ location: MAURLocation) {
        let jsLocation = Self.makeLocation(from: location)
        locationCallbacks.values.forEach { $0(jsLocation) }
    }

    private func emitStationary(_ location: MAURLocation) {
        let jsLocation = Self.makeStationaryLocation(from: location)
        stationaryCallbacks.values.forEach { $0(jsLocation) }
    }

    private func emitActivity(_ activity: MAURActivity) {
        let jsActivity = Activity(
            confidence: activity.confidence?.doubleValue ?? 0,
            type: activity.type ?? ""
        )
        activityCallbacks.values.forEach { $0(jsActivity) }
    }

    private func emitAuthorization(status: MAURLocationAuthorizationStatus) {
        let jsStatus = Self.makeAuthorizationStatus(from: status)
        authorizationCallbacks.values.forEach { $0(jsStatus) }
    }

    private func emitAbortRequested() {
        abortRequestedCallbacks.values.forEach { $0() }
    }

    private func emitHttpAuthorization() {
        httpAuthorizationCallbacks.values.forEach { $0() }
    }

    private func emitError(_ error: NSError) {
        let jsError = BackgroundGeolocationError(
            code: Double(error.code),
            message: error.localizedDescription
        )
        errorCallbacks.values.forEach { $0(jsError) }
    }

    private static func makeOperationError(method: String, error: NSError?) -> Error {
        if let error {
            return error
        }
        return BridgeError.operationFailed(method, "Unknown native failure")
    }

    private static func makeLocation(from location: MAURLocation) -> Location {
        Location(
            id: location.locationId?.doubleValue ?? 0,
            provider: location.provider ?? "",
            locationProvider: location.locationProvider?.doubleValue ?? 0,
            time: location.time.map { $0.timeIntervalSince1970 * 1000 } ?? 0,
            latitude: location.latitude?.doubleValue ?? 0,
            longitude: location.longitude?.doubleValue ?? 0,
            accuracy: location.accuracy?.doubleValue ?? 0,
            speed: location.speed?.doubleValue ?? 0,
            altitude: location.altitude?.doubleValue ?? 0,
            altitudeAccuracy: location.altitudeAccuracy?.doubleValue ?? 0,
            bearing: location.heading?.doubleValue ?? 0,
            isFromMockProvider: false,
            mockLocationsEnabled: false
        )
    }

    private static func makeStationaryLocation(from location: MAURLocation) -> StationaryLocation {
        StationaryLocation(
            id: location.locationId?.doubleValue ?? 0,
            provider: location.provider ?? "",
            locationProvider: location.locationProvider?.doubleValue ?? 0,
            time: location.time.map { $0.timeIntervalSince1970 * 1000 } ?? 0,
            latitude: location.latitude?.doubleValue ?? 0,
            longitude: location.longitude?.doubleValue ?? 0,
            accuracy: location.accuracy?.doubleValue ?? 0,
            speed: location.speed?.doubleValue ?? 0,
            altitude: location.altitude?.doubleValue ?? 0,
            altitudeAccuracy: location.altitudeAccuracy?.doubleValue ?? 0,
            bearing: location.heading?.doubleValue ?? 0,
            isFromMockProvider: false,
            mockLocationsEnabled: false,
            radius: location.radius?.doubleValue ?? 0
        )
    }

    private static func makeAuthorizationStatus(from status: MAURLocationAuthorizationStatus) -> AuthorizationStatus {
        switch status {
        case .always, .allowed:
            return .authorized
        case .foreground:
            return .authorizedForeground
        default:
            return .notAuthorized
        }
    }

    private static func makeNativeConfig(from options: ConfigureOptions) throws -> MAURConfig {
        let dictionary = NSMutableDictionary()
        try ConfigContractMapper.apply(options, into: dictionary)
        return MAURConfig.fromDictionary(dictionary as? [AnyHashable: Any] ?? [:])
    }

    private static func makeAppliedConfig(from config: MAURConfig) throws -> AppliedConfig {
        try ConfigContractMapper.read(config.toDictionary() as NSDictionary)
    }

    private static func makeNativeLogLevelName(_ level: NativeLogLevel) -> String {
        switch level {
        case .tracevalue:
            return "TRACE"
        case .debugvalue:
            return "DEBUG"
        case .infovalue:
            return "INFO"
        case .warnvalue:
            return "WARN"
        case .errorvalue:
            return "ERROR"
        @unknown default:
            return "DEBUG"
        }
    }

    private static func makeLogEntries(from entries: [Any]) -> [LogEntry] {
        entries.compactMap { entry in
            guard let dictionary = entry as? [String: Any] else {
                return nil
            }

            return LogEntry(
                id: (dictionary["id"] as? NSNumber)?.doubleValue ?? 0,
                timestamp: (dictionary["timestamp"] as? NSNumber)?.doubleValue ?? 0,
                level: (dictionary["level"] as? String) ?? "",
                message: (dictionary["message"] as? String) ?? "",
                stackTrace: (dictionary["stackTrace"] as? String) ?? ""
            )
        }
    }
}
