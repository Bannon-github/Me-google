# ADR-001: System Architecture

## Status

Accepted

## Context

Me-google is a privacy-first, multi-platform AI xrOS. Users place persistent favourites and collaboration surfaces in physical or virtual space, move between devices, and share selected experiences in real time without exposing identity or location metadata by default.

The architecture must support:

- shared platform-agnostic logic across iOS/visionOS, Android, and WebXR;
- native spatial UI adapters per platform;
- optional privacy-preserving services for anonymous relay, rendezvous, and sync;
- local-first data ownership with explicit consent before any data leaves a device;
- modular features that can be disabled without changing unrelated modules.

## Decision

Adopt a layered monorepo architecture with strict module boundaries.

### Module boundaries

```text
Me-google
├── core/             Platform-agnostic domain models, validation, serialization,
│                     permissions, CRDT/sync schemas, and privacy policy primitives.
├── platform/ios/     Swift, SwiftUI, RealityKit, ARKit, and visionOS adapters.
├── platform/android/ Kotlin, Jetpack Compose, ARCore, and Android service adapters.
├── platform/web/     TypeScript, React, WebXR, WebCrypto, and browser storage adapters.
├── services/         Optional relays, rendezvous, push fanout, and sync infrastructure.
└── docs/             ADRs, API references, threat models, and platform guides.
```

Rules for dependency direction:

```text
platform/*  ───────┐
                   ├──> core
services/*  ───────┘

core MUST NOT import platform/* or services/*.
platform/* MAY adapt core types to native UI/storage/network APIs.
services/* MAY accept encrypted core payload envelopes but MUST NOT require plaintext user data.
```

### Privacy-first architecture

Me-google is local-first. Devices create anonymous identities locally, store private data locally, and sync only encrypted envelopes after explicit user action.

Privacy design:

- Anonymous identity: random, rotating, unlinkable identifiers; no email, phone, device ID, or stable hardware identifier in core models.
- On-device data: spatial favourites, keys, consent state, and private session history remain on the device by default.
- End-to-end encryption: shared sessions encrypt item payloads on the sender device and decrypt only on authorized participant devices.
- Anonymous transport: relay/rendezvous traffic uses onion or mixnet-style routing so services do not learn both sender and receiver.
- Metadata minimization: services see opaque session handles, message sizes, timing, and relay hops only when unavoidable.
- Consent gates: platform adapters must request user approval before exporting any spatial item, identity proof, or collaboration payload.

### Spatial-first UI principles

Platform UI must treat every object as a spatial entity, not a flat screen widget:

- items have 3D transforms, anchors, dimensions, layers, and occlusion behavior;
- UI affordances support depth, gaze, hand/controller/touch input, and accessibility alternatives;
- placement state belongs in `core/` so it serializes consistently across platforms;
- platform adapters map core placement into RealityKit anchors, ARCore anchors, or WebXR reference spaces;
- 2D fallback views are adapters, not the primary interaction model.

### Real-time sync approach

Use a local-first encrypted sync protocol with optimistic replication.

1. Core models define stable IDs, timestamps, validation, and serialization.
2. Platform adapters edit local state immediately.
3. A sync engine packages changes as encrypted operations.
4. Anonymous services relay encrypted operations between participants.
5. Devices merge operations using deterministic conflict rules, moving toward CRDTs for shared spatial maps.

Initial sync topology:

```text
Participant A device                         Participant B device
┌──────────────────┐                         ┌──────────────────┐
│ Spatial UI       │                         │ Spatial UI       │
│ native adapter   │                         │ native adapter   │
└────────┬─────────┘                         └────────┬─────────┘
         │ edits core models                            │ decrypts + merges
┌────────▼─────────┐    encrypted operation    ┌────────▼─────────┐
│ core sync model  │──────────────────────────>│ core sync model  │
└────────┬─────────┘                            └────────▲─────────┘
         │ encrypted envelope                             │
┌────────▼─────────┐    anonymous relay path     ┌────────┴─────────┐
│ network adapter  │─── onion/mix routing ──────>│ network adapter  │
└──────────────────┘                             └──────────────────┘
```

Service view of traffic:

```text
device ── encrypted envelope ── entry relay ── middle relay ── rendezvous/sync relay ── device
          plaintext visible: hop routing metadata only; payload and participant identity stay opaque
```

### Technology choices

- Core reference implementation: strict TypeScript for portable schemas, validation, and serialization.
- iOS/visionOS: Swift, SwiftUI, RealityKit, ARKit, and Apple CryptoKit/Keychain adapters.
- Android: Kotlin, Jetpack Compose, ARCore, Android Keystore, and coroutine-based sync adapters.
- Web: TypeScript, React, WebXR Device API, WebCrypto, IndexedDB, and service-worker-safe sync adapters.
- Services: small privacy-focused microservices for relay, rendezvous, and encrypted sync queues; no plaintext user content.

## Consequences

Positive:

- Shared core semantics reduce platform drift.
- Platform teams can build native spatial experiences without duplicating domain rules.
- Services can scale relaying while remaining blind to content.
- The architecture supports future Tor/I2P/Nym transport adapters without rewriting core models.

Negative and trade-offs:

- Local-first encrypted sync requires careful key management and recovery UX.
- Anonymous networking increases latency and complicates abuse prevention.
- Native platform adapters require separate test suites and accessibility work.
- CRDT-based shared spatial maps add complexity but are necessary for robust collaboration.

Follow-up decisions:

- ADR-002 selects the anonymous networking strategy.
- Future ADRs must define key management, encrypted local storage, and the real-time sync operation format.
