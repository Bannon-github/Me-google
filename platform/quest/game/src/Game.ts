/**
 * Game.ts — Main game orchestrator and state machine.
 *
 * Manages the Three.js scene, WebXR session, animation loop, and all
 * subsystems (timer, score, spawner, controllers, HUD). The game state
 * machine drives the correct behaviour in each phase:
 *
 *   LOADING → MENU → PLAYING ↔ PAUSED → GAME_OVER → MENU
 *
 * Responsibilities
 * ----------------
 * - Build and own the Three.js Scene, PerspectiveCamera, and lighting.
 * - Wire subsystem callbacks (orb collected → score update → HUD refresh).
 * - Drive the XR animation loop via `renderer.setAnimationLoop`.
 * - Persist high scores via ScoreManager on game over.
 */

import * as THREE from 'three';
import { ScoreManager } from './ScoreManager.js';
import { GameTimer } from './GameTimer.js';
import { OrbSpawner } from './OrbSpawner.js';
import { ControllerManager } from './ControllerManager.js';
import { HapticManager } from './HapticManager.js';
import { HUDManager } from './HUDManager.js';
import { Orb } from './Orb.js';
import { getWaveForScore } from './WaveConfig.js';
import {
  SurfaceColors, FOG_COLOR, AMBIENT_COLOR, FILL_COLOR,
} from './theme.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export enum GameState {
  LOADING   = 'LOADING',
  MENU      = 'MENU',
  PLAYING   = 'PLAYING',
  PAUSED    = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
}

const ROUND_DURATION_MS = 60_000;

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

export class Game {
  // Three.js core
  private readonly scene    = new THREE.Scene();
  private readonly camera   = new THREE.PerspectiveCamera(75, 1, 0.1, 50);
  private readonly clock    = new THREE.Clock();

  // Subsystems
  private readonly score      = new ScoreManager();
  private readonly timer      = new GameTimer(ROUND_DURATION_MS);
  private readonly haptic     : HapticManager;
  private readonly spawner    : OrbSpawner;
  private readonly controllers: ControllerManager;
  private readonly hud        : HUDManager;

  // State
  private state: GameState = GameState.LOADING;
  private menuGroup?: THREE.Group;
  private gameOverGroup?: THREE.Group;

  /**
   * @param renderer An XR-enabled WebGL renderer (created in `main.ts`).
   */
  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.buildScene();

    this.haptic      = new HapticManager(renderer);
    this.spawner     = new OrbSpawner(this.scene, this.camera);
    this.controllers = new ControllerManager(renderer, this.spawner, this.haptic);
    this.hud         = new HUDManager();

    this.controllers.addToScene(this.scene);
    this.hud.addToScene(this.scene);

    this.controllers.setOrbCollectedCallback((orb: Orb) => this.onOrbCollected(orb));

    // Grip squeeze toggles pause / resume during a round
    for (const ctrl of this.controllers.controllers) {
      ctrl.addEventListener('squeezestart', () => {
        if (this.state === GameState.PLAYING) this.pauseRound();
        else if (this.state === GameState.PAUSED) this.resumeRound();
      });
    }

    // Enter MENU when XR session starts
    renderer.xr.addEventListener('sessionstart', () => this.enterMenu());
    // Return to flat view when XR session ends
    renderer.xr.addEventListener('sessionend',   () => this.enterMenu());

    // Start animation loop
    renderer.setAnimationLoop(() => this.loop());

