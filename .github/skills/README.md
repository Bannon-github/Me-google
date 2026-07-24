# Skills Registry

This directory contains **reusable agent skills** derived automatically by `scripts/reflect.py`
from observed patterns in how agents work on the Me-google xrOS project.

---

## What are Skills?

A **skill** is a named, step-by-step capability that any agent (Copilot, custom agent, or
human contributor) can invoke when facing a recognisable situation. Skills capture recurring
workflows so agents don't have to rediscover the same steps each time.

They complement **rules** (which tell you *what* to do) by telling you *how* to do it.

---

## Files

| File / Directory | Purpose |
|---|---|
| `registry.json` | Machine-readable index of all skills (current + historical) |
| `derived/YYYY-MM-DD-skills.json` | Skills generated on a specific date |

---

## How to Use

When an agent encounters a trigger situation described in a skill, it should follow the
skill's steps in order. Skills are intentionally high-level — they describe intent, not
exact commands, so agents can adapt them to context.

```bash
# Re-generate skills from the current repo state
python3 scripts/reflect.py generate-skills

# Full pipeline
python3 scripts/reflect.py run-all
```

---

## Skill Schema

```json
{
  "id": "SKILL-001",
  "name": "short-kebab-case-name",
  "description": "What this skill does.",
  "trigger": "When an agent should invoke this skill.",
  "steps": [
    "Step 1 — imperative description",
    "Step 2",
    "..."
  ],
  "applies_to": ["Role A", "Role B"],
  "generated_at": "YYYY-MM-DD",
  "source": "auto-reflect"
}
```

---

## Adding Skills Manually

Add entries to `registry.json` under `entries` with `"source": "manual"`. Manual skills
are preserved across reflection runs.
