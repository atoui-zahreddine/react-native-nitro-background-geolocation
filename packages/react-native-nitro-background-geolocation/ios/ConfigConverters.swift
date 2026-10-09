import Foundation
import NitroModules

/// The converter escapes the Config Contract declares, plus the primitive
/// dictionary helpers the generated mapper calls. Hand written on
/// purpose: `postTemplate` is an arbitrary nested map, so making it expressible
/// in the contract would distort it to serve the generator.
enum ConfigConverters {

    // MARK: - writes

    static func apply<Value>(_ value: Value?, key: String, into dictionary: NSMutableDictionary) {
        guard let value else { return }
        dictionary[key] = value
    }

    static func applyHeaders(
        _ value: Variant_NullType_Dictionary_String__String_?,
        key: String,
        into dictionary: NSMutableDictionary
    ) {
        guard let value else { return }
        switch value {
        case .first:
            dictionary[key] = NSNull()
        case .second(let headers):
            dictionary[key] = headers
        }
    }

    static func applyAnyMap(
        _ value: Variant_NullType_AnyMap?,
        key: String,
        into dictionary: NSMutableDictionary
    ) throws {
        guard let value else { return }
        switch value {
        case .first:
            dictionary[key] = NSNull()
        case .second(let anyMap):
            dictionary[key] = anyMapToDictionary(anyMap)
        }
    }

    private static func anyMapToDictionary(_ anyMap: AnyMap) -> [String: Any] {
        var dictionary: [String: Any] = [:]
        for key in anyMap.getAllKeys() {
            dictionary[key] = anyMap.getAny(key: key)
        }
        return dictionary
    }

    // MARK: - reads

    static func readString(_ dictionary: NSDictionary, key: String, fallback: String) -> String {
        guard let value = dictionary[key], !(value is NSNull) else { return fallback }
        return (value as? String) ?? fallback
    }

    static func readDouble(_ dictionary: NSDictionary, key: String, fallback: Double) -> Double {
        guard let value = dictionary[key], !(value is NSNull) else { return fallback }
        return (value as? NSNumber)?.doubleValue ?? fallback
    }

    static func readBool(_ dictionary: NSDictionary, key: String, fallback: Bool) -> Bool {
        guard let value = dictionary[key], !(value is NSNull) else { return fallback }
        return (value as? NSNumber)?.boolValue ?? fallback
    }

    /// An unset field reads back as its contract default — for these two that is
    /// the `null` *value*, never an absent field.
    // Note the type asymmetry: the write side's optional field derives an inline
    // variant (`Variant_NullType_*`), while the read side's required field keeps
    // the declared alias name (`Nullable*`). Same shape, two generated names.
    static func readHeaders(
        _ dictionary: NSDictionary,
        key: String
    ) -> NullableHeaders {
        // The core stores a null write as an empty dictionary.
        guard let headers = dictionary[key] as? [String: String], !headers.isEmpty else {
            return .first(.null)
        }
        return .second(headers)
    }

    static func readAnyMap(_ dictionary: NSDictionary, key: String) throws -> NullableAnyMap {
        // The core replaces a null write with its default template, so that is
        // what "set to nothing" reads back as.
        guard let map = dictionary[key] as? [String: Any],
              !(map as NSDictionary).isEqual(to: MAURConfig.getDefaultTemplate()) else {
            return .first(.null)
        }
        return .second(try AnyMap.fromDictionary(map))
    }
}
