#!/usr/bin/env python3
"""schema_validate.py — JSON Schema validator for Me-google theme directories.

Assembles a theme directory into ``{manifest, tokens, accessibility}`` and validates it
against ``platform/quest/themes/schema/theme.schema.json``. Reports missing required token
groups, unknown keys, and value-type mismatches (ADR-006 Tier-1 check).

Usage:
  python3 schema_validate.py path/to/theme/
  python3 schema_validate.py path/to/theme/ --json
  python3 schema_validate.py path/to/theme/ --schema path/to/theme.schema.json

Exit code: 0 if valid, 1 otherwise.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _theme_common import load_theme_dir, read_json  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_SCHEMA = REPO_ROOT / "platform" / "quest" / "themes" / "schema" / "theme.schema.json"


def _assemble_for_schema(theme_dir: str) -> dict:
    """Build the object shape the schema expects (accessibility keys unwrapped)."""
    theme = load_theme_dir(theme_dir)
    tokens = {}
    for category, group in theme["tokens"].items():
        tokens[category] = group
    accessibility = {}
    for mode, content in theme["accessibility"].items():
        accessibility[mode] = content
    return {"manifest": theme["manifest"], "tokens": tokens, "accessibility": accessibility}


def check(theme_dir: str, schema_path: Path) -> dict:
    try:
        import jsonschema
    except ImportError:
        return {"validator": "schema_validate", "theme": str(theme_dir), "passed": False,
                "errors": ["jsonschema is not installed (pip install jsonschema)"]}

    schema = read_json(schema_path)
    instance = _assemble_for_schema(theme_dir)

    validator = jsonschema.Draft202012Validator(schema)
    errors = []
    for err in sorted(validator.iter_errors(instance), key=lambda e: list(e.absolute_path)):
        loc = "/".join(str(p) for p in err.absolute_path) or "<root>"
        errors.append({"path": loc, "message": err.message})

    return {
        "validator": "schema_validate",
        "theme": str(theme_dir),
        "schema": str(schema_path),
        "summary": {"errors": len(errors)},
        "passed": len(errors) == 0,
        "errors": errors,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="JSON Schema validator for Me-google themes.")
    ap.add_argument("theme_dir", help="Path to a theme directory (containing manifest.json).")
    ap.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    ap.add_argument("--schema", default=str(DEFAULT_SCHEMA), help="Path to theme.schema.json.")
    args = ap.parse_args()

    try:
        report = check(args.theme_dir, Path(args.schema))
    except (FileNotFoundError, KeyError, ValueError) as exc:
        print(f"schema_validate: ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"Schema validation — {report['theme']}")
        if report["passed"]:
            print("  [PASS] theme conforms to theme.schema.json")
        else:
            for e in report.get("errors", []):
                loc = e["path"] if isinstance(e, dict) else e
                msg = e["message"] if isinstance(e, dict) else ""
                print(f"  [FAIL] {loc}: {msg}")
        print("RESULT:", "PASS" if report["passed"] else "FAIL")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
