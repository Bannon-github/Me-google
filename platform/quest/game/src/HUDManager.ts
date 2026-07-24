/**
 * HUDManager.ts — Spatial floating HUD panels rendered as canvas textures.
 *
 * Two panels are created:
 *   - Score panel (left of centre): score, combo, wave
 *   - Timer panel (right of centre): countdown seconds, progress arc
 *
 * Panels are parented to a group that is repositioned each frame to stay
 * 1.8 m in front of the camera and slightly below eye level, always facing
 * the player.
 *
 * Canvas textures allow arbitrary 2D drawing without depending on DOM
 * text layout, which is unavailable in the VR context.
 */

import * as THREE from 'three';
import { AccentColors, SurfaceColors } from './theme.js';

// ---------------------------------------------------------------------------
// Canvas panel constants
// ---------------------------------------------------------------------------

const PANEL_WIDTH_PX  = 512;
const PANEL_HEIGHT_PX = 200;
const PANEL_WIDTH_M   = 0.50;   // physical width in metres
const PANEL_HEIGHT_M  = PANEL_WIDTH_M * (PANEL_HEIGHT_PX / PANEL_WIDTH_PX);
const HUD_DISTANCE_M  = 1.80;   // metres in front of camera
const HUD_Y_OFFSET_M  = -0.30;  // metres below camera centre
const PANEL_SPACING_M = 0.28;   // horizontal spacing from centre

// ---------------------------------------------------------------------------
// HUDManager
// ---------------------------------------------------------------------------

export class HUDManager {
  private readonly group = new THREE.Group();

  // Score panel
  private readonly scoreCanvas: HTMLCanvasElement;
  private readonly scoreTex: THREE.CanvasTexture;
  private readonly scoreMesh: THREE.Mesh;

  // Timer panel
  private readonly timerCanvas: HTMLCanvasElement;
  private readonly timerTex: THREE.CanvasTexture;
  private readonly timerMesh: THREE.Mesh;

  constructor() {
    // Score panel
    this.scoreCanvas = this.makeCanvas();
    this.scoreTex    = new THREE.CanvasTexture(this.scoreCanvas);
    this.scoreMesh   = this.makePanel(this.scoreTex, -PANEL_SPACING_M);

    // Timer panel
    this.timerCanvas = this.makeCanvas();
    this.timerTex    = new THREE.CanvasTexture(this.timerCanvas);
    this.timerMesh   = this.makePanel(this.timerTex, PANEL_SPACING_M);

    this.group.add(this.scoreMesh, this.timerMesh);
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  /** Attach the HUD group to the scene. */
  addToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }

  // ---------------------------------------------------------------------------
  // Updates called by Game each frame
  // ---------------------------------------------------------------------------

  /** Refresh the score panel. */
  updateScore(score: number, combo: number, wave: number): void {
    const ctx = this.scoreCanvas.getContext('2d')!;
    this.clearPanel(ctx);

    // Score value
    ctx.fillStyle = AccentColors.primary.getStyle();
    ctx.font = 'bold 80px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(score.toLocaleString(), PANEL_WIDTH_PX / 2, 100);

    // Labels
    ctx.fillStyle = '#8B9BC0';
    ctx.font = '28px system-ui';
    ctx.fillText('SCORE', PANEL_WIDTH_PX / 2, 145);

    // Wave badge
    ctx.fillStyle = AccentColors.secondary.getStyle();
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`WAVE ${wave}`, 20, 185);

    // Combo badge
    if (combo > 1) {
      ctx.fillStyle = AccentColors.warning.getStyle();
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${combo}× COMBO`, PANEL_WIDTH_PX - 20, 185);
    }

    this.scoreTex.needsUpdate = true;
  }

  /** Refresh the timer panel. */
  updateTimer(remainingMs: number, durationMs: number): void {
    const ctx = this.timerCanvas.getContext('2d')!;
    this.clearPanel(ctx);

    const secs = Math.ceil(remainingMs / 1000);
    const progress = 1 - remainingMs / durationMs; // 0→1

    // Arc background
    const cx = PANEL_WIDTH_PX / 2;
    const cy = 95;
    const r  = 70;
    ctx.strokeStyle = SurfaceColors.overlay.getStyle();
    ctx.lineWidth   = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Arc foreground (remaining time)
    const timerColor = secs <= 10
      ? AccentColors.danger.getStyle()
      : AccentColors.success.getStyle();
    ctx.strokeStyle = timerColor;
    ctx.lineWidth   = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (1 - progress) * Math.PI * 2);
    ctx.stroke();

    // Seconds value
    ctx.fillStyle = timerColor;
    ctx.font = 'bold 68px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(secs), cx, cy);

    // Label
    ctx.fillStyle = '#8B9BC0';
    ctx.font = '28px system-ui';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('TIME', cx, 175);

    this.timerTex.needsUpdate = true;
  }

  /**
   * Reposition the HUD group to float in front of the camera.
   * Call every frame before rendering.
   */
  updateFrame(camera: THREE.Camera): void {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    this.group.position
      .copy(camera.position)
      .addScaledVector(forward, HUD_DISTANCE_M);
    this.group.position.y += HUD_Y_OFFSET_M;
    this.group.lookAt(camera.position);
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /** Dispose GPU resources. */
  dispose(): void {
    [this.scoreMesh, this.timerMesh].forEach(mesh => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.scoreTex.dispose();
    this.timerTex.dispose();
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private makeCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width  = PANEL_WIDTH_PX;
    c.height = PANEL_HEIGHT_PX;
    return c;
  }

  private makePanel(texture: THREE.CanvasTexture, xOffset: number): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(PANEL_WIDTH_M, PANEL_HEIGHT_M);
    const mat = new THREE.MeshBasicMaterial({
      map:         texture,
      transparent: true,
      depthWrite:  false,
      side:        THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.x = xOffset;
    return mesh;
  }

  private clearPanel(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, PANEL_WIDTH_PX, PANEL_HEIGHT_PX);
    // Semi-transparent panel background
    ctx.fillStyle = 'rgba(11,14,22,0.82)';
    this.roundRect(ctx, 4, 4, PANEL_WIDTH_PX - 8, PANEL_HEIGHT_PX - 8, 16);
    ctx.fill();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
