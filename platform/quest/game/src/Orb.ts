/**
 * Orb.ts — Individual orb entity: mesh, behaviour, and lifecycle.
 *
 * Each orb has a randomised tier that determines its colour, radius, and base
 * point value. Orbs drift slowly through space, wobble on a sine wave, pulse
 * in scale, and fade out in their final 1.5 s before expiring.
 *
 * Call {@link Orb.update} every frame and check {@link Orb.isAlive} to know
 * when to remove it from the scene. Call {@link Orb.collect} to mark it
 * as collected (plays a scale burst animation before removal).
 */

import * as THREE from 'three';
import { ORB_COLORS, ORB_POINTS, ORB_RADIUS, randomOrbTier } from './theme.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrbOptions {
  /** World-space spawn position. */
  position: THREE.Vector3;
  /** Initial velocity in metres/second. Randomised if omitted. */
  velocity?: THREE.Vector3;
  /** Lifetime in milliseconds before the orb expires. */
  lifetimeMs?: number;
}

// Animation constants
const WOBBLE_PERIOD = 800;     // ms per wobble cycle
const PULSE_PERIOD  = 400;     // ms per scale-pulse cycle
const FADE_START_MS = 1_500;   // ms before expiry when fade-out begins
const COLLECT_BURST_SCALE = 1.6; // scale burst on collection
const COLLECT_BURST_MS    = 150; // duration of burst animation (ms)

// ---------------------------------------------------------------------------
// Orb class
// ---------------------------------------------------------------------------

export class Orb {
  /** The Three.js mesh — add/remove this from the scene. */
  readonly mesh: THREE.Mesh;

  /** Tier index 0–4 (common → legendary). */
  readonly tier: number;

  /** Base point value for this orb (before combo/wave multipliers). */
  readonly points: number;

  private age = 0;
  private readonly lifetime: number;
  private alive = true;
  private collected = false;
  private collectAge = 0;
  private readonly velocity: THREE.Vector3;
  private readonly wobblePhase: number;

  constructor(options: OrbOptions) {
    this.tier    = randomOrbTier();
    this.points  = ORB_POINTS[this.tier];
    this.lifetime = options.lifetimeMs ?? 8_000;
    this.wobblePhase = Math.random() * Math.PI * 2;

    // Random drift velocity if not supplied
    this.velocity = options.velocity?.clone() ?? new THREE.Vector3(
      (Math.random() - 0.5) * 0.20,
      (Math.random() - 0.5) * 0.08,
      (Math.random() - 0.5) * 0.20,
    );

    const geometry = new THREE.SphereGeometry(ORB_RADIUS[this.tier], 20, 20);
    const material = new THREE.MeshStandardMaterial({
      color:             ORB_COLORS[this.tier],
      emissive:          ORB_COLORS[this.tier],
      emissiveIntensity: 0.45,
      roughness:         0.15,
      metalness:         0.80,
      transparent:       false,
      opacity:           1,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(options.position);
    // Store back-reference so raycasting can retrieve the Orb from the mesh
    this.mesh.userData['orb'] = this;
  }

  // ---------------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------------

  /**
   * Advance the orb simulation by one frame.
   *
   * @param deltaMs Elapsed real time since the last frame (ms).
   */
  update(deltaMs: number): void {
    if (!this.alive) return;

    if (this.collected) {
      this.updateCollectBurst(deltaMs);
      return;
    }

    this.age += deltaMs;

    if (this.age >= this.lifetime) {
      this.alive = false;
      return;
    }

    const dt = deltaMs / 1_000;

    // Drift
    this.mesh.position.addScaledVector(this.velocity, dt);

    // Vertical wobble
    this.mesh.position.y +=
      Math.sin(this.age / WOBBLE_PERIOD + this.wobblePhase) * 0.0006;

    // Scale pulse
    const pulse = 1 + 0.05 * Math.sin(this.age / PULSE_PERIOD + this.wobblePhase);
    this.mesh.scale.setScalar(pulse);

    // Fade-out in the last FADE_START_MS
    const timeLeft = this.lifetime - this.age;
    if (timeLeft < FADE_START_MS) {
      const mat = this.mesh.material as THREE.MeshStandardMaterial;
      mat.transparent = true;
      mat.opacity = timeLeft / FADE_START_MS;
    }
  }

  // ---------------------------------------------------------------------------
  // Collection
  // ---------------------------------------------------------------------------

  /**
   * Mark the orb as collected. Triggers a brief scale-burst animation then
   * marks the orb dead so it can be removed from the scene.
   */
  collect(): void {
    if (this.collected) return;
    this.collected = true;
    this.collectAge = 0;
    // Restore full opacity for the burst
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    mat.transparent = true;
    mat.opacity = 1;
    this.mesh.scale.setScalar(COLLECT_BURST_SCALE);
  }

  private updateCollectBurst(deltaMs: number): void {
    this.collectAge += deltaMs;
    const t = Math.min(this.collectAge / COLLECT_BURST_MS, 1);
    // Scale burst → shrink to zero
    const scale = COLLECT_BURST_SCALE * (1 - t);
    this.mesh.scale.setScalar(scale);
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    mat.opacity = 1 - t;
    if (t >= 1) this.alive = false;
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  /** `true` until the orb expires or its collection burst completes. */
  isAlive(): boolean {
    return this.alive;
  }

  /** `true` once {@link collect} has been called. */
  isCollected(): boolean {
    return this.collected;
  }

  /** Age in milliseconds since the orb was spawned. */
  getAge(): number {
    return this.age;
  }

  /** Dispose geometry and material to free GPU memory. */
  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
