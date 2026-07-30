/**
 * WaveConfig.test.ts — Unit tests for the wave configuration table and helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  WAVE_CONFIGS,
  getWaveForScore,
  getWaveNumber,
} from '../WaveConfig.js';

describe('WAVE_CONFIGS', () => {
  it('contains exactly 5 waves', () => {
    expect(WAVE_CONFIGS).toHaveLength(5);
  });

  it('wave indices are consecutive 1–5', () => {
    WAVE_CONFIGS.forEach((wc, i) => {
      expect(wc.wave).toBe(i + 1);
    });
  });

  it('score thresholds increase with each wave', () => {
    for (let i = 1; i < WAVE_CONFIGS.length; i++) {
      expect(WAVE_CONFIGS[i].scoreThreshold).toBeGreaterThan(
        WAVE_CONFIGS[i - 1].scoreThreshold,
      );
    }
  });

  it('spawn intervals decrease with each wave (harder)', () => {
    for (let i = 1; i < WAVE_CONFIGS.length; i++) {
      expect(WAVE_CONFIGS[i].spawnIntervalMs).toBeLessThan(
        WAVE_CONFIGS[i - 1].spawnIntervalMs,
      );
    }
  });

  it('orb lifetimes decrease with each wave', () => {
    for (let i = 1; i < WAVE_CONFIGS.length; i++) {
      expect(WAVE_CONFIGS[i].orbLifetimeMs).toBeLessThan(
        WAVE_CONFIGS[i - 1].orbLifetimeMs,
      );
    }
  });

  it('score multipliers increase with each wave', () => {
    for (let i = 1; i < WAVE_CONFIGS.length; i++) {
      expect(WAVE_CONFIGS[i].scoreMultiplier).toBeGreaterThan(
        WAVE_CONFIGS[i - 1].scoreMultiplier,
      );
    }
  });

  it('wave 1 threshold is 0 (starts immediately)', () => {
    expect(WAVE_CONFIGS[0].scoreThreshold).toBe(0);
  });

  it('all maxOrbs values are positive', () => {
    WAVE_CONFIGS.forEach(wc => {
      expect(wc.maxOrbs).toBeGreaterThan(0);
    });
  });

  it('all orbSpeedBase values are positive', () => {
    WAVE_CONFIGS.forEach(wc => {
      expect(wc.orbSpeedBase).toBeGreaterThan(0);
    });
  });
});

describe('getWaveForScore', () => {
  it('returns wave 1 at score 0', () => {
    expect(getWaveForScore(0).wave).toBe(1);
  });

  it('returns wave 1 just below wave-2 threshold', () => {
    const threshold = WAVE_CONFIGS[1].scoreThreshold;
    expect(getWaveForScore(threshold - 1).wave).toBe(1);
  });

  it('returns wave 2 at its threshold', () => {
    expect(getWaveForScore(WAVE_CONFIGS[1].scoreThreshold).wave).toBe(2);
  });

  it('returns wave 3 at its threshold', () => {
    expect(getWaveForScore(WAVE_CONFIGS[2].scoreThreshold).wave).toBe(3);
  });

  it('returns wave 4 at its threshold', () => {
    expect(getWaveForScore(WAVE_CONFIGS[3].scoreThreshold).wave).toBe(4);
  });

  it('returns wave 5 at its threshold', () => {
    expect(getWaveForScore(WAVE_CONFIGS[4].scoreThreshold).wave).toBe(5);
  });

  it('returns wave 5 for very large scores', () => {
    expect(getWaveForScore(999_999).wave).toBe(5);
  });

  it('returns the correct WaveConfig object (not a copy)', () => {
    const config = getWaveForScore(0);
    expect(config).toBe(WAVE_CONFIGS[0]);
  });
});

describe('getWaveNumber', () => {
  it('is a convenience alias for getWaveForScore(...).wave', () => {
    for (const score of [0, 49, 50, 149, 150, 299, 300, 499, 500, 1000]) {
      expect(getWaveNumber(score)).toBe(getWaveForScore(score).wave);
    }
  });
});
