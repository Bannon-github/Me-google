/**
 * HapticManager.ts — Controller haptic (vibration) feedback wrapper.
 *
 * Accesses vibration actuators through the WebXR input-source gamepad API.
 * Methods degrade gracefully when haptics are unsupported or the XR session
 * is inactive.
 */

import * as THREE from 'three';

export class HapticManager {
  /**
   * @param renderer The WebGL renderer whose XR session provides input sources.
   */
  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  // ---------------------------------------------------------------------------
  // Feedback presets
  // ---------------------------------------------------------------------------

  /**
   * Pulse all active controllers when an orb is collected.
   *
   * Higher-tier orbs produce a stronger, longer pulse.
   *
   * @param tier Orb tier index (0 = common … 4 = legendary).
   */
  collectOrb(tier: number): void {
    const intensity = Math.min(0.30 + tier * 0.15, 1.0);
    const duration  = 80 + tier * 40;   // 80 ms … 240 ms
    this.pulse(intensity, duration);
  }

  /** Short, weak pulse when the trigger fires and misses all orbs. */
  miss(): void {
    this.pulse(0.10, 50);
  }

  /** Gentle rumble at round start (countdown). */
  countdownBeat(): void {
    this.pulse(0.15, 60);
  }

  /** Strong double-pulse at game over. */
  gameOver(): void {
    this.pulse(0.70, 200);
    setTimeout(() => this.pulse(0.50, 150), 300);
  }

  // ---------------------------------------------------------------------------
  // Core pulse
  // ---------------------------------------------------------------------------

  /**
   * Fire a haptic pulse on every connected controller that supports it.
   *
   * @param intensity Normalised intensity in [0, 1].
   * @param durationMs Pulse duration in milliseconds.
   */
  pulse(intensity: number, durationMs: number): void {
    const session = this.renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
      const actuators = source.gamepad?.hapticActuators;
      if (actuators && actuators.length > 0) {
        // The WebXR Gamepads Module pulse() returns a Promise; we ignore it
        // intentionally — haptic failures should never surface to the user.
        void actuators[0].pulse(
          Math.max(0, Math.min(1, intensity)),
          Math.max(0, durationMs),
        );
      }
    }
  }
}
