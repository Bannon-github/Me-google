#!/usr/bin/env python3
"""Minimal chat-completion client for the AI automation loops (ADR-009).

Speaks the OpenAI-compatible /chat/completions protocol using only the
standard library, so the same scripts run against xAI's Grok API (the
default), or any other compatible provider, with zero dependencies.

Configuration is environment-only so CI can inject it as secrets/vars:

    AI_API_KEY    required — no key means the loops skip gracefully
    AI_BASE_URL   default: https://api.x.ai/v1
    AI_MODEL      default: grok-4

`live_search=True` adds xAI's `search_parameters` extension so the model
can read the open web; other providers may reject the field, so it is
only sent when explicitly requested.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from typing import Dict, List, Optional

DEFAULT_BASE_URL = "https://api.x.ai/v1"
DEFAULT_MODEL = "grok-4"

RETRYABLE_STATUS = {429, 500, 502, 503, 504}
MAX_ATTEMPTS = 3


class AIClientError(RuntimeError):
    """Raised when the provider returns an unusable response."""


def have_key() -> bool:
    return bool(os.environ.get("AI_API_KEY", "").strip())


def base_url() -> str:
    return os.environ.get("AI_BASE_URL", DEFAULT_BASE_URL).rstrip("/")


def model() -> str:
    return os.environ.get("AI_MODEL", DEFAULT_MODEL)


def build_payload(
    messages: List[Dict[str, str]],
    *,
    temperature: float = 0.3,
    max_tokens: int = 4096,
    live_search: bool = False,
) -> Dict:
    payload: Dict = {
        "model": model(),
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if live_search:
        # xAI extension: lets Grok consult the live web while answering.
        payload["search_parameters"] = {"mode": "auto", "return_citations": True}
    return payload


def extract_content(response: Dict) -> str:
    try:
        content = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise AIClientError(f"Malformed provider response: {response!r:.500}") from exc
    if not isinstance(content, str) or not content.strip():
        raise AIClientError("Provider returned an empty completion.")
    return content


def chat(
    messages: List[Dict[str, str]],
    *,
    temperature: float = 0.3,
    max_tokens: int = 4096,
    live_search: bool = False,
    timeout: int = 300,
) -> str:
    """Send a chat request and return the completion text.

    Retries transient failures (429/5xx, network errors) with backoff.
    """
    key = os.environ.get("AI_API_KEY", "").strip()
    if not key:
        raise AIClientError("AI_API_KEY is not set.")

    payload = build_payload(
        messages, temperature=temperature, max_tokens=max_tokens, live_search=live_search
    )
    body = json.dumps(payload).encode("utf-8")
    url = f"{base_url()}/chat/completions"

    last_error: Optional[Exception] = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        request = urllib.request.Request(
            url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as resp:
                return extract_content(json.loads(resp.read().decode("utf-8")))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
            last_error = AIClientError(f"HTTP {exc.code} from {url}: {detail}")
            if exc.code not in RETRYABLE_STATUS:
                raise last_error
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = AIClientError(f"Request to {url} failed: {exc}")
        if attempt < MAX_ATTEMPTS:
            time.sleep(2 ** attempt)
    raise AIClientError(f"Giving up after {MAX_ATTEMPTS} attempts: {last_error}")
