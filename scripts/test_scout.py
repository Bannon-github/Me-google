#!/usr/bin/env python3
"""Unit tests for scout.py prompt/report building (offline)."""

import unittest

import scout


class PromptTests(unittest.TestCase):
    def test_all_beats_present(self):
        prompt = scout.build_user_prompt("2026-08-09")
        for name, _, _ in scout.BEATS:
            self.assertIn(name, prompt)

    def test_system_prompt_states_firewall(self):
        self.assertIn("never write code", scout.SYSTEM_PROMPT)
        self.assertIn("untrusted", scout.SYSTEM_PROMPT)

    def test_open_tasks_snapshot_returns_string(self):
        self.assertIsInstance(scout.open_tasks_snapshot(), str)


class ReportTests(unittest.TestCase):
    def test_render_has_header_and_body(self):
        report = scout.render_report("## XR platform\n- finding", "2026-08-09")
        self.assertTrue(report.startswith("# Research Scout Digest — 2026-08-09"))
        self.assertIn("ADR-009", report)
        self.assertIn("- finding", report)
        self.assertTrue(report.endswith("\n"))


if __name__ == "__main__":
    unittest.main()
