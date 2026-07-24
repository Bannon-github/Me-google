#!/usr/bin/env python3
"""contrast_check.py — WCAG/XAUR contrast-ratio validator for Me-google themes.

Computes WCAG 2.1 contrast ratios for every ``color.on-*`` / surface(-or-fill) pair in a
theme and reports any below the thresholds from ADR-005:

  * FAIL  < 4.5:1   (below WCAG 2.2 AA for normal text)
  * WARN  4.5:1 – 6.99:1  (below the VR-recommended 7:1 target)
  * PASS  >= 7:1

Pairs checked:
  * ``color.on-surface.*``   against every ``color.surface.*``
  * ``color.on-accent.<k>``  against ``color.accent.<k>``
  * ``color.on-semantic.<k>``against ``color.semantic.<k>``
  * ``color.utility.focus-ring`` against ``color.surface.base`` (non-text, 3:1 floor)

Usage:
  python3 contrast_check.py path/to/theme/            # human-readable
  python3 contrast_check.py path/to/theme/ --json     # machine-readable
  python3 contrast_check.py path/to/theme/ --mode high-contrast   # check a merged a11y layer

Exit code: 0 if no FAILs, 1 otherwise.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _theme_common import (  # noqa: E402
    load_theme_dir, flatten_theme, resolve_aliases, merge_accessibility,
    contrast_ratio, token_hex,
)

AA_MIN = 4.5          # WCAG 2.2 AA normal text
VR_TARGET = 7.0       # ADR-005 VR-recommended
NON_TEXT_MIN = 3.0    # WCAG 1.4.11 non-text


def _rank(ratio: float, floor: float = AA_MIN) -> str:
    if ratio < floor:
        return "FAIL"
    if ratio < VR_TARGET:
        return "WARN"
    return "PASS"


def check(theme_dir: str, mode: str | None) -> dict:
    theme = load_theme_dir(theme_dir)
    if mode:
        theme = merge_accessibility(theme, mode)
    flat = resolve_aliases(flatten_theme(theme))

    def hexes(prefix: str) -> dict:
        out = {}
        for path, tok in flat.items():
            if path.startswith(prefix):
                h = token_hex(tok["$value"])
                if h:
                    out[path] = h
        return out

    surfaces = hexes("color.surface.")
    on_surface = hexes("color.on-surface.")
    accents = hexes("color.accent.")
    on_accents = hexes("color.on-accent.")
    semantic = hexes("color.semantic.")
    on_semantic = hexes("color.on-semantic.")
    utility = hexes("color.utility.")

    results = []

    for fg_path, fg in on_surface.items():
        for bg_path, bg in surfaces.items():
            r = contrast_ratio(fg, bg)
            results.append({"pair": f"{fg_path} on {bg_path}", "ratio": round(r, 2),
                            "floor": AA_MIN, "status": _rank(r)})

    def paired(on_map, fill_map, label):
        for on_path, on_hex in on_map.items():
            key = on_path.split(".")[-1]
            fill_path = f"color.{label}.{key}"
            fill_hex = fill_map.get(fill_path)
            if fill_hex:
                r = contrast_ratio(on_hex, fill_hex)
                results.append({"pair": f"{on_path} on {fill_path}", "ratio": round(r, 2),
                                "floor": AA_MIN, "status": _rank(r)})

    paired(on_accents, accents, "accent")
    paired(on_semantic, semantic, "semantic")

    focus = utility.get("color.utility.focus-ring")
    base = surfaces.get("color.surface.base")
    if focus and base:
        r = contrast_ratio(focus, base)
        results.append({"pair": "color.utility.focus-ring on color.surface.base (non-text)",
                        "ratio": round(r, 2), "floor": NON_TEXT_MIN, "status": _rank(r, NON_TEXT_MIN)})

    fails = [x for x in results if x["status"] == "FAIL"]
    warns = [x for x in results if x["status"] == "WARN"]
    return {
        "validator": "contrast_check",
        "theme": str(theme_dir),
        "mode": mode,
        "summary": {"checks": len(results), "fail": len(fails), "warn": warns and len(warns) or 0,
                    "pass": len(results) - len(fails) - len(warns)},
        "passed": len(fails) == 0,
        "results": sorted(results, key=lambda x: x["ratio"]),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="WCAG/XAUR contrast validator for Me-google themes.")
    ap.add_argument("theme_dir", help="Path to a theme directory (containing manifest.json).")
    ap.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    ap.add_argument("--mode", choices=["high-contrast", "reduced-motion"], default=None,
                    help="Merge an accessibility override layer before checking.")
    args = ap.parse_args()

    try:
        report = check(args.theme_dir, args.mode)
    except (FileNotFoundError, KeyError, ValueError) as exc:
        print(f"contrast_check: ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"Contrast check — {report['theme']}"
              + (f" [{args.mode}]" if args.mode else ""))
        for r in report["results"]:
            print(f"  [{r['status']:4}] {r['ratio']:6.2f}:1  {r['pair']}")
        s = report["summary"]
        print(f"Summary: {s['pass']} PASS, {s['warn']} WARN, {s['fail']} FAIL "
              f"(FAIL < {AA_MIN}:1, WARN < {VR_TARGET}:1)")
        print("RESULT:", "PASS" if report["passed"] else "FAIL")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
