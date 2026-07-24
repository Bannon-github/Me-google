# Theme authoring guide

How to create, structure, and ship a Me-google Meta Quest VR theme. Read
[ADR-003](../../../docs/adr/ADR-003-theme-system-architecture.md) for the full rationale.

## 1. Anatomy of a theme

```
themes/<theme-id>/
├── manifest.json                 # metadata (id, version, author, a11y level, comfort rating)
├── tokens/                       # base (dark-first) design tokens
│   ├── color.json                # surfaces, on-*, accents, semantics, utility
│   ├── typography.json           # angular type scale, weights, families, roles
│   ├── spacing.json              # spatial spacing (metres), radii, panel geometry
│   ├── depth.json                # z-layer distances (metres), scene lighting
│   ├── motion.json               # durations, easing, comfort caps
│   ├── audio.json                # spatial cue refs, volumes, falloff
│   └── haptics.json              # controller haptic patterns
├── accessibility/                # sparse override layers (REQUIRED)
│   ├── high-contrast.json
│   └── reduced-motion.json
├── assets/                       # audio/icon/texture assets (no PII)
└── README.md
```

`<theme-id>` is a lowercase-kebab slug and must match `manifest.id`.

## 2. Token format (DTCG)

A **token** is any JSON object with a `$value`. Groups are objects without `$value`.
`$type` is inherited from the nearest ancestor group. Reference other tokens with the
`{group.token}` alias syntax.

```json
{
  "color": {
    "$type": "color",
    "surface": {
      "base": {
        "$value": { "colorSpace": "srgb", "components": [0.043, 0.055, 0.086], "hex": "#0B0E16" },
        "$description": "Primary panel background",
        "$extensions": { "dev.me-google.linear": [0.0033, 0.005, 0.0089] }
      }
    },
    "utility": { "glow": { "$value": "{color.accent.primary}" } }
  }
}
```

### Supported `$type` values

| `$type` | Value shape | Used by |
|---------|-------------|---------|
| `color` | `{ colorSpace, components[3], hex }` | color |
| `dimension` | `{ value, unit: "px"\|"rem" }` | typography, spacing |
| `fontFamily` | string or string[] | typography |
| `fontWeight` | number | typography |
| `duration` | `{ value, unit: "ms"\|"s" }` | motion, haptics |
| `cubicBezier` | `[x1,y1,x2,y2]` | motion |
| `number` | number | depth, audio, haptics, comfort |
| `typography` | composite | typography roles |
| `transition` | composite | motion |
| `depth` / `audio` / `haptic` | group markers (VR extensions) | depth, audio, haptics |

Shader-ready **linear** colour floats live under `$extensions["dev.me-google.linear"]`.
Angular sizes (degrees) and metric values live under `dev.me-google.*` extensions on
dimension tokens.

## 3. Spatial units (ADR-004)

- Distances in **metres**; primary panels at **1.5 m** (optimal zone 1.0–2.0 m, never < 0.5 m).
- Type sizes in **degrees of visual angle**; body ≥ 0.9°, minimum readable 0.5°.
- Interactable targets ≥ 2° with ≥ 0.5° gaps.

## 4. Accessibility layers (REQUIRED — ADR-005)

Both `accessibility/high-contrast.json` and `accessibility/reduced-motion.json` must exist.
They are **sparse patches** keyed by the same category/path as the base tokens and are merged
on top of the base at activation. A theme without both layers fails schema + motion validation.

- **high-contrast**: raise text contrast to ≥ 7:1 (target ~21:1), remove transparency/glow,
  bolden weights.
- **reduced-motion**: set all durations to 0 ms, disable parallax and scale animation.

## 5. Validate before you commit

```bash
python3 scripts/theme_pipeline.py validate platform/quest/themes/<theme-id>
```

This runs schema validation, contrast checking (FAIL < 4.5:1, WARN < 7:1), and motion safety
(FAIL on > 60°/s, > 0.3×/s, < 100 ms, > 3 Hz, or missing reduced-motion). All must pass.

## 6. Generate a starting point

```bash
python3 scripts/theme_pipeline.py generate --name "My Theme" --seed "#FF7A59" \
    --accessibility AA --comfort Comfortable
```

This scaffolds a full, valid theme with a contrast-aware seed-derived palette. Edit the token
files, re-validate, then `build` and `publish`.

## 7. Versioning (ADR-007)

Themes use SemVer. PATCH = value fixes (auto), MINOR = additive (auto after review),
MAJOR = breaking token rename/removal (human approval). Pre-release channels:
`-alpha` (unreviewed) → `-beta` (validated) → release.
