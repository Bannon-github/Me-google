# ADR-002: Anonymous Networking Approach

## Status

Accepted

## Context

Me-google needs real-time sharing while protecting identity and metadata. Users should be able to join shared spatial sessions without exposing IP address, stable identity, device identifiers, or plaintext item content to infrastructure. The system also needs practical latency for collaboration and deployability across iOS/visionOS, Android, and web.

## Threat model

We defend against:

- relay or sync servers attempting to read shared content;
- a single network observer linking a client IP to a session recipient;
- passive correlation using stable user identifiers;
- curious participants learning more identity data than the user consents to share;
- compromised relays seeing plaintext payloads.

We do not fully defend against:

- a global passive adversary observing all network links and timing;
- endpoint compromise before encryption or after decryption;
- users voluntarily revealing identity in shared content;
- denial-of-service or traffic flooding without separate abuse controls.

## Options considered

### Tor

Tor provides mature onion routing, a large anonymity set, bridge support, and hidden-service patterns for rendezvous. It is well understood and battle tested.

Trade-offs: mobile integration can be heavy, latency is variable, browser WebXR cannot always control network routing, and real-time media-like collaboration may suffer without careful batching.

### I2P

I2P provides garlic routing and is optimized for hidden services inside its own network. It can protect service location and participant IPs.

Trade-offs: smaller anonymity set than Tor, less mainstream mobile/browser support, and more operational complexity for users unfamiliar with I2P.

### Nym / mixnets

Mixnets add packet delays and cover traffic to resist timing analysis better than low-latency onion routing. Nym-style designs are attractive for metadata protection.

Trade-offs: added latency can conflict with live spatial collaboration, ecosystem maturity varies by platform, and cover traffic may increase battery/network cost.

### Custom onion routing

A custom relay path could optimize for Me-google semantics: encrypted envelopes, rendezvous handles, mobile constraints, and spatial sync batching.

Trade-offs: designing anonymity systems is high risk. A custom protocol is likely weaker than existing networks until audited and widely deployed, and it creates a small anonymity set at launch.

## Decision

Use a hybrid, adapter-based anonymous transport strategy:

1. Define a transport-agnostic encrypted envelope in `core/` and `services/` documentation.
2. Prefer Tor-compatible onion routing for early relay/rendezvous deployments where platform support allows it.
3. Keep I2P and Nym/mixnet adapters as documented future transport options for users who need stronger service-location or timing protection.
4. Do not invent a full custom anonymity protocol for v1. Build only a minimal relay adapter that carries already-encrypted envelopes and can later run behind Tor, I2P, or mixnet gateways.

Rationale:

- Tor offers the best maturity and anonymity set for early implementation.
- An adapter boundary avoids locking core models or platform UX to one network.
- Encrypted envelopes keep services blind even when anonymous routing is unavailable.
- Avoiding a bespoke anonymity protocol reduces cryptographic and traffic-analysis risk.

## Metadata protection

Protected by design:

- spatial item content and labels;
- user profile or display data not explicitly shared;
- private keys and local identity seeds;
- session payload contents;
- direct sender-to-recipient IP linkage when routed through an anonymity network.

Minimized but not eliminated:

- message size;
- approximate timing;
- relay selected by the client;
- opaque session or rendezvous handle;
- coarse traffic volume.

Not protected from endpoints:

- content a participant decrypts;
- display names or avatars a user intentionally shares inside a session;
- local device compromise.

## Reference flow

```text
sender device
  │
  │ 1. validate core model
  │ 2. encrypt payload for authorized session participants
  ▼
opaque envelope {session_handle, key_id, ciphertext, padding_hint}
  │
  │ 3. route through selected anonymous transport adapter
  ▼
entry relay ── middle relay ── rendezvous/sync relay
  │                                      │
  │ visible: hop metadata, opaque handle │ not visible: plaintext, user ID
  ▼                                      ▼
recipient device ◄──── encrypted envelope queue
  │
  │ 4. decrypt locally
  │ 5. merge into local spatial session
```

## Consequences

Positive:

- The project relies on established anonymity research instead of a new protocol.
- Services can be implemented as blind relays and encrypted queues.
- Platform adapters can choose the strongest available transport for each runtime.
- Future Nym/mixnet support can improve timing metadata protection for non-interactive sync.

Negative and trade-offs:

- Tor-style low-latency routing still leaks timing and volume metadata to powerful observers.
- Web platform support may require proxy or service-mediated routing where native Tor is unavailable.
- Abuse prevention must avoid introducing stable identifiers or invasive logging.
- Stronger mixnet modes may be unsuitable for low-latency shared manipulation.

Implementation requirements:

- Never send plaintext identity or spatial payloads to services.
- Rotate anonymous session handles.
- Pad or batch messages where latency budgets allow.
- Document every network endpoint in `docs/api/` before implementation.
- Run a privacy review for any networking, storage, or identity changes.
