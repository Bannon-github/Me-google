# Theme Schema Changelog

All notable changes to `theme.schema.json` are documented here. The schema follows
SemVer; themes declare the schema version they target via `manifest.schemaVersion`.

## [1.0.0] — 2026-07-24

### Added
- Initial theme schema for Me-google Meta Quest VR themes.
- Assembled-theme validation model: `{ manifest, tokens, accessibility }`.
- Required token groups: `color`, `typography`, `spacing`, `depth`, `motion`, `audio`,
  `haptics`.
- Required accessibility override layers: `high-contrast`, `reduced-motion`.
- DTCG-aligned token/group model (`$value`, `$type`, `$description`, `$extensions`).
- VR-extension `$type` values: `depth`, `audio`, `haptic` (alongside the DTCG core types).
- Manifest requirements: `id`, `name`, `version` (SemVer), `author`, `description`,
  `accessibilityLevel` (A/AA/AAA), `targetComfortRating`, `schemaVersion`; optional
  `generatedBy` and `checksums`.
