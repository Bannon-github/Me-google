# platform/android/

Android and ARCore adapter for Me-google xrOS.

## Purpose

This module will map `core/` spatial models to Kotlin, Jetpack Compose, ARCore anchors, Android storage, and Android privacy controls.

## Public API surface

Planned surfaces:

- Kotlin data models generated or adapted from `core/models`;
- ARCore anchor placement for spatial items;
- Compose overlays for spatial controls and accessibility fallbacks;
- Android Keystore adapters for encrypted local/session data.

## Tests

No Gradle project exists yet. When scaffolded, run the Android unit tests with the documented `./gradlew test` command from this directory.
