# ADR-008 — Executable Rules and Autonomous Merge

- **Status:** Proposed
- **Date:** 2026-08-09
- **Deciders:** Architect + DevOps roles
- **Related:** ADR-001, ADR-006 (generalises its tier model repo-wide)
- **Supersedes:** nothing; extends the reflection pipeline defined in `scripts/reflect.py`

## Context

Me-google's primary purpose is to be a working sandbox for agent-driven development. The
product surface — a privacy-first xrOS — is the payload that proves the loop, not the goal in
itself. The stated success signal is therefore throughput: **open tasks reaching done without a
human commit in the chain.**

Measured against that signal, the loop is currently open. `scripts/reflect.py` observes the
repository, derives rules, and writes them as prose into `.github/copilot-instructions.md`.
Nothing downstream reads those rules mechanically. There is no check that runs when a pull
request opens, because there is no test or lint workflow at all — `.github/workflows/` contains
only `reflect.yml` (TASK-003 remains open). The system measures, advises, and hopes.

Three pieces of evidence show this is not a theoretical gap.

**Rules do not change behaviour.** RULE-001 requires Conventional Commits, has been derived and
injected repeatedly, and compliance is still 61% (22/36 commits). The engine noticed the problem,
wrote the rule, re-derived the same rule the following week, and the metric did not move.

**The rule contradicts the repository's own documented convention.** `AGENTS.md` specifies PR
titles of the form `[TASK-XXX] Short description`, commit messages in Conventional Commits
format, and squash-merge on completion. Under squash-merge the *PR title* becomes the commit
message on `main`. So an agent that follows `AGENTS.md` exactly produces a non-conventional
commit on `main` every time, and RULE-001 flags it forever. Compliance is capped by the process,
not by agent diligence. No amount of re-injecting the rule can fix a contradiction in the thing
being injected — and the reflection engine has no way to notice, because it measures compliance
without diagnosing cause.

**Enforcement in this repository is consistently prose rather than code.** Rules are JSON
directives injected as instructions. ADR-006 defines an excellent three-tier QA model whose
Tier-1 and Tier-2 rows read "FAIL blocks merge", but nothing executes them — the validators in
`platform/quest/qa/validators/` are real, runnable programs that no workflow ever calls.
Release gates are markdown checklists. Task claims are PR comments. Every enforcement mechanism
in the repository is a document describing enforcement that does not occur.

Two further constraints shape the decision. The agent fleet is open-ended — "whatever I happen to
open" — but `inject_rules()` writes to a single hardcoded target (`reflect.py:47`), so an agent
reading `AGENTS.md` or `CLAUDE.md` never sees a derived rule. And the available test hardware is
Meta Quest and an ARCore Android phone; there is no Vision Pro or Mac, which makes the iOS track
untestable regardless of how the task graph ranks it.

## Decision

Close the loop by making rules executable, gating merges on them, and letting green PRs merge
themselves. Five parts, in dependency order.

### 1. Resolve the commit-format contradiction before automating it

Adopt a single PR-title format that satisfies both conventions, since squash-merge collapses them
into one artifact:

```
feat(core): encrypted favourites store [TASK-005]
```

Conventional prefix, optional scope, task ID as a trailing tag. Amend `AGENTS.md` to state this
once, as the format for PR titles *and* therefore for squashed commits. RULE-001's directive is
rewritten to match, and its check targets the PR title — the artifact that actually lands on
`main` — rather than intermediate commits that squash-merge discards.

This ordering matters: automating a self-contradictory rule converts a nagging warning into a
gate that cannot be passed.

### 2. One canonical rule surface, fanned out to every agent

`AGENTS.md` becomes the single source of truth for agent-facing rules. `CLAUDE.md` and
`.github/copilot-instructions.md` become thin files carrying a generated, delimited block that
points at it. `inject_rules()` takes a list of targets from a small config rather than the
hardcoded `COPILOT_INSTRUCTIONS` constant, so adding a new agent convention is a one-line change
rather than a code change.

### 3. Rules carry an executable check

Extend the registry schema to 2.0. Each entry gains:

| Field | Meaning |
|-------|---------|
| `enforcement` | `blocking` · `advisory` · `unenforceable` |
| `check` | Path to a gate module, or `null` |
| `check_args` | Arguments passed to the gate |
| `baseline` | Path to the recorded pre-existing violation set, or `null` |

Gates live in `scripts/gates/` and reuse the contract already proven by
`platform/quest/qa/validators/`: a standalone Python module with an `argparse` entry point, a
`--json` output mode, and a process exit code as the verdict. That pattern is working code in
this repository today; generalising it costs far less than inventing a mechanism.

Initial mapping of the existing registry:

| Rule | Gate | Enforcement |
|------|------|-------------|
| RULE-001 PR title / commit format | `gates/commit_format.py` | blocking |
| RULE-003 test per source file | `gates/test_coverage.py` | blocking, ratcheted |
| RULE-005 files under 500 lines | `gates/file_length.py` | blocking, ratcheted |
| RULE-004 README per module dir | `gates/module_readme.py` | advisory |
| RULE-002 prioritise bottleneck tasks | — | unenforceable (judgement) |

A rule the generator cannot map to a check is marked `unenforceable` and stays advisory. Being
explicit about which rules have teeth is itself the point; today the registry implies all of them
do.

