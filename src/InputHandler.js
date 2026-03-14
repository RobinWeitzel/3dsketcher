// src/InputHandler.js
import * as THREE from 'three';

const TOUCH_ROTATION_SENSITIVITY = 0.01;

export class InputHandler {
  constructor(canvas, camera, drawingPlane, strokeManager, modeController, orbitControls, rotationController) {
    this.canvas = canvas;
    this.camera = camera;
    this.drawingPlane = drawingPlane;
    this.strokeManager = strokeManager;
    this.modeController = modeController;
    this.orbitControls = orbitControls;
    this.rotationController = rotationController;

    this.isDrawing = false;
    this.isErasing = false;

    // Touch rotation state (for plane mode)
    this._touchPrev = null;
    this._isTouchRotating = false;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointercancel', this._onPointerUp);

    // Capturing phase: disable OrbitControls during pen input or plane-mode touch
    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'pen' && e.target === canvas) {
        this.orbitControls.enabled = false;
      }
      if (e.pointerType === 'touch' && e.target === canvas && this.modeController.mode === 'plane') {
        this.orbitControls.enabled = false;
      }
    }, true);

    document.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'pen' || e.pointerType === 'touch') {
        this.orbitControls.enabled = this.modeController.mode === 'camera';
      }
    }, true);

    // Sync OrbitControls enabled state on mode change
    modeController.onModeChange((mode) => {
      this.orbitControls.enabled = mode === 'camera';
    });
  }

  _getNDC(e) {
    return {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -(e.clientY / window.innerHeight) * 2 + 1,
    };
  }

  _onPointerDown(e) {
    // Pen: always draw/erase
    if (e.pointerType === 'pen') {
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
      return;
    }

    // Touch in plane mode: rotate drawing plane
    if (e.pointerType === 'touch' && this.modeController.mode === 'plane') {
      this._touchPrev = { x: e.clientX, y: e.clientY };
      this._isTouchRotating = true;
      e.preventDefault();
    }
  }

  _onPointerMove(e) {
    // Pen: draw/erase
    if (e.pointerType === 'pen') {
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
      return;
    }

    // Touch in plane mode: rotate drawing plane
    if (this._isTouchRotating && e.pointerType === 'touch') {
      const dx = e.clientX - this._touchPrev.x;
      const dy = e.clientY - this._touchPrev.y;
      this._touchPrev = { x: e.clientX, y: e.clientY };

      this.rotationController.applyRotation(
        this.drawingPlane.group,
        dx * TOUCH_ROTATION_SENSITIVITY,
        -dy * TOUCH_ROTATION_SENSITIVITY,
        0
      );
      e.preventDefault();
    }
  }

  _onPointerUp(e) {
    if (e.pointerType === 'pen') {
      if (this.isErasing) {
        this.isErasing = false;
        e.preventDefault();
        return;
      }

      if (!this.isDrawing) return;

      this.isDrawing = false;
      this.strokeManager.endStroke();
      e.preventDefault();
      return;
    }

    if (e.pointerType === 'touch') {
      this._isTouchRotating = false;
    }
  }
}
