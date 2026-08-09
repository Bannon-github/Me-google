#!/usr/bin/env python3
"""Unit tests for premortem.py prompt/report building (offline)."""

import unittest

import premortem


class PromptTests(unittest.TestCase):
    def test_all_quadrants_present(self):
        prompt = premortem.build_user_prompt("2026-08-09")
        for name, _ in premortem.QUADRANTS:
            self.assertIn(name, prompt)

    def test_system_prompt_requires_warning_signs(self):
        self.assertIn("Earliest warning sign", premortem.SYSTEM_PROMPT)
        self.assertIn("Cheapest prevention", premortem.SYSTEM_PROMPT)

    def test_adr_snapshot_lists_known_adr(self):
        self.assertIn("ADR-009", premortem.adr_snapshot())


class ReportTests(unittest.TestCase):
    def test_render_has_header(self):
        report = premortem.render_report("## Scenario 1", "2026-08-09")
        self.assertTrue(report.startswith("# Pre-mortem — 2026-08-09"))
        self.assertIn("Scenario fiction", report)


if __name__ == "__main__":
    unittest.main()
