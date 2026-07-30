/**
 * ScoreManager.ts — Score and combo tracking for the Orb Collector game.
 *
 * Pure logic — no Three.js dependency, fully unit-testable.
 *
 * Combo rules
 * -----------
 * Collecting an orb within COMBO_WINDOW_MS of the previous collection extends
 * the combo by 1 (capped at COMBO_MAX). The combo multiplier equals the combo
 * count. If the window expires without a collection the combo resets to 1.
 *
 * Point formula
 * -------------
 *   awarded = Math.round(base × waveMultiplier × comboMultiplier)
 *
 * High score
 * ----------
 * Persisted to localStorage under the key 'meg-orb-highscore'. Falls back
 * gracefully if localStorage is unavailable (e.g. in test environments).
 */

const HIGH_SCORE_KEY = 'meg-orb-highscore';
const COMBO_WINDOW_MS = 2_000;
const COMBO_MAX = 8;

export class ScoreManager {
  private score = 0;
  private combo = 1;
  private comboAccumulator = 0;   // time since last orb collected (ms)
  private comboActive = false;    // true while the window is running

  // ---------------------------------------------------------------------------
  // Control
  // ---------------------------------------------------------------------------

  /** Reset score and combo to initial state (call at round start). */
  reset(): void {
    this.score = 0;
    this.combo = 1;
    this.comboAccumulator = 0;
    this.comboActive = false;
  }

  // ---------------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------------

  /**
   * Advance the combo decay timer.
   *
   * @param deltaMs Elapsed real time since the last frame (ms).
   */
  tick(deltaMs: number): void {
    if (!this.comboActive) return;
    this.comboAccumulator += deltaMs;
    if (this.comboAccumulator >= COMBO_WINDOW_MS) {
      this.combo = 1;
      this.comboActive = false;
      this.comboAccumulator = 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------

  /**
   * Add points for an orb collection.
   *
   * @param base           Base point value of the orb (from {@link ORB_POINTS}).
   * @param waveMultiplier Score multiplier for the current wave (from {@link WaveConfig}).
   * @returns              The actual number of points awarded this collection.
   */
  addPoints(base: number, waveMultiplier: number): number {
    // Extend or start the combo
    if (this.comboActive) {
      this.combo = Math.min(this.combo + 1, COMBO_MAX);
    } else {
      this.comboActive = true;
    }
    this.comboAccumulator = 0;

    const awarded = Math.round(base * waveMultiplier * this.combo);
    this.score += awarded;
    return awarded;
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  /** Current accumulated score. */
  getScore(): number {
    return this.score;
  }

  /** Current combo count (1 = no active combo). */
  getCombo(): number {
    return this.combo;
  }

  /** `true` if a combo chain is currently active. */
  isComboActive(): boolean {
    return this.comboActive;
  }

  /** Maximum possible combo multiplier. */
  getMaxCombo(): number {
    return COMBO_MAX;
  }

  /** Combo window duration in milliseconds. */
  getComboWindowMs(): number {
    return COMBO_WINDOW_MS;
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  /** Persist the current score as the high score if it exceeds the stored value. */
  saveHighScore(): void {
    try {
      const current = this.loadHighScore();
      if (this.score > current) {
        localStorage.setItem(HIGH_SCORE_KEY, String(this.score));
      }
    } catch {
      // localStorage unavailable (test env / private-browsing / storage full)
    }
  }

  /** Load the stored high score, or 0 if none exists or storage is unavailable. */
  loadHighScore(): number {
    try {
      const raw = localStorage.getItem(HIGH_SCORE_KEY);
      if (raw === null) return 0;
      const parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    } catch {
      return 0;
    }
  }
}
