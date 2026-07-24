# ADR-005 — Accessibility Conformance for the VR Theme System

- **Status:** Accepted
- **Date:** 2026-07-24
- **Deciders:** Theme System Coordinator (Architect + Accessibility owner)
- **Related:** ADR-003, ADR-004, ADR-006
- **Research basis:** Phase 1 R2 — W3C XAUR, WCAG 2.2, Meta Quest accessibility features,
  WebXR accessibility guidance.

## Context

The theme system must be accessible by construction. Visual-only design excludes users with
low vision, colour-vision deficiency, vestibular sensitivity, and hearing loss. VR adds
optical challenges (lens contrast falloff, vergence-accommodation conflict, optic-flow
sickness) that make several WCAG minimums insufficient on their own.

## Decision

### 1. Conformance target

**XAUR-aligned + Meta Quest accessibility feature support + WCAG 2.2 Level AA**, with
selected AAA uplifts for VR text contrast.

- We align to the **W3C XR Accessibility User Requirements (XAUR)** — 19 numbered user needs
  spanning immersive semantics, magnification, colour/contrast customisation, reduced motion,
  captions/subtitles, gesture alternatives, timing adjustability, personalisation, and
  mono-audio.
- We respect the **Meta Quest OS accessibility settings**: mono audio, colour
  correction / high contrast, reduced motion, text/font scaling, and pointer options. The
  theme must **listen for live changes** to these preferences (on WebXR: `matchMedia` change
  listeners for `prefers-reduced-motion`, `prefers-contrast`, and `forced-colors`) and
  re-resolve tokens without a reload.
- WCAG 2.2 AA success criteria that translate to immersive VR are honoured: 1.4.3 (contrast),
  1.4.4 (resize text ≥ 200%), 1.4.11 (non-text contrast 3:1), 2.2.1 (timing adjustable),
  2.3.1 (three flashes ≤ 3 Hz), 2.3.3 (animation from interactions can be disabled).

### 2. Colour contrast requirements (VR-adjusted)

Fresnel/pancake lenses reduce effective contrast at the periphery, and small text sits below
1° of visual angle, so we raise the bar above baseline WCAG:

| Element | Minimum (fail below) | Recommended (VR target) |
|---------|----------------------|-------------------------|
| Body text (≤ 1° angular size) | **4.5:1** (WCAG AA) | **7:1** (WCAG AAA) |
| Large text (≥ 1.4° / bold ≥ 1.1°) | 3:1 | 4.5:1 |
| UI components, icons, focus rings (non-text) | **3:1** (WCAG 1.4.11) | 4.5:1 |
| High-contrast mode text | 7:1 | **≥ 15:1** (target #000/#fff ≈ 21:1) |

`contrast_check.py` computes WCAG 2.1 relative-luminance ratios for every `color.on-*` /
background pair and **FAILs < 4.5:1**, **WARNs 4.5:1–6.99:1** (below the VR-recommended 7:1).

### 3. Colour-vision-deficiency (CVD) rules

- **Never encode meaning by hue alone** — every semantic colour (success/warning/error/info)
  must also differ in **luminance** and be paired with an icon or text label.
- Semantic hues are chosen to remain distinguishable under deuteranopia, protanopia and
  tritanopia (verified by luminance separation, not hue).
- High-contrast mode drops chroma dependence entirely (near-monochrome + shape/label coding).

### 4. Motion safety rules

Derived from vestibular research and Meta comfort guidance:

| Parameter | Cap (default theme) | Hard fail (validator) |
|-----------|---------------------|-----------------------|
| UI transition duration | < 300 ms (snap < 100 ms) | < 100 ms flagged as too-fast sim-sickness risk |
| Snap-turn / rotation animation | ≤ 200 ms | — |
| Max angular velocity of animated content | ≤ 30°/s (comfortable) | **> 60°/s = FAIL** |
| Max scale change per second | ≤ 0.3×/s | > 0.3×/s = FAIL |
| Flashing | ≤ 3 Hz | > 3 Hz = FAIL (seizure risk) |
| Reduced-motion override | **Must exist** | Absent = FAIL |
| Motion-to-photon latency | < 20 ms | (runtime concern, not token-level) |

Under `reduced-motion` mode **all** durations become 0 ms, parallax and scale animation are
disabled, and transitions become instant cross-fades or hard cuts (WCAG 2.3.3).

### 5. Audio & haptic fallbacks for visual elements

- Every state change that is communicated visually (focus, selection, success, error) also has
  an **audio cue** token and a **haptic pattern** token, so the information survives with vision
  reduced or off.
- **Mono-audio** support (XAUR REQ 18a): when the OS mono-audio setting is on, spatial cues are
  summed to both ears; the theme never relies on left/right separation to convey required
  information.
- Captions/subtitles for any spoken audio must be scalable independently (see §6).

### 6. Font scaling implementation

- The typography scale is authored in **degrees of visual angle**, with a **`fontScale`
  multiplier token** (default `1.0`). Honouring the OS text-size setting multiplies every
  computed size, satisfying WCAG 1.4.4 (resize ≥ 200% ⇒ `fontScale` up to `2.0` supported).
- Line-height and spacing tokens are expressed as multipliers so they scale with font size and
  reflow rather than clip.

### 7. Testing and audit protocol

- **Automated (every commit):** `contrast_check.py`, `motion_safety.py`, `schema_validate.py`
  (verifies accessibility override files exist and are valid).
- **Integration (every PR):** apply `high-contrast` and `reduced-motion` layers and re-run the
  contrast/motion validators against the *merged* result; confirm live-preference propagation.
- **Manual (every release):** the per-theme
  [accessibility audit checklist](../../platform/quest/qa/checklists/accessibility-audit.md)
  is completed and signed off, including a CVD simulation pass and a mono-audio pass.

## Consequences

- Every visual token has a defined non-visual fallback and an accessibility override, which is
  enforceable and auditable.
- The 7:1 VR-recommended contrast target means the default palette is intentionally
  high-contrast, which also improves general legibility through the lenses.
- Live OS-preference listening prevents the "preference toggled mid-session but never applied"
  class of bug.

## References

- W3C XR Accessibility User Requirements (XAUR).
- WCAG 2.2 (W3C Recommendation, 2023-10-05): SC 1.4.3, 1.4.4, 1.4.11, 2.2.1, 2.3.1, 2.3.3.
- Meta Quest accessibility features documentation.
- WebXR accessibility architecture notes; `prefers-reduced-motion` / `prefers-contrast` /
  `forced-colors` media queries.
