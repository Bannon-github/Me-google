/**
 * WaveConfig.ts — Difficulty wave configuration table.
 *
 * Pure logic — no Three.js dependency, fully unit-testable.
 *
 * The game automatically advances through five waves as the player's score
 * increases. Each wave increases the number of concurrent orbs, shortens the
 * spawn interval and orb lifetime, and applies a score multiplier.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WaveConfig {
  /** Wave index (1–5). */
  readonly wave: number;
  /** Maximum number of live orbs at any time. */
  readonly maxOrbs: number;
  /** Time in ms between each spawn attempt. */
  readonly spawnIntervalMs: number;
  /** Base drift speed in metres/second. */
  readonly orbSpeedBase: number;
  /** How long (ms) an orb stays alive before expiring. */
  readonly orbLifetimeMs: number;
  /** Points multiplier applied on top of the base orb value. */
  readonly scoreMultiplier: number;
  /** Score threshold at which this wave begins. */
  readonly scoreThreshold: number;
}

// ---------------------------------------------------------------------------
// Wave table
// ---------------------------------------------------------------------------

/**
 * All five wave configurations ordered by difficulty (wave 1 = easiest).
 *
 * The last entry (wave 5) is the maximum difficulty; scores beyond 500
 * remain in wave 5.
 */
export const WAVE_CONFIGS: readonly WaveConfig[] = [
  {
    wave: 1,
    maxOrbs: 5,
    spawnIntervalMs: 2000,
    orbSpeedBase: 0.20,
    orbLifetimeMs: 8000,
    scoreMultiplier: 1.0,
    scoreThreshold: 0,
  },
  {
    wave: 2,
    maxOrbs: 8,
    spawnIntervalMs: 1600,
    orbSpeedBase: 0.30,
    orbLifetimeMs: 7000,
    scoreMultiplier: 1.5,
    scoreThreshold: 50,
  },
  {
    wave: 3,
    maxOrbs: 12,
    spawnIntervalMs: 1200,
    orbSpeedBase: 0.40,
    orbLifetimeMs: 6000,
    scoreMultiplier: 2.0,
    scoreThreshold: 150,
  },
  {
    wave: 4,
    maxOrbs: 16,
    spawnIntervalMs: 900,
    orbSpeedBase: 0.50,
    orbLifetimeMs: 5000,
    scoreMultiplier: 2.5,
    scoreThreshold: 300,
  },
  {
    wave: 5,
    maxOrbs: 22,
    spawnIntervalMs: 700,
    orbSpeedBase: 0.60,
    orbLifetimeMs: 4500,
    scoreMultiplier: 3.0,
    scoreThreshold: 500,
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return the appropriate {@link WaveConfig} for the given score.
 *
 * Iterates from the hardest wave downwards so the first match (highest
 * threshold ≤ score) is returned efficiently.
 */
export function getWaveForScore(score: number): WaveConfig {
  for (let i = WAVE_CONFIGS.length - 1; i >= 0; i--) {
    if (score >= WAVE_CONFIGS[i].scoreThreshold) {
      return WAVE_CONFIGS[i];
    }
  }
  return WAVE_CONFIGS[0];
}

/**
 * Return the wave index (1-based) for the given score.
 * Convenience wrapper around {@link getWaveForScore}.
 */
export function getWaveNumber(score: number): number {
  return getWaveForScore(score).wave;
}
