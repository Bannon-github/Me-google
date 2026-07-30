# core/

Shared, platform-agnostic logic for Me-google xrOS. Code here must have unit tests and must not depend on any single platform (iOS/visionOS, Android/ARCore, Web/WebXR).

## Purpose

`core/` owns domain models, validation, serialization contracts, privacy primitives, and future sync schemas that must behave consistently across platform adapters.

## Public API surface

The current reference implementation lives in [`models/`](models/):

- `spatial_item.ts` — spatial favourites/items with 3D transforms, layers, metadata, and serialization.
- `user.ts` — anonymous user identity model with no PII or device identifiers.
- `session.ts` — encrypted collaboration session model with participants, items, and sync state.

## Running tests

The core models are zero-dependency TypeScript modules using Node's built-in test runner and runtime type stripping.

```bash
node --test core/models/*.test.ts
```

For strict type checking, run:

```bash
tsc --project core/tsconfig.json --noEmit
```

## Conventions

- No hard-coded credentials, tokens, or device identifiers.
- Privacy review required for anything touching networking, storage, or identity.
- Unit tests accompany every module.
