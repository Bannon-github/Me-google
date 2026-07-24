# ADR-007 — Iterative Theme Pipeline

- **Status:** Accepted
- **Date:** 2026-07-24
- **Deciders:** Theme System Coordinator (Architect + DevOps roles)
- **Related:** ADR-003, ADR-006
- **Research basis:** Phase 1 R5 — Style Dictionary, Material Color Utilities (HCT),
  GitHub Actions, SemVer, living-design-system distribution.

## Context

Themes are living artefacts. Humans and AI agents must be able to propose, validate, build,
and publish theme updates repeatably, with quality gates and predictable versioning. This ADR
defines the pipeline (`scripts/theme_pipeline.py`), the package format, and the versioning
policy.

## Decision

### 1. Theme versioning (SemVer)

Each theme carries a SemVer version in `manifest.json`:
`MAJOR.MINOR.PATCH[-prerelease][+build]`.

| Bump | Trigger | Gate |
|------|---------|------|
| **MAJOR** | Breaking: renaming/removing a token key, incompatible schema change | **Human approval required** |
| **MINOR** | Non-breaking: adding a new token/feature | Auto-publish after `validate` + visual review |
| **PATCH** | Non-breaking correction: value tweak, doc fix | Fully automated (`validate → build → publish`) |

Pre-release channels: `-alpha.N` (agent-generated, unreviewed) → `-beta.N` (validated +
reviewed) → release (human-approved). CHANGELOG entries are generated from Conventional
Commits and categorised (`✨ Features`, `🐛 Fixes`, `💥 Breaking`, `♿ Accessibility`,
`🤖 Generated`). Agent-generated themes are labelled via the manifest `generatedBy` field.

### 2. Token pipeline (source → transform → output)

Modelled on Style Dictionary:

```
tokens/*.json (DTCG source)
        │  resolve aliases {group.token}
        ▼
   merge accessibility overrides (per mode)
        │  platform transforms
        ▼
   dist/
   ├── web/theme.css        (CSS custom properties)
   ├── web/theme.json       (resolved flat token map)
   ├── ios/Theme.swift      (Swift constants — stub target)
   └── android/theme.xml    (Android resources — stub target)
```

The reference `build` implementation emits the resolved flat JSON map and the CSS custom
properties (the WebXR reference target); iOS/Android outputs are declared targets that the
platform teams wire to Style Dictionary transforms.

### 3. CI workflow

`.github/workflows/theme-ci.yml` triggers on push/PR touching
`platform/quest/themes/**` and runs the Tier-1 automated checks from ADR-006
(schema, contrast, motion) plus `ThemeManager` unit tests, reporting results as PR checks.

### 4. Theme update distribution (package format)

`theme_pipeline.py publish` packages a validated theme into a **`.megtheme`** file — a ZIP
containing `manifest.json`, `tokens/`, `accessibility/`, `assets/`, and a generated
`dist/` — plus a `checksums.txt` (SHA-256 of every file) recorded in the manifest. Themes are
installed by unpacking into `platform/quest/themes/<id>/` (or an OS user-themes directory at
runtime). No PII or telemetry is embedded — consistent with the privacy-first mandate.

### 5. Agent-driven generation workflow

An automated agent proposes a new theme as follows:

1. **Generate** — `theme_pipeline.py generate --spec spec.json` scaffolds a theme directory
   from a spec (name, seed colour, accessibility level, target comfort rating). The palette is
   derived from the seed using an HCT-style tonal approach (contrast-aware), and the two
   accessibility override files are scaffolded automatically.
2. **Validate** — `theme_pipeline.py validate <dir>` runs all three validators; failures block.
3. **Build** — `theme_pipeline.py build <dir>` produces `dist/` outputs.
4. **Publish** — `theme_pipeline.py publish <dir>` packages `.megtheme` at an `-alpha` version.
5. **Review gate** — CI + human review promote `-alpha → -beta → release` per §1.

### 6. Task-system integration

A new task category **`theme-updates`** is added to `scripts/generate_tasks.py` static tasks
(THEME-001…) so theme work is tracked and surfaced by `TASKS.md` like all other project work.

## Consequences

- Validation logic is shared verbatim between local runs, CI, and the pipeline, so a theme that
  passes locally passes in CI.
- The `generate` subcommand plus contrast-aware palette derivation lets an agent bootstrap a
  conformant theme that already satisfies most Tier-1 checks.
- The `.megtheme` package with checksums gives a verifiable, PII-free distribution unit.

## Alternatives considered

- **npm-only distribution** — viable for the web target but not natural for on-device Quest
  install; `.megtheme` ZIP is platform-neutral. (An npm publish path can be added later for the
  web package without changing the source format.)
- **Full Style Dictionary dependency now** — deferred to keep the reference pipeline
  dependency-light and runnable in CI with only Python stdlib + `jsonschema`; the transform
  model is deliberately Style-Dictionary-compatible so adoption is a drop-in later.

## References

- Style Dictionary v4 (DTCG `usesDtcg`, transforms/formats/platforms).
- Material Color Utilities — HCT tonal palettes / contrast-aware tone selection.
- SemVer 2.0.0. GitHub Actions. Conventional Commits.
