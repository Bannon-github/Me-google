# Theme API

Reference implementations of the `ThemeManager` — the runtime that installs, activates,
switches, previews, and rolls back VR themes, and applies accessibility override layers.

| File | Platform | Status |
|------|----------|--------|
| `ThemeManager.ts` | Web / WebXR (canonical reference) | Implemented + unit-tested |
| `ThemeManager.kt` | Android / ARCore (Jetpack Compose) | Documented stub |
| `ThemeManager.swift` | visionOS / RealityKit (SwiftUI) | Documented stub |

The TypeScript implementation is the **behavioural contract**; the Kotlin and Swift stubs
mirror its API surface and the ADR-003 token fallback chain.

## API surface

| Method | Purpose |
|--------|---------|
| `loadTheme(manifestPath)` | Load + structurally validate a theme, register it as installed |
| `activateTheme(theme)` | Resolve tokens through the fallback chain and apply to the platform target |
| `getToken(key)` | Resolve a token by dotted path (e.g. `color.surface.base`) |
| `applyAccessibilityLayer(mode)` | Merge a `high-contrast` / `reduced-motion` override and re-apply |
| `clearAccessibilityLayer()` | Disable the active override layer |
| `setUserOverrides(group)` | Highest-priority per-token overrides |
| `listInstalledThemes()` | Enumerate installed themes |
| `previewTheme(theme)` | Non-destructively resolve a theme for a preview surface |
| `rollbackTheme()` | Single-level undo to the previously active theme |

## Token fallback chain (ADR-003 §6)

```
user override → accessibility override → active theme → me-google-default → safe default
```

`me-google-default` is both the default theme and the guaranteed floor, so a corrupt or
incomplete installed theme can never brick the OS.

## Platform target

`activateTheme` pushes a **resolved, flattened** token map (dotted path → token) to a
`ThemeTarget`. The default WebXR target (`CssVariableTarget`) writes CSS custom properties
named `--mg-<dotted-path>` on `:root`. Native platforms implement their own target
(SwiftUI `Environment`, Compose `CompositionLocal`).

## Build & test (web reference)

```bash
cd platform/quest/api
npm install
npm test      # tsc type-check + node --test (13 unit tests)
npm run build # emit dist/ JS + .d.ts
```

Build artefacts (`dist/`, `node_modules/`) are git-ignored.
