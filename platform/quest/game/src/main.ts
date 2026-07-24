/**
 * main.ts — Entry point for the Orb Collector Meta Quest 3 game.
 *
 * Responsibilities:
 *   1. Create and configure the Three.js WebGL renderer with XR enabled.
 *   2. Inject the Three.js VRButton into the page.
 *   3. Handle window resize for the non-XR flat preview.
 *   4. Instantiate and start the Game.
 *
 * Everything else (scene, state machine, subsystems) lives in Game.ts.
 */

import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { Game } from './Game.js';

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({
  antialias:        true,
  alpha:            true,
  powerPreference:  'high-performance',
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping      = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = false;   // shadows off for VR perf

// Enable WebXR
renderer.xr.enabled = true;

// Inject canvas
document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------------------------
// VRButton
// ---------------------------------------------------------------------------

// VRButton.createButton returns an <a> element styled as a floating button.
// Three.js automatically requests an immersive-vr session when clicked.
document.body.appendChild(
  VRButton.createButton(renderer),
);

// ---------------------------------------------------------------------------
// Responsive resize (flat / browser preview only)
// ---------------------------------------------------------------------------

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Game bootstrap
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
new Game(renderer);
