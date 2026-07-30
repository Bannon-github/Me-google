# docs/api/

API references for Me-google service, sync, and platform adapter boundaries.

## Purpose

This directory documents any public or internal API that moves data between modules, devices, or services. Network endpoints must be documented here before implementation, including privacy notes and metadata exposure.

## Public API surface

- Encrypted relay and rendezvous APIs for `services/`.
- Core model serialization contracts consumed by `platform/*`.
- Platform adapter contracts when native apps expose share or sync hooks.

## Tests

Documentation has no executable tests yet. When API schemas are added, validate examples with the owning module's test command.
