/**
 * theme.ts — Me-google default-theme colours as Three.js Color values.
 *
 * Mirrors the DTCG tokens in:
 *   platform/quest/themes/me-google-default/tokens/color.json
 *
 * Using hardcoded hex values avoids a runtime JSON fetch while ensuring the
 * game palette stays in sync with the design system. Update alongside the
 * token file when the default theme is revised.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Surface palette (backgrounds, panels)
// ---------------------------------------------------------------------------

export const SurfaceColors = {
  /** Deepest background — behind all panels. */
  sunken:  new THREE.Color(0x05070B),
  /** Primary panel background (near-black, blue tint). */
  base:    new THREE.Color(0x0B0E16),
  /** Raised panel / card surface. */
  raised:  new THREE.Color(0x151A26),
  /** Overlay / modal surface. */
  overlay: new THREE.Color(0x1E2536),
} as const;

// ---------------------------------------------------------------------------
// Accent palette (interactive elements, orb tiers)
// ---------------------------------------------------------------------------

export const AccentColors = {
  /** Brand violet — primary interactive colour. */
  primary:   new THREE.Color(0x7B5CFF),
  /** Cyan — secondary / informational. */
  secondary: new THREE.Color(0x00D4FF),
  /** Green — success / positive feedback. */
  success:   new THREE.Color(0x00E5A0),
  /** Amber — warning / medium value. */
  warning:   new THREE.Color(0xFFB800),
  /** Rose — danger / high-value alert. */
  danger:    new THREE.Color(0xFF4D6D),
} as const;

// ---------------------------------------------------------------------------
// Orb tier definitions — ordered from common (0) to legendary (4)
// ---------------------------------------------------------------------------

/** Three.js Color for each orb tier. */
export const ORB_COLORS: readonly THREE.Color[] = [
  new THREE.Color(0x00D4FF),  // 0 — common     (cyan)
  new THREE.Color(0x00E5A0),  // 1 — uncommon   (green)
  new THREE.Color(0xFFB800),  // 2 — rare        (amber)
  new THREE.Color(0xFF4D6D),  // 3 — epic        (rose)
  new THREE.Color(0x7B5CFF),  // 4 — legendary   (violet)
] as const;

/** Base point value for each orb tier. */
export const ORB_POINTS: readonly number[] = [10, 25, 50, 100, 250] as const;

/** Radius (metres) for each orb tier — larger tiers are bigger. */
export const ORB_RADIUS: readonly number[] = [0.06, 0.075, 0.09, 0.105, 0.13] as const;

/**
 * Pick a random tier index weighted towards common tiers.
 *
 * Distribution: 45 % common | 30 % uncommon | 15 % rare | 7 % epic | 3 % legendary
 */
export function randomOrbTier(): number {
  const r = Math.random();
  if (r < 0.45) return 0;
  if (r < 0.75) return 1;
  if (r < 0.90) return 2;
  if (r < 0.97) return 3;
  return 4;
}

/** Fog colour that matches the background (used for scene fog). */
export const FOG_COLOR = new THREE.Color(0x05070B);

/** Ambient light colour — faint blue matching the surface.base tone. */
export const AMBIENT_COLOR = new THREE.Color(0x0D1220);

/** Directional / fill light colour — soft violet tint. */
export const FILL_COLOR = new THREE.Color(0x3A2880);
