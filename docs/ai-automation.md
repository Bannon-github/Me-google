# AI Automation — Operator's Guide

The research and PR automations from ADR-009 (as amended), powered by Grok — or any
OpenAI-compatible provider. One secret turns everything on.

## Setup (one time)

1. Get an xAI API key from <https://console.x.ai>.
2. Repo → Settings → Secrets and variables → Actions → **New repository secret**:
   `AI_API_KEY` = your key.
3. Optional repository *variables*: `AI_MODEL` (default `grok-4`), `AI_BASE_URL`
   (default `https://api.x.ai/v1`). Point these at any OpenAI-compatible provider to
   swap models without touching code.
4. Open `dashboard/index.html` in a browser (locally, or serve it via GitHub Pages) and
   paste a fine-grained GitHub token — repo-scoped, read/write on contents, actions, and
   pull requests. It stays in your browser's localStorage.

Without `AI_API_KEY`, every loop skips gracefully and says so in the workflow log.

## The pipeline

```
open web ──▶ Scout (weekly) ──▶ Council of specialized agents ──▶ you: pick an action
             reads the web        4 seats + chair, read the        │
             writes prose only    digest only, never the web       ▼
                                                            AI Task (on demand)
                                                            no web access, path
                                                            firewall, tests run
                                                                   │
                                                                   ▼
                                                    draft PR: "tests passed"
                                                                   │
                                            you give the green light (merge) ──▶ main
```

Each stage can read the previous stage's output but has strictly fewer permissions than
the one after it gains — a poisoned web page can at worst produce a bad paragraph, never
code. This ladder is the amended ADR-009 injection defence; don't collapse its rungs.

## The pieces

| Piece | Schedule | Output |
|---|---|---|
| `scripts/scout.py` | Wed 06:00 UTC (`ai-research.yml`) | `reports/scout-*.md` — live-searched digest across the four beats |
| `scripts/council.py` | right after each scout run | `reports/council-*.md` — seat reviews + chair's ranked actions |
| `scripts/premortem.py` | 1st of the month | `reports/premortem-*.md` — failure-scenario fiction with warning signs |
| `scripts/pr_review.py` | every PR (`ai-pr-review.yml`) | one sticky advisory comment; never blocks |
| `scripts/ai_task.py` | manual only (`ai-task.yml` or dashboard) | code on a branch → draft PR with test verdict |
| `dashboard/index.html` | — | Mission Control: trigger loops, launch tasks, read reports, green-light |

All scheduled output arrives as a **draft PR**, never a direct push. The council's seats
live in `scripts/council_personas.json` — edit it (or have an AI task propose an edit)
to evolve the council.

## Firewalls, in one place

- **Scout**: reads the web, writes prose reports only.
- **Council**: reads the scout's report only — no web, no code.
- **AI Task**: codes from *your* instruction only — no web; refuses to write to
  `.github/workflows/`, `.github/rules/`, `.github/skills/`, or its own machinery;
  output is always a draft PR.
- **PR review**: advisory by construction; every step is `continue-on-error`.
- **Liveness**: `reflect.py` warns in the weekly report if any loop stops producing.

## Running things by hand

```bash
python3 scripts/scout.py --dry-run        # inspect the prompt without spending tokens
AI_API_KEY=… python3 scripts/scout.py     # write a digest locally
AI_API_KEY=… python3 scripts/council.py   # deliberate over the latest digest
python3 -m unittest discover -s scripts -p 'test_*.py'   # the offline test suite
```
