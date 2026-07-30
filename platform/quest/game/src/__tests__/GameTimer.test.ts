/**
 * GameTimer.test.ts — Unit tests for GameTimer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameTimer } from '../GameTimer.js';

const ONE_MINUTE = 60_000;

describe('GameTimer', () => {
  let timer: GameTimer;

  beforeEach(() => {
    timer = new GameTimer(ONE_MINUTE);
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------

  it('initialises with full duration remaining', () => {
    expect(timer.getRemainingMs()).toBe(ONE_MINUTE);
    expect(timer.isExpired()).toBe(false);
    expect(timer.isRunning()).toBe(false);
    expect(timer.getProgress()).toBe(0);
  });

  it('exposes the configured duration', () => {
    expect(timer.getDurationMs()).toBe(ONE_MINUTE);
  });

  // ---------------------------------------------------------------------------
  // start / pause / reset
  // ---------------------------------------------------------------------------

  it('start makes the timer running', () => {
    timer.start();
    expect(timer.isRunning()).toBe(true);
  });

  it('pause stops the countdown', () => {
    timer.start();
    timer.tick(1_000);
    timer.pause();
    expect(timer.isRunning()).toBe(false);
    const remaining = timer.getRemainingMs();
    timer.tick(5_000);
    expect(timer.getRemainingMs()).toBe(remaining);
  });

  it('reset restores full duration and stops', () => {
    timer.start();
    timer.tick(10_000);
    timer.reset();
    expect(timer.getRemainingMs()).toBe(ONE_MINUTE);
    expect(timer.isRunning()).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // tick
  // ---------------------------------------------------------------------------

  it('tick decrements remaining time when running', () => {
    timer.start();
    timer.tick(5_000);
    expect(timer.getRemainingMs()).toBe(ONE_MINUTE - 5_000);
  });

  it('tick does nothing when paused', () => {
    timer.tick(10_000);
    expect(timer.getRemainingMs()).toBe(ONE_MINUTE);
  });

  it('remaining time never goes below 0', () => {
    timer.start();
    timer.tick(ONE_MINUTE + 10_000);
    expect(timer.getRemainingMs()).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Expiry
  // ---------------------------------------------------------------------------

  it('marks expired once remaining reaches 0', () => {
    timer.start();
    timer.tick(ONE_MINUTE);
    expect(timer.isExpired()).toBe(true);
    expect(timer.isRunning()).toBe(false);
  });

  it('is not expired before duration elapses', () => {
    timer.start();
    timer.tick(ONE_MINUTE - 1);
    expect(timer.isExpired()).toBe(false);
  });

  it('tick after expiry is a no-op', () => {
    timer.start();
    timer.tick(ONE_MINUTE);
    timer.tick(5_000);
    expect(timer.getRemainingMs()).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Progress
  // ---------------------------------------------------------------------------

  it('progress is 0 at start', () => {
    expect(timer.getProgress()).toBe(0);
  });

  it('progress is 1 when expired', () => {
    timer.start();
    timer.tick(ONE_MINUTE);
    expect(timer.getProgress()).toBe(1);
  });

  it('progress is 0.5 at the halfway point', () => {
    timer.start();
    timer.tick(ONE_MINUTE / 2);
    expect(timer.getProgress()).toBeCloseTo(0.5);
  });

  // ---------------------------------------------------------------------------
  // getRemainingSeconds
  // ---------------------------------------------------------------------------

  it('getRemainingSeconds returns ceiling of remaining ms / 1000', () => {
    timer.start();
    timer.tick(59_001);   // 999 ms left
    expect(timer.getRemainingSeconds()).toBe(1);
  });

  it('getRemainingSeconds is 0 when expired', () => {
    timer.start();
    timer.tick(ONE_MINUTE);
    expect(timer.getRemainingSeconds()).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Custom duration
  // ---------------------------------------------------------------------------

  it('works with a custom duration', () => {
    const t = new GameTimer(5_000);
    t.start();
    t.tick(5_000);
    expect(t.isExpired()).toBe(true);
    expect(t.getDurationMs()).toBe(5_000);
  });

  it('uses 60 000 ms as default duration', () => {
    const t = new GameTimer();
    expect(t.getDurationMs()).toBe(60_000);
  });
});
