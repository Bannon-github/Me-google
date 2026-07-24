"""Shared helpers for Me-google theme validators and the theme pipeline.

Loads a theme directory into an assembled object, flattens DTCG token trees into
dotted-path maps, resolves ``{group.token}`` aliases, merges accessibility override
layers, and provides sRGB colour maths (relative luminance + WCAG contrast).

No third-party dependencies (stdlib only) so it runs anywhere the validators run.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

# --- DTCG reserved keys -----------------------------------------------------
_RESERVED = {"$value", "$type", "$description", "$extensions"}


def read_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def load_theme_dir(theme_dir: str | Path) -> Dict[str, Any]:
    """Assemble a theme directory into ``{manifest, tokens, accessibility}``.

    ``tokens`` is a dict keyed by category (color, typography, ...) whose values are
    the parsed token-file contents. ``accessibility`` is keyed by mode name.
    """
    d = Path(theme_dir)
    manifest_path = d / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"manifest.json not found in {d}")
    manifest = read_json(manifest_path)

    tokens: Dict[str, Any] = {}
    for category in ("color", "typography", "spacing", "depth", "motion", "audio", "haptics"):
        fp = d / "tokens" / f"{category}.json"
        if fp.exists():
            content = read_json(fp)
            # Token files wrap their group under the category key; unwrap it.
            tokens[category] = content.get(category, content)

    accessibility: Dict[str, Any] = {}
    for mode in ("high-contrast", "reduced-motion"):
        fp = d / "accessibility" / f"{mode}.json"
        if fp.exists():
            accessibility[mode] = read_json(fp)

    return {"manifest": manifest, "tokens": tokens, "accessibility": accessibility}


def _is_token(node: Any) -> bool:
    return isinstance(node, dict) and "$value" in node


def flatten_tokens(node: Any, prefix: str = "", inherited_type: Optional[str] = None,
                   out: Optional[Dict[str, Dict[str, Any]]] = None) -> Dict[str, Dict[str, Any]]:
    """Flatten a DTCG group tree into ``{dotted.path: {"$value":..., "$type":...}}``.

    ``$type`` is inherited from the nearest ancestor group when not set on the token.
    """
    if out is None:
        out = {}
    if not isinstance(node, dict):
        return out
    group_type = node.get("$type", inherited_type)
    for key, child in node.items():
        if key in _RESERVED or key.startswith("$"):
            continue
        path = f"{prefix}.{key}" if prefix else key
        if _is_token(child):
            out[path] = {
                "$value": child["$value"],
                "$type": child.get("$type", group_type),
                "$description": child.get("$description"),
                "$extensions": child.get("$extensions"),
            }
        elif isinstance(child, dict):
            flatten_tokens(child, path, group_type, out)
    return out


def flatten_theme(theme: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Flatten all token categories of an assembled theme into one dotted map."""
    flat: Dict[str, Dict[str, Any]] = {}
    for category, group in theme.get("tokens", {}).items():
        flatten_tokens({category: group}, "", None, flat)
    return flat


_ALIAS_RE = None


def _resolve_ref(value: Any, flat: Dict[str, Dict[str, Any]], seen: Optional[set] = None) -> Any:
    """Resolve a single ``{group.token}`` alias string to the referenced ``$value``."""
    if seen is None:
        seen = set()
    if isinstance(value, str) and value.startswith("{") and value.endswith("}"):
        ref = value[1:-1]
        if ref in seen:
            raise ValueError(f"Circular token reference: {ref}")
        seen.add(ref)
        target = flat.get(ref)
        if target is None:
            raise KeyError(f"Unresolved token reference: {{{ref}}}")
        return _resolve_ref(target["$value"], flat, seen)
    return value


def resolve_aliases(flat: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Return a copy of ``flat`` with all top-level alias ``$value`` strings resolved."""
    resolved: Dict[str, Dict[str, Any]] = {}
    for path, tok in flat.items():
        new = dict(tok)
        try:
            new["$value"] = _resolve_ref(tok["$value"], flat)
        except (KeyError, ValueError):
            pass  # leave unresolved; schema/other checks report structural issues
        resolved[path] = new
    return resolved


def deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively merge ``override`` onto ``base`` (override wins). Returns a new dict."""
    result = dict(base)
    for key, val in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(val, dict):
            result[key] = deep_merge(result[key], val)
        else:
            result[key] = val
    return result


def merge_accessibility(theme: Dict[str, Any], mode: str) -> Dict[str, Any]:
    """Return a new assembled theme with the given accessibility override merged in.

    Override files are keyed by category at the top level (color, motion, ...), the
    same shape as base token files, so they merge onto ``theme['tokens']`` directly.
    """
    override = theme.get("accessibility", {}).get(mode)
    if not override:
        return theme
    merged_tokens = dict(theme["tokens"])
    for category, group in override.items():
        if category.startswith("$"):
            continue
        if category in merged_tokens:
            merged_tokens[category] = deep_merge(merged_tokens[category], group)
        else:
            merged_tokens[category] = group
    new_theme = dict(theme)
    new_theme["tokens"] = merged_tokens
    return new_theme


# --- Colour maths -----------------------------------------------------------

def hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    h = hex_str.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _linearize(channel_0_255: int) -> float:
    c = channel_0_255 / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def relative_luminance(hex_str: str) -> float:
    r, g, b = hex_to_rgb(hex_str)
    return 0.2126 * _linearize(r) + 0.7152 * _linearize(g) + 0.0722 * _linearize(b)


def contrast_ratio(hex_a: str, hex_b: str) -> float:
    la, lb = relative_luminance(hex_a), relative_luminance(hex_b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def token_hex(token_value: Any) -> Optional[str]:
    """Extract a hex string from a DTCG color token ``$value`` (object or string)."""
    if isinstance(token_value, str) and token_value.startswith("#"):
        return token_value
    if isinstance(token_value, dict) and "hex" in token_value:
        return token_value["hex"]
    return None
