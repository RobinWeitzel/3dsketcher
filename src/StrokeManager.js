// src/StrokeManager.js
import * as THREE from 'three';

const STROKE_COLOR = new THREE.Color(0x222222);
const MAX_POINTS_PER_STROKE = 10000;

const VERTEX_SHADER = `
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform vec3 uPlaneNormal;
  uniform vec3 uPlanePoint;
  uniform vec3 uCameraPosition;

  varying vec3 vWorldPos;

  void main() {
    float cameraSide = dot(uCameraPosition - uPlanePoint, uPlaneNormal);
    float fragSide = dot(vWorldPos - uPlanePoint, uPlaneNormal);
    float alpha = (cameraSide * fragSide > 0.0) ? 1.0 : 0.2;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export class StrokeManager {
  constructor(scene, drawingPlane, camera) {
    this.scene = scene;
    this.drawingPlane = drawingPlane;
    this.camera = camera;

    this.strokes = [];
    this.undoStack = [];
    this.redoStack = [];
    this.currentStroke = null;
    this.currentPointCount = 0;

    // Shared uniforms — all stroke materials reference these same objects
    this.sharedUniforms = {
      uColor: { value: STROKE_COLOR },
      uPlaneNormal: { value: new THREE.Vector3(0, 1, 0) },
      uPlanePoint: { value: new THREE.Vector3(0, 0, 0) },
      uCameraPosition: { value: new THREE.Vector3(0, 5, 10) },
    };
  }

  // Call once per frame to keep shader uniforms in sync
  updateUniforms() {
    this.sharedUniforms.uPlaneNormal.value.copy(this.drawingPlane.getNormal());
    this.sharedUniforms.uPlanePoint.value.copy(this.drawingPlane.group.position);
    this.sharedUniforms.uCameraPosition.value.copy(this.camera.position);
  }

  _createMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: this.sharedUniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
    });
  }

  beginStroke(point) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_POINTS_PER_STROKE * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);

    const material = this._createMaterial();
    this.currentStroke = new THREE.Line(geometry, material);
    this.currentPointCount = 0;
    this.scene.add(this.currentStroke);

    this.addPoint(point);
  }

  addPoint(point) {
    if (!this.currentStroke) return;
    if (this.currentPointCount >= MAX_POINTS_PER_STROKE) return;

    const positions = this.currentStroke.geometry.attributes.position.array;
    const i = this.currentPointCount * 3;
    positions[i] = point.x;
    positions[i + 1] = point.y;
    positions[i + 2] = point.z;

    this.currentPointCount++;
    this.currentStroke.geometry.setDrawRange(0, this.currentPointCount);
    this.currentStroke.geometry.attributes.position.needsUpdate = true;
  }

  endStroke() {
    if (!this.currentStroke) return;
    if (this.currentPointCount < 2) {
      this.scene.remove(this.currentStroke);
      this.currentStroke.geometry.dispose();
      this.currentStroke.material.dispose();
      this.currentStroke = null;
      return;
    }

    const positions = this.currentStroke.geometry.attributes.position.array;
    const trimmed = new Float32Array(this.currentPointCount * 3);
    trimmed.set(positions.subarray(0, this.currentPointCount * 3));
    this.currentStroke.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(trimmed, 3)
    );
    this.currentStroke.geometry.setDrawRange(0, this.currentPointCount);

    this.strokes.push(this.currentStroke);
    this.undoStack.push({ type: 'add', stroke: this.currentStroke });
    this.redoStack = [];
    this.currentStroke = null;
  }

  removeStroke(stroke) {
    const index = this.strokes.indexOf(stroke);
    if (index === -1) return;

    this.strokes.splice(index, 1);
    this.scene.remove(stroke);
    this.undoStack.push({ type: 'remove', stroke });
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const action = this.undoStack.pop();

    if (action.type === 'add') {
      const index = this.strokes.indexOf(action.stroke);
      if (index !== -1) this.strokes.splice(index, 1);
      this.scene.remove(action.stroke);
    } else if (action.type === 'remove') {
      this.strokes.push(action.stroke);
      this.scene.add(action.stroke);
    }

    this.redoStack.push(action);
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const action = this.redoStack.pop();

    if (action.type === 'add') {
      this.strokes.push(action.stroke);
      this.scene.add(action.stroke);
    } else if (action.type === 'remove') {
      const index = this.strokes.indexOf(action.stroke);
      if (index !== -1) this.strokes.splice(index, 1);
      this.scene.remove(action.stroke);
    }

    this.undoStack.push(action);
  }

  findNearestStroke(point, threshold = 0.5) {
    let nearest = null;
    let nearestDist = threshold;

    for (const stroke of this.strokes) {
      const positions = stroke.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const dx = positions.getX(i) - point.x;
        const dy = positions.getY(i) - point.y;
        const dz = positions.getZ(i) - point.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = stroke;
        }
      }
    }

    return nearest;
  }
}
