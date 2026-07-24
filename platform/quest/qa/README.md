# Theme QA framework

Quality gates for the VR theme system, per
[ADR-006](../../../docs/adr/ADR-006-theme-qa-framework.md). Three tiers: cheap automated
checks on every commit, integration checks on every PR, and human gates on every release.

## Layout

```
qa/
├── validators/          Automated Tier-1 checks (Python, stdlib + jsonschema)
│   ├── contrast_check.py    WCAG/XAUR contrast ratios
│   ├── motion_safety.py     Motion/vestibular safety
│   ├── schema_validate.py   JSON Schema conformance
│   └── _theme_common.py     Shared loader / alias / contrast helpers
├── snapshots/           Visual-regression baselines (Tier 2, reserved)
└── checklists/          Manual Tier-3 gates
    ├── pr-review.md
    ├── release-gate.md
    └── accessibility-audit.md
```

## Tier 1 — automated (every commit)

Each validator takes a theme directory, prints `PASS`/`WARN`/`FAIL` per check, supports
`--json`, and exits non-zero on any `FAIL`.

```bash
python3 qa/validators/schema_validate.py platform/quest/themes/me-google-default
python3 qa/validators/contrast_check.py  platform/quest/themes/me-google-default
python3 qa/validators/motion_safety.py   platform/quest/themes/me-google-default
# or all three:
python3 scripts/theme_pipeline.py validate platform/quest/themes/me-google-default
```

| Validator | FAIL condition |
|-----------|----------------|
| `schema_validate` | Missing required token group / accessibility layer, unknown key, type mismatch |
| `contrast_check` | Any `on-*`/surface pair < 4.5:1 (WARN < 7:1 VR target) |
| `motion_safety` | Duration < 100 ms, angular velocity > 60°/s, scale > 0.3×/s, flash > 3 Hz, or missing reduced-motion |

Contrast can also validate a merged accessibility layer: `--mode high-contrast`.

## Tier 2 — integration (every PR)

Runs in CI (`.github/workflows/theme-ci.yml`) plus the `ThemeManager` unit tests
(`cd platform/quest/api && npm test`). Visual-regression snapshots live in `snapshots/`.

## Tier 3 — manual (every release)

Complete the checklists in `checklists/` and obtain sign-off. Comfort is gated by an SSQ
session (mean delta ≤ 10; no participant total > 20).

## Bug severity taxonomy

S0 Critical (safety/crash) · S1 Major (comfort/contrast violation) · S2 Moderate (AA fail /
too-slow) · S3 Minor (cosmetic) · S4 Enhancement. Record both severity and priority.
