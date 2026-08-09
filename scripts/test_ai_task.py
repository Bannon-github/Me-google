#!/usr/bin/env python3
"""Unit tests for ai_task.py firewalls and proposal parsing (offline)."""

import json
import unittest

import ai_task


class ProtectedPathTests(unittest.TestCase):
    def test_workflows_are_protected(self):
        self.assertTrue(ai_task.is_protected(".github/workflows/evil.yml"))
        self.assertTrue(ai_task.is_protected("./.github/rules/registry.json"))
        self.assertTrue(ai_task.is_protected("scripts/ai_task.py"))

    def test_normal_paths_allowed(self):
        self.assertFalse(ai_task.is_protected("core/models/spatial_item.ts"))
        self.assertFalse(ai_task.is_protected("scripts/scout.py"))


class ParseProposalTests(unittest.TestCase):
    def test_plain_json(self):
        raw = json.dumps({"summary": "s", "files": [{"path": "a.ts", "content": "x"}]})
        self.assertEqual(ai_task.parse_proposal(raw)["files"][0]["path"], "a.ts")

    def test_fenced_json_tolerated(self):
        raw = '```json\n{"summary": "s", "files": [{"path": "a.ts", "content": "x"}]}\n```'
        self.assertEqual(ai_task.parse_proposal(raw)["summary"], "s")

    def test_empty_files_rejected(self):
        with self.assertRaises(ValueError):
            ai_task.parse_proposal(json.dumps({"summary": "s", "files": []}))

    def test_path_traversal_rejected(self):
        raw = json.dumps({"files": [{"path": "../etc/passwd", "content": "x"}]})
        with self.assertRaises(ValueError):
            ai_task.parse_proposal(raw)

    def test_absolute_path_rejected(self):
        raw = json.dumps({"files": [{"path": "/etc/passwd", "content": "x"}]})
        with self.assertRaises(ValueError):
            ai_task.parse_proposal(raw)


class ApplyProposalTests(unittest.TestCase):
    def test_dry_run_rejects_protected_writes_nothing(self):
        proposal = {
            "files": [
                {"path": ".github/workflows/evil.yml", "content": "boom"},
                {"path": "core/new_thing.ts", "content": "ok"},
            ]
        }
        applied, rejected = ai_task.apply_proposal(proposal, dry_run=True)
        self.assertEqual(applied, ["core/new_thing.ts"])
        self.assertEqual(rejected, [".github/workflows/evil.yml"])
        self.assertFalse((ai_task.REPO_ROOT / "core" / "new_thing.ts").exists())


if __name__ == "__main__":
    unittest.main()
