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
    this.renderer.setClearColor(0xf0f0f0);
    this.renderer.domElement.style.touchAction = 'none';
    document.body.appendChild(this.renderer.domElement);

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.enableZoom = false;
    this.orbitControls.enabled = true;

    this._updateCallbacks = [];

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    this.renderer.setAnimationLoop(() => this._animate());
  }

  get canvas() {
    return this.renderer.domElement;
  }

  addUpdateCallback(fn) {
    this._updateCallbacks.push(fn);
  }

  _animate() {
    for (const cb of this._updateCallbacks) cb();
    this.orbitControls.update();
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
