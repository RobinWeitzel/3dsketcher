// src/StrokeManager.js
import * as THREE from 'three';

const STROKE_COLOR = 0xffffff;
const MAX_POINTS_PER_STROKE = 10000;

export class StrokeManager {
  constructor(scene) {
    this.scene = scene;
    this.strokes = [];       // All active strokes (THREE.Line objects)
    this.undoStack = [];     // Actions: { type: 'add'|'remove', stroke }
    this.redoStack = [];
    this.currentStroke = null;
    this.currentPoints = [];
    this.currentPointCount = 0;
  }

  // Begin a new stroke at the given world-space point
  beginStroke(point) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_POINTS_PER_STROKE * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({ color: STROKE_COLOR });
    this.currentStroke = new THREE.Line(geometry, material);
    this.currentPoints = [];
    this.currentPointCount = 0;
    this.scene.add(this.currentStroke);

    this.addPoint(point);
  }

  // Add a point to the current in-progress stroke
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

  // Finalize the current stroke
  endStroke() {
    if (!this.currentStroke) return;
    if (this.currentPointCount < 2) {
      // Too few points, discard
      this.scene.remove(this.currentStroke);
      this.currentStroke.geometry.dispose();
      this.currentStroke.material.dispose();
      this.currentStroke = null;
      return;
    }

    // Trim the buffer to actual size
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
    this.redoStack = []; // Clear redo on new action
    this.currentStroke = null;
  }

  // Remove a specific stroke (used by eraser)
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
      // Undo an add → remove the stroke
      const index = this.strokes.indexOf(action.stroke);
      if (index !== -1) this.strokes.splice(index, 1);
      this.scene.remove(action.stroke);
    } else if (action.type === 'remove') {
      // Undo a remove → re-add the stroke
      this.strokes.push(action.stroke);
      this.scene.add(action.stroke);
    }

    this.redoStack.push(action);
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const action = this.redoStack.pop();

    if (action.type === 'add') {
      // Redo an add → re-add the stroke
      this.strokes.push(action.stroke);
      this.scene.add(action.stroke);
    } else if (action.type === 'remove') {
      // Redo a remove → remove the stroke again
      const index = this.strokes.indexOf(action.stroke);
      if (index !== -1) this.strokes.splice(index, 1);
      this.scene.remove(action.stroke);
    }

    this.undoStack.push(action);
  }

  // Find the nearest stroke to a world-space point within threshold
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
