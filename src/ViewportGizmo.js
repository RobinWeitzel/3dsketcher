// src/ViewportGizmo.js
import * as THREE from 'three';

const SIZE = 120;
const AXIS_LENGTH = 0.8;
const LABEL_OFFSET = 1.0;

export class ViewportGizmo {
  constructor(mainCamera, orbitControls) {
    this.mainCamera = mainCamera;
    this.orbitControls = orbitControls;
    this._animating = false;

    // Create overlay canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIZE * window.devicePixelRatio;
    this.canvas.height = SIZE * window.devicePixelRatio;
    this.canvas.style.cssText = `
      position: fixed;
      top: 12px;
      right: 12px;
      width: ${SIZE}px;
      height: ${SIZE}px;
      z-index: 100;
      cursor: pointer;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.3);
      touch-action: none;
    `;
    document.body.appendChild(this.canvas);

    // Secondary scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 10);
    this.camera.position.set(0, 0, 3);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(SIZE, SIZE);
    this.renderer.setClearColor(0x000000, 0);

    this._createAxes();
    this._createLabels();

    // Click to snap camera
    this.canvas.addEventListener('pointerdown', (e) => this._onClick(e));
  }

  _createAxes() {
    // X axis (red)
    const xGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(AXIS_LENGTH, 0, 0),
    ]);
    this.scene.add(new THREE.Line(xGeo, new THREE.LineBasicMaterial({ color: 0xff4444, linewidth: 2 })));

    // Y axis (green)
    const yGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, AXIS_LENGTH, 0),
    ]);
    this.scene.add(new THREE.Line(yGeo, new THREE.LineBasicMaterial({ color: 0x44cc44, linewidth: 2 })));

    // Z axis (blue)
    const zGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, AXIS_LENGTH),
    ]);
    this.scene.add(new THREE.Line(zGeo, new THREE.LineBasicMaterial({ color: 0x4444ff, linewidth: 2 })));

    // Axis endpoint spheres
    const sphereGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const xSphere = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0xff4444 }));
    xSphere.position.set(AXIS_LENGTH, 0, 0);
    this.scene.add(xSphere);

    const ySphere = new THREE.Mesh(sphereGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x44cc44 }));
    ySphere.position.set(0, AXIS_LENGTH, 0);
    this.scene.add(ySphere);

    const zSphere = new THREE.Mesh(sphereGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x4444ff }));
    zSphere.position.set(0, 0, AXIS_LENGTH);
    this.scene.add(zSphere);
  }

  _createLabels() {
    this._labels = [];
    const labelData = [
      { text: 'X', color: '#ff4444', pos: new THREE.Vector3(LABEL_OFFSET, 0, 0) },
      { text: 'Y', color: '#44cc44', pos: new THREE.Vector3(0, LABEL_OFFSET, 0) },
      { text: 'Z', color: '#4444ff', pos: new THREE.Vector3(0, 0, LABEL_OFFSET) },
    ];

    for (const ld of labelData) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = ld.color;
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ld.text, 32, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.4, 0.4, 1);
      sprite.position.copy(ld.pos);
      this.scene.add(sprite);
      this._labels.push(sprite);
    }
  }

  _onClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const views = [
      { dir: new THREE.Vector3(0, 0, 1), label: 'Front' },
      { dir: new THREE.Vector3(0, 1, 0), label: 'Top' },
      { dir: new THREE.Vector3(1, 0, 0), label: 'Right' },
      { dir: new THREE.Vector3(0, -1, 0), label: 'Bottom' },
      { dir: new THREE.Vector3(-1, 0, 0), label: 'Left' },
      { dir: new THREE.Vector3(0, 0, -1), label: 'Back' },
    ];

    let closestView = null;
    let closestDist = Infinity;

    for (const view of views) {
      const screenPos = view.dir.clone().project(this.camera);
      const dx = screenPos.x - x;
      const dy = screenPos.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist && dist < 0.8) {
        closestDist = dist;
        closestView = view;
      }
    }

    if (closestView) {
      this._animateToView(closestView.dir);
    }
  }

  _animateToView(direction) {
    if (this._animating) return;
    this._animating = true;

    const target = this.orbitControls.target.clone();
    const distance = this.mainCamera.position.distanceTo(target);
    const endPos = target.clone().addScaledVector(direction, distance);

    const startPos = this.mainCamera.position.clone();
    const startTime = performance.now();
    const duration = 400;

    const animate = () => {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      const eased = t * (2 - t);
      this.mainCamera.position.lerpVectors(startPos, endPos, eased);
      this.mainCamera.lookAt(target);
      this.orbitControls.update();

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this._animating = false;
      }
    };

    requestAnimationFrame(animate);
  }

  update() {
    const dir = new THREE.Vector3();
    this.mainCamera.getWorldDirection(dir);
    this.camera.position.copy(dir.multiplyScalar(-3));
    this.camera.lookAt(0, 0, 0);
    this.camera.up.copy(this.mainCamera.up);

    this.renderer.render(this.scene, this.camera);
  }
}
