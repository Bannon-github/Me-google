# ADR-003 — VR Theme System Architecture

- **Status:** Accepted
- **Date:** 2026-07-24
- **Deciders:** Theme System Coordinator (Architect role)
- **Related:** ADR-004 (Quest UI standards), ADR-005 (accessibility conformance),
  ADR-006 (theme QA framework), ADR-007 (iterative theme pipeline)
- **Supersedes / Superseded by:** —

## Context

Me-google is a multi-platform AI xrOS. It needs a **configurable VR theme system**
targeting **Meta Quest / Horizon OS** that is installable as a reusable package,
switchable at runtime, and shared (as far as possible) across visionOS, Android/ARCore
and WebXR. The system must be privacy-first (no telemetry without consent),
spatial-first (every token expresses a 3D concept), accessibility-conformant, and
maintainable by both humans and automated agents.

Research (Phase 1, R1–R5) established the following constraints:

- Meta Spatial SDK and all Quest surfaces use **metres** as the world unit; panels are
  composited by the Horizon OS compositor (Layer mode) for sharp text.
- The [W3C Design Tokens Community Group (DTCG) format](https://www.designtokens.org/)
  is the emerging cross-tool standard: tokens are JSON objects with `$value`, `$type`,
  and `$description`; groups nest tokens; aliases use `{group.token}` reference syntax.
- [Style Dictionary v4](https://styledictionary.com/) can transform DTCG source tokens
  into per-platform outputs (`usesDtcg: true`).
- Accessibility requires an **override layer** (high-contrast, reduced-motion) that sits
  on top of the base theme — see ADR-005.

## Decision

### 1. Theme specification format

Themes are authored as **DTCG-aligned JSON design-token files** plus a JSON `manifest.json`
and an asset directory. We adopt DTCG conventions (`$value` / `$type` / `$description` /
`{group.token}` aliases) so the tokens are portable to Style Dictionary, Figma token
plugins, and other DTCG tooling.

Deviation from strict DTCG: VR introduces token types with no DTCG primitive
(`depth`, `audio`, `haptics`). These are modelled as DTCG groups of `number` / `dimension`
/ composite tokens and carry a `$description`. Vendor-specific extras live under
`$extensions` per the DTCG escape hatch.

### 2. Directory layout for themes

```
platform/quest/themes/<theme-name>/
├── manifest.json          # id, version, author, description, accessibility level, checksums
├── tokens/                # base (light-agnostic, dark-first) token files
│   ├── color.json
│   ├── typography.json
│   ├── spacing.json
│   ├── depth.json
│   ├── motion.json
│   ├── audio.json
│   └── haptics.json
├── accessibility/         # override layers merged on top of base tokens
│   ├── high-contrast.json
│   └── reduced-motion.json
├── assets/                # audio cues, icons, textures (privacy-safe, no PII)
└── README.md
```

The canonical schema lives at `platform/quest/themes/schema/theme.schema.json`.

### 3. Token categories

| Category      | DTCG `$type` basis                     | Purpose |
|---------------|----------------------------------------|---------|
| `color`       | `color` (`{colorSpace, components, hex}`) | Surfaces, accents, semantics, `on-*` text pairs; sRGB hex + linear float for shaders |
| `typography`  | `typography` composite + `dimension`   | Angular-size type scale (degrees / metres @1m / px@72dpi), weights, line-height |
| `spacing`     | `dimension` (metres, px equiv.)        | Spatial gaps, radii, padding in VR-native metres |
| `depth`       | `number` / `dimension` (metres)        | Z-layer placement distances from viewer, panel curvature, scene lighting |
| `motion`      | `duration` + `cubicBezier` + `number`  | Easing curves, durations, angular-velocity caps, comfort multipliers |
| `audio`       | `number` + string refs                 | Spatial cue asset refs, volumes [0,1], falloff |
| `haptics`     | `number` + `duration`                  | Controller haptic intensity/duration/frequency patterns |

### 4. Accessibility token layer

The base tokens define the default (dark-first) appearance. Two override files provide a
**sparse patch** merged over the base at activation time:

- `accessibility/high-contrast.json` — raises contrast ratios (target ≥ 7:1), removes
  transparency/glow, bolder weights.
- `accessibility/reduced-motion.json` — zeroes animation durations, disables parallax and
  scale animation, forces static transitions.

Merge order (highest priority last): **base → active accessibility overrides → user overrides**.
Overrides are keyed by the same dotted token path as the base; unspecified tokens fall through.

### 5. Theme API surface

The reference implementation is `platform/quest/api/ThemeManager.ts`. It exposes:

| Method | Responsibility |
|--------|----------------|
| `loadTheme(manifestPath)` | Load + validate a theme, resolve aliases, return a `Theme` |
| `activateTheme(theme)`    | Apply resolved tokens to the platform variable layer (CSS custom properties on WebXR) |
| `getToken(key)`           | Resolve a token by dotted path through the fallback chain |
| `applyAccessibilityLayer(mode)` | Merge a high-contrast / reduced-motion override on top of the active theme |
| `listInstalledThemes()`   | Enumerate installed themes |
| `previewTheme(theme)`     | Non-destructive apply for a preview surface |
| `rollbackTheme()`         | Restore the previously active theme (single-level undo) |

Kotlin (`ThemeManager.kt`) and Swift (`ThemeManager.swift`) stubs mirror this surface.

### 6. Default fallback chain

Token resolution follows this order, stopping at the first hit:

1. Active **user override** for the token path.
2. Active **accessibility override** (if a mode is enabled) for the token path.
3. Active **theme** base token.
4. **`me-google-default`** theme token (the OS ships this and it can never be uninstalled).
5. **Hard-coded safe default** compiled into `ThemeManager` (last-resort, guarantees the
   OS is always usable even with a corrupt theme).

`me-google-default` is therefore both the default and the guaranteed floor of the chain.

## Consequences

**Positive**
- DTCG alignment gives us a large existing tooling ecosystem (Style Dictionary, Figma).
- Sparse accessibility overrides keep authoring DRY and make conformance auditable.
- A guaranteed fallback chain means a broken installed theme can never brick the OS.

**Negative / trade-offs**
- DTCG has no native `depth`/`audio`/`haptics` types, so we extend the vocabulary and must
  document it (done in the schema and theme authoring guide).
- Runtime merge of override layers adds a small activation cost (mitigated by caching the
  resolved token map per (theme, a11y-mode) tuple).

## Alternatives considered

- **Platform-native theming only** (SwiftUI semantic colours, Compose `MaterialTheme`,
  CSS vars) — rejected as the single source of truth because it fragments the design system
  across three languages. Instead these are *outputs* of the DTCG pipeline (ADR-007).
- **Material You dynamic colour as the base model** — good for colour but has no spatial
  (depth/motion/audio/haptics) vocabulary; we borrow its HCT palette-generation idea for
  the `generate` pipeline only (ADR-007).
