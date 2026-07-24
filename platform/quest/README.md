# Meta Quest platform (`platform/quest/`)

Home of the Me-google **VR theme system** targeting Meta Quest / Horizon OS. This directory
contains the theme specification, the default theme, the runtime theme API, the QA framework,
and everything needed to author, validate, and ship additional themes.

## Layout

```
platform/quest/
├── themes/              Theme specification, JSON schema, and installed themes
│   ├── schema/          theme.schema.json (+ CHANGELOG)
│   └── me-google-default/   The default theme that ships with the OS
├── api/                 ThemeManager runtime (TS reference + Kotlin/Swift stubs)
└── qa/                  QA framework: validators, snapshots, review checklists
```

## Architecture

The design is recorded in Architecture Decision Records:

- [ADR-003 — Theme system architecture](../../docs/adr/ADR-003-theme-system-architecture.md)
- [ADR-004 — Meta Quest UI standards](../../docs/adr/ADR-004-quest-ui-standards.md)
- [ADR-005 — Accessibility conformance](../../docs/adr/ADR-005-accessibility-conformance.md)
- [ADR-006 — Theme QA framework](../../docs/adr/ADR-006-theme-qa-framework.md)
- [ADR-007 — Iterative theme pipeline](../../docs/adr/ADR-007-iterative-theme-pipeline.md)

## Key properties

- **DTCG-aligned tokens** (`$value`/`$type`/`$description`, `{group.token}` aliases) with VR
  extensions for `depth`, `audio`, and `haptics`.
- **Metres + degrees** as native units (spatial-first), with px equivalents for tooling.
- **Accessibility by construction**: XAUR-aligned, WCAG 2.2 AA (7:1 VR contrast target), with
  high-contrast and reduced-motion override layers for every theme.
- **Runtime switching** with a guaranteed fallback chain to `me-google-default`.
- **Privacy-first**: no telemetry, no PII, no user identifiers in themes or packages.

## Common commands

```bash
# Validate the default theme (schema + contrast + motion)
python3 scripts/theme_pipeline.py validate platform/quest/themes/me-google-default

# Build per-platform outputs into dist/
python3 scripts/theme_pipeline.py build platform/quest/themes/me-google-default

# Scaffold a new theme from a seed colour
python3 scripts/theme_pipeline.py generate --name "Aurora" --seed "#7B5CFF"

# Package a validated theme as a .megtheme
python3 scripts/theme_pipeline.py publish platform/quest/themes/<id>

# Run the ThemeManager unit tests
cd platform/quest/api && npm install && npm test
```
