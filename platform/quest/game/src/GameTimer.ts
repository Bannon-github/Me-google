/**
 * GameTimer.ts — Countdown timer for a timed game round.
 *
 * Pure logic — no Three.js dependency, fully unit-testable.
 *
 * Usage:
 *   const timer = new GameTimer(60_000);
 *   timer.start();
 *   // in animation loop:
 *   timer.tick(deltaMs);
 *   if (timer.isExpired()) { ... }
 */

export class GameTimer {
  private remaining: number;
  private running = false;

  /**
   * @param durationMs Total round duration in milliseconds (default 60 000 = 60 s).
   */
  constructor(private readonly durationMs: number = 60_000) {
    this.remaining = durationMs;
  }

  // ---------------------------------------------------------------------------
  // Control
  // ---------------------------------------------------------------------------

  /** Start (or resume) the countdown. No-op if already running. */
  start(): void {
    this.running = true;
  }

  /** Pause the countdown without resetting it. */
  pause(): void {
    this.running = false;
  }

  /** Reset to the original duration and stop. */
  reset(): void {
    this.remaining = this.durationMs;
    this.running = false;
  }

  // ---------------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------------

  /**
   * Advance the timer by {@link deltaMs} milliseconds.
   * Does nothing when paused or already expired.
   *
   * @param deltaMs Elapsed real time since the last frame (ms).
   */
  tick(deltaMs: number): void {
    if (!this.running) return;
    this.remaining = Math.max(0, this.remaining - deltaMs);
    if (this.remaining === 0) {
      this.running = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  /** `true` once the countdown reaches zero. */
  isExpired(): boolean {
    return this.remaining <= 0;
  }

  /** `true` while the timer is actively counting down. */
  isRunning(): boolean {
    return this.running;
  }

  /** Remaining time in milliseconds (never negative). */
  getRemainingMs(): number {
    return this.remaining;
  }

  /** Remaining time in whole seconds (ceiling). */
  getRemainingSeconds(): number {
    return Math.ceil(this.remaining / 1000);
  }

  /**
   * Fraction of the total duration that has elapsed, in [0, 1].
   * 0 = just started, 1 = expired.
   */
  getProgress(): number {
    return 1 - this.remaining / this.durationMs;
  }

  /** Total configured duration in milliseconds. */
  getDurationMs(): number {
    return this.durationMs;
  }
}
