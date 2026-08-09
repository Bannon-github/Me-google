# ADR-009 — Outward and Forward Loops: Research Scout and Pre-mortem

- **Status:** Proposed
- **Date:** 2026-08-09
- **Deciders:** Architect + Task Manager roles
- **Related:** ADR-008 (executable rules), ADR-002 (anonymous networking), ADR-006 (QA tiers)

## Context

The reflection pipeline (`scripts/reflect.py`) looks in exactly one direction: **backward and
inward**. It derives rules from mistakes already made, using only data inside this repository.
For a sandbox whose ambition is staying ahead of a field that publishes daily, that leaves two
whole directions dark:

- **Outward.** XR platforms, agent tooling, privacy tech, and creative-web techniques move
  weekly. Nothing in the loop reads any of it. The repository's external knowledge is frozen at
  whatever its contributors happened to know.
- **Forward.** Nothing imagines failure before it happens. Every rule in the registry is a scar,
  not a forecast. The cheapest moment to catch a correlation attack in the sync design, or a
  gate-gaming exploit in the autonomy machinery, is before the code exists — a moment the
  current loop structurally cannot see.

These two loops differ from everything in ADR-008 in one architectural way: **they cannot be
deterministic Python.** A cron job can fetch release notes; deciding "this changes our plan" is
judgement. Imagining a plausible failure future is judgement. These are the first components of
the system that require an agent in the loop by design — scheduled agent sessions whose outputs
land in the repo, not new analyser classes in `reflect.py`.

A deliberate asymmetry, chosen explicitly: the *enforcement* loop (ADR-008) gets maximum teeth —
blocking gates, auto-merge. The *research* and *imagination* loops get the lightest outputs —
digests and narratives, no automated pipeline from finding to action. The principle: automate
ruthlessly where checks are mechanical; keep the human as the filter where judgement is the
entire value. Dissemination into action stays a human act, at least until the digests prove
consistently worth acting on.

## Decision

### Loop 2 — Research Scout (outward)

A scheduled agent session (weekly, offset from the Monday reflect run) that sweeps four beats
and writes a digest to `reports/scout-YYYY-MM-DD.md`:

| Beat | Watches | Feeds |
|------|---------|-------|
| XR platform | WebXR spec, Horizon OS / Quest SDK, ARCore, visionOS | platform tracks, theme/QA stack |
| Agent & AI tooling | model releases, MCP ecosystem, agentic patterns | the sandbox's own machinery |
| Privacy & networking | Tor/I2P/Nym, E2E sync, local-first CRDTs | TASK-008/009 before they're built |
| Creative web | Canvas/WebGPU, game feel, procedural art | CHROMABOUND, orb game |

Digest format per finding: what shipped, why it matters *to this repo specifically*, and a
one-paragraph integration sketch naming the files or tasks it would touch. A finding that can't
be tied to something in the repo doesn't make the digest — the scout is a scout, not a
newsletter.

No pipeline beyond the report. No auto-created tasks, no spike branches. The human reads the
digest and promotes findings by hand (via `generate_tasks.py --add`). Revisit after ~8 digests:
if a stable class of finding is always promoted, that class earns an automated path then.

### Loop 3 — Pre-mortem (forward)

A scheduled agent session (monthly, or manually before starting any critical-priority task) that
writes **scenario fiction** to `reports/premortem-YYYY-MM-DD.md`: short, concrete narratives of
plausible failure futures, written as if the failure already happened, each ending with the
earliest observable warning sign.

Standing threat model, all four quadrants in scope:

1. **The autonomy machinery itself** — gate-gaming, baseline corruption, a buggy blocking gate
   freezing the loop, self-modification paths around the ADR-008 firewall. First priority:
   a failure here corrupts the mechanism that fixes failures.
2. **The privacy architecture** — correlation attacks, metadata leakage, key compromise in the
   anon identity and sync designs, stress-tested before implementation.
3. **Product & UX failure modes** — anchor drift, lost placements, sync conflicts where two
   users both "win"; constraints that should shape TASK-005/009 before code exists.
