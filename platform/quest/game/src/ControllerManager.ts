/**
 * ControllerManager.ts — XR controller input and orb hit detection.
 *
 * Sets up both Quest 3 controllers, renders a pointer ray from each, and
 * performs raycasting on every `selectstart` (trigger squeeze) event. A
 * successful hit calls the registered `onOrbCollected` callback.
 *
 * Controller model glTF assets are loaded via XRControllerModelFactory so
 * the correct Quest 3 model renders automatically inside the headset.
 */

import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { Orb } from './Orb.js';
import { OrbSpawner } from './OrbSpawner.js';
import { HapticManager } from './HapticManager.js';

// Ray visualisation style
const RAY_COLOR   = 0xffffff;
const RAY_OPACITY = 0.35;
const RAY_LENGTH  = 8;          // metres

export type OrbCollectedCallback = (orb: Orb) => void;

export class ControllerManager {
  /** Both XR target-ray spaces (index 0 = right, 1 = left on most headsets). */
  readonly controllers: THREE.XRTargetRaySpace[] = [];

  private readonly raycaster = new THREE.Raycaster();
  private readonly tempMatrix = new THREE.Matrix4();
  private onOrbCollected?: OrbCollectedCallback;

  /**
   * @param renderer  WebGL renderer (provides XR controller handles).
   * @param spawner   OrbSpawner whose live orbs are tested for intersection.
   * @param haptic    HapticManager for feedback on collect / miss.
   */
  constructor(
    renderer: THREE.WebGLRenderer,
    private readonly spawner: OrbSpawner,
    private readonly haptic: HapticManager,
  ) {
    const modelFactory = new XRControllerModelFactory();

    for (let i = 0; i < 2; i++) {
      // Target-ray space — used for raycasting and pointer rendering
      const ctrl = renderer.xr.getController(i);
      ctrl.addEventListener('selectstart', () => this.onSelectStart(ctrl));
      this.controllers.push(ctrl);

      // Grip space — hosts the visual controller model
      const grip = renderer.xr.getControllerGrip(i);
      grip.add(modelFactory.createControllerModel(grip));
      ctrl.add(grip);

      this.buildRay(ctrl);
    }
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  /** Add controller objects to the scene. Call once during scene initialisation. */
  addToScene(scene: THREE.Scene): void {
    for (const ctrl of this.controllers) {
      scene.add(ctrl);
    }
  }

  /** Register the callback invoked when a controller ray hits and collects an orb. */
  setOrbCollectedCallback(fn: OrbCollectedCallback): void {
    this.onOrbCollected = fn;
  }

  // ---------------------------------------------------------------------------
  // Hit detection
  // ---------------------------------------------------------------------------

  private onSelectStart(ctrl: THREE.XRTargetRaySpace): void {
    this.tempMatrix.identity().extractRotation(ctrl.matrixWorld);

    this.raycaster.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
    this.raycaster.ray.direction
      .set(0, 0, -1)
      .applyMatrix4(this.tempMatrix);

    const meshes = this.spawner.getOrbs()
      .filter(o => !o.isCollected())
      .map(o => o.mesh);

    const hits = this.raycaster.intersectObjects(meshes, false);

    if (hits.length > 0) {
      const orb = hits[0].object.userData['orb'] as Orb;
      orb.collect();
      this.haptic.collectOrb(orb.tier);
      this.onOrbCollected?.(orb);
    } else {
      this.haptic.miss();
    }
  }

  // ---------------------------------------------------------------------------
  // Ray visualisation
  // ---------------------------------------------------------------------------

  private buildRay(ctrl: THREE.XRTargetRaySpace): void {
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color:       RAY_COLOR,
      transparent: true,
      opacity:     RAY_OPACITY,
    });
    const line = new THREE.Line(geometry, material);
    line.name = 'ray';
    line.scale.z = RAY_LENGTH;
    ctrl.add(line);
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /** Remove all controller objects from the scene and free resources. */
  dispose(scene: THREE.Scene): void {
    for (const ctrl of this.controllers) {
      const ray = ctrl.getObjectByName('ray') as THREE.Line | undefined;
      if (ray) {
        ray.geometry.dispose();
        (ray.material as THREE.Material).dispose();
        ctrl.remove(ray);
      }
      scene.remove(ctrl);
    }
    this.controllers.length = 0;
  }
}
