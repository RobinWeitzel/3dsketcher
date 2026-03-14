// src/RotationCube.js
import * as THREE from 'three';

// Face definitions
// Three.js BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
// quat: quaternion that rotates the cube so the clicked face ends up facing the cube camera (+Z)
// normal: the world-space direction this face points in (used for camera snap)
const FACE_DEFS = [
  { label: 'Right',  color: '#ff8844', quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2), normal: new THREE.Vector3(1, 0, 0) },
  { label: 'Left',   color: '#dd4444', quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2),  normal: new THREE.Vector3(-1, 0, 0) },
  { label: 'Top',    color: '#44bb44', quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2),  normal: new THREE.Vector3(0, 1, 0) },
  { label: 'Bottom', color: '#228822', quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), normal: new THREE.Vector3(0, -1, 0) },
  { label: 'Front',  color: '#4488ff', quat: new THREE.Quaternion(), normal: new THREE.Vector3(0, 0, 1) },
  { label: 'Back',   color: '#88bbff', quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI),      normal: new THREE.Vector3(0, 0, -1) },
];

const DRAG_THRESHOLD = 5;
const ROTATION_SENSITIVITY = 0.01;
const EDGE_THRESHOLD = 0.15;
const CUBE_SIZE = 150;

const _yAxis = new THREE.Vector3(0, 1, 0);
const _offset = new THREE.Vector3();
const _right = new THREE.Vector3();
const _yawQuat = new THREE.Quaternion();
const _pitchQuat = new THREE.Quaternion();

export class RotationCube {
  constructor(drawingPlane, rotationController, modeController, orbitControls, mainCamera) {
    this.drawingPlane = drawingPlane;
    this.rotationController = rotationController;
    this.modeController = modeController;
    this.orbitControls = orbitControls;
    this.mainCamera = mainCamera;

    this._isDragging = false;
    this._startPos = null;
    this._totalDrag = 0;
    this._hitFaceIndex = null;
    this._hitUV = null;

    this._setupRenderer();
    this._createCube();
    this._bindEvents();
    this._animate();
  }

