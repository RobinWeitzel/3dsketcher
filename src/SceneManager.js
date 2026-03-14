// src/SceneManager.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x1a1a2e);
    this.renderer.domElement.style.touchAction = 'none';
    document.body.appendChild(this.renderer.domElement);

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.enableZoom = false; // Out of scope for MVP
    this.orbitControls.enabled = false; // Start disabled (draw mode)

    this._initGizmo();

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    this.renderer.setAnimationLoop(() => this._animate());
  }

  get canvas() {
    return this.renderer.domElement;
  }

  _initGizmo() {
    this.gizmoScene = new THREE.Scene();

    this.gizmoCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);

    // Size of the gizmo viewport in CSS pixels
    this.gizmoSize = 100;

    // Create axis lines: red=X, green=Y, blue=Z
    const axisLength = 0.8;
    const axes = [
      { dir: new THREE.Vector3(1, 0, 0), color: 0xff4444 }, // X - red
      { dir: new THREE.Vector3(0, 1, 0), color: 0x44ff44 }, // Y - green
      { dir: new THREE.Vector3(0, 0, 1), color: 0x4488ff }, // Z - blue
    ];

    for (const axis of axes) {
      const points = [
        new THREE.Vector3(0, 0, 0),
        axis.dir.clone().multiplyScalar(axisLength),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: axis.color, linewidth: 2 });
      this.gizmoScene.add(new THREE.Line(geometry, material));
    }
  }

  _animate() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // --- Render main scene at full viewport ---
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissor(0, 0, w, h);
    this.renderer.setScissorTest(false);
    this.orbitControls.update();
    this.renderer.render(this.scene, this.camera);

    // --- Render gizmo overlay in bottom-left corner ---
    // Position the gizmo camera to match the main camera's viewing direction
    this.gizmoCamera.position
      .copy(this.camera.position)
      .sub(this.orbitControls.target)
      .normalize()
      .multiplyScalar(3);
    this.gizmoCamera.lookAt(0, 0, 0);

    const gizmoPx = this.gizmoSize;
    // Bottom-left corner with a small margin
    const gizmoX = 10;
    const gizmoY = 10;

    this.renderer.autoClear = false;
    this.renderer.setViewport(gizmoX, gizmoY, gizmoPx, gizmoPx);
    this.renderer.setScissor(gizmoX, gizmoY, gizmoPx, gizmoPx);
    this.renderer.setScissorTest(true);
    this.renderer.clearDepth();
    this.renderer.render(this.gizmoScene, this.gizmoCamera);

    // Reset state
    this.renderer.setScissorTest(false);
    this.renderer.autoClear = true;
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
