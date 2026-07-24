# ADR-006 — Theme QA Framework

- **Status:** Accepted
- **Date:** 2026-07-24
- **Deciders:** Theme System Coordinator (Architect + DevOps roles)
- **Related:** ADR-003, ADR-004, ADR-005, ADR-007
- **Research basis:** Phase 1 R4 — ISO 9241, Meta VRC, XR test tooling, visual regression,
  a11y automation, comfort heuristics.

## Context

A living theme system edited by humans and agents needs graded quality gates: cheap checks
run constantly, expensive checks run before merge, and human judgement gates every release.
The model below is grounded in ISO 9241-210 (human-centred, iterative design) and
ISO 9241-11 (usability = effectiveness + efficiency + satisfaction), Meta's Virtual Reality
Checks (VRC), and established XR test tooling.

## Decision

### QA tiers

#### Tier 1 — Automated, every commit (fast, < 2 min)

| Check | Tool | Gate |
|-------|------|------|
| Token schema validation | `qa/validators/schema_validate.py` | FAIL blocks |
| Contrast ratios | `qa/validators/contrast_check.py` | < 4.5:1 FAIL; < 7:1 WARN |
| Motion safety | `qa/validators/motion_safety.py` | > 60°/s, > 0.3×/s, < 100 ms, > 3 Hz, or missing reduced-motion FAIL |
| Accessibility contrast snapshot | contrast validator `--json` compared to baseline | regression FAIL |
| `ThemeManager` unit tests | Jest / node test | FAIL blocks |

#### Tier 2 — Integration, every PR (15–45 min, parallelised)

| Check | Approach | Gate |
|-------|----------|------|
| End-to-end install / activate / switch / rollback | `ThemeManager` integration tests | FAIL blocks merge |
| Accessibility-layer merge validation | apply `high-contrast` + `reduced-motion`, re-run contrast + motion validators on merged tokens | FAIL blocks |
| Live-preference propagation | simulate `prefers-reduced-motion` / `prefers-contrast` / `forced-colors` change events | FAIL blocks |
| Visual regression — panels | screenshot each themed panel from a fixed camera; `pixelmatch` diff ≤ 1 % (threshold 0.05) | FAIL blocks |
| Performance smoke | reference-device frame time ≤ 11.1 ms (90 Hz); MTP ≤ 20 ms | FAIL blocks |

#### Tier 3 — Manual, every release (human judgement)

| Gate | Criterion |
|------|-----------|
| On-device VRC walkthrough | Full Meta VRC required checks pass on physical Quest 3 |
| PR review checklist | [`qa/checklists/pr-review.md`](../../platform/quest/qa/checklists/pr-review.md) complete |
| Accessibility audit | [`qa/checklists/accessibility-audit.md`](../../platform/quest/qa/checklists/accessibility-audit.md) signed |
| Comfort / SSQ session | 5 participants × ~15 min cycling all themes; **mean SSQ delta ≤ 10**, no participant total > 20 |
| Release-gate sign-off | [`qa/checklists/release-gate.md`](../../platform/quest/qa/checklists/release-gate.md) signed by QA lead |

### Automated check definitions (Tier 1 detail)

- **Schema validation** — every required token group/key present, no unknown keys, value
  types match `theme.schema.json`; both accessibility override files present and valid.
- **Contrast** — WCAG 2.1 relative-luminance ratio for all `on-*` / surface pairs; FAIL < 4.5:1,
  WARN 4.5:1–6.99:1 (below VR-recommended 7:1), PASS ≥ 7:1.
- **Motion safety** — parses `motion.json`; flags any duration < 100 ms, angular velocity
  > 60°/s, scale change > 0.3×/s, flash > 3 Hz, and the absence of a `reduced-motion` override.
- **Snapshot regression** — the contrast validator's `--json` output is diffed against a
  committed baseline so an unintended contrast regression fails even if still above threshold.

### Bug severity taxonomy for theme defects

| Severity | Label | Definition | Theme examples | Gate |
|----------|-------|------------|----------------|------|
| **S0 Critical** | `severity:critical` | Crash, data loss, or **safety** risk | Theme switch crashes OS; flash > 3 Hz introduced; user trapped with no exit | Tier 1/2 auto-block |
| **S1 Major** | `severity:major` | Key feature broken, no workaround; comfort violation over threshold | Angular velocity > 60°/s in a transition; contrast < 3:1 on critical UI; MTP > 20 ms after theme load | Tier 2 blocks merge |
| **S2 Moderate** | `severity:moderate` | Usability impaired, workaround exists | Body text 3:1–4.5:1 (AA fail); transition 400–800 ms (too slow); missing haptic cue | Tier 3 blocks release |
| **S3 Minor** | `severity:minor` | Cosmetic, no functional/comfort impact | Slightly-off shade within token family; 2 px panel misalignment | Blocks no tier |
| **S4 Enhancement** | `severity:enhancement` | Desired improvement, not a bug | Extra CVD mode requested; low-res preview thumbnail | Backlog |

Record **both** severity (how broken) and priority (how urgent) on every theme defect.

## Consequences

- Cheap, deterministic checks (schema/contrast/motion) catch the majority of theme defects
  before a human ever reviews a PR.
- The three validators are reused verbatim by the CI workflow (ADR-007, `theme-ci.yml`) and by
  the `theme_pipeline.py validate` subcommand, so local and CI results are identical.
- Comfort/SSQ and on-device VRC remain human-gated because sim-sickness cannot be fully
  automated.

## References

- ISO 9241-210:2019 (human-centred design), ISO 9241-11:2018 (usability).
- Meta Quest Virtual Reality Checks (VRC).
- Unity Test Framework (edit-mode vs play-mode), XR Interaction Simulator.
- `jest-image-snapshot` / `pixelmatch` for visual regression.
- Simulator Sickness Questionnaire (SSQ).
