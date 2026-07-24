# ADR-004 — Meta Quest UI Standards for Theming

- **Status:** Accepted
- **Date:** 2026-07-24
- **Deciders:** Theme System Coordinator (Architect + iOS/xrOS Engineer roles)
- **Related:** ADR-003, ADR-005
- **Research basis:** Phase 1 R1 (Meta Horizon OS / Meta Spatial SDK design guidance)

## Context

Theme tokens for `depth`, `spacing`, `typography` and panel layout must be grounded in
Meta's published spatial-UI guidance so that any theme built on this system renders
comfortably and legibly on Quest 2 / 3 / Pro. This ADR fixes the numeric standards the
default theme and all validators enforce.

All values are sourced from Meta developer guidance (Meta Spatial SDK skill files, Unity
Meta Quest UI guidance, Immersive Web SDK / WebXR spatial-UI references) and VR ergonomics
research surfaced during Phase 1. Where Meta gives a range we adopt the conservative,
comfort-biased end.

## Decision

### 1. Units

The world unit is **metres** (Meta Spatial SDK convention: `Vector3(0, 1.5, -2)` = 1.5 m up,
2 m forward). All spatial tokens are authored in metres with a px equivalent (@72 dpi, 1 m
reference distance) provided for tooling compatibility only. Angular sizes are authored in
**degrees of visual angle** because legibility in VR depends on angular — not physical — size.

### 2. Panel placement (depth zones)

| Zone        | Distance from viewer | Use |
|-------------|----------------------|-----|
| Too near    | < 0.5 m              | **Forbidden** — vergence-accommodation strain |
| Near        | 0.5 – 1.0 m          | Transient, hand-attached UI only |
| **Optimal** | **1.0 – 2.0 m**      | **Primary zone for all focused UI** (sweet spot 1.2–1.5 m) |
| Far         | 2.0 – 5.0 m          | Ambient / background panels; max 5 m for readable text |
| Too far     | > 5.0 m              | Non-text scenery only |

Default primary panel distance token: **1.5 m**.

### 3. Panel dimensions

- Primary / menu panel: **1.2–2.0 m wide × 0.8–1.4 m tall**.
- A common square content panel is **592 × 592 dp**; a landscape secondary panel **592 × 444 dp**
  (Meta Spatial SDK `PanelRegistration` convention).
- Any panel exceeding **~40° of horizontal span** should be rendered on a **cylinder
  compositor layer** (keeps edges equidistant from the eyes); otherwise a **quad layer**.
- Prefer **Layer mode** (compositor) over Mesh mode for text-heavy panels — it yields the
  sharpest text after lens distortion.

### 4. Angular field-of-view comfort zones

| Zone      | Angle from gaze centre | Content rule |
|-----------|------------------------|--------------|
| Primary   | 0–30°                  | All critical info + primary interaction targets; comfortable for extended viewing |
| Secondary | 30–60°                 | Supporting/contextual UI; requires head turn |
| Peripheral| > 60°                  | Ambient only; never place required content here |

At the default 1.5 m distance, keep primary panels within a **30–55° horizontal span** so
they sit inside the primary + inner-secondary comfort zone.

### 5. Text legibility

- **Minimum text angular size: 0.5°** (≈ 22 arcmin, ≈ 20 dmm at 1 m). Below ~0.3° text is
  not reliably readable at current pixels-per-degree.
- Body text should target **≥ 0.9°**; the default type scale therefore starts at
  0.7° (`xs`, captions only) and body (`md`) is 1.1°.
- Contrast: see ADR-005. Avoid pure-white-on-pure-black for large fills (bloom/halation on
  Fresnel/pancake optics); reserve maximum contrast for high-contrast mode.

### 6. Interaction model support matrix

| Input           | Supported | Min interactable angular size | Notes |
|-----------------|-----------|-------------------------------|-------|
| Hand tracking (pinch/ray) | Yes | **≥ 2°** target, 3°+ recommended | Primary Quest 3 input |
| Direct touch (poke)       | Yes | ≥ 2°, panel within arm reach (≤ 0.7 m) | Requires `PokeInteractable` |
| Controllers (ray)         | Yes | ≥ 1.5° | Rays are precise; still pad targets |
| Eye gaze + dwell          | Progressive enhancement | ≥ 3° + dwell timeout ≥ 600 ms | Requires eye-tracking hardware; always provide a non-gaze alternative |

Minimum spacing between adjacent targets: **≥ 0.5°** of clear gap to prevent mis-selection.

### 7. Z-order stack convention (top → bottom)

1. System / Horizon OS overlays (always on top)
2. System notifications
3. App modal dialogs
4. Primary app UI panels
5. App secondary panels
6. World-space 3D content
7. Passthrough underlay (lowest)

The `depth.json` token file encodes this as ascending distance / descending priority layers.

### 8. Comfort rating targets

- Target Meta comfort rating: **Comfortable** for all default-theme motion.
- Frame-rate budget: content must hold **72 Hz minimum, 90 Hz target** (≤ 11.1 ms/frame),
  120 Hz where the device supports it.
- **Motion-to-photon latency < 20 ms** (above ~20 ms is perceptible; > 30 ms provokes sickness).
- Motion caps for theme animation are defined in ADR-005 §Motion safety and enforced by
  `motion_safety.py`.

## Consequences

- The default theme's `depth`, `spacing`, and `typography` tokens are derived directly from
  these numbers, so they are guaranteed comfortable out of the box.
- `contrast_check.py` and `motion_safety.py` encode §5 and §8 thresholds as automated gates.
- Themes that violate these standards fail QA (ADR-006) rather than shipping.

## References

- Meta Spatial SDK panel & layout guidance (`meta-quest/agentic-tools` skill files).
- Meta Unity Meta Quest UI guidance (world-space canvas at 0.001 scale = 1 unit → 1 mm).
- Meta Immersive Web SDK / WebXR spatial-UI references (`PanelUI maxWidth/maxHeight` in metres).
- Meta comfort-rating / motion-sickness best practices.
