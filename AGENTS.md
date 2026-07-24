# Agent Collaboration Guide

This document defines how AI agents (Copilot, custom agents, or any automated contributor)
should work together on the **Me-google** xrOS project.

---

## Agent Roles

| Role | Responsibility | Primary Directories |
|------|---------------|---------------------|
| **Architect** | High-level design, ADRs, module boundaries | `docs/`, `core/` |
| **iOS/xrOS Engineer** | Swift, SwiftUI, RealityKit, spatial UI | `platform/ios/` |
| **Android/AR Engineer** | Kotlin, Jetpack Compose, ARCore | `platform/android/` |
| **Web/WebXR Engineer** | TypeScript, React, WebXR API | `platform/web/` |
| **Core Logic Engineer** | Platform-agnostic algorithms, data models | `core/` |
| **Privacy/Networking Engineer** | Anonymous routing, E2E encryption, sync | `services/` |
| **DevOps Engineer** | CI/CD, tooling, automation | `.github/workflows/`, `scripts/` |
| **Documentation Writer** | Guides, API references, architecture docs | `docs/` |
| **Task Manager** | Keeps `TASKS.md` current, unblocks agents | `TASKS.md`, `scripts/` |

An agent may hold multiple roles. Declare which role(s) you are acting in when opening a PR.

---

## Workflow

```
1. PLAN   → Read TASKS.md. Choose an open task whose dependencies are satisfied.
2. BRANCH → git checkout -b feat/TASK-XXX-short-description
3. BUILD  → Implement the task in small commits (conventional commits style).
4. TEST   → Add/update tests. Run the relevant platform test suite.
5. PR     → Open a PR with title: [TASK-XXX] Short description
6. REVIEW → Another agent or human reviews; address comments.
7. MERGE  → Squash-merge. Re-run generate_tasks.py and commit updated TASKS.md.
```

---

## Communication Conventions

- **PR title**: `[TASK-XXX] Short description` — always include the task ID.
- **Commit messages**: follow [Conventional Commits](https://www.conventionalcommits.org/).
  - `feat:` new feature
  - `fix:` bug fix
  - `docs:` documentation only
  - `refactor:` code change without feature/fix
  - `test:` test-only change
  - `chore:` tooling, deps, CI
- **Blocking questions**: open a GitHub Issue tagged `question` and mention the relevant agent role.
- **Architecture decisions**: record in `docs/adr/ADR-XXX-title.md` before implementing.

---

## Task Assignment Rules

1. Always check `TASKS.md` first — do not invent tasks that already exist.
2. Before starting, comment on the task (or open a draft PR) so other agents know it is claimed.
3. If a task is blocked, update its **Status** to `blocked` and add a note explaining why.
4. If you discover new necessary work, add it to `TASKS.md` via `generate_tasks.py --add`.
5. No single agent should hold more than **3 open tasks** simultaneously.

---

## Privacy & Security Checklist (required for any networking or storage PR)

- [ ] No plaintext credentials or tokens in source
- [ ] User identity is never sent in cleartext over the network
- [ ] New network endpoints documented in `docs/api/`
- [ ] Data stored locally is encrypted at rest
- [ ] Third-party dependencies reviewed for privacy policy compliance

---

## Automated Task List Generator

The script `scripts/generate_tasks.py` is the single source of truth for task management.

```bash
# View current task list
python3 scripts/generate_tasks.py

# Output as JSON (for machine consumption)
python3 scripts/generate_tasks.py --json

# Add a new task interactively
python3 scripts/generate_tasks.py --add

# Mark a task done
python3 scripts/generate_tasks.py --done TASK-XXX

# Regenerate TASKS.md from internal task database
python3 scripts/generate_tasks.py --write
```

The script scans the repository for:
- Missing directories / scaffolding
- Undocumented modules (no README.md)
- Uncovered source files (no corresponding test file)
- Open GitHub Issues (if `gh` CLI is authenticated)

It then cross-references these findings with the static task definitions embedded in the script
to produce a prioritised, dependency-aware task list.

---

## Self-Improving Design Process

The script `scripts/reflect.py` is a **self-improvement engine** that analyses the repository's
development state and automatically derives rules and skills to improve how agents work.

```bash
# Full reflection pipeline (recommended after completing significant work)
python3 scripts/reflect.py run-all

# Analyse only (print findings)
python3 scripts/reflect.py analyze

# Derive and save rules
python3 scripts/reflect.py generate-rules

# Derive and save skills
python3 scripts/reflect.py generate-skills

# Generate Markdown report → reports/
python3 scripts/reflect.py report

# Inject top rules into .github/copilot-instructions.md
python3 scripts/reflect.py inject
```

The engine examines:
- **Git history**: commit velocity, Conventional Commits adherence, churn patterns
- **Task state**: completion rate, bottlenecks, inactive roles, critical task backlog
- **Code quality**: untested files, undocumented modules, large files, missing scaffolding
- **Architecture coverage**: number of ADRs, accessibility override completeness

Derived artefacts:
- **Rules** → `.github/rules/derived/` and `.github/rules/registry.json`
- **Skills** → `.github/skills/derived/` and `.github/skills/registry.json`
- **Reports** → `reports/reflection-YYYY-MM-DD.md`
- **Injection** → high-severity rules written into `.github/copilot-instructions.md`

The engine runs automatically every Monday at 06:00 UTC via `.github/workflows/reflect.yml`.

---

## Getting Started (for a new agent)

1. Read `README.md` for the project vision.
2. Read this file (`AGENTS.md`) for process.
3. Read `.github/copilot-instructions.md` for coding standards.
4. Run `python3 scripts/generate_tasks.py` to see what is available.
5. Pick a task, follow the **Workflow** above, and open a PR.
