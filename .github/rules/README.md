# Rules Registry

This directory contains **structured rules** derived automatically by `scripts/reflect.py`
from analysis of the Me-google repository's development state.

---

## What are Rules?

Rules are imperative directives that agents must follow when contributing to this repository.
They are derived from observed patterns in git history, task completion, code quality, and
architectural decisions — not invented by hand.

Every rule has a **severity**:
- `required` — must be followed; PRs violating required rules will not be merged.
- `recommended` — should be followed; deviations require an explanation in the PR.
- `suggested` — nice to follow; low-friction guidance.

---

## Files

| File / Directory | Purpose |
|---|---|
| `registry.json` | Machine-readable index of all rules (current + historical) |
| `derived/YYYY-MM-DD-rules.json` | Rules generated on a specific date |

Rules are **also injected** into `.github/copilot-instructions.md` (between
`<!-- reflect:rules:start -->` and `<!-- reflect:rules:end -->` markers) so that
Copilot agents read them automatically without visiting this directory.

---

## How to Use

```bash
# Re-generate rules from the current repo state
python3 scripts/reflect.py generate-rules

# Re-inject required/recommended rules into copilot-instructions.md
python3 scripts/reflect.py inject

# Full pipeline: analyze + generate-rules + generate-skills + report + inject
python3 scripts/reflect.py run-all
```

---

## Rule Schema

```json
{
  "id": "RULE-001",
  "category": "process | code-quality | testing | architecture | accessibility | security",
  "title": "Short human-readable title",
  "directive": "Imperative sentence — what the agent must or should do.",
  "severity": "required | recommended | suggested",
  "rationale": "Why this rule exists.",
  "evidence": "What finding triggered this rule.",
  "generated_at": "YYYY-MM-DD",
  "source": "auto-reflect",
  "supersedes": null
}
```

---

## Adding Rules Manually

To add a rule that the reflection engine does not yet derive automatically, add it
to `registry.json` under `entries` with `"source": "manual"`. Manual rules are
preserved across reflection runs.
