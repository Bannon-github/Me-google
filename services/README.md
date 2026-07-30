# services/

Privacy-preserving backend micro-services for Me-google xrOS.

## Purpose

Services provide optional relay, rendezvous, and encrypted sync infrastructure. They must never require plaintext spatial content, stable user identifiers, credentials, or device identifiers.

## Public API surface

Planned service boundaries:

- anonymous relay ingress and egress for encrypted envelopes;
- rendezvous handles for shared sessions;
- encrypted queue fanout for real-time sync;
- abuse controls that avoid persistent identity tracking.

Endpoint specifications belong in `docs/api/` before implementation.

## Tests

No service runtime exists yet. Future service modules must include tests next to each source file and document the exact test command here.
