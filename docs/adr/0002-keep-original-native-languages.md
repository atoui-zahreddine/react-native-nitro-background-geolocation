# ADR 0002: Keep Original Native Languages (Java/ObjC), Bridge in Kotlin/Swift

## Status
Accepted

## Context
The Cordova plugin's core logic is written in Java (~100 files) and Objective-C (~95 files). The Nitro Module is configured to use Kotlin (Android) and Swift (iOS) for the HybridObject bridge layer.

Rewriting ~200 files of battle-tested native code to new languages would be high-risk and high-effort with zero functional benefit. Both language pairs (Java↔Kotlin, ObjC↔Swift) have full interoperability.

## Decision
Copy the Cordova plugin's `common/` native code in its original languages (Java, Objective-C). Write only the Nitro HybridObject bridge layer in Kotlin/Swift. The bridge calls into the existing Java/ObjC classes directly via language interop.

Gradual migration to Kotlin/Swift may happen over time as files are touched, but is not a goal for the initial release.

## Consequences
- Mixed-language codebase on both platforms (standard practice in Android/iOS development).
- Minimal risk — proven native code stays untouched.
- Android needs no special config (Kotlin/Java interop is automatic).
- iOS needs a bridging header to expose ObjC classes to Swift.
- Future contributors need to be comfortable reading both languages per platform.