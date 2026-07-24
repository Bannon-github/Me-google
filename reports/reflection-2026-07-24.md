# Me-google — Self-Improvement Reflection Report

> Generated: 2026-07-24 00:13 UTC by `scripts/reflect.py`

## Executive Summary

| Category | Count |
|---|---|
| 🔴 Critical findings | 2 |
| 🟡 Warnings | 5 |
| ℹ️ Info | 4 |
| 📋 Rules derived | 7 |
| 🛠️ Skills derived | 7 |

---

## Findings

### 🔴 Critical

**[TASKS / priority]** 5 critical-priority tasks are still open.
> 💡 Critical tasks must be addressed before high/medium work.

**[CODE / scaffolding]** 8 required directories do not exist yet.
> 💡 Scaffold all required directories before implementing features.

### 🟡 Warning

**[TASKS / bottleneck]** Bottleneck tasks (each blocks ≥2 others): TASK-002, TASK-004, TASK-001.
> 💡 Prioritise bottleneck tasks to unblock the most parallel work.

**[TASKS / coverage]** Roles with no completed tasks: Architect, DevOps Engineer, Core Logic Engineer, Privacy/Networking Engineer, iOS/xrOS Engineer, Android/AR Engineer, Web/WebXR Engineer, Documentation Writer.
> 💡 Ensure each agent role has at least one in-progress task.

**[CODE / testing]** 2 source file(s) have no corresponding test file.
> 💡 Every source file in core/ and services/ must have a test counterpart.

**[CODE / architecture]** 0 Architecture Decision Record(s) exist in docs/adr/.
> 💡 Document every significant architectural decision as an ADR.

**[CODE / quality]** 4 file(s) exceed 500 lines and may need splitting.
> 💡 Prefer small, focused modules. Split files over 500 lines.

### ℹ️ Info

**[GIT / velocity]** 3 commits in the last 30 days (0.10/day).
> 💡 Aim for at least 1 commit per active development day.

**[GIT / quality]** 3/3 commits (100%) follow Conventional Commits format.

**[GIT / churn]** Top churn files: .github/copilot-instructions.md, AGENTS.md, scripts/generate_tasks.py.
> 💡 High churn may indicate unstable interfaces — consider stabilising with tests.

**[TASKS / velocity]** Task completion: 0/27 (0%). 0 blocked.

---

## Derived Rules

| ID | Category | Severity | Title |
|---|---|---|---|
| RULE-001 | process | recommended | Resolve bottleneck tasks before picking up new work |
| RULE-002 | process | suggested | Ensure all agent roles have active work |
| RULE-003 | process | required | Critical tasks take priority over high/medium tasks |
| RULE-004 | testing | required | Every source file must have a corresponding test file |
| RULE-005 | architecture | recommended | Document every significant decision as an ADR |
| RULE-006 | code-quality | recommended | Source files must stay under 500 lines |
| RULE-007 | architecture | required | Scaffold required directories before implementing features |

---

## Derived Skills

| ID | Name | Applies To |
|---|---|---|
| SKILL-001 | `pick-and-start-task` | All |
| SKILL-002 | `scaffold-new-module` | Core Logic Engineer, DevOps Engineer, Privacy/Networking Engineer |
| SKILL-003 | `write-adr` | Architect, Privacy/Networking Engineer, Core Logic Engineer |
| SKILL-004 | `run-reflection` | Task Manager, DevOps Engineer |
| SKILL-005 | `add-missing-tests` | Core Logic Engineer, Web/WebXR Engineer |
| SKILL-006 | `scaffold-platform-structure` | DevOps Engineer, Architect |
| SKILL-007 | `unblock-bottleneck` | Task Manager, Architect |

---

## Next Actions

1. Review rules above and address any `required` items immediately.
2. Share new skills with relevant agent roles.
3. Re-run `python3 scripts/reflect.py run-all` after addressing findings.
