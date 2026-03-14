// src/SceneManager.js
import * as THREE from 'three';

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
    document.body.appendChild(this.renderer.domElement);

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    this.renderer.setAnimationLoop(() => this._animate());
  }

  get canvas() {
    return this.renderer.domElement;
  }

  _animate() {
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
