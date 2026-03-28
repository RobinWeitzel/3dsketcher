// src/InputHandler.js
import * as THREE from 'three';

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
    this._barrelHold = false;

    this._raycaster = new THREE.Raycaster();

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointercancel', this._onPointerUp);

    // Prevent context menu from pen barrel button (button 2 = right-click)
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

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

  // Check if pen barrel button is pressed via the buttons bitmask
  // Barrel button = bit 1 (value 2) in the buttons property
  _isBarrelPressed(e) {
    return e.pointerType === 'pen' && (e.buttons & 2) !== 0;
  }

  _onPointerDown(e) {
    if (e.pointerType !== 'pen') return;

    // Pen barrel button (button === 2 per W3C Pointer Events spec)
    // This is the same as right-click for mouse, so we check pointerType
    if (e.button === 2) {
      this._barrelHold = true;
      this.modeController.enterAdjusting(true);
      e.preventDefault();
      return;
    }

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

    // Detect barrel button via buttons bitmask during move/hover
    // This catches cases where pointerdown didn't fire for the barrel button
    // (known Chromium bug with Samsung S Pen)
    if (this._isBarrelPressed(e) && !this._barrelHold) {
      this._barrelHold = true;
      this.modeController.enterAdjusting(true);
    } else if (!this._isBarrelPressed(e) && this._barrelHold) {
      this._barrelHold = false;
      this.modeController.exitHoldAdjusting();
    }

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

    // Barrel button release
    if (e.button === 2 && this._barrelHold) {
      this._barrelHold = false;
      this.modeController.exitHoldAdjusting();
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