    this.state = GameState.MENU;
  }

  // ---------------------------------------------------------------------------
  // State transitions
  // ---------------------------------------------------------------------------

  private enterMenu(): void {
    this.state = GameState.MENU;
    this.timer.reset();
    this.score.reset();
    this.spawner.clearAll();
    this.spawner.setActive(false);
    this.removeGameOverPanel();
    this.showMenuPanel();
    this.hud.updateScore(0, 1, 1);
    this.hud.updateTimer(ROUND_DURATION_MS, ROUND_DURATION_MS);
  }

  private startRound(): void {
    this.state = GameState.PLAYING;
    this.removeMenuPanel();
    this.score.reset();
    this.timer.reset();
    this.timer.start();
    this.spawner.clearAll();
    this.spawner.setActive(true);
    this.haptic.countdownBeat();
  }

  private pauseRound(): void {
    if (this.state !== GameState.PLAYING) return;
    this.state = GameState.PAUSED;
    this.timer.pause();
    this.spawner.setActive(false);
  }

  private resumeRound(): void {
    if (this.state !== GameState.PAUSED) return;
    this.state = GameState.PLAYING;
    this.timer.start();
    this.spawner.setActive(true);
  }

  private endRound(): void {
    this.state = GameState.GAME_OVER;
    this.timer.pause();
    this.spawner.setActive(false);
    this.score.saveHighScore();
    this.haptic.gameOver();
    this.showGameOverPanel();
  }

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  private loop(): void {
    const delta = this.clock.getDelta() * 1_000; // ms

    if (this.state === GameState.PLAYING) {
      this.score.tick(delta);
      this.timer.tick(delta);

      const wave = getWaveForScore(this.score.getScore());
      this.spawner.update(delta, wave);

      this.hud.updateScore(this.score.getScore(), this.score.getCombo(), wave.wave);
      this.hud.updateTimer(this.timer.getRemainingMs(), ROUND_DURATION_MS);

      if (this.timer.isExpired()) this.endRound();
    } else if (this.state === GameState.PAUSED) {
      // Orbs continue their existing motion but no new spawns
      const wave = getWaveForScore(this.score.getScore());
      this.spawner.update(delta, wave);
    }

    this.hud.updateFrame(this.camera);
    this.renderer.render(this.scene, this.camera);
  }

  // ---------------------------------------------------------------------------
  // Orb collected callback
  // ---------------------------------------------------------------------------

  private onOrbCollected(orb: Orb): void {
    if (this.state !== GameState.PLAYING) return;
    const wave = getWaveForScore(this.score.getScore());
    this.score.addPoints(orb.points, wave.scoreMultiplier);
    this.hud.updateScore(this.score.getScore(), this.score.getCombo(), wave.wave);
  }

  // ---------------------------------------------------------------------------
  // Scene construction
  // ---------------------------------------------------------------------------

  private buildScene(): void {
    this.scene.background = SurfaceColors.sunken.clone();
    this.scene.fog = new THREE.FogExp2(FOG_COLOR.getHex(), 0.06);

    // Ambient fill
    const ambient = new THREE.AmbientLight(AMBIENT_COLOR.getHex(), 8);
    this.scene.add(ambient);

    // Directional fill (top-right, blue-violet)
    const fill = new THREE.DirectionalLight(FILL_COLOR.getHex(), 6);
    fill.position.set(3, 5, 2);
    this.scene.add(fill);

    // Subtle point lights for environment depth
    const pl1 = new THREE.PointLight(0x7B5CFF, 3, 8);
    pl1.position.set(-3, 2, -3);
    this.scene.add(pl1);

    const pl2 = new THREE.PointLight(0x00D4FF, 2, 6);
    pl2.position.set(3, 1, 3);
    this.scene.add(pl2);

    // Floor grid (orientation reference in VR)
    const gridHelper = new THREE.GridHelper(20, 20, 0x1E2536, 0x151A26);
    gridHelper.position.y = -1.6;   // approximate floor under the player
    this.scene.add(gridHelper);
  }

  // ---------------------------------------------------------------------------
  // Menu panel (spatial billboard)
  // ---------------------------------------------------------------------------

  private showMenuPanel(): void {
    if (this.menuGroup) return;
    this.menuGroup = this.buildBillboard(
      ['ORB COLLECTOR', '', 'Aim your controller', 'Squeeze trigger to START', '', `High Score: ${this.score.loadHighScore()}`],
      [0x7B5CFF,        0,   0xE8EAF0,             0x00E5A0,                   0,  0xFFB800],
      [1.8, 0.4, -1.8],   // position relative to scene origin (VR floor level)
    );

    // Start on first trigger pull from either controller
    this.controllers.setOrbCollectedCallback(() => { /* no-op until playing */ });
    for (const ctrl of this.controllers.controllers) {
      const existing = ctrl.userData['menuSelectHandler'] as (() => void) | undefined;
      if (existing) ctrl.removeEventListener('selectstart', existing);

      const handler = (): void => {
        if (this.state === GameState.MENU) {
          this.startRound();
          // Restore normal orb-collected callback
          this.controllers.setOrbCollectedCallback((orb: Orb) => this.onOrbCollected(orb));
        } else if (this.state === GameState.GAME_OVER) {
          this.enterMenu();
        }
      };
      ctrl.userData['menuSelectHandler'] = handler;
      ctrl.addEventListener('selectstart', handler);
    }

    this.scene.add(this.menuGroup);
  }

  private removeMenuPanel(): void {
    if (!this.menuGroup) return;
    this.scene.remove(this.menuGroup);
    this.menuGroup.children.forEach(c => {
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      }
    });
    this.menuGroup = undefined;
  }

  // ---------------------------------------------------------------------------
  // Game over panel
  // ---------------------------------------------------------------------------

  private showGameOverPanel(): void {
    const high = this.score.loadHighScore();
    const isNew = this.score.getScore() >= high;
    this.gameOverGroup = this.buildBillboard(
      [
        'GAME OVER',
        '',
        `Score: ${this.score.getScore()}`,
        isNew ? '★ NEW HIGH SCORE ★' : `Best: ${high}`,
        '',
        'Pull trigger to play again',
      ],
      [0xFF4D6D, 0, 0xE8EAF0, isNew ? 0xFFB800 : 0x8B9BC0, 0, 0x00E5A0],
      [1.8, 0.4, -1.8],
    );
    this.scene.add(this.gameOverGroup);
  }

  private removeGameOverPanel(): void {
    if (!this.gameOverGroup) return;
    this.scene.remove(this.gameOverGroup);
    this.gameOverGroup.children.forEach(c => {
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      }
    });
    this.gameOverGroup = undefined;
  }

  // ---------------------------------------------------------------------------
  // Generic spatial text billboard helper
  // ---------------------------------------------------------------------------

  private buildBillboard(
    lines: string[],
    colors: number[],
    position: [number, number, number],
  ): THREE.Group {
    const group     = new THREE.Group();
    const canvasW   = 640;
    const canvasH   = 64 * (lines.length + 1);
    const canvas    = document.createElement('canvas');
    canvas.width    = canvasW;
    canvas.height   = canvasH;
    const ctx       = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(11,14,22,0.88)';
    this.roundRectCanvas(ctx, 8, 8, canvasW - 16, canvasH - 16, 20);
    ctx.fill();

    lines.forEach((line, i) => {
      if (!line) return;
      const hex = '#' + (colors[i] ?? 0xE8EAF0).toString(16).padStart(6, '0');
      ctx.fillStyle  = hex;
      ctx.font       = i === 0 ? 'bold 52px monospace' : '36px system-ui';
      ctx.textAlign  = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(line, canvasW / 2, 48 + i * 62);
    });

    const tex  = new THREE.CanvasTexture(canvas);
    const geo  = new THREE.PlaneGeometry(1.2, 1.2 * (canvasH / canvasW));
    const mat  = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...position);
    group.add(mesh);
    return group;
  }

  private roundRectCanvas(
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