  _setupRenderer() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CUBE_SIZE * window.devicePixelRatio;
    this.canvas.height = CUBE_SIZE * window.devicePixelRatio;
    this.canvas.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: ${CUBE_SIZE}px;
      height: ${CUBE_SIZE}px;
      z-index: 100;
      touch-action: none;
      pointer-events: auto;
      cursor: grab;
    `;
    document.body.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(CUBE_SIZE, CUBE_SIZE);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    this.camera.position.set(0, 0, 3);
    this.camera.lookAt(0, 0, 0);

    this.raycaster = new THREE.Raycaster();
  }

  _createFaceTexture(label, color) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, size - 3, size - 3);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  _createCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const materials = FACE_DEFS.map(def =>
      new THREE.MeshBasicMaterial({ map: this._createFaceTexture(def.label, def.color) })
    );
    this.cube = new THREE.Mesh(geometry, materials);
    this.scene.add(this.cube);
  }

  _bindEvents() {
    this.canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this._onPointerUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this._onPointerUp(e));
  }

  _getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  _getNDC(e) {
    const rect = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  _onPointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    this.canvas.setPointerCapture(e.pointerId);

    this._isDragging = true;
    this._startPos = this._getCanvasCoords(e);
    this._prevPos = { ...this._startPos };
    this._totalDrag = 0;

    const ndc = this._getNDC(e);
    this.raycaster.setFromCamera(ndc, this.camera);
    const intersects = this.raycaster.intersectObject(this.cube);
    if (intersects.length > 0) {
      this._hitFaceIndex = intersects[0].face.materialIndex;
      this._hitUV = intersects[0].uv ? intersects[0].uv.clone() : null;
    } else {
      this._hitFaceIndex = null;
      this._hitUV = null;
    }

    this.canvas.style.cursor = 'grabbing';
  }

  _onPointerMove(e) {
    if (!this._isDragging) return;
    e.preventDefault();
    e.stopPropagation();

    const pos = this._getCanvasCoords(e);
    const dx = pos.x - this._prevPos.x;
    const dy = pos.y - this._prevPos.y;
    this._totalDrag += Math.abs(dx) + Math.abs(dy);
    this._prevPos = pos;

    if (this._totalDrag >= DRAG_THRESHOLD) {
      if (this.modeController.mode === 'plane') {
        // Plane mode: rotate the drawing plane
        this.rotationController.applyRotation(
          this.drawingPlane.group,
          dx * ROTATION_SENSITIVITY,
          -dy * ROTATION_SENSITIVITY,
          0
        );
      } else {
        // Camera mode: orbit the camera around the target
        _offset.copy(this.mainCamera.position).sub(this.orbitControls.target);

        // Yaw around world Y
        _yawQuat.setFromAxisAngle(_yAxis, -dx * ROTATION_SENSITIVITY);
        _offset.applyQuaternion(_yawQuat);

        // Pitch around camera's right vector
        _right.set(1, 0, 0).applyQuaternion(this.mainCamera.quaternion);
        _pitchQuat.setFromAxisAngle(_right, dy * ROTATION_SENSITIVITY);
        _offset.applyQuaternion(_pitchQuat);

        this.mainCamera.position.copy(this.orbitControls.target).add(_offset);
        this.mainCamera.lookAt(this.orbitControls.target);
      }
    }
  }

  _onPointerUp(e) {
    if (!this._isDragging) return;
    e.preventDefault();
    e.stopPropagation();

    this._isDragging = false;
    this.canvas.style.cursor = 'grab';

    if (this._totalDrag < DRAG_THRESHOLD && this._hitFaceIndex !== null) {
      this._handleTap(this._hitFaceIndex, this._hitUV);
    }
  }

  _handleTap(faceIndex, uv) {
    const faceDef = FACE_DEFS[faceIndex];

    if (this.modeController.mode === 'plane') {
      // Plane mode: snap drawing plane orientation
      if (uv && this._isNearEdge(uv)) {
        const adjacentIndex = this._getAdjacentFace(faceIndex, uv);
        if (adjacentIndex !== null) {
          const adjacentDef = FACE_DEFS[adjacentIndex];
          const midQuat = new THREE.Quaternion();
          midQuat.slerpQuaternions(faceDef.quat, adjacentDef.quat, 0.5);
          this.drawingPlane.group.quaternion.copy(midQuat);
          this.rotationController.reset(this.drawingPlane.group);
          this.drawingPlane.group.quaternion.copy(midQuat);
          return;
        }
      }

      this.drawingPlane.group.quaternion.copy(faceDef.quat);
      this.rotationController.reset(this.drawingPlane.group);
      this.drawingPlane.group.quaternion.copy(faceDef.quat);
    } else {
      // Camera mode: snap camera to look from face direction
      const distance = this.mainCamera.position.distanceTo(this.orbitControls.target);

      if (uv && this._isNearEdge(uv)) {
        const adjacentIndex = this._getAdjacentFace(faceIndex, uv);
        if (adjacentIndex !== null) {
          const adjacentDef = FACE_DEFS[adjacentIndex];
          const midDir = new THREE.Vector3().addVectors(faceDef.normal, adjacentDef.normal).normalize();
          this.mainCamera.position.copy(this.orbitControls.target).addScaledVector(midDir, distance);
          this.mainCamera.lookAt(this.orbitControls.target);
          return;
        }
      }

      this.mainCamera.position.copy(this.orbitControls.target).addScaledVector(faceDef.normal, distance);
      this.mainCamera.lookAt(this.orbitControls.target);
    }
  }

  _isNearEdge(uv) {
    return uv.x < EDGE_THRESHOLD || uv.x > (1 - EDGE_THRESHOLD) ||
           uv.y < EDGE_THRESHOLD || uv.y > (1 - EDGE_THRESHOLD);
  }

  _getAdjacentFace(faceIndex, uv) {
    const edges = [];
    if (uv.x < EDGE_THRESHOLD) edges.push('left');
    if (uv.x > 1 - EDGE_THRESHOLD) edges.push('right');
    if (uv.y < EDGE_THRESHOLD) edges.push('bottom');
    if (uv.y > 1 - EDGE_THRESHOLD) edges.push('top');

    const edge = edges[0];
    if (!edge) return null;

    const adjacency = {
      0: { left: 4, right: 5, top: 2, bottom: 3 },
      1: { left: 5, right: 4, top: 2, bottom: 3 },
      2: { left: 1, right: 0, top: 5, bottom: 4 },
      3: { left: 1, right: 0, top: 4, bottom: 5 },
      4: { left: 1, right: 0, top: 2, bottom: 3 },
      5: { left: 0, right: 1, top: 2, bottom: 3 },
    };

    return adjacency[faceIndex]?.[edge] ?? null;
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    if (this.modeController.mode === 'plane') {
      // Plane mode: cube syncs to drawing plane orientation
      this.cube.quaternion.copy(this.drawingPlane.group.quaternion);
    } else {
      // Camera mode: cube shows scene from camera's perspective
      this.cube.quaternion.copy(this.mainCamera.quaternion).invert();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
