# core/

Shared, platform-agnostic logic for Me-google xrOS. Code here must have unit tests and must
not depend on any single platform (iOS/visionOS, Android/ARCore, Web/WebXR).

## Status

Scaffold. The first shared module wired through this directory is the **VR theme system**,
whose reference runtime and specification live under
[`platform/quest/`](../platform/quest/) and are consumed cross-platform via the token
outputs produced by `scripts/theme_pipeline.py build`.

## Conventions

- No hard-coded credentials, tokens, or device identifiers.
- Privacy review required for anything touching networking, storage, or identity.
- Unit tests accompany every module.
