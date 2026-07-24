#!/usr/bin/env python3
"""motion_safety.py — motion-parameter safety checker for Me-google themes.

Parses a theme's ``motion.json`` and flags vestibular / sim-sickness risks per ADR-005 §4:

  * FAIL  any animation duration < 100 ms (too-fast snap, sim-sickness risk)   [excludes 0 = instant]
  * FAIL  any comfort angular velocity > 60 deg/s
  * FAIL  any comfort scale-change > 0.3x per second
  * FAIL  any flash frequency > 3 Hz
  * FAIL  the theme has no reduced-motion accessibility override
  * WARN  any non-snap duration > 300 ms (too slow / lingering)

Usage:
  python3 motion_safety.py path/to/theme/
  python3 motion_safety.py path/to/theme/ --json

Exit code: 0 if no FAILs, 1 otherwise.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _theme_common import load_theme_dir, flatten_tokens  # noqa: E402

MIN_DURATION_MS = 100      # below this (and non-zero) = too fast
MAX_DURATION_MS = 300      # above this = warn (too slow)
MAX_ANGULAR_VELOCITY = 60  # deg/s hard cap
MAX_SCALE_PER_SEC = 0.3
MAX_FLASH_HZ = 3


def _duration_ms(value) -> float | None:
    if isinstance(value, dict) and "value" in value:
        unit = value.get("unit", "ms")
        v = float(value["value"])
        return v * 1000 if unit == "s" else v
    return None


def check(theme_dir: str) -> dict:
    theme = load_theme_dir(theme_dir)
    motion = theme["tokens"].get("motion", {})
    flat = flatten_tokens({"motion": motion})

    results = []

    for path, tok in flat.items():
        val = tok["$value"]
        ms = _duration_ms(val)
        if ms is not None and tok.get("$type") == "duration":
            if 0 < ms < MIN_DURATION_MS:
                results.append({"check": path, "value": ms, "unit": "ms",
                                "status": "FAIL", "reason": f"duration {ms}ms < {MIN_DURATION_MS}ms (too fast)"})
            elif ms > MAX_DURATION_MS:
                results.append({"check": path, "value": ms, "unit": "ms",
                                "status": "WARN", "reason": f"duration {ms}ms > {MAX_DURATION_MS}ms (too slow)"})
            else:
                results.append({"check": path, "value": ms, "unit": "ms",
                                "status": "PASS", "reason": "duration within comfort band"})

    def comfort(path_suffix):
        return flat.get(f"motion.comfort.{path_suffix}", {}).get("$value")

    av = comfort("maxAngularVelocityDegPerSec")
    if av is not None:
        results.append({"check": "motion.comfort.maxAngularVelocityDegPerSec", "value": av, "unit": "deg/s",
                        "status": "FAIL" if av > MAX_ANGULAR_VELOCITY else "PASS",
                        "reason": f"angular velocity {av} deg/s vs cap {MAX_ANGULAR_VELOCITY}"})

    sc = comfort("maxScaleChangePerSec")
    if sc is not None:
        results.append({"check": "motion.comfort.maxScaleChangePerSec", "value": sc, "unit": "x/s",
                        "status": "FAIL" if sc > MAX_SCALE_PER_SEC else "PASS",
                        "reason": f"scale change {sc}x/s vs cap {MAX_SCALE_PER_SEC}"})

    fl = comfort("maxFlashHz")
    if fl is not None:
        results.append({"check": "motion.comfort.maxFlashHz", "value": fl, "unit": "Hz",
                        "status": "FAIL" if fl > MAX_FLASH_HZ else "PASS",
                        "reason": f"flash {fl} Hz vs cap {MAX_FLASH_HZ}"})

    has_reduced = "reduced-motion" in theme.get("accessibility", {})
    results.append({"check": "accessibility.reduced-motion override present",
                    "value": has_reduced, "unit": "bool",
                    "status": "PASS" if has_reduced else "FAIL",
                    "reason": "reduced-motion override exists" if has_reduced
                              else "missing reduced-motion accessibility override"})

    fails = [x for x in results if x["status"] == "FAIL"]
    warns = [x for x in results if x["status"] == "WARN"]
    return {
        "validator": "motion_safety",
        "theme": str(theme_dir),
        "summary": {"checks": len(results), "fail": len(fails), "warn": len(warns),
                    "pass": len(results) - len(fails) - len(warns)},
        "passed": len(fails) == 0,
        "results": results,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Motion-safety validator for Me-google themes.")
    ap.add_argument("theme_dir", help="Path to a theme directory (containing manifest.json).")
    ap.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    args = ap.parse_args()

    try:
        report = check(args.theme_dir)
    except (FileNotFoundError, KeyError, ValueError) as exc:
        print(f"motion_safety: ERROR: {exc}", file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"Motion safety — {report['theme']}")
        for r in report["results"]:
            print(f"  [{r['status']:4}] {r['check']}: {r['reason']}")
        s = report["summary"]
        print(f"Summary: {s['pass']} PASS, {s['warn']} WARN, {s['fail']} FAIL")
        print("RESULT:", "PASS" if report["passed"] else "FAIL")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
