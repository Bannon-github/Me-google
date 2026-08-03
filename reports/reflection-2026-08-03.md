# Me-google — Self-Improvement Reflection Report

> Generated: 2026-08-03 10:00 UTC by `scripts/reflect.py`

## Executive Summary

| Category | Count |
|---|---|
| 🔴 Critical findings | 1 |
| 🟡 Warnings | 4 |
| ℹ️ Info | 4 |
| 📋 Rules derived | 5 |
| 🛠️ Skills derived | 6 |

---

## Findings

### 🔴 Critical

**[CODE / testing]** 7 source file(s) have no corresponding test file.
> 💡 Every source file in core/ and services/ must have a test counterpart.

### 🟡 Warning

**[GIT / quality]** 22/36 commits (61%) follow Conventional Commits format.
> 💡 All commits must use Conventional Commits (feat:, fix:, docs:, etc.).

**[TASKS / bottleneck]** Bottleneck tasks (each blocks ≥2 others): TASK-005, TASK-010, TASK-013.
> 💡 Prioritise bottleneck tasks to unblock the most parallel work.

**[CODE / documentation]** 10 directory(ies) lack a README.md.
> 💡 Add README.md to every module directory explaining its purpose.

**[CODE / quality]** 4 file(s) exceed 500 lines and may need splitting.
> 💡 Prefer small, focused modules. Split files over 500 lines.

### ℹ️ Info

**[GIT / velocity]** 36 commits in the last 30 days (1.20/day).

**[GIT / churn]** Top churn files: .github/copilot-instructions.md, .github/rules/registry.json, .github/skills/registry.json.
> 💡 High churn may indicate unstable interfaces — consider stabilising with tests.

**[TASKS / velocity]** Task completion: 9/25 (36%). 0 blocked.

**[CODE / architecture]** 7 Architecture Decision Record(s) exist in docs/adr/.

---

## Derived Rules

| ID | Category | Severity | Title |
|---|---|---|---|
| RULE-001 | process | required | All commits must use Conventional Commits format |
| RULE-002 | process | recommended | Resolve bottleneck tasks before picking up new work |
| RULE-003 | testing | required | Every source file must have a corresponding test file |
| RULE-004 | code-quality | recommended | Every module directory must contain a README.md |
| RULE-005 | code-quality | recommended | Source files must stay under 500 lines |

---

## Derived Skills

| ID | Name | Applies To |
|---|---|---|
| SKILL-001 | `pick-and-start-task` | All |
| SKILL-002 | `scaffold-new-module` | Core Logic Engineer, DevOps Engineer, Privacy/Networking Engineer |
| SKILL-003 | `write-adr` | Architect, Privacy/Networking Engineer, Core Logic Engineer |
| SKILL-004 | `run-reflection` | Task Manager, DevOps Engineer |
| SKILL-005 | `add-missing-tests` | Core Logic Engineer, Web/WebXR Engineer |
| SKILL-006 | `unblock-bottleneck` | Task Manager, Architect |

---

## Next Actions

1. Review rules above and address any `required` items immediately.
2. Share new skills with relevant agent roles.
3. Re-run `python3 scripts/reflect.py run-all` after addressing findings.
