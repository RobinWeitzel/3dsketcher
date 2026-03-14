# Drawing Control Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify plane controls by removing draw-to-place, adding 5° rotation snapping, and showing push/pull distance feedback.

**Architecture:** Remove the Place button and all placement code (snap logic, preview line, placement state). Add rotation quantization in PlaneHandles.drag(). Add a THREE.Sprite distance label that tracks cumulative push/pull displacement and resets on rotation or mode exit.

**Tech Stack:** Three.js v0.183, Vanilla JS ES modules, Vite

---

### Task 1: Remove Place Button and Placing State from ModeController

**Files:**
- Modify: `src/ModeController.js`

**Step 1: Remove placing state and Place button**

Remove `placingPlane`, `_placingCallbacks`, `onPlacingChange`, `_togglePlacing`, `exitPlacing` and the Place button from the toolbar. Update `_toggleEraser` to no longer clear `placingPlane`. Update `_toggleAdjusting` to no longer call `exitPlacing`.

The full rewritten file:

```js
// src/ModeController.js

export class ModeController {
  constructor() {
    this.eraserActive = false;
    this.adjustingPlane = false;
    this._adjustingCallbacks = [];

    this._createToolbar();
  }

  _createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.id = 'toolbar';
    toolbar.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.85);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      border-radius: 12px;
      backdrop-filter: blur(8px);
      z-index: 100;
      user-select: none;
      -webkit-user-select: none;
    `;

    this.undoBtn = this._createButton('Undo', null);
    this.redoBtn = this._createButton('Redo', null);
    this.eraserBtn = this._createButton('Eraser', () => this._toggleEraser());
    this.moveBtn = this._createButton('Move', () => this._toggleAdjusting());

    toolbar.append(this.undoBtn, this.redoBtn, this.eraserBtn, this.moveBtn);
    document.body.appendChild(toolbar);

    this._updateButtonStates();
  }

  _createButton(label, onClick) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      min-width: 56px;
      min-height: 44px;
      padding: 8px 12px;
      border: none;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.06);
      color: #333;
      font-size: 14px;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    `;
    if (onClick) btn.addEventListener('pointerdown', (e) => { e.preventDefault(); onClick(); });
    return btn;
  }

  setUndoRedoHandlers(onUndo, onRedo) {
    this.undoBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); onUndo(); });
    this.redoBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); onRedo(); });
  }

  onAdjustingChange(callback) {
    this._adjustingCallbacks.push(callback);
  }

  _toggleAdjusting() {
    if (this.adjustingPlane) {
      this.exitAdjusting();
      return;
    }
    this.eraserActive = false;
    this.enterAdjusting();
  }

  enterAdjusting() {
    this.adjustingPlane = true;
    this._updateButtonStates();
    for (const cb of this._adjustingCallbacks) cb(true);
  }

  exitAdjusting() {
    if (!this.adjustingPlane) return;
    this.adjustingPlane = false;
    this._updateButtonStates();
    for (const cb of this._adjustingCallbacks) cb(false);
  }

  _toggleEraser() {
    this.eraserActive = !this.eraserActive;
    if (this.eraserActive) {
      if (this.adjustingPlane) this.exitAdjusting();
    }
    this._updateButtonStates();
  }

  _updateButtonStates() {
    // Eraser button
    this.eraserBtn.style.background = this.eraserActive
      ? 'rgba(244, 67, 54, 0.2)' : 'rgba(0, 0, 0, 0.06)';
    this.eraserBtn.style.color = this.eraserActive ? '#d32f2f' : '#333';

    // Move button
    this.moveBtn.style.background = this.adjustingPlane
      ? 'rgba(33, 150, 243, 0.2)' : 'rgba(0, 0, 0, 0.06)';
    this.moveBtn.style.color = this.adjustingPlane ? '#1565c0' : '#333';
  }
}
```

**Step 2: Verify app loads**

Run dev server, check for console errors. Toolbar should show [Undo] [Redo] [Eraser] [Move] — no Place button.

**Step 3: Commit**

```bash
git add src/ModeController.js
git commit -m "Remove Place button and placing state from ModeController"
```

---

### Task 2: Remove Placement Code from InputHandler

**Files:**
- Modify: `src/InputHandler.js`

**Step 1: Strip all placement-related code**

Remove snap constants (`SNAP_ANGLE`, `SNAP_AXES`, `SNAP_COLORS`), placement state (`_placeStartNDC`, `_previewLine`), and all placement methods (`_createPreviewLine`, `_updatePreviewLine`, `_removePreviewLine`, `_rayAtTargetDist`, `_applyPlacement`, `_snapNormal`, `_snapColor`). Remove the placement branches from `_onPointerDown`, `_onPointerMove`, and `_onPointerUp`.

The full rewritten file:

```js
// src/InputHandler.js
import * as THREE from 'three';

export class InputHandler {
  constructor(canvas, camera, drawingPlane, strokeManager, modeController, orbitControls, planeHandles) {
    this.canvas = canvas;
    this.camera = camera;
    this.drawingPlane = drawingPlane;
    this.strokeManager = strokeManager;
    this.modeController = modeController;
    this.orbitControls = orbitControls;
    this.planeHandles = planeHandles;

    this.isDrawing = false;
    this.isErasing = false;

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
    this.strokeManager.beginStroke(point);
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
```

**Step 2: Verify app loads**

Run dev server, check for console errors. Drawing and erasing should still work. Move button should still show handles.

