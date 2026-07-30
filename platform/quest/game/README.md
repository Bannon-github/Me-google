# Orb Collector — Meta Quest 3 Game

A WebXR game built for **Meta Quest 3**, integrated with the Me-google xrOS platform and
its default VR theme system. Play it in the **Meta Quest Browser** with full 6DoF controller
support, hand-tracking, and haptic feedback.

## Game Overview

Floating orbs appear in 3D space around you. Use your **Quest 3 controllers** (aim + trigger)
or **hand tracking** (pinch gesture) to collect them before they expire. Score as many points
as possible in **60 seconds**.

| Orb Colour | Tier       | Points | Spawn Rate |
|------------|------------|--------|------------|
| Cyan       | Common     | 10     | 45 %       |
| Green      | Uncommon   | 25     | 30 %       |
| Amber      | Rare       | 50     | 15 %       |
| Rose       | Epic       | 100    | 7 %        |
| Violet     | Legendary  | 250    | 3 %        |

**Combo multiplier**: collect orbs within 2 s of each other to chain combos (up to 8×).

**Wave progression**: difficulty ramps automatically as your score climbs through 5 tiers —
more orbs, shorter lifetime, faster drift.

## Controls

| Action         | Controller      |
|----------------|-----------------|
| Aim at orb     | Point controller|
| Collect orb    | Squeeze trigger |
| Pause / Resume | Grip squeeze    |

> Hand tracking controls are not implemented yet; update this section when added.
## Directory Layout

```
game/
├── index.html              Entry page (served via Vite dev or deployed to Quest Browser)
├── package.json            npm project (three, vite, vitest)
├── tsconfig.json           TypeScript strict mode
├── vite.config.ts          Vite build configuration
└── src/
    ├── main.ts             Renderer setup, VRButton, Game bootstrap
    ├── Game.ts             State machine + animation loop
    ├── theme.ts            Me-google → THREE.Color palette bridge
    ├── WaveConfig.ts       Wave difficulty table (pure logic)
    ├── GameTimer.ts        Countdown timer (pure logic)
    ├── ScoreManager.ts     Score + combo tracking (pure logic)
    ├── Orb.ts              Orb mesh entity
    ├── OrbSpawner.ts       Spawn pool and lifecycle
    ├── ControllerManager.ts XR controller input + raycasting
    ├── HapticManager.ts    Vibration feedback wrapper
    ├── HUDManager.ts       Spatial floating UI panels
    └── __tests__/          Unit tests (vitest)
```

## Development

```bash
# Install dependencies
npm install

# Start dev server (open in Quest Browser at http://<your-ip>:5173)
npm run dev

# Production build → dist/
npm run build

# Run unit tests
npm test
```

> **HTTPS required for WebXR**: serve with `npm run dev -- --https` or deploy behind a proxy
> when testing on-device, since the WebXR API requires a secure context.

## Architecture Notes

- **WebXR Device API** via Three.js `WebGLRenderer.xr` — no native SDK required.
- **Me-google theme colours** are pulled from `src/theme.ts` (mirrors the DTCG tokens in
  `platform/quest/themes/me-google-default/tokens/color.json`).
- **Privacy-first**: no analytics, no user identifiers, no network requests at runtime.
- High scores are persisted to `localStorage` only; no data leaves the device.
- All source files comply with the 500-line limit (RULE-006).

## Public API

This module exports nothing at the package level — it is a self-contained runnable app.
The pure-logic classes (`ScoreManager`, `GameTimer`, `WaveConfig`) can be imported by other
`core/` modules if shared logic is needed in future.
