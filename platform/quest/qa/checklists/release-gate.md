# Release gate checklist — theme release

Complete before publishing a theme to the release channel (ADR-006 Tier 3). All items are
human-verified; automated Tier-1/2 checks are prerequisites, not substitutes.

## Prerequisites (green from CI)

- [ ] All Tier-1 validators pass (schema, contrast, motion)
- [ ] All Tier-2 integration checks pass (install/switch/rollback, visual regression, perf smoke)
- [ ] PR review checklist completed and signed
- [ ] Accessibility audit checklist completed and signed

## On-device VRC walkthrough (physical Quest 3)

- [ ] Theme installs, activates, previews, switches, and rolls back without error
- [ ] All required Meta VRC checks pass on the pre-release build
- [ ] First themed frame renders within 4 s of launch
- [ ] Frame time ≤ 11.1 ms (90 Hz); no thermal spike; MTP ≤ 20 ms
- [ ] High-contrast and reduced-motion modes verified live from Quick Settings mid-session

## Comfort / SSQ session

- [ ] 5 participants × ~15 min cycling all themes
- [ ] Mean SSQ delta ≤ 10 points
- [ ] No individual participant SSQ total > 20
- [ ] QA lead signs the SSQ summary

## Content & privacy

- [ ] Assets are licence-clean and contain no PII
- [ ] No telemetry added; no user identifiers embedded
- [ ] `.megtheme` package built with valid SHA-256 checksums in the manifest

## Versioning & release notes

- [ ] `manifest.version` is a final (non-prerelease) SemVer
- [ ] CHANGELOG entry generated and categorised
- [ ] GitHub Release created with the relevant CHANGELOG section

## Sign-off

- QA lead: ______________________  Date: ____________
- Release approved: ☐ Yes  ☐ No (blocking issues: __________________________)
