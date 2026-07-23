# Me-google — Copilot Agent Instructions

## Project Overview
**Me-google** is a multi-platform AI xrOS — an operating system extended into augmented/virtual reality.
Users enter their OS, persist across real-world movement, place favourites spatially across multiple
layers, share their experience in real-time, and do all of this with privacy as a foundational
guarantee (inspired by Samurai Wallet + Tor anonymity models).

## Guiding Principles
1. **Privacy-first** — no user data leaves the device without explicit consent; anonymous networking
   by default.
2. **Spatial-first UI** — all UI components must be designed to exist in 3D space (xrOS / visionOS
   style), not just adapted from flat surfaces.
3. **Multi-platform** — target iOS/visionOS, Android, and web (WebXR) with shared logic.
4. **Real-time collaboration** — architecture must support live, low-latency sharing between users.
5. **Modular & composable** — every feature is a self-contained module that can be enabled or
   disabled without touching others.

## Repository Layout (target structure)
```
Me-google/
├── .github/
│   ├── copilot-instructions.md   ← you are here
│   └── workflows/                ← CI/CD pipelines
├── core/                         ← shared platform-agnostic logic
├── platform/
│   ├── ios/                      ← Swift / SwiftUI / RealityKit
│   ├── android/                  ← Kotlin / Jetpack Compose / ARCore
│   └── web/                      ← TypeScript / React / WebXR
├── services/                     ← backend micro-services (privacy networking, sync)
├── scripts/                      ← developer tooling & automation
│   └── generate_tasks.py         ← automated task list generator
├── docs/                         ← architecture decisions, API references
├── AGENTS.md                     ← agent collaboration guide
├── TASKS.md                      ← current prioritised task list (auto-generated)
└── README.md
```

## Agent Coding Standards
- **Language defaults**: Swift for iOS/xrOS, Kotlin for Android, TypeScript (strict) for web.
- **Shared core logic** belongs in `core/` and must have unit tests.
- **No hard-coded credentials, tokens, or device identifiers** anywhere in the codebase.
- **Privacy review required** for any code that touches networking, storage, or identity.
- Follow conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Every PR must update `TASKS.md` (re-run `scripts/generate_tasks.py`) if the task it addresses is now complete.

## How to Use the Task System
1. Run `python3 scripts/generate_tasks.py` to see the current prioritised task list.
2. Pick a task whose **Status** is `open` and whose **Depends On** tasks are all `done`.
3. Open a PR referencing the task ID in the title, e.g. `feat: [TASK-003] scaffold iOS project`.
4. Mark the task `done` in `TASKS.md` when the PR merges.

## Collaboration Rules for Agents
- Read `AGENTS.md` for role definitions before starting work.
- Do not duplicate work — check open PRs before beginning a task.
- Small, focused PRs are strongly preferred over large omnibus changes.
- Leave review comments for anything that touches the privacy or spatial-UI layers.
