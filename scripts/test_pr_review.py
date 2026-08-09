#!/usr/bin/env python3
"""Unit tests for pr_review.py (offline)."""

import unittest

import pr_review


class TruncateTests(unittest.TestCase):
    def test_short_diff_untouched(self):
        self.assertEqual(pr_review.truncate_diff("abc", limit=10), "abc")

    def test_long_diff_truncated_with_note(self):
        out = pr_review.truncate_diff("x" * 100, limit=10)
        self.assertIn("truncated", out)
        self.assertTrue(out.startswith("x" * 10))


class RulesTests(unittest.TestCase):
    def test_registry_summary_includes_rule_ids(self):
        summary = pr_review.load_rules_summary()
        self.assertIn("RULE-001", summary)


class RenderTests(unittest.TestCase):
    def test_review_carries_sticky_marker_and_advisory_note(self):
        out = pr_review.render_review("## Verdict\nFine.")
        self.assertTrue(out.startswith(pr_review.COMMENT_MARKER))
        self.assertIn("Advisory only", out)


if __name__ == "__main__":
    unittest.main()
