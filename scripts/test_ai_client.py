#!/usr/bin/env python3
"""Unit tests for ai_client.py (offline — no network calls)."""

import os
import unittest
from unittest import mock

import ai_client


class BuildPayloadTests(unittest.TestCase):
    def test_defaults(self):
        payload = ai_client.build_payload([{"role": "user", "content": "hi"}])
        self.assertEqual(payload["messages"][0]["content"], "hi")
        self.assertNotIn("search_parameters", payload)

    def test_live_search_adds_xai_extension(self):
        payload = ai_client.build_payload([], live_search=True)
        self.assertEqual(payload["search_parameters"]["mode"], "auto")

    def test_model_env_override(self):
        with mock.patch.dict(os.environ, {"AI_MODEL": "grok-test"}):
            self.assertEqual(ai_client.build_payload([])["model"], "grok-test")


class ExtractContentTests(unittest.TestCase):
    def test_happy_path(self):
        resp = {"choices": [{"message": {"content": "hello"}}]}
        self.assertEqual(ai_client.extract_content(resp), "hello")

    def test_malformed_raises(self):
        with self.assertRaises(ai_client.AIClientError):
            ai_client.extract_content({"choices": []})

    def test_empty_completion_raises(self):
        with self.assertRaises(ai_client.AIClientError):
            ai_client.extract_content({"choices": [{"message": {"content": "  "}}]})


class ConfigTests(unittest.TestCase):
    def test_have_key(self):
        with mock.patch.dict(os.environ, {"AI_API_KEY": ""}):
            self.assertFalse(ai_client.have_key())
        with mock.patch.dict(os.environ, {"AI_API_KEY": "xai-123"}):
            self.assertTrue(ai_client.have_key())

    def test_base_url_strips_trailing_slash(self):
        with mock.patch.dict(os.environ, {"AI_BASE_URL": "https://example.test/v1/"}):
            self.assertEqual(ai_client.base_url(), "https://example.test/v1")

    def test_chat_without_key_raises(self):
        with mock.patch.dict(os.environ, {"AI_API_KEY": ""}):
            with self.assertRaises(ai_client.AIClientError):
                ai_client.chat([{"role": "user", "content": "hi"}])


if __name__ == "__main__":
    unittest.main()
