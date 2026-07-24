/**
 * ScoreManager.test.ts — Unit tests for ScoreManager.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScoreManager } from '../ScoreManager.js';

describe('ScoreManager', () => {
  let sm: ScoreManager;

  beforeEach(() => {
    sm = new ScoreManager();
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------

  it('starts at score 0 and combo 1', () => {
    expect(sm.getScore()).toBe(0);
    expect(sm.getCombo()).toBe(1);
    expect(sm.isComboActive()).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Basic scoring
  // ---------------------------------------------------------------------------

  it('awards base × waveMultiplier × combo points', () => {
    const awarded = sm.addPoints(10, 1.0);
    expect(awarded).toBe(10);
    expect(sm.getScore()).toBe(10);
  });

  it('applies wave multiplier correctly', () => {
    const awarded = sm.addPoints(10, 2.5);
    expect(awarded).toBe(25);
    expect(sm.getScore()).toBe(25);
  });

  it('accumulates score over multiple independent collections', () => {
    sm.addPoints(10, 1.0);
    // expire the combo window so the second collect has no multiplier
    sm.tick(2_001);
    sm.addPoints(25, 1.0);
    expect(sm.getScore()).toBe(35);
  });

  // ---------------------------------------------------------------------------
  // Combo mechanics
  // ---------------------------------------------------------------------------

  it('activates a combo on first collection', () => {
    sm.addPoints(10, 1.0);
    expect(sm.isComboActive()).toBe(true);
    expect(sm.getCombo()).toBe(1);
  });

  it('increments combo on successive collections before window expires', () => {
    sm.addPoints(10, 1.0);          // combo → 1
    sm.tick(500);                    // 0.5 s — window still open
    sm.addPoints(10, 1.0);          // combo → 2
    expect(sm.getCombo()).toBe(2);
  });

  it('applies combo multiplier to awarded points', () => {
    sm.addPoints(10, 1.0);          // first collect; combo = 1; awarded = 10
    sm.tick(500);
    const awarded = sm.addPoints(10, 1.0);  // combo = 2; awarded = 20
    expect(awarded).toBe(20);
  });

  it('resets combo after the window expires', () => {
    sm.addPoints(10, 1.0);
    sm.tick(2_001);                 // exceed 2 000 ms window
    expect(sm.getCombo()).toBe(1);
    expect(sm.isComboActive()).toBe(false);
  });

  it('does not reset combo before the window expires', () => {
    sm.addPoints(10, 1.0);
    sm.tick(1_999);
    expect(sm.getCombo()).toBe(1);
    expect(sm.isComboActive()).toBe(true);
  });

  it('caps combo at COMBO_MAX (8)', () => {
    for (let i = 0; i < 10; i++) {
      sm.tick(100);           // stay within window
      sm.addPoints(10, 1.0);
    }
    expect(sm.getCombo()).toBeLessThanOrEqual(sm.getMaxCombo());
  });

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  it('reset clears score and combo', () => {
    sm.addPoints(50, 2.0);
    sm.tick(500);
    sm.addPoints(50, 2.0);
    sm.reset();
    expect(sm.getScore()).toBe(0);
    expect(sm.getCombo()).toBe(1);
    expect(sm.isComboActive()).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // tick with no combo active is a no-op
  // ---------------------------------------------------------------------------

  it('tick without active combo does not throw', () => {
    expect(() => sm.tick(5_000)).not.toThrow();
    expect(sm.getCombo()).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // High score persistence (mocked localStorage)
  // ---------------------------------------------------------------------------

  it('loadHighScore returns 0 when localStorage is empty', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: vi.fn(),
    });
    expect(sm.loadHighScore()).toBe(0);
    vi.unstubAllGlobals();
  });

  it('saveHighScore persists when score exceeds stored value', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: () => '50',
      setItem,
    });
    sm.addPoints(100, 1.0);
    sm.saveHighScore();
    expect(setItem).toHaveBeenCalledWith('meg-orb-highscore', '100');
    vi.unstubAllGlobals();
  });

  it('saveHighScore does not persist when score is lower', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: () => '500',
      setItem,
    });
    sm.addPoints(10, 1.0);
    sm.saveHighScore();
    expect(setItem).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('handles localStorage exceptions gracefully', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('unavailable'); },
      setItem: () => { throw new Error('unavailable'); },
    });
    expect(() => sm.loadHighScore()).not.toThrow();
    expect(() => sm.saveHighScore()).not.toThrow();
    vi.unstubAllGlobals();
  });
});