4. **Project-level risks** — single maintainer, hardware dependency, platform rug-pulls,
   token cost drift.

Narratives are the deliverable, deliberately: the imaginative register surfaces failure shapes
that a likelihood-times-impact spreadsheet flattens. A scenario the human finds credible gets
promoted by hand — into a task, a gate, or an ADR amendment. The report is thinking fuel; the
human decides what hardens into structure.

### Shared mechanics

- Both loops run as agent sessions on a schedule, not as `reflect.py` subcommands. `reflect.py`
  gains one small hook: its `CodeAnalyser` counts digests/pre-mortems present versus scheduled,
  so a silently dead loop shows up as a finding in the weekly report.
- Reports follow the existing `reports/` naming convention and are committed via the normal PR
  path (never direct-push, per ADR-008 part 5).
- `AGENTS.md` gains two roles: **Research Scout** and **Red Team / Pre-mortem Author**, with the
  digest and scenario formats specified there as the canonical templates.

## Consequences

**Positive.** The loop gains eyes (outward) and foresight (forward) without expanding the
auto-merge blast radius — new machinery is read-only with respect to code. The privacy claim
gets adversarial attention *before* implementation, when changes are free. The pre-mortem's
first target being the autonomy machinery means ADR-008's riskiest parts get stress-tested by
the system itself.

**Negative.** Digests and narratives only work if read; both loops depend on a human actually
consuming reports, which reintroduces the human bottleneck the enforcement loop just removed —
accepted deliberately, for judgement-shaped work. Two scheduled agent sessions add recurring
token cost. Scout quality is hard to measure; a drifting scout produces plausible-sounding
noise.

**Risks.** The scout summarising external content is an injection surface — a malicious page
could try to steer an agent that later opens PRs. Mitigation: scout sessions are read-and-write-
report-only, never code-writing, and their reports go through the PR path like everything else.

## Amendment — 2026-08-09: Grok implementation, council stage, and on-demand coding

Accepted by the maintainer on 2026-08-09, superseding two of the original decisions.

**Provider.** Both loops are implemented as scheduled CI jobs calling an OpenAI-compatible
chat API — xAI Grok by default (`scripts/ai_client.py`; env `AI_API_KEY` / `AI_MODEL` /
`AI_BASE_URL`) — rather than interactive agent sessions. Grok's live-search extension gives
the scout its web access.

**Council stage (new).** The original "human promotes findings by hand, full stop" is
extended with a deliberation layer: after each scout digest, a council of specialized agent
personas (`scripts/council.py`, seats defined in `scripts/council_personas.json` — Architect,
Privacy Red-Team, Integrator, Product) independently reviews the digest and a chair synthesis
produces `reports/council-YYYY-MM-DD.md` with ranked, ready-to-promote actions. The council
reads only the digest file, never the web. Seats are data, so the council can evolve by PR.

**On-demand coding (new, supersedes "no pipeline from finding to action").** The maintainer
may turn a council action into code via the `ai-task` workflow (`scripts/ai_task.py`): a
human-typed instruction, a coding session with **no web access** (the web-reading scout and
the code-writing task are separate sessions by design), a write-firewall rejecting protected
paths (workflows, rules/skills registries, the AI machinery itself), the repo test suite run
with its result stamped on the submission, and a **draft PR** as the only output. The formal
submission protocol: research → council decision → implementation draft PR with tests passed
→ the human gives the green light by merging. Nothing in this chain auto-merges.

**Web UI.** The loops are operated from `dashboard/index.html` — a single-file Mission
Control page using the GitHub API with a user-supplied fine-grained token — rather than the
Actions tab: trigger runs, launch AI tasks, read reports, and green-light submissions.

The injection-defence principle survives all four changes in laddered form: web content is
only ever read by the scout, which only writes prose; the council reasons over that prose but
cannot write code; code is written only from human instructions, without web access, behind a
path firewall, into a draft PR a human merges.

## References

- ADR-008 — the enforcement loop this deliberately counterweights
- `scripts/reflect.py` — `run_analysis()` extension point for the liveness check
- `reports/` — existing reflection reports establishing the naming convention