### 4. Ratchet against a baseline, never a cliff

The repository already violates its own rules. `reflect.py` is 1023 lines, `generate_tasks.py`
570, `game.js` 703 — and the two largest violators of RULE-005 are the automation scripts that
derive it. Seven source files lack tests. Turning on absolute gates would fail the first agent PR
on unrelated legacy code and stall the loop on its first turn.

Each ratcheted gate therefore records a baseline (`.gates/baseline.json`) and fails only on
**regression**: a new file over the limit, a *newly* untested source file, an existing violation
made worse. Improvements shrink the baseline automatically. The debt becomes visible and
monotonically decreasing rather than a wall.

### 5. Auto-merge, bounded, with a self-modification firewall

A PR auto-merges when every `blocking` gate is green **and** its changed paths fall entirely
within an allowlist. Everything else waits for a human.

The critical constraint: **a PR that modifies gate code, the baseline, the rule registry, the
allowlist, or `reflect.yml` is never auto-mergeable, regardless of gate status.** Without this,
the system can weaken its own gates without review — and the path is not hypothetical, because
scheduled `reflect.yml` runs currently commit **directly to `main` with no review at all**. A
self-derived rule change reaching `main` unreviewed is acceptable while rules are advisory prose;
it is not acceptable once rules are the merge gate. Scheduled reflection runs must therefore move
from direct-push to the same PR path as everything else.

Add a kill switch — a repository variable checked as the first gate step — so the loop can be
halted without reverting configuration.

### 6. Measure the signal that was actually chosen

Success is "tasks close without you touching them", which `reflect.py` does not currently
measure; it reports raw completion (9/25) with no notion of who did the work. Add a throughput
analyser that attributes each closed task to *agent-only* or *human-touched* by inspecting commit
authorship on the merged branch, and report the agent-only closure rate as the headline metric.

### 7. Correct the task graph for real hardware

The generator ranks TASK-010 (iOS scaffold) as a bottleneck because three tasks depend on it, but
it cannot be built or tested on the available hardware. Add a `blocked-on-hardware` status so the
graph stops advertising unreachable work, and re-rank the live platform tracks as Quest first
(furthest along — ThemeManager, theme schema, QA validators, WebXR orb game all exist) then
Android/ARCore.

### Proposed tasks

To be added via `python3 scripts/generate_tasks.py --add` — `TASKS.md` is generated and must not
be hand-edited.

| Priority | Role | Title | Depends on |
|---|---|---|---|
| critical | DevOps | Tier-0 CI: lint, typecheck, unit tests for `core/` and `platform/quest/*` | TASK-003 |
| critical | Architect | Resolve PR-title / commit-format contradiction in `AGENTS.md`; rewrite RULE-001 | — |
| high | DevOps | Canonical rule surface in `AGENTS.md`; multi-target `inject_rules()` | — |
| high | DevOps | Registry schema 2.0 with `enforcement` / `check` / `baseline` fields | — |
| high | DevOps | `scripts/gates/` runner + commit_format, file_length, test_coverage gates | Tier-0 CI |
| high | DevOps | Baseline capture and ratchet semantics | gates runner |
| high | DevOps | Auto-merge workflow, path allowlist, self-modification firewall, kill switch | gates runner |
| medium | DevOps | Move scheduled reflection off direct-push to `main` | auto-merge |
| medium | Task Manager | Agent-only vs human-touched task attribution in `reflect.py` | — |
| medium | Task Manager | `blocked-on-hardware` status; re-rank platform tracks | — |

The pilot payload is **TASK-005** (encrypted local favourites storage): it is the first
user-visible win — pin an item in space, return, find it still there — it is a genuine bottleneck
blocking three other tasks, and it is confined to `core/`, which makes it a clean first candidate
for the auto-merge allowlist.

## Consequences

**Positive.** The loop closes: derived rules become checks, checks gate merges, merges happen
without a human, and the throughput metric measures the thing that was chosen as the success
signal. Existing assets are reused rather than replaced — the ADR-006 tier model and the Quest
validator contract generalise directly. Technical debt becomes an explicit, shrinking baseline.
Rules that cannot be enforced are labelled as such instead of silently pretending.

**Negative.** The gate runner and baseline machinery are new infrastructure to maintain, and
`reflect.py` — already the largest file in the repository — grows unless it is split first.
Ratcheting means legacy violations can persist indefinitely if nothing drives them down. The
allowlist will need tending as the codebase grows, and an overly narrow one quietly returns the
human to the critical path.

**Risks.** A buggy blocking gate halts all agent progress, which is what the kill switch is for.
Gates can be gamed — a trivial assertion satisfies `test_coverage.py` — so gate strictness must
be revisited as agents optimise against it; the throughput metric will rise while quality does
not, and only human review of the pilot payload will catch it. Auto-merge to `main` makes `main`
breakable by construction, so Tier-0 CI must be genuinely trustworthy before part 5 ships.

## References

- ADR-006 — Theme QA Framework (tier model and FAIL-blocks semantics generalised here)
- `scripts/reflect.py` — analysers, `RuleGenerator`, `inject_rules`
- `platform/quest/qa/validators/` — the validator contract adopted for `scripts/gates/`
- `reports/reflection-2026-08-03.md` — findings this ADR responds to
