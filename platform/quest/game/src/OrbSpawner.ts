/**
 * OrbSpawner.ts — Manages the spawn pool, lifecycle, and cleanup of orbs.
 *
 * Each frame, {@link OrbSpawner.update} is called with the current
 * {@link WaveConfig}. The spawner:
 *   1. Spawns a new orb if the spawn interval has elapsed and the pool is
 *      below the wave's `maxOrbs` cap.
 *   2. Advances every live orb's simulation.
 *   3. Removes and disposes orbs that have expired or been collected.
 *
 * Orbs are placed in a hemisphere around the player's head position at a
 * random radius (1.5–3 m) and height (0.5–2 m), with a gentle drift toward
 * the player's centre to keep them in reach.
 */

import * as THREE from 'three';
import { Orb, OrbOptions } from './Orb.js';
import { WaveConfig } from './WaveConfig.js';

export class OrbSpawner {
  private orbs: Orb[] = [];
  private timeSinceLastSpawn = 0;
  private active = false;

  /**
   * @param scene     The Three.js scene to add/remove orb meshes from.
   * @param playerRef Object whose world position is used as the spawn centre
   *                  (typically the XR camera or player rig).
   */
  constructor(
    private readonly scene: THREE.Scene,
    private readonly playerRef: THREE.Object3D,
  ) {}

  // ---------------------------------------------------------------------------
  // Control
  // ---------------------------------------------------------------------------

  /** Enable or disable spawning. When inactive, existing orbs still update. */
  setActive(val: boolean): void {
    this.active = val;
  }

  /** Remove and dispose all live orbs immediately (e.g. on round end). */
  clearAll(): void {
    for (const orb of this.orbs) {
      this.scene.remove(orb.mesh);
      orb.dispose();
    }
    this.orbs = [];
    this.timeSinceLastSpawn = 0;
  }

  // ---------------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------------

  /**
   * Advance the spawn pool one frame.
   *
   * @param deltaMs  Elapsed real time since last frame (ms).
   * @param config   Current wave configuration.
   */
  update(deltaMs: number, config: WaveConfig): void {
    // Spawn attempt
    if (this.active) {
      this.timeSinceLastSpawn += deltaMs;
      if (
        this.timeSinceLastSpawn >= config.spawnIntervalMs &&
        this.orbs.length < config.maxOrbs
      ) {
        this.spawnOrb(config);
        this.timeSinceLastSpawn = 0;
      }
    }

    // Update live orbs; collect dead ones for removal
    const dead: Orb[] = [];
    for (const orb of this.orbs) {
      orb.update(deltaMs);
      if (!orb.isAlive()) dead.push(orb);
    }

    for (const orb of dead) {
      this.scene.remove(orb.mesh);
      orb.dispose();
      this.orbs.splice(this.orbs.indexOf(orb), 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  /** Read-only view of currently live orbs (for raycasting). */
  getOrbs(): readonly Orb[] {
    return this.orbs;
  }

  /** Number of live orbs currently in the scene. */
  getCount(): number {
    return this.orbs.length;
  }

  // ---------------------------------------------------------------------------
  // Internal spawn logic
  // ---------------------------------------------------------------------------

  private spawnOrb(config: WaveConfig): void {
    const playerPos = new THREE.Vector3();
    this.playerRef.getWorldPosition(playerPos);

    const angle  = Math.random() * Math.PI * 2;
    const radius = 1.5 + Math.random() * 1.5;           // 1.5–3 m from player
    const height = 0.5 + Math.random() * 1.5;            // 0.5–2 m above floor

    const pos = new THREE.Vector3(
      playerPos.x + Math.cos(angle) * radius,
      playerPos.y + height,
      playerPos.z + Math.sin(angle) * radius,
    );

    // Gentle inward drift — keeps orbs drifting toward the player
    const inward = new THREE.Vector3()
      .subVectors(playerPos, pos)
      .normalize()
      .multiplyScalar(config.orbSpeedBase * 0.35);

    // Add a small tangential component for visual variety
    inward.x += (Math.random() - 0.5) * 0.05;
    inward.z += (Math.random() - 0.5) * 0.05;

    const options: OrbOptions = {
      position:   pos,
      velocity:   inward,
      lifetimeMs: config.orbLifetimeMs,
    };

    const orb = new Orb(options);
    this.orbs.push(orb);
    this.scene.add(orb.mesh);
  }
}