**Step 3: Commit**

```bash
git add src/InputHandler.js
git commit -m "Remove all placement code from InputHandler"
```

---

### Task 3: Remove Placing Wiring from main.js

**Files:**
- Modify: `src/main.js`

**Step 1: Remove placing-related callbacks**

The current `main.js` has `modeController.enterAdjusting()` in the placement flow and `onAdjustingChange` wiring. The `onAdjustingChange` callback stays (it controls handle visibility). Just verify there are no stale references to `placingPlane` or `exitPlacing`. The current `main.js` should work as-is since it doesn't reference placement directly — the undo/redo handlers call `exitAdjusting` and `planeHandles.hide()` which is still valid.

No code changes needed in main.js — just verify it still works.

**Step 2: Verify app loads**

Run dev server, confirm no console errors, test undo/redo/eraser/move buttons.

**Step 3: Commit (skip if no changes)**

---

### Task 4: Add 5° Rotation Snapping to PlaneHandles

**Files:**
- Modify: `src/PlaneHandles.js`

**Step 1: Add rotation snap constant and apply in drag()**

Add at the top with other constants:

```js
const ROTATION_SNAP = Math.PI / 36; // 5 degrees
```

In the `drag()` method, after computing `totalAngle` for ring handles, snap it:

Replace this block in `drag()`:

```js
      // Clamp total rotation
      const maxAngle = Math.PI; // 180° max
      const totalAngle = Math.max(-maxAngle, Math.min(maxAngle, rawDelta));
```

With:

```js
      // Clamp and snap to 5° increments
      const maxAngle = Math.PI; // 180° max
      const clamped = Math.max(-maxAngle, Math.min(maxAngle, rawDelta));
      const totalAngle = Math.round(clamped / ROTATION_SNAP) * ROTATION_SNAP;
```

**Step 2: Verify rotation snapping works**

Run dev server, tap Move, drag a ring handle. Rotation should move in discrete 5° steps instead of continuously.

**Step 3: Commit**

```bash
git add src/PlaneHandles.js
git commit -m "Add 5-degree rotation snapping to ring handles"
```

---

### Task 5: Add Push/Pull Distance Label to PlaneHandles

**Files:**
- Modify: `src/PlaneHandles.js`

**Step 1: Create the distance label sprite**

Add a method to create a canvas-based text sprite. Add to the constructor after `this._createHandles()`:

```js
    // Distance tracking
    this._distanceOrigin = null;
    this._distanceLabel = this._createDistanceLabel();
    this.scene.add(this._distanceLabel);
    this._distanceLabel.visible = false;
```

Add the label creation method:

```js
  _createDistanceLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    this._labelCanvas = canvas;
    this._labelCtx = canvas.getContext('2d');

    const texture = new THREE.CanvasTexture(canvas);
    this._labelTexture = texture;

    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.5, 0.75, 1);
    return sprite;
  }

  _updateDistanceLabel(distance) {
    const ctx = this._labelCtx;
    ctx.clearRect(0, 0, 128, 64);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(4, 4, 120, 56, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(distance.toFixed(2), 64, 32);
    this._labelTexture.needsUpdate = true;
  }
```

**Step 2: Track distance in beginDrag and endDrag**

In `beginDrag()`, when the handle is `'arrow'`, set the distance origin if not already set:

```js
    if (handleName === 'arrow') {
      this._arrowMaterial.color.setHex(COLOR_ACTIVE);
      this._arrowNormal = this.drawingPlane.getNormal();
      this._arrowOrigin = this.drawingPlane.group.position.clone();
      this._arrowStartProj = this._projectRayOntoLine(ray, this._arrowOrigin, this._arrowNormal);
      this._arrowOffset = 0;

      // Set distance origin on first push/pull
      if (!this._distanceOrigin) {
        this._distanceOrigin = this._arrowOrigin.clone();
      }
    }
```

In `drag()`, for the arrow branch, after updating the plane position, update the label:

After the line `this._arrowOffset = newOffset;`, add:

```js
      // Update distance label
      const currentPos = this.drawingPlane.group.position;
      const dist = currentPos.distanceTo(this._distanceOrigin);
      this._updateDistanceLabel(dist);
      this._distanceLabel.visible = true;
      // Position label near the arrow tip
      const normal = this._arrowNormal;
      this._distanceLabel.position.copy(currentPos).addScaledVector(normal, ARROW_LENGTH + 0.5);
```

**Step 3: Reset distance on rotation**

In `beginDrag()`, for ring handles (the `else` branch), add at the start:

```js
      // Reset distance tracking on rotation
      this._distanceOrigin = null;
      this._distanceLabel.visible = false;
```

**Step 4: Reset distance on hide**

In `hide()`, add:

```js
    this._distanceOrigin = null;
    this._distanceLabel.visible = false;
```

**Step 5: Clean up dispose**

In `dispose()`, add before `this._meshes = []`:

```js
    this.scene.remove(this._distanceLabel);
    this._distanceLabel.material.map.dispose();
    this._distanceLabel.material.dispose();
```

**Step 6: Verify distance label works**

Run dev server, tap Move, drag arrow → label appears with distance. Release and drag again → distance continues from original origin. Drag a ring → label disappears. Drag arrow again → new origin, label shows distance from new start.

**Step 7: Commit**

```bash
git add src/PlaneHandles.js
git commit -m "Add push/pull distance label with persistent tracking"
```
