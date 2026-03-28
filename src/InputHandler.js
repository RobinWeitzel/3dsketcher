// src/InputHandler.js
import * as THREE from 'three';

const DOUBLE_TAP_THRESHOLD = 300; // ms between taps
const DOUBLE_TAP_DISTANCE = 30;   // max px distance between taps

export class InputHandler {
  constructor(canvas, camera, drawingPlane, strokeManager, modeController, orbitControls, planeHandles, measurementTool) {
    this.canvas = canvas;
    this.camera = camera;
    this.drawingPlane = drawingPlane;
    this.strokeManager = strokeManager;
    this.modeController = modeController;
    this.orbitControls = orbitControls;
    this.planeHandles = planeHandles;
    this.measurementTool = measurementTool;

    this.isDrawing = false;
    this.isErasing = false;

    // Double-tap detection state
    this._lastTapTime = 0;
    this._lastTapX = 0;
    this._lastTapY = 0;
    this._didDoubleTap = false;

    this._raycaster = new THREE.Raycaster();

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointercancel', this._onPointerUp);

    // Capturing phase: disable OrbitControls during pen input
    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'pen' && e.target === canvas) {
        this.orbitControls.enabled = false;
      }
    }, true);

    document.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'pen') {
        this.orbitControls.enabled = true;
      }
    }, true);
  }

  _getNDC(e) {
    return {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -(e.clientY / window.innerHeight) * 2 + 1,
    };
  }

  _onPointerDown(e) {
    if (e.pointerType !== 'pen') return;
    if (e.button !== 0) return; // Only primary pen tip

    const now = performance.now();
    const dx = e.clientX - this._lastTapX;
    const dy = e.clientY - this._lastTapY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const timeSinceLastTap = now - this._lastTapTime;

    // Check for double-tap
    if (timeSinceLastTap < DOUBLE_TAP_THRESHOLD && dist < DOUBLE_TAP_DISTANCE) {
      // Double-tap detected — toggle adjust mode
      this._didDoubleTap = true;
      // End any in-progress stroke from first tap (auto-discarded if <2 points)
      if (this.isDrawing) {
        this.isDrawing = false;
        this.strokeManager.endStroke();
      }
      this.modeController._toggleAdjusting();
      this._lastTapTime = 0; // Reset so third tap doesn't re-toggle
      e.preventDefault();
      return;
    }

    // Record this tap for double-tap detection
    this._lastTapTime = now;
    this._lastTapX = e.clientX;
    this._lastTapY = e.clientY;
    this._didDoubleTap = false;

    const ndc = this._getNDC(e);

    // Adjusting mode — check handle hit, ignore pen input otherwise
    if (this.modeController.adjustingPlane) {
      this._raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), this.camera);
      const hit = this.planeHandles.hitTest(this._raycaster.ray);
      if (hit) {
        this.planeHandles.beginDrag(hit, this._raycaster.ray);
      }
      e.preventDefault();
      return;
    }

    // Ruler
    if (this.modeController.rulerActive) {
      const point = this.drawingPlane.raycast(ndc.x, ndc.y, this.camera);
      if (point) {
        this.measurementTool.addPoint(point);
      }
      e.preventDefault();
      return;
    }

    // Eraser
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

    // Draw
    const point = this.drawingPlane.raycast(ndc.x, ndc.y, this.camera);
    if (!point) return;

    this.isDrawing = true;
    this.strokeManager.beginStroke(point, this.modeController.activeColor, this.modeController.activeWidth);
    e.preventDefault();
  }

  _onPointerMove(e) {
    if (e.pointerType !== 'pen') return;

    // Handle dragging
    if (this.planeHandles.activeHandle) {
      const ndc = this._getNDC(e);
      this._raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), this.camera);
      this.planeHandles.drag(this._raycaster.ray);
      e.preventDefault();
      return;
    }

    // Eraser
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

    // Draw
    if (!this.isDrawing) return;

    const ndc = this._getNDC(e);
    const point = this.drawingPlane.raycast(ndc.x, ndc.y, this.camera);
    if (point) {
      this.strokeManager.addPoint(point);
    }
    e.preventDefault();
  }

  _onPointerUp(e) {
    if (e.pointerType !== 'pen') return;

    // If this was a double-tap, ignore the up event
    if (this._didDoubleTap) {
      this._didDoubleTap = false;
      e.preventDefault();
      return;
    }

    // End handle drag
    if (this.planeHandles.activeHandle) {
      this.planeHandles.endDrag();
      e.preventDefault();
      return;
    }

    // Eraser
    if (this.isErasing) {
      this.isErasing = false;
      e.preventDefault();
      return;
    }

    // Draw
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.strokeManager.endStroke();
    e.preventDefault();
  }
}
