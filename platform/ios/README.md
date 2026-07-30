# platform/ios/

iOS and visionOS adapter for Me-google xrOS.

## Purpose

This module will map `core/` spatial models to Swift, SwiftUI, RealityKit, ARKit, and visionOS experiences. It owns native placement, accessibility, local storage adapters, keychain integration, and platform-specific UI.

## Public API surface

Planned surfaces:

- Swift models generated or adapted from `core/models`;
- RealityKit anchors and entities for spatial items;
- consent prompts before sharing data off-device;
- CryptoKit/Keychain adapters for encrypted local and session data.

## Tests

No Xcode project exists yet. When scaffolded, run the iOS/visionOS unit tests with the documented `xcodebuild test` command from this directory.
