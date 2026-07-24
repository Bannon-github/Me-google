# PR review checklist — theme changes

Complete this checklist for any PR touching `platform/quest/themes/**`,
`platform/quest/api/**`, or `platform/quest/qa/**` (ADR-006 Tier 2).

## Automated gates (must be green)

- [ ] `schema_validate.py` passes for every changed theme
- [ ] `contrast_check.py` passes (0 FAIL; WARNs reviewed and justified)
- [ ] `motion_safety.py` passes (0 FAIL)
- [ ] `contrast_check.py --mode high-contrast` passes for changed themes
- [ ] `ThemeManager` unit tests pass (`cd platform/quest/api && npm test`)
- [ ] `theme-ci.yml` workflow is green

## Tokens & structure

- [ ] All seven token categories present and valid
- [ ] Both accessibility override layers present (`high-contrast`, `reduced-motion`)
- [ ] New/changed colour tokens include `hex`, sRGB `components`, and linear `$extensions`
- [ ] Spatial values in metres; type sizes in degrees; px only as tooling equivalents
- [ ] Aliases (`{group.token}`) resolve; no circular references

## Accessibility (ADR-005)

- [ ] Every new visual token has an accessibility override where relevant
- [ ] No meaning encoded by hue alone (luminance + icon/label back-up)
- [ ] Semantic colours remain distinguishable under deuteranopia/protanopia/tritanopia
- [ ] Every visual state change has an audio cue and a haptic pattern
- [ ] `manifest.accessibilityLevel` still accurate

## Comfort & motion (ADR-004/005)

- [ ] Animated durations within 100–300 ms (snap ≥ 100 ms)
- [ ] Angular velocity ≤ 30°/s, scale change ≤ 0.3×/s, no flashing > 3 Hz
- [ ] `targetComfortRating` still accurate

## Versioning & privacy (ADR-007)

- [ ] `manifest.version` bumped correctly (PATCH/MINOR/MAJOR)
- [ ] MAJOR (breaking token rename/removal) has explicit human approval
- [ ] Schema changes documented in `themes/schema/CHANGELOG.md`
- [ ] No credentials, tokens, PII, or user identifiers in tokens/assets/manifest
- [ ] Conventional-commit messages used

## Reviewer sign-off

- Reviewer: ______________________  Date: ____________
- Severity of any deferred issues (S0–S4): ____________
