// src/InputHandler.js
import * as THREE from 'three';
import { Mode } from './ModeController.js';

export class InputHandler {
  constructor(canvas, camera, drawingPlane, strokeManager, modeController) {
    this.canvas = canvas;
    this.camera = camera;
    this.drawingPlane = drawingPlane;
    this.strokeManager = strokeManager;
    this.modeController = modeController;

    this.isDrawing = false;
    this.isErasing = false;
    this.activeTouches = new Map();

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointercancel', this._onPointerUp);
  }

  _getNDC(e) {
    return {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -(e.clientY / window.innerHeight) * 2 + 1,
    };
  }

  _onPointerDown(e) {
    // Track touch points for plane manipulation in DRAW mode
    if (e.pointerType === 'touch' && this.modeController.mode === Mode.DRAW) {
      this.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // Store state for two-finger rotation tracking
      if (this.activeTouches.size === 2) {
        this._prevTouchAngle = this._computeTouchAngle();
        this._prevMidpoint = this._computeTouchMidpoint();
      }
      e.preventDefault();
      return;
    }

    if (e.pointerType !== 'pen') return;
    if (this.modeController.mode !== Mode.DRAW) return;

    const ndc = this._getNDC(e);

    if (this.modeController.eraserActive) {
      const point = this.drawingPlane.raycast(ndc.x, ndc.y, this.camera);
      if (point) {
        const stroke = this.strokeManager.findNearestStroke(point);
        if (stroke) this.strokeManager.removeStroke(stroke);
      }
      this.isErasing = true;
      e.preventDefault();
      return;
    }

    const point = this.drawingPlane.raycast(ndc.x, ndc.y, this.camera);
    if (!point) return;

    this.isDrawing = true;
    this.strokeManager.beginStroke(point);
    e.preventDefault();
  }

  _onPointerMove(e) {
    // Handle touch drag for plane manipulation in DRAW mode
    if (e.pointerType === 'touch' && this.modeController.mode === Mode.DRAW) {
      if (!this.activeTouches.has(e.pointerId)) return;

      const prev = this.activeTouches.get(e.pointerId);
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;

      if (this.activeTouches.size === 1) {
        // Single touch drag — translate the plane
        this._translatePlane(dx, dy);
      } else if (this.activeTouches.size === 2) {
        // Two-finger: full 3-axis rotation (no translation)
        this.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });

        const ROTATION_SENSITIVITY = 0.005;

        // Yaw: twist between fingers → rotate around local Y (normal)
        const currentAngle = this._computeTouchAngle();
        if (this._prevTouchAngle !== undefined) {
          const deltaAngle = currentAngle - this._prevTouchAngle;
          this.drawingPlane.group.rotateOnAxis(new THREE.Vector3(0, 1, 0), deltaAngle);
        }
        this._prevTouchAngle = currentAngle;

        // Pitch & Roll: midpoint drag → rotate around local X and Z
        const currentMidpoint = this._computeTouchMidpoint();
        if (this._prevMidpoint) {
          const mdx = currentMidpoint.x - this._prevMidpoint.x;
          const mdy = currentMidpoint.y - this._prevMidpoint.y;
          // Pitch: vertical drag → tilt forward/backward around local X
          this.drawingPlane.group.rotateOnAxis(new THREE.Vector3(1, 0, 0), mdy * ROTATION_SENSITIVITY);
          // Roll: horizontal drag → tilt sideways around local Z
          this.drawingPlane.group.rotateOnAxis(new THREE.Vector3(0, 0, 1), -mdx * ROTATION_SENSITIVITY);
        }
        this._prevMidpoint = currentMidpoint;

        e.preventDefault();
        return;
      }

      this.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      e.preventDefault();
      return;
    }

    if (e.pointerType !== 'pen') return;

    // Eraser drag: erase strokes as pen moves
    if (this.isErasing) {
      const ndc = this._getNDC(e);
      const point = this.drawingPlane.raycast(ndc.x, ndc.y, this.camera);
      if (point) {
        const stroke = this.strokeManager.findNearestStroke(point);
        if (stroke) this.strokeManager.removeStroke(stroke);
      }
      e.preventDefault();
      return;
    }

    if (!this.isDrawing) return;

    const ndc = this._getNDC(e);
    const point = this.drawingPlane.raycast(ndc.x, ndc.y, this.camera);
    if (point) {
      this.strokeManager.addPoint(point);
    }
    e.preventDefault();
  }

  _onPointerUp(e) {
    // Clean up touch tracking
    if (e.pointerType === 'touch') {
      this.activeTouches.delete(e.pointerId);
      if (this.activeTouches.size < 2) {
        this._prevTouchAngle = undefined;
        this._prevMidpoint = undefined;
      }
      e.preventDefault();
      return;
    }

    if (e.pointerType !== 'pen') return;

    if (this.isErasing) {
      this.isErasing = false;
      e.preventDefault();
      return;
    }

    if (!this.isDrawing) return;

    this.isDrawing = false;
    this.strokeManager.endStroke();
    e.preventDefault();
  }

  /**
   * Translate the drawing plane along camera right/up vectors based on screen-space deltas.
   */
  _translatePlane(dx, dy) {
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    this.camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());

    // Scale movement by camera distance to plane for consistent feel
    const dist = this.camera.position.distanceTo(this.drawingPlane.group.position);
    const sensitivity = dist * 0.002;

    const offset = new THREE.Vector3()
      .addScaledVector(right, dx * sensitivity)
      .addScaledVector(up, -dy * sensitivity);

    this.drawingPlane.group.position.add(offset);
  }

  /**
   * Compute the angle (radians) of the line between two active touch points.
   */
  _computeTouchAngle() {
    const pts = Array.from(this.activeTouches.values());
    return Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
  }

  /**
   * Compute the midpoint of two active touch points in screen pixels.
   */
  _computeTouchMidpoint() {
    const pts = Array.from(this.activeTouches.values());
    return {
      x: (pts[0].x + pts[1].x) / 2,
      y: (pts[0].y + pts[1].y) / 2,
    };
  }
}
