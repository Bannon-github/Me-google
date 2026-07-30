# Me-google

**A multi-platform AI xrOS** — an operating system extended into augmented and virtual reality.

Built by the xr-intelligence group. Enter your OS and stay there as you move through the real world. Place favourites anywhere in space across multiple layers, share your experience with others in real-time, and do it all with privacy as a foundational guarantee — inspired by Samurai Wallet and Tor anonymity models.

---

## Key Features

- **Spatial-first UI** — every element exists in 3D space. Items have anchors, depth, layers, and occlusion behaviour rather than living on a flat screen.
- **Privacy by default** — anonymous, rotating identifiers; no PII or device fingerprints in any model. Data stays on-device unless you explicitly share it.
- **Multi-platform** — native experiences on iOS/visionOS (RealityKit), Android (ARCore + Jetpack Compose), and the web (WebXR + React). Shared core logic across all platforms.
- **Real-time collaboration** — share spatial sessions live using encrypted envelopes relayed over an onion/mixnet-style anonymous transport layer.
- **Modular & composable** — each feature is a self-contained module that can be toggled without touching unrelated code.

---

## Repository Structure

```
Me-google/
├── core/                 # Platform-agnostic domain models, sync schemas, privacy primitives
│   └── models/           # SpatialItem, User, Session — TypeScript reference implementation
├── platform/
│   ├── ios/              # Swift / SwiftUI / RealityKit / ARKit (visionOS)
│   ├── android/          # Kotlin / Jetpack Compose / ARCore
│   ├── web/              # TypeScript / React / WebXR
│   └── quest/            # Meta Quest VR theme system
├── services/             # Optional anonymous relay, rendezvous, and encrypted sync services
├── docs/
│   ├── adr/              # Architecture Decision Records (start with ADR-001)
│   └── api/              # Service endpoint specifications
├── scripts/
│   ├── generate_tasks.py # Prioritised task list generator
│   └── reflect.py        # Self-improvement reflection engine
├── reports/              # Auto-generated reflection reports
├── AGENTS.md             # Agent roles and collaboration workflow
├── TASKS.md              # Current prioritised task list (auto-generated)
├── index.html            # Chromabound — embedded browser game (no build step required)
└── game.js / styles.css  # Chromabound game source
```

---

## Architecture

Me-google follows a **local-first, privacy-first** layered architecture. See [ADR-001](docs/adr/ADR-001-system-architecture.md) for the full decision record.

Dependency direction:

```
platform/*  ──┐
              ├──> core
services/*  ──┘

core must not import platform/* or services/*
```

All sync traffic travels as **encrypted envelopes** through anonymous relay hops — services see only routing metadata, never payload content or participant identity.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20 (for core TypeScript models)
- **Xcode** ≥ 15 (for iOS/visionOS)
- **Android Studio** (for Android)

### Run core model tests

```bash
node --test core/models/*.test.ts
```

### Type-check core

```bash
tsc --project core/tsconfig.json --noEmit
```

### View the task list

```bash
python3 scripts/generate_tasks.py
```

### Play Chromabound (embedded browser game)

Open `index.html` via any static web server — no build step needed.

---

## Task System

Tasks are tracked in [`TASKS.md`](TASKS.md) and managed via `scripts/generate_tasks.py`.

```bash
# View current tasks
python3 scripts/generate_tasks.py

# Mark a task done
python3 scripts/generate_tasks.py --done TASK-XXX --write

# Add a new task
python3 scripts/generate_tasks.py --add
```

Open PRs with titles in the form `[TASK-XXX] Short description`. See [`AGENTS.md`](AGENTS.md) for the full contribution workflow.

---

## Contributing

1. Read [`AGENTS.md`](AGENTS.md) for role definitions and PR process.
2. Read [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for coding standards.
3. Pick an unblocked open task from [`TASKS.md`](TASKS.md).
4. Branch, implement, test, and open a PR referencing the task ID.

All PRs touching networking, storage, or identity require a **privacy review**. No plaintext credentials, tokens, or device identifiers may appear anywhere in the codebase.

---

## License

See repository root for license information.
