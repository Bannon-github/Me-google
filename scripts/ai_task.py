#!/usr/bin/env python3
"""AI Task — on-demand code authoring (ADR-009 amendment).

Takes a human-written instruction, gives the model repository context,
and applies the files it proposes to the working tree. Designed to run
inside the ai-task workflow, which commits the result to a branch and
opens a DRAFT pull request — never auto-merged, always human-reviewed.

Injection firewall (kept from ADR-009): this session has NO web access
(live_search stays off) and codes only from the human instruction plus
repo context. The web-reading scout and the code-writing task are
separate sessions by design, so a poisoned page can never steer code
directly.

Write firewall (from ADR-008): the model may not touch the paths in
PROTECTED_PATHS — workflows, rules/skills registries, or this script's
own machinery. Proposals into those paths are rejected, not applied.

Usage:
  python3 scripts/ai_task.py --instruction "add a JSON export to ThemeManager"
  python3 scripts/ai_task.py --instruction "..." --dry-run   # show plan, write nothing
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import ai_client
from scout import open_tasks_snapshot

REPO_ROOT = Path(__file__).resolve().parent.parent

PROTECTED_PATHS = (
    ".github/workflows/",
    ".github/rules/",
    ".github/skills/",
    "scripts/ai_task.py",
    "scripts/ai_client.py",
)

MAX_CONTEXT_FILES = 12
MAX_FILE_CHARS = 12_000

SYSTEM_PROMPT = """\
You are a coding agent for Me-google, a privacy-first spatial-computing \
sandbox. You receive one human instruction plus repository context, and you \
respond with complete file contents to create or replace.

House rules: follow AGENTS.md conventions; every new source file in core/ or \
services/ needs a test counterpart in the same directory; keep files under \
500 lines; match the style of neighbouring code.

Respond with ONLY a JSON object, no prose, no code fences:
{
  "summary": "one-line description of the change",
  "files": [{"path": "relative/path", "content": "full file content"}],
  "notes": "anything the human reviewer should check"
}
Paths are relative to the repo root. Provide the FULL content of every file \
you touch — partial edits are not applied. Never propose paths under \
.github/workflows/, .github/rules/, or .github/skills/ — they will be \
rejected."""


def is_protected(path: str) -> bool:
    normalized = path
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return any(normalized.startswith(p) for p in PROTECTED_PATHS)


def gather_context(paths: list[str]) -> str:
    """Read the requested context files, bounded so prompts stay sane."""
    chunks = []
    for rel in paths[:MAX_CONTEXT_FILES]:
        p = REPO_ROOT / rel
        if not p.is_file():
            chunks.append(f"### {rel}\n(file not found)")
            continue
        text = p.read_text(errors="replace")
        if len(text) > MAX_FILE_CHARS:
            text = text[:MAX_FILE_CHARS] + "\n[... truncated ...]"
        chunks.append(f"### {rel}\n```\n{text}\n```")
    return "\n\n".join(chunks) if chunks else "(no context files provided)"


def parse_proposal(raw: str) -> dict:
    """Parse the model's JSON, tolerating an accidental code fence."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        text = text.rsplit("```", 1)[0]
    proposal = json.loads(text)
    if not isinstance(proposal.get("files"), list) or not proposal["files"]:
        raise ValueError("Proposal contains no files.")
    for f in proposal["files"]:
        if not isinstance(f.get("path"), str) or not isinstance(f.get("content"), str):
            raise ValueError(f"Malformed file entry: {f!r:.200}")
        if ".." in Path(f["path"]).parts or Path(f["path"]).is_absolute():
            raise ValueError(f"Refusing path outside repo: {f['path']}")
    return proposal


def apply_proposal(proposal: dict, *, dry_run: bool) -> tuple[list[str], list[str]]:
    applied, rejected = [], []
    for f in proposal["files"]:
        if is_protected(f["path"]):
            rejected.append(f["path"])
            continue
        if not dry_run:
            target = REPO_ROOT / f["path"]
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(f["content"])
        applied.append(f["path"])
    return applied, rejected


def main() -> int:
    parser = argparse.ArgumentParser(description="On-demand AI code authoring for Me-google.")
    parser.add_argument("--instruction", required=True, help="what to build, in your words")
    parser.add_argument(
        "--context",
        default="AGENTS.md",
        help="comma-separated repo-relative files to include as context",
    )
    parser.add_argument("--dry-run", action="store_true", help="show the plan, write nothing")
    args = parser.parse_args()

    if not ai_client.have_key():
        print("AI_API_KEY is not set — cannot run an AI task.", file=sys.stderr)
        return 1

    context_paths = [p.strip() for p in args.context.split(",") if p.strip()]
    user_prompt = (
        f"Instruction from the maintainer:\n{args.instruction}\n\n"
        f"Open tasks (for reference):\n{open_tasks_snapshot()}\n\n"
        f"Repository context:\n{gather_context(context_paths)}"
    )
    raw = ai_client.chat(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=8000,
        live_search=False,  # firewall: the coding session never reads the web
    )

    try:
        proposal = parse_proposal(raw)
    except (json.JSONDecodeError, ValueError) as exc:
        print(f"Could not parse model proposal: {exc}", file=sys.stderr)
        print(raw[:2000], file=sys.stderr)
        return 1

    applied, rejected = apply_proposal(proposal, dry_run=args.dry_run)
    verb = "Would write" if args.dry_run else "Wrote"
    print(f"Summary: {proposal.get('summary', '(none)')}")
    for path in applied:
        print(f"{verb}: {path}")
    for path in rejected:
        print(f"REJECTED (protected path): {path}")
    if proposal.get("notes"):
        print(f"Reviewer notes: {proposal['notes']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
