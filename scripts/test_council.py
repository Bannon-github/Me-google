#!/usr/bin/env python3
"""Unit tests for council.py (offline)."""

import unittest
from pathlib import Path

import council


class PersonaTests(unittest.TestCase):
    def test_personas_load_with_required_fields(self):
        personas = council.load_personas()
        self.assertGreaterEqual(len(personas), 3)
        for p in personas:
            self.assertTrue(p["name"] and p["charge"])

    def test_privacy_seat_present(self):
        names = [p["name"] for p in council.load_personas()]
        self.assertIn("Privacy Red-Team", names)


class MessageTests(unittest.TestCase):
    def test_seat_message_carries_charge_and_digest(self):
        persona = {"name": "Tester", "charge": "test everything"}
        msgs = council.seat_messages(persona, "DIGEST-BODY")
        self.assertIn("test everything", msgs[0]["content"])
        self.assertIn("DIGEST-BODY", msgs[1]["content"])

    def test_chair_message_includes_all_seats(self):
        msgs = council.chair_messages("digest", [("A", "ra"), ("B", "rb")])
        self.assertIn("Seat: A", msgs[1]["content"])
        self.assertIn("Seat: B", msgs[1]["content"])


class RenderTests(unittest.TestCase):
    def test_report_has_decision_and_appendix(self):
        digest = council.REPORTS_DIR / "scout-2026-01-01.md"
        report = council.render_report(digest, [("A", "review")], "## Actions\n- x", "2026-01-01")
        self.assertTrue(report.startswith("# Council Decision — 2026-01-01"))
        self.assertIn("## Actions", report)
        self.assertIn("Seat reviews (appendix)", report)


if __name__ == "__main__":
    unittest.main()
