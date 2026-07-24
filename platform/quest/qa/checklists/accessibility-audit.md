# Accessibility audit checklist — per theme

Complete for every theme before release. Target: **XAUR-aligned + Meta Quest accessibility
support + WCAG 2.2 AA** with VR contrast uplift (ADR-005).

## Contrast (WCAG 2.2 AA + VR uplift)

- [ ] All body text (≤ 1° angular) ≥ 4.5:1; **7:1 target met or WARN justified**
- [ ] Large text (≥ 1.4°) ≥ 3:1
- [ ] UI components / icons / focus rings ≥ 3:1 (non-text contrast, SC 1.4.11)
- [ ] High-contrast mode reaches ≥ 15:1 (near #000/#fff ~21:1)
- [ ] `contrast_check.py` and `contrast_check.py --mode high-contrast` both pass

## Colour vision deficiency

- [ ] No information conveyed by hue alone
- [ ] Semantic colours (success/warning/error/info) separated by luminance
- [ ] Each semantic state also uses an icon or text label
- [ ] Verified under deuteranopia, protanopia, and tritanopia simulation

## Text & scaling (SC 1.4.4)

- [ ] Minimum text angular size ≥ 0.5°; body ≥ 0.9°
- [ ] `fontScale` up to 2.0 (200%) reflows without clipping or overlap
- [ ] Line-height / spacing scale with font size

## Motion & vestibular safety (SC 2.3.1, 2.3.3)

- [ ] Reduced-motion override present and effective (all durations 0 ms, no parallax)
- [ ] Angular velocity ≤ 30°/s; scale change ≤ 0.3×/s; no flashing > 3 Hz
- [ ] `prefers-reduced-motion` change handled live (no reload required)
- [ ] `motion_safety.py` passes

## Audio, haptics & captions

- [ ] Every visual state change has an audio cue and a haptic pattern
- [ ] Mono-audio setting honoured; no required info relies on L/R separation (XAUR REQ 18a)
- [ ] Any spoken audio has scalable captions (SC 1.2.x; XAUR timing needs)

## OS preference integration (Meta Quest)

- [ ] Respects OS high-contrast / colour-correction setting
- [ ] Respects OS reduced-motion setting
- [ ] Respects OS text-size setting
- [ ] `matchMedia` listeners for `prefers-reduced-motion`, `prefers-contrast`, `forced-colors`

## Immersive semantics & interaction (XAUR)

- [ ] Focus order is logical; focus indicator always visible (≥ 3:1)
- [ ] All gaze/dwell interactions have a non-gaze alternative
- [ ] Interaction works one-handed and with audio off

## Sign-off

- Auditor: ______________________  Date: ____________
- Declared level (A / AA / AAA): ____________
- Outstanding issues (severity S0–S4): __________________________________
