// src/InputHandler.js
import { Mode } from './ModeController.js';

export class InputHandler {
  constructor(canvas, camera, drawingPlane, strokeManager, modeController) {
    this.canvas = canvas;
    this.camera = camera;
    this.drawingPlane = drawingPlane;
    this.strokeManager = strokeManager;
    this.modeController = modeController;

    this.isDrawing = false;

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
    if (e.pointerType !== 'pen') return;
    if (this.modeController.mode !== Mode.DRAW) return;

    const ndc = this._getNDC(e);

    if (this.modeController.eraserActive) {
      const point = this.drawingPlane.raycast(ndc.x, ndc.y, this.camera);
      if (point) {
        const stroke = this.strokeManager.findNearestStroke(point);
        if (stroke) this.strokeManager.removeStroke(stroke);
      }
      return;
    }

    const point = this.drawingPlane.raycast(ndc.x, ndc.y, this.camera);
    if (!point) return;

    this.isDrawing = true;
    this.strokeManager.beginStroke(point);
    e.preventDefault();
  }

  _onPointerMove(e) {
    if (!this.isDrawing) return;
    if (e.pointerType !== 'pen') return;

    const ndc = this._getNDC(e);
    const point = this.drawingPlane.raycast(ndc.x, ndc.y, this.camera);
    if (point) {
      this.strokeManager.addPoint(point);
    }
    e.preventDefault();
  }

  _onPointerUp(e) {
    if (!this.isDrawing) return;
    if (e.pointerType !== 'pen') return;

    this.isDrawing = false;
    this.strokeManager.endStroke();
  }
}
