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
│   ├── rules/                    ← auto-derived coding rules (registry.json + derived/)
│   ├── skills/                   ← auto-derived agent skills (registry.json + derived/)
│   └── workflows/                ← CI/CD pipelines
├── core/                         ← shared platform-agnostic logic
├── platform/
│   ├── ios/                      ← Swift / SwiftUI / RealityKit
│   ├── android/                  ← Kotlin / Jetpack Compose / ARCore
│   ├── web/                      ← TypeScript / React / WebXR
│   └── quest/                    ← Meta Quest VR theme system
├── services/                     ← backend micro-services (privacy networking, sync)
├── scripts/                      ← developer tooling & automation
│   ├── generate_tasks.py         ← automated task list generator
│   └── reflect.py                ← self-improvement reflection engine
├── reports/                      ← reflection reports (auto-generated)
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

## Self-Improving Design Process
This repository uses an **automated reflection engine** (`scripts/reflect.py`) that continuously
examines development progress and derives rules and skills to improve the process.

- **Rules** live in `.github/rules/` and are injected below automatically.
- **Skills** (step-by-step agent capabilities) live in `.github/skills/`.
- The engine runs weekly via `.github/workflows/reflect.yml` and on every push touching source code.
- Any agent may run it manually: `python3 scripts/reflect.py run-all`
- After significant work is complete, the Task Manager role should run the engine and commit results.

Read `.github/skills/registry.json` for the current list of named skills you can invoke.

<!-- reflect:rules:start -->

## Derived Rules (auto-generated — do not edit manually)

> These rules were derived by `scripts/reflect.py` from analysis of the repository.
> Re-run `python3 scripts/reflect.py inject` to update.

### Required

- **Critical tasks take priority over high/medium tasks** (RULE-003): No agent may begin a high or medium priority task if a critical task is available and unblocked. Critical tasks must be fully complete (PR merged) before new high-priority work begins.
- **Every source file must have a corresponding test file** (RULE-004): When creating any source file in core/ or services/, immediately create test_<filename> in the same directory. A PR adding source without tests must not be merged.
- **Scaffold required directories before implementing features** (RULE-007): The first PR for any platform or module must create the directory with a README.md. Never add feature code to a directory that hasn't been formally scaffolded.

### Recommended

- **Resolve bottleneck tasks before picking up new work** (RULE-001): Before starting a new task, check whether any open task blocks ≥2 others. If so, prioritise that blocking task.
- **Every module directory must contain a README.md** (RULE-005): When scaffolding any new directory in core/, services/, or platform/, add a README.md explaining the module's purpose, its public API, and how to run its tests.
- **Source files must stay under 500 lines** (RULE-006): If a source file exceeds 500 lines, split it into focused sub-modules. Use one file per class / concern. Prefer composition over monoliths.

<!-- reflect:rules:end -->
