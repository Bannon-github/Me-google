#!/usr/bin/env python3
"""
reflect.py — Self-improving design process engine for Me-google xrOS.

Examines the repository's development state (git history, task completion,
code quality, ADR coverage) and derives:
  - Rules: structured directives injected back into agent instructions
  - Skills: reusable agent capability definitions

Usage:
  python3 scripts/reflect.py analyze              # analyse and print findings
  python3 scripts/reflect.py generate-rules       # derive + write rules
  python3 scripts/reflect.py generate-skills      # derive + write skills
  python3 scripts/reflect.py report               # full Markdown report → reports/
  python3 scripts/reflect.py inject               # write top rules into copilot-instructions.md
  python3 scripts/reflect.py run-all              # analyze + generate-rules + generate-skills + report + inject
  python3 scripts/reflect.py --json ...           # machine-readable output

The system is designed to run on a schedule (see .github/workflows/reflect.yml)
and to be triggered by any agent after completing work.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field, asdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT     = Path(__file__).resolve().parent.parent
RULES_DIR     = REPO_ROOT / ".github" / "rules"
DERIVED_RULES = RULES_DIR / "derived"
SKILLS_DIR    = REPO_ROOT / ".github" / "skills"
DERIVED_SKILLS = SKILLS_DIR / "derived"
REPORTS_DIR   = REPO_ROOT / "reports"
REGISTRY_RULES  = RULES_DIR / "registry.json"
REGISTRY_SKILLS = SKILLS_DIR / "registry.json"
COPILOT_INSTRUCTIONS = REPO_ROOT / ".github" / "copilot-instructions.md"
TASKS_FILE    = REPO_ROOT / "TASKS.md"
STATE_FILE    = REPO_ROOT / ".task-state.json"

TODAY = date.today().isoformat()  # generation date for this run

# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class Finding:
    """A single observation produced by an analyser."""
    source: str          # e.g. "git", "tasks", "code", "adr"
    category: str        # e.g. "velocity", "quality", "coverage"
    key: str             # short identifier
    value: Any           # the measured value
    severity: str        # info | warning | critical
    description: str
    recommendation: Optional[str] = None


@dataclass
class Rule:
    id: str
    category: str        # process | code-quality | testing | architecture | accessibility | security
    title: str
    directive: str       # imperative sentence — what agents must / should do
    severity: str        # required | recommended | suggested
    rationale: str       # why this rule exists
    evidence: str        # what finding triggered it
    generated_at: str    = field(default_factory=lambda: TODAY)
    source: str          = "auto-reflect"
    supersedes: Optional[str] = None   # ID of older rule this replaces


@dataclass
class Skill:
    id: str
    name: str
    description: str
    trigger: str         # when an agent should invoke this skill
    steps: List[str]
    applies_to: List[str]   # roles this skill helps
    generated_at: str    = field(default_factory=lambda: TODAY)
    source: str          = "auto-reflect"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run(cmd: str, cwd: Path = REPO_ROOT) -> Tuple[int, str]:
    result = subprocess.run(
        cmd, shell=True, cwd=cwd, capture_output=True, text=True
    )
    return result.returncode, (result.stdout + result.stderr).strip()


def _load_json(path: Path) -> Any:
    if path.exists():
        with path.open() as f:
            return json.load(f)
    return {}


def _save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        json.dump(data, f, indent=2)


def _load_task_state() -> dict:
    return _load_json(STATE_FILE)


# ---------------------------------------------------------------------------
# 1. Git Analyser
# ---------------------------------------------------------------------------

class GitAnalyser:
    """Inspects git history for velocity, commit quality, and churn patterns."""

    def analyse(self, days: int = 30) -> List[Finding]:
        findings: List[Finding] = []

        # Check git is available
        rc, _ = _run("git rev-parse --is-inside-work-tree")
        if rc != 0:
            return findings

        since = (datetime.now(tz=timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

        # -- Commit count and velocity -----------------------------------------
        rc, out = _run(f'git log --oneline --since="{since}" 2>/dev/null')
        commits = [l for l in out.splitlines() if l.strip()]
        count = len(commits)
        velocity = count / max(days, 1)

        findings.append(Finding(
            source="git", category="velocity", key="commit_count",
            value=count, severity="info",
            description=f"{count} commits in the last {days} days ({velocity:.2f}/day).",
            recommendation="Aim for at least 1 commit per active development day." if velocity < 0.5 else None,
        ))

        # -- Conventional commit adherence ------------------------------------
        cc_pattern = re.compile(
            r"^[0-9a-f]+\s+(feat|fix|docs|refactor|test|chore|ci|research|style|perf)(\(.+?\))?(!)?:"
        )
        conforming = sum(1 for c in commits if cc_pattern.match(c))
        rate = conforming / count if count else 1.0
        sev = "info" if rate >= 0.8 else ("warning" if rate >= 0.5 else "critical")
        findings.append(Finding(
            source="git", category="quality", key="conventional_commit_rate",
            value=round(rate, 2), severity=sev,
            description=f"{conforming}/{count} commits ({rate*100:.0f}%) follow Conventional Commits format.",
            recommendation="All commits must use Conventional Commits (feat:, fix:, docs:, etc.)." if rate < 0.8 else None,
        ))

        # -- Files with highest churn -----------------------------------------
        rc, out = _run(f'git log --since="{since}" --name-only --pretty=format: 2>/dev/null')
        file_counts: Dict[str, int] = {}
        for line in out.splitlines():
            line = line.strip()
            if line:
                file_counts[line] = file_counts.get(line, 0) + 1
        top_churn = sorted(file_counts.items(), key=lambda x: -x[1])[:5]
        if top_churn:
            findings.append(Finding(
                source="git", category="churn", key="high_churn_files",
                value=[{"file": f, "changes": c} for f, c in top_churn],
                severity="info",
                description=f"Top churn files: {', '.join(f for f, _ in top_churn[:3])}.",
                recommendation="High churn may indicate unstable interfaces — consider stabilising with tests.",
            ))

        # -- Commit message length quality ------------------------------------
        rc, out = _run(f'git log --format="%s" --since="{since}" 2>/dev/null')
        messages = [l.strip() for l in out.splitlines() if l.strip()]
        short = [m for m in messages if len(m) < 15]
        if short and messages:
            short_rate = len(short) / len(messages)
            sev = "warning" if short_rate > 0.2 else "info"
            findings.append(Finding(
                source="git", category="quality", key="short_commit_messages",
                value={"count": len(short), "rate": round(short_rate, 2)},
                severity=sev,
                description=f"{len(short)} commits have very short messages (< 15 chars).",
                recommendation="Write descriptive commit subjects — at least 20 characters." if sev == "warning" else None,
            ))

        return findings


# ---------------------------------------------------------------------------
# 2. Task Analyser
# ---------------------------------------------------------------------------

class TaskAnalyser:
    """Analyses TASKS.md and task state for completion patterns and bottlenecks."""

    def analyse(self) -> List[Finding]:
        findings: List[Finding] = []
        if not TASKS_FILE.exists():
            return findings

        content = TASKS_FILE.read_text()
        state = _load_task_state()
        overrides = state.get("status_overrides", {})

        # Parse task table rows
        row_re = re.compile(
            r"\|\s*(TASK-[\w]+)\s*\|\s*(\w+)\s*\|\s*[^\|]+\s*\|\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|\s*([^\|]*)\s*\|"
        )
        tasks: List[Dict] = []
        for m in row_re.finditer(content):
            tid, priority, role, title, deps = m.group(1), m.group(2), m.group(3).strip(), m.group(4).strip(), m.group(5).strip()
            status = overrides.get(tid, "open")
            tasks.append({"id": tid, "priority": priority, "role": role,
                          "title": title, "deps": deps, "status": status})

        total = len(tasks)
        done  = sum(1 for t in tasks if t["status"] == "done")
        open_ = sum(1 for t in tasks if t["status"] == "open")
        blocked = sum(1 for t in tasks if t["status"] == "blocked")

        completion_rate = done / total if total else 0.0
        findings.append(Finding(
            source="tasks", category="velocity", key="task_completion_rate",
            value={"total": total, "done": done, "open": open_, "blocked": blocked,
                   "rate": round(completion_rate, 2)},
            severity="info",
            description=f"Task completion: {done}/{total} ({completion_rate*100:.0f}%). {blocked} blocked.",
            recommendation="Address blocked tasks promptly — they prevent downstream work." if blocked > 0 else None,
        ))

        # -- Identify bottleneck tasks (many dependents, status open) ---------
        all_deps: Dict[str, int] = {}
        for t in tasks:
            for dep in t["deps"].split(","):
                dep = dep.strip()
                if dep and dep != "—":
                    all_deps[dep] = all_deps.get(dep, 0) + 1
        bottlenecks = [(tid, cnt) for tid, cnt in all_deps.items()
                       if cnt >= 2 and overrides.get(tid, "open") != "done"]
        if bottlenecks:
            bottlenecks.sort(key=lambda x: -x[1])
            findings.append(Finding(
                source="tasks", category="bottleneck", key="blocking_tasks",
                value=[{"id": tid, "blocked_count": cnt} for tid, cnt in bottlenecks],
                severity="warning",
                description=f"Bottleneck tasks (each blocks ≥2 others): {', '.join(t for t, _ in bottlenecks[:3])}.",
                recommendation="Prioritise bottleneck tasks to unblock the most parallel work.",
            ))

        # -- Role coverage: are all roles contributing? -----------------------
        role_counts: Dict[str, int] = {}
        role_done: Dict[str, int] = {}
        for t in tasks:
            r = t["role"]
            role_counts[r] = role_counts.get(r, 0) + 1
            if t["status"] == "done":
                role_done[r] = role_done.get(r, 0) + 1
        inactive_roles = [r for r, cnt in role_counts.items()
                          if cnt > 0 and role_done.get(r, 0) == 0]
        if inactive_roles:
            findings.append(Finding(
                source="tasks", category="coverage", key="inactive_roles",
                value=inactive_roles,
                severity="warning",
                description=f"Roles with no completed tasks: {', '.join(inactive_roles)}.",
                recommendation="Ensure each agent role has at least one in-progress task.",
            ))

        # -- Critical tasks still open ----------------------------------------
        critical_open = [t for t in tasks if t["priority"] == "critical" and t["status"] != "done"]
        if critical_open:
            findings.append(Finding(
                source="tasks", category="priority", key="critical_tasks_open",
                value=[t["id"] for t in critical_open],
                severity="critical",
                description=f"{len(critical_open)} critical-priority tasks are still open.",
                recommendation="Critical tasks must be addressed before high/medium work.",
            ))

        return findings


# ---------------------------------------------------------------------------
# 3. Code Analyser
# ---------------------------------------------------------------------------

class CodeAnalyser:
    """Inspects source files for quality signals."""

    SOURCE_DIRS  = ["core", "services", "scripts", "platform"]
    TEST_PATTERNS = ["test_", "_test.", ".test.", ".spec."]
    DOC_PATTERNS  = ["README.md", "readme.md"]

    def analyse(self) -> List[Finding]:
        findings: List[Finding] = []

        # -- Missing tests ------------------------------------------------
        untested: List[str] = []
        for src_dir in self.SOURCE_DIRS:
            p = REPO_ROOT / src_dir
            if not p.exists():
                continue
            for f in p.rglob("*.py"):
                if any(pat in f.name for pat in self.TEST_PATTERNS):
                    continue
                test_path = f.parent / f"test_{f.name}"
                if not test_path.exists():
                    untested.append(str(f.relative_to(REPO_ROOT)))
        if untested:
            sev = "critical" if len(untested) > 5 else "warning"
            findings.append(Finding(
                source="code", category="testing", key="untested_source_files",
                value=untested,
                severity=sev,
                description=f"{len(untested)} source file(s) have no corresponding test file.",
                recommendation="Every source file in core/ and services/ must have a test counterpart.",
            ))

        # -- Missing directory READMEs ------------------------------------
        missing_docs: List[str] = []
        for src_dir in self.SOURCE_DIRS:
            p = REPO_ROOT / src_dir
            if not p.exists():
                continue
            for d in p.rglob("*"):
                if d.is_dir():
                    has_readme = any((d / pat).exists() for pat in self.DOC_PATTERNS)
                    if not has_readme:
                        rel = str(d.relative_to(REPO_ROOT))
                        missing_docs.append(rel)
        if missing_docs:
            findings.append(Finding(
                source="code", category="documentation", key="undocumented_directories",
                value=missing_docs,
                severity="warning",
                description=f"{len(missing_docs)} directory(ies) lack a README.md.",
                recommendation="Add README.md to every module directory explaining its purpose.",
            ))

        # -- ADR coverage -------------------------------------------------
        adr_dir = REPO_ROOT / "docs" / "adr"
        adr_count = len(list(adr_dir.glob("ADR-*.md"))) if adr_dir.exists() else 0
        findings.append(Finding(
            source="code", category="architecture", key="adr_count",
            value=adr_count,
            severity="info" if adr_count >= 1 else "warning",
            description=f"{adr_count} Architecture Decision Record(s) exist in docs/adr/.",
            recommendation="Document every significant architectural decision as an ADR." if adr_count < 3 else None,
        ))

        # -- Research-loop liveness (ADR-009) ------------------------------
        if (REPO_ROOT / ".github" / "workflows" / "ai-research.yml").exists():
            reports_dir = REPO_ROOT / "reports"
            for prefix, max_age_days, label in [
                ("scout", 14, "scout digest"),
                ("council", 14, "council decision"),
                ("premortem", 45, "pre-mortem"),
            ]:
                reports = sorted(reports_dir.glob(f"{prefix}-*.md")) if reports_dir.exists() else []
                if not reports:
                    findings.append(Finding(
                        source="code", category="research-loop", key=f"{prefix}_missing",
                        value=None,
                        severity="warning",
                        description=f"The {label} loop has never produced a report.",
                        recommendation=f"Run the ai-research workflow (or scripts/{prefix}.py) — a silent loop is a dead loop.",
                    ))
                    continue
                newest = reports[-1]
                try:
                    newest_date = date.fromisoformat(newest.stem.replace(f"{prefix}-", ""))
                except ValueError:
                    continue
                age = (date.today() - newest_date).days
                if age > max_age_days:
                    findings.append(Finding(
                        source="code", category="research-loop", key=f"{prefix}_stale",
                        value={"latest": newest.name, "age_days": age},
                        severity="warning",
                        description=f"Latest {label} is {age} days old (threshold {max_age_days}).",
                        recommendation="Check the ai-research workflow schedule and AI_API_KEY secret.",
                    ))

        # -- Large files (> 500 lines) ------------------------------------
        large_files: List[Dict] = []
        for ext in ["*.py", "*.ts", "*.kt", "*.swift"]:
            for src_dir in self.SOURCE_DIRS + ["scripts", ".github"]:
                p = REPO_ROOT / src_dir
                if not p.exists():
                    continue
                for f in p.rglob(ext):
                    lines = len(f.read_text(errors="replace").splitlines())
                    if lines > 500:
                        large_files.append({"file": str(f.relative_to(REPO_ROOT)), "lines": lines})
        if large_files:
            large_files.sort(key=lambda x: -x["lines"])
            findings.append(Finding(
                source="code", category="quality", key="large_files",
                value=large_files[:10],
                severity="warning",
                description=f"{len(large_files)} file(s) exceed 500 lines and may need splitting.",
                recommendation="Prefer small, focused modules. Split files over 500 lines.",
            ))

        # -- Missing platform scaffolding ---------------------------------
        missing_platform: List[str] = []
        for plat in ["ios", "android", "web", "quest"]:
            if not (REPO_ROOT / "platform" / plat).exists():
                missing_platform.append(f"platform/{plat}")
        for infra in ["core", "services", "docs/adr", "docs/api"]:
            if not (REPO_ROOT / infra).exists():
                missing_platform.append(infra)
        if missing_platform:
            findings.append(Finding(
                source="code", category="scaffolding", key="missing_directories",
                value=missing_platform,
                severity="critical",
                description=f"{len(missing_platform)} required directories do not exist yet.",
                recommendation="Scaffold all required directories before implementing features.",
            ))

        # -- Accessibility: quest theme checks ----------------------------
        quest_themes = REPO_ROOT / "platform" / "quest" / "themes"
        if quest_themes.exists():
            for theme_dir in quest_themes.iterdir():
                if not theme_dir.is_dir() or theme_dir.name in ("schema",):
                    continue
                acc_dir = theme_dir / "accessibility"
                if not acc_dir.exists():
                    findings.append(Finding(
                        source="code", category="accessibility", key="missing_accessibility_overrides",
                        value=str(theme_dir.relative_to(REPO_ROOT)),
                        severity="critical",
                        description=f"Theme '{theme_dir.name}' lacks accessibility/ override directory.",
                        recommendation="Every theme must provide high-contrast and reduced-motion override tokens.",
                    ))

        return findings


# ---------------------------------------------------------------------------
# 4. Rule Generator
# ---------------------------------------------------------------------------

class RuleGenerator:
    """Derives rules from analyser findings."""

    def generate(self, findings: List[Finding]) -> List[Rule]:
        rules: List[Rule] = []
        used_ids = set()
        counter = [1]  # mutable int for nested functions

        def _next_id() -> str:
            rule_id = f"RULE-{counter[0]:03d}"
            counter[0] += 1
            return rule_id

        for f in findings:
            if f.key == "conventional_commit_rate" and f.severity in ("warning", "critical"):
                rid = _next_id()
                rules.append(Rule(
                    id=rid, category="process",
                    title="All commits must use Conventional Commits format",
                    directive=(
                        "Every commit message must begin with a type prefix: "
                        "feat:, fix:, docs:, refactor:, test:, chore:, ci:, research:, perf:. "
                        "Do not commit without a type prefix."
                    ),
                    severity="required",
                    rationale="Conventional Commits enable automated changelogs and clear history.",
                    evidence=f.description,
                ))

            elif f.key == "short_commit_messages" and f.severity == "warning":
                rid = _next_id()
                rules.append(Rule(
                    id=rid, category="process",
                    title="Commit subjects must be at least 20 characters",
                    directive=(
                        "Write descriptive commit subjects — minimum 20 characters. "
                        "Prefer imperative mood: 'Add X', 'Fix Y', not 'update stuff'."
                    ),
                    severity="recommended",
                    rationale="Short commit messages make history difficult to understand.",
                    evidence=f.description,
                ))

            elif f.key == "blocking_tasks":
                rid = _next_id()
                rules.append(Rule(
                    id=rid, category="process",
                    title="Resolve bottleneck tasks before picking up new work",
                    directive=(
                        "Before starting a new task, check whether any open task blocks ≥2 others. "
                        "If so, prioritise that blocking task."
                    ),
                    severity="recommended",
                    rationale="Bottleneck tasks multiply their delay across every dependent task.",
                    evidence=f.description,
                ))

            elif f.key == "critical_tasks_open":
                rid = _next_id()
                rules.append(Rule(
                    id=rid, category="process",
                    title="Critical tasks take priority over high/medium tasks",
                    directive=(
                        "No agent may begin a high or medium priority task if a critical task is "
                        "available and unblocked. Critical tasks must be fully complete (PR merged) "
                        "before new high-priority work begins."
                    ),
                    severity="required",
                    rationale="Critical tasks are foundational; delaying them blocks everything else.",
                    evidence=f.description,
                ))

            elif f.key == "untested_source_files":
                rid = _next_id()
                rules.append(Rule(
                    id=rid, category="testing",
                    title="Every source file must have a corresponding test file",
                    directive=(
                        "When creating any source file in core/ or services/, immediately create "
                        "test_<filename> in the same directory. A PR adding source without tests "
                        "must not be merged."
                    ),
                    severity="required",
                    rationale="Untested code leads to silent regressions, especially in shared core logic.",
                    evidence=f.description,
                ))

            elif f.key == "undocumented_directories":
                rid = _next_id()
                rules.append(Rule(
                    id=rid, category="code-quality",
                    title="Every module directory must contain a README.md",
                    directive=(
                        "When scaffolding any new directory in core/, services/, or platform/, "
                        "add a README.md explaining the module's purpose, its public API, and "
                        "how to run its tests."
                    ),
                    severity="recommended",
                    rationale="Undocumented modules prevent new agents from understanding the codebase.",
                    evidence=f.description,
                ))

            elif f.key == "large_files":
                rid = _next_id()
                rules.append(Rule(
                    id=rid, category="code-quality",
                    title="Source files must stay under 500 lines",
                    directive=(
                        "If a source file exceeds 500 lines, split it into focused sub-modules. "
                        "Use one file per class / concern. Prefer composition over monoliths."
                    ),
                    severity="recommended",
                    rationale="Large files are harder to understand, review, and test.",
                    evidence=f.description,
                ))

            elif f.key == "missing_directories" and f.severity == "critical":
                rid = _next_id()
                rules.append(Rule(
                    id=rid, category="architecture",
                    title="Scaffold required directories before implementing features",
                    directive=(
                        "The first PR for any platform or module must create the directory with "
                        "a README.md. Never add feature code to a directory that hasn't been "
                        "formally scaffolded."
                    ),
                    severity="required",
                    rationale="Premature feature code without structure leads to tangled modules.",
                    evidence=f.description,
                ))

            elif f.key == "missing_accessibility_overrides":
                rid = _next_id()
                rules.append(Rule(
                    id=rid, category="accessibility",
                    title="Every theme must provide accessibility override token files",
                    directive=(
                        "Any theme directory under platform/quest/themes/<name>/ must contain an "
                        "accessibility/ sub-directory with high-contrast.json and reduced-motion.json "
                        "before the theme may be merged."
                    ),
                    severity="required",
                    rationale="VR accessibility requires explicit overrides — defaults are insufficient.",
                    evidence=f.description,
                ))

            elif f.key == "adr_count" and f.severity == "warning":
                rid = _next_id()
                rules.append(Rule(
                    id=rid, category="architecture",
                    title="Document every significant decision as an ADR",
                    directive=(
                        "Before implementing any cross-cutting concern (networking, auth, storage, "
                        "theming, test strategy), write an ADR in docs/adr/ADR-XXX-title.md and "
                        "get it reviewed before writing code."
                    ),
                    severity="recommended",
                    rationale="Undocumented decisions lead to contradictory implementations.",
                    evidence=f.description,
                ))

            elif f.key == "inactive_roles":
                rid = _next_id()
                roles_str = ", ".join(f.value) if isinstance(f.value, list) else str(f.value)
                rules.append(Rule(
                    id=rid, category="process",
                    title="Ensure all agent roles have active work",
                    directive=(
                        f"Roles currently without completed tasks ({roles_str}) should be "
                        "assigned at least one open task. The Task Manager must review "
                        "TASKS.md weekly and ensure no role is idle for more than 7 days."
                    ),
                    severity="suggested",
                    rationale="Idle roles indicate imbalanced workload or blocked agents.",
                    evidence=f.description,
                ))

        return rules


# ---------------------------------------------------------------------------
# 5. Skill Generator
# ---------------------------------------------------------------------------

class SkillGenerator:
    """Derives reusable agent skills from findings and existing patterns."""

    def generate(self, findings: List[Finding], rules: List[Rule]) -> List[Skill]:
        skills: List[Skill] = []
        counter = [1]

        def _next_id() -> str:
            sid = f"SKILL-{counter[0]:03d}"
            counter[0] += 1
            return sid

        finding_keys = {f.key for f in findings}

        # -- Always-useful skills (generated unconditionally) -----------------

        skills.append(Skill(
            id=_next_id(),
            name="pick-and-start-task",
            description="Standard workflow for picking up and starting a task from TASKS.md",
            trigger="When an agent is ready to begin new work",
            steps=[
                "Run: python3 scripts/generate_tasks.py to see open tasks",
                "Check that all dependencies of your chosen task are ✅ done",
                "If any critical task is open and unblocked, pick that first",
                "Create branch: git checkout -b feat/TASK-XXX-short-description",
                "Update task status: python3 scripts/generate_tasks.py --done TASK-XXX is only run after merging",
                "Open a draft PR immediately so other agents know the task is claimed",
            ],
            applies_to=["All"],
        ))

        skills.append(Skill(
            id=_next_id(),
            name="scaffold-new-module",
            description="Scaffold a new module directory following Me-google conventions",
            trigger="When creating any new directory in core/, services/, or platform/",
            steps=[
                "Create the directory",
                "Add README.md explaining: purpose, public API surface, how to test",
                "Add a .gitkeep or initial source file",
                "If it is a Python module, add an __init__.py",
                "If it is a code module (not docs), add a test_ counterpart directory or file",
                "Commit with: chore(scaffold): add <module-name> module structure",
            ],
            applies_to=["Core Logic Engineer", "DevOps Engineer", "Privacy/Networking Engineer"],
        ))

        skills.append(Skill(
            id=_next_id(),
            name="write-adr",
            description="Write an Architecture Decision Record following the project template",
            trigger="Before implementing any cross-cutting concern or significant design choice",
            steps=[
                "Create docs/adr/ADR-NNN-title.md (increment NNN from the highest existing ADR)",
                "Use sections: Context, Decision, Consequences, Alternatives Considered",
                "Link the ADR in any related PR description",
                "Get the ADR reviewed before writing implementation code",
                "Commit with: docs(adr): ADR-NNN — short title",
            ],
            applies_to=["Architect", "Privacy/Networking Engineer", "Core Logic Engineer"],
        ))

        skills.append(Skill(
            id=_next_id(),
            name="run-reflection",
            description="Run the self-improvement reflection engine and review output",
            trigger="After completing a significant batch of work, or weekly",
            steps=[
                "Run: python3 scripts/reflect.py run-all",
                "Review the generated report in reports/reflection-YYYY-MM-DD.md",
                "Review new rules in .github/rules/derived/",
                "Review new skills in .github/skills/derived/",
                "Check the updated .github/copilot-instructions.md for injected rules",
                "Commit all changed files: chore(reflect): run weekly reflection",
                "Open a PR if rules or skills have materially changed",
            ],
            applies_to=["Task Manager", "DevOps Engineer"],
        ))

        # -- Conditional skills -----------------------------------------------

        if "untested_source_files" in finding_keys:
            skills.append(Skill(
                id=_next_id(),
                name="add-missing-tests",
                description="Backfill test coverage for existing untested source files",
                trigger="When the reflection engine reports untested source files",
                steps=[
                    "Run: python3 scripts/reflect.py analyze --json | python -m json.tool to find untested files",
                    "For each untested file, create test_<filename> in the same directory",
                    "Write tests covering: happy path, edge cases, and error conditions",
                    "Run the tests to confirm they pass before committing",
                    "Commit with: test(<module>): add coverage for <filename>",
                ],
                applies_to=["Core Logic Engineer", "Web/WebXR Engineer"],
            ))

        if "missing_directories" in finding_keys:
            skills.append(Skill(
                id=_next_id(),
                name="scaffold-platform-structure",
                description="Create the full required platform directory structure",
                trigger="When platform directories (core/, services/, platform/*) are missing",
                steps=[
                    "Run: python3 scripts/reflect.py analyze to see which directories are missing",
                    "Create each missing directory with README.md and .gitkeep",
                    "Follow the layout in .github/copilot-instructions.md",
                    "Commit with: chore(scaffold): create <dir> directory structure",
                    "Run generate_tasks.py --write to auto-close any TASK-A* scaffold tasks",
                ],
                applies_to=["DevOps Engineer", "Architect"],
            ))

        if "blocking_tasks" in finding_keys:
            skills.append(Skill(
                id=_next_id(),
                name="unblock-bottleneck",
                description="Identify and resolve bottleneck tasks that are blocking the most work",
                trigger="When reflection reports blocking tasks",
                steps=[
                    "Run: python3 scripts/reflect.py analyze to see bottleneck task IDs",
                    "Read the bottleneck task description in TASKS.md",
                    "Break the task into the smallest possible deliverable that unblocks others",
                    "Deliver that smallest slice first, then continue the rest",
                    "Update TASKS.md after merging: python3 scripts/generate_tasks.py --done TASK-XXX --write",
                ],
                applies_to=["Task Manager", "Architect"],
            ))

        if "missing_accessibility_overrides" in finding_keys:
            skills.append(Skill(
                id=_next_id(),
                name="add-accessibility-overrides",
                description="Add accessibility override token files to a theme",
                trigger="When a theme directory is missing accessibility/ overrides",
                steps=[
                    "Create platform/quest/themes/<name>/accessibility/ directory",
                    "Add high-contrast.json — override: increase contrast ratios, remove transparency, bold weights",
                    "Add reduced-motion.json — override: zero durations, disable parallax, static transitions",
                    "Run platform/quest/qa/validators/contrast_check.py on both override files",
                    "Run platform/quest/qa/validators/motion_safety.py on reduced-motion.json",
                    "Commit with: feat(theme): add accessibility overrides for <theme-name>",
                ],
                applies_to=["iOS/xrOS Engineer", "Web/WebXR Engineer", "Android/AR Engineer"],
            ))

        return skills


# ---------------------------------------------------------------------------
# 6. Registry I/O
# ---------------------------------------------------------------------------

def load_registry(path: Path) -> Dict[str, Any]:
    return _load_json(path) if path.exists() else {"entries": []}


def save_registry(path: Path, entries: List[Any]) -> None:
    existing = load_registry(path)
    existing_ids = {e["id"] for e in existing.get("entries", [])}
    new_entries = [asdict(e) if hasattr(e, "__dataclass_fields__") else e for e in entries]
    for entry in new_entries:
        if entry["id"] not in existing_ids:
            existing.setdefault("entries", []).append(entry)
        else:
            # Update in place
            existing["entries"] = [
                entry if e["id"] == entry["id"] else e
                for e in existing["entries"]
            ]
    existing["updated_at"] = TODAY
    existing["total"] = len(existing["entries"])
    _save_json(path, existing)


def save_derived(directory: Path, items: List[Any], prefix: str) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    out_path = directory / f"{TODAY}-{prefix}.json"
    _save_json(out_path, [asdict(i) if hasattr(i, "__dataclass_fields__") else i for i in items])
    return out_path


# ---------------------------------------------------------------------------
# 7. Report Generator
# ---------------------------------------------------------------------------

def generate_report(findings: List[Finding], rules: List[Rule], skills: List[Skill]) -> str:
    crit = [f for f in findings if f.severity == "critical"]
    warn = [f for f in findings if f.severity == "warning"]
    info = [f for f in findings if f.severity == "info"]

    lines = [
        f"# Me-google — Self-Improvement Reflection Report",
        f"",
        f"> Generated: {datetime.now(tz=timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} by `scripts/reflect.py`",
        f"",
        f"## Executive Summary",
        f"",
        f"| Category | Count |",
        f"|---|---|",
        f"| 🔴 Critical findings | {len(crit)} |",
        f"| 🟡 Warnings | {len(warn)} |",
        f"| ℹ️ Info | {len(info)} |",
        f"| 📋 Rules derived | {len(rules)} |",
        f"| 🛠️ Skills derived | {len(skills)} |",
        f"",
        f"---",
        f"",
        f"## Findings",
        f"",
    ]

    for sev, label in [("critical", "🔴 Critical"), ("warning", "🟡 Warning"), ("info", "ℹ️ Info")]:
        group = [f for f in findings if f.severity == sev]
        if not group:
            continue
        lines.append(f"### {label}")
        lines.append("")
        for f in group:
            lines.append(f"**[{f.source.upper()} / {f.category}]** {f.description}")
            if f.recommendation:
                lines.append(f"> 💡 {f.recommendation}")
            lines.append("")

    lines += [
        "---",
        "",
        "## Derived Rules",
        "",
        "| ID | Category | Severity | Title |",
        "|---|---|---|---|",
    ]
    for r in rules:
        lines.append(f"| {r.id} | {r.category} | {r.severity} | {r.title} |")

    lines += [
        "",
        "---",
        "",
        "## Derived Skills",
        "",
        "| ID | Name | Applies To |",
        "|---|---|---|",
    ]
    for s in skills:
        lines.append(f"| {s.id} | `{s.name}` | {', '.join(s.applies_to)} |")

    lines += [
        "",
        "---",
        "",
        "## Next Actions",
        "",
        "1. Review rules above and address any `required` items immediately.",
        "2. Share new skills with relevant agent roles.",
        "3. Re-run `python3 scripts/reflect.py run-all` after addressing findings.",
        "",
    ]

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 8. Injector — writes top rules into copilot-instructions.md
# ---------------------------------------------------------------------------

INJECT_START = "<!-- reflect:rules:start -->"
INJECT_END   = "<!-- reflect:rules:end -->"


def inject_rules(rules: List[Rule]) -> None:
    if not COPILOT_INSTRUCTIONS.exists():
        print("copilot-instructions.md not found — skipping inject.", file=sys.stderr)
        return

    required = [r for r in rules if r.severity == "required"]
    recommended = [r for r in rules if r.severity == "recommended"]

    block_lines = [
        INJECT_START,
        "",
        "## Derived Rules (auto-generated — do not edit manually)",
        "",
        "> These rules were derived by `scripts/reflect.py` from analysis of the repository.",
        "> Re-run `python3 scripts/reflect.py inject` to update.",
        "",
    ]
    if required:
        block_lines.append("### Required")
        block_lines.append("")
        for r in required:
            block_lines.append(f"- **{r.title}** ({r.id}): {r.directive}")
        block_lines.append("")
    if recommended:
        block_lines.append("### Recommended")
        block_lines.append("")
        for r in recommended:
            block_lines.append(f"- **{r.title}** ({r.id}): {r.directive}")
        block_lines.append("")
    block_lines.append(INJECT_END)
    block = "\n".join(block_lines)

    content = COPILOT_INSTRUCTIONS.read_text()
    if INJECT_START in content:
        # Replace existing block
        content = re.sub(
            re.escape(INJECT_START) + r".*?" + re.escape(INJECT_END),
            block,
            content,
            flags=re.DOTALL,
        )
    else:
        content = content.rstrip() + "\n\n" + block + "\n"

    COPILOT_INSTRUCTIONS.write_text(content)
    print(f"Injected {len(required)} required + {len(recommended)} recommended rules into copilot-instructions.md")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def run_analysis(verbose: bool = True) -> List[Finding]:
    findings: List[Finding] = []
    findings.extend(GitAnalyser().analyse())
    findings.extend(TaskAnalyser().analyse())
    findings.extend(CodeAnalyser().analyse())
    if verbose:
        for f in findings:
            icon = {"critical": "🔴", "warning": "🟡", "info": "ℹ️"}.get(f.severity, "•")
            print(f"  {icon} [{f.source}/{f.category}] {f.description}")
            if f.recommendation:
                print(f"     💡 {f.recommendation}")
    return findings


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Me-google self-improvement reflection engine",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("command", choices=[
        "analyze", "generate-rules", "generate-skills", "report", "inject", "run-all"
    ], nargs="?", default="analyze")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--days", type=int, default=30, help="Git history window in days")
    args = parser.parse_args()

    if args.command in ("analyze", "run-all"):
        print("=== Analysing repository…" if not args.json else "")
        findings = run_analysis(verbose=not args.json)
        if args.json and args.command == "analyze":
            print(json.dumps([asdict(f) for f in findings], indent=2))
            return
        if args.command == "analyze":
            return

    if args.command != "analyze":
        findings = run_analysis(verbose=False)

    if args.command in ("generate-rules", "run-all"):
        print("\n=== Generating rules…")
        rules = RuleGenerator().generate(findings)
        out = save_derived(DERIVED_RULES, rules, "rules")
        save_registry(REGISTRY_RULES, rules)
        print(f"  {len(rules)} rule(s) written → {out.relative_to(REPO_ROOT)}")
        if args.json and args.command == "generate-rules":
            print(json.dumps([asdict(r) for r in rules], indent=2))
            return
        if args.command == "generate-rules":
            for r in rules:
                print(f"  [{r.severity.upper()}] {r.id}: {r.title}")
            return
    else:
        rules = RuleGenerator().generate(findings)

    if args.command in ("generate-skills", "run-all"):
        print("\n=== Generating skills…")
        skills = SkillGenerator().generate(findings, rules)
        out = save_derived(DERIVED_SKILLS, skills, "skills")
        save_registry(REGISTRY_SKILLS, skills)
        print(f"  {len(skills)} skill(s) written → {out.relative_to(REPO_ROOT)}")
        if args.json and args.command == "generate-skills":
            print(json.dumps([asdict(s) for s in skills], indent=2))
            return
        if args.command == "generate-skills":
            for s in skills:
                print(f"  {s.id}: {s.name}")
            return
    else:
        skills = SkillGenerator().generate(findings, rules)

    if args.command in ("report", "run-all"):
        print("\n=== Generating report…")
        report = generate_report(findings, rules, skills)
        REPORTS_DIR.mkdir(exist_ok=True)
        report_path = REPORTS_DIR / f"reflection-{TODAY}.md"
        report_path.write_text(report)
        print(f"  Report written → {report_path.relative_to(REPO_ROOT)}")
        if args.command == "report":
            print(report)
            return

    if args.command in ("inject", "run-all"):
        print("\n=== Injecting rules into copilot-instructions.md…")
        inject_rules(rules)

    if args.command == "run-all":
        print("\n✅ Reflection complete.")
        print(f"   Findings: {len(findings)} | Rules: {len(rules)} | Skills: {len(skills)}")


if __name__ == "__main__":
    main()
