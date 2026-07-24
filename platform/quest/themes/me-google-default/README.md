# Me-google Default theme

The default spatial theme that ships with the Me-google xrOS and forms the guaranteed
floor of the token fallback chain (ADR-003 §6). It can never be uninstalled.

- **ID:** `me-google-default`
- **Version:** 1.0.0
- **Accessibility level:** WCAG 2.2 **AA** (XAUR-aligned; 7:1 VR contrast target)
- **Target comfort rating:** **Comfortable** (Meta)

## Design intent

Dark-first, near-black surfaces with a slight blue tint so panels read cleanly against
Quest passthrough. High-luminance text (17.65:1 primary) and accents chosen so semantic
meaning survives colour-vision deficiency (distinguished by luminance, not hue alone).

## Token files

| File | Category | Notes |
|------|----------|-------|
| `tokens/color.json` | Colour | sRGB hex + normalized components; linear floats for shaders under `$extensions` |
| `tokens/typography.json` | Typography | Sizes in degrees of visual angle (0.7°–2.4°); metres@1m + px@72dpi |
| `tokens/spacing.json` | Spacing | Metres (VR-native) + panel geometry + min target angles |
| `tokens/depth.json` | Depth | Z-layer distances (m) per the ADR-004 §7 z-stack |
| `tokens/motion.json` | Motion | Durations, easing, comfort caps (≤30°/s, ≤0.3×/s, ≤3 Hz) |
| `tokens/audio.json` | Audio | Spatial cue refs, volumes, mono-safe |
| `tokens/haptics.json` | Haptics | Controller patterns (intensity/duration/frequency) |
| `accessibility/high-contrast.json` | A11y override | ≥15:1 near #000/#fff, bolder weights |
| `accessibility/reduced-motion.json` | A11y override | Zero durations, parallax off |

## Validating this theme

```bash
python3 platform/quest/qa/validators/schema_validate.py  platform/quest/themes/me-google-default/
python3 platform/quest/qa/validators/contrast_check.py   platform/quest/themes/me-google-default/
python3 platform/quest/qa/validators/motion_safety.py    platform/quest/themes/me-google-default/
# or all at once:
python3 scripts/theme_pipeline.py validate platform/quest/themes/me-google-default/
```

## Contrast summary (WCAG 2.1, sRGB)

Primary text (`on-surface.default`) on `surface.base`: **17.65:1**. All `on-*` / fill pairs
are ≥ 4.5:1 (AA); most exceed the 7:1 VR-recommended target. See `contrast_check.py --json`
for the full report.
