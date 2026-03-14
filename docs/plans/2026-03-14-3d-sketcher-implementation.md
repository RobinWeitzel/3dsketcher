# 3D Sketcher Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a tablet-focused web app for 3D sketching via a movable drawing plane, using pen input for strokes and touch for navigation.

**Architecture:** Five modules (SceneManager, DrawingPlane, StrokeManager, InputHandler, ModeController) coordinated through a main entry point. Pen input raycasts onto an arbitrarily-oriented 3D plane to produce world-space strokes. A mode toggle separates camera control from drawing/plane manipulation.

**Tech Stack:** Three.js, vanilla JS (ES modules), Vite

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.js`
- Create: `vite.config.js`

**Step 1: Initialize project with Vite**

```bash
npm create vite@latest . -- --template vanilla
```

If the directory isn't empty, accept overwrite prompts. This gives us `package.json`, `index.html`, and starter files.

**Step 2: Install Three.js**

```bash
npm install three
```

**Step 3: Clean up scaffolding**

Remove default Vite content (`counter.js`, `javascript.svg`, default styles). Replace `index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>3D Sketcher</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; touch-action: none; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

Replace `src/main.js` with:

```js
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x1a1a2e);
document.body.appendChild(renderer.domElement);

function animate() {
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

**Step 4: Verify it runs**

```bash
npm run dev
```

Expected: Dark blue-ish empty scene renders in browser. No errors in console.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + Three.js project with empty scene"
```

---

### Task 2: SceneManager Module

**Files:**
- Create: `src/SceneManager.js`
- Modify: `src/main.js`

**Step 1: Create SceneManager**

```js
// src/SceneManager.js
import * as THREE from 'three';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x1a1a2e);
    document.body.appendChild(this.renderer.domElement);

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    this.renderer.setAnimationLoop(() => this._animate());
  }

  get canvas() {
    return this.renderer.domElement;
  }

  _animate() {
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
```

**Step 2: Update main.js to use SceneManager**

```js
// src/main.js
import { SceneManager } from './SceneManager.js';

const sceneManager = new SceneManager();
```

**Step 3: Verify**

```bash
npm run dev
```

Expected: Same dark empty scene as before. No errors.

**Step 4: Commit**

```bash
git add src/SceneManager.js src/main.js
git commit -m "refactor: extract SceneManager module"
```

---

### Task 3: DrawingPlane — Visual Grid

**Files:**
- Create: `src/DrawingPlane.js`
- Modify: `src/main.js`

**Step 1: Create DrawingPlane with grid visual**

```js
// src/DrawingPlane.js
import * as THREE from 'three';

export class DrawingPlane {
  constructor(scene) {
    this.scene = scene;

    // Group holds the visual grid and can be transformed
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Semi-transparent grid
    const gridSize = 20;
    const gridDivisions = 20;
    this.grid = new THREE.GridHelper(gridSize, gridDivisions, 0x4a4a6a, 0x3a3a5a);
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.4;
    this.group.add(this.grid);

    // Axis indicator on the plane: small colored lines at center
    const axisLength = 1;
    const xAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(axisLength, 0, 0),
    ]);
    const zAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, axisLength),
    ]);
    this.group.add(new THREE.Line(xAxisGeo, new THREE.LineBasicMaterial({ color: 0xff4444 })));
    this.group.add(new THREE.Line(zAxisGeo, new THREE.LineBasicMaterial({ color: 0x4444ff })));

    // Mathematical plane for raycasting (starts as Y=0, i.e. XZ plane)
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.raycaster = new THREE.Raycaster();
  }

  // Update the mathematical plane to match the group's transform
  updatePlane() {
    const normal = new THREE.Vector3(0, 1, 0);
    normal.applyQuaternion(this.group.quaternion);
    const point = this.group.position.clone();
    this.plane.setFromNormalAndCoplanarPoint(normal, point);
  }

  // Raycast from screen coordinates to the drawing plane
  // Returns a Vector3 in world space, or null if no intersection
  raycast(ndcX, ndcY, camera) {
    this.updatePlane();
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const intersection = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.plane, intersection);
    return hit ? intersection : null;
  }

  // Get the plane's normal in world space
  getNormal() {
    const normal = new THREE.Vector3(0, 1, 0);
    normal.applyQuaternion(this.group.quaternion);
    return normal;
  }

  // Get the plane's right vector in world space
  getRight() {
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.group.quaternion);
    return right;
  }

  // Get the plane's forward vector in world space
  getForward() {
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(this.group.quaternion);
    return forward;
  }
}
```

**Step 2: Add DrawingPlane to main.js**

```js
// src/main.js
import { SceneManager } from './SceneManager.js';
import { DrawingPlane } from './DrawingPlane.js';

const sceneManager = new SceneManager();
const drawingPlane = new DrawingPlane(sceneManager.scene);
```

**Step 3: Verify**

```bash
npm run dev
```

Expected: A semi-transparent grid visible in the scene on the XZ plane, with small red (X) and blue (Z) axis indicators at the center.

**Step 4: Commit**

```bash
git add src/DrawingPlane.js src/main.js
git commit -m "feat: add DrawingPlane with grid visual and raycasting"
```

---

### Task 4: StrokeManager — Stroke Creation and Undo/Redo

**Files:**
- Create: `src/StrokeManager.js`

**Step 1: Create StrokeManager**

```js
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
```

**Step 2: Commit**

```bash
git add src/StrokeManager.js
git commit -m "feat: add StrokeManager with stroke creation, undo/redo, and eraser support"
```

---

### Task 5: ModeController — Mode Toggle and Toolbar UI

**Files:**
- Create: `src/ModeController.js`

**Step 1: Create ModeController**

```js
// src/ModeController.js

export const Mode = {
  DRAW: 'draw',
  CAMERA: 'camera',
};

export class ModeController {
  constructor() {
    this.mode = Mode.DRAW;
    this.eraserActive = false;
    this._listeners = [];

    this._createToolbar();
  }

  onModeChange(fn) {
    this._listeners.push(fn);
  }

  _notify() {
    for (const fn of this._listeners) {
      fn(this.mode, this.eraserActive);
    }
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
      background: rgba(30, 30, 50, 0.85);
      border-radius: 12px;
      backdrop-filter: blur(8px);
      z-index: 100;
      user-select: none;
      -webkit-user-select: none;
    `;

    this.modeBtn = this._createButton('Draw', () => this._toggleMode());
    this.undoBtn = this._createButton('Undo', null);
    this.redoBtn = this._createButton('Redo', null);
    this.eraserBtn = this._createButton('Eraser', () => this._toggleEraser());

    toolbar.append(this.modeBtn, this.undoBtn, this.redoBtn, this.eraserBtn);
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
      background: rgba(255, 255, 255, 0.1);
      color: #ccc;
      font-size: 14px;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    `;
    if (onClick) btn.addEventListener('pointerdown', (e) => { e.preventDefault(); onClick(); });
    return btn;
  }

  // Public: attach undo/redo handlers after StrokeManager is created
  setUndoRedoHandlers(onUndo, onRedo) {
    this.undoBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); onUndo(); });
    this.redoBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); onRedo(); });
  }

  _toggleMode() {
    this.mode = this.mode === Mode.DRAW ? Mode.CAMERA : Mode.DRAW;
    if (this.mode === Mode.CAMERA) this.eraserActive = false;
    this._updateButtonStates();
    this._notify();
  }

  _toggleEraser() {
    if (this.mode === Mode.CAMERA) return;
    this.eraserActive = !this.eraserActive;
    this._updateButtonStates();
    this._notify();
  }

  _updateButtonStates() {
    this.modeBtn.textContent = this.mode === Mode.DRAW ? 'Draw' : 'Camera';
    this.modeBtn.style.background = this.mode === Mode.DRAW
      ? 'rgba(100, 200, 100, 0.3)' : 'rgba(100, 150, 255, 0.3)';

    this.eraserBtn.style.background = this.eraserActive
      ? 'rgba(255, 100, 100, 0.3)' : 'rgba(255, 255, 255, 0.1)';
    this.eraserBtn.style.color = this.eraserActive ? '#ff6666' : '#ccc';
  }
}
```

**Step 2: Commit**

```bash
git add src/ModeController.js
git commit -m "feat: add ModeController with toolbar UI"
```

---

### Task 6: InputHandler — Pen Drawing on the Plane

**Files:**
- Create: `src/InputHandler.js`
- Modify: `src/main.js`

**Step 1: Create InputHandler**

```js
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
```

**Step 2: Wire everything together in main.js**

```js
// src/main.js
import { SceneManager } from './SceneManager.js';
import { DrawingPlane } from './DrawingPlane.js';
import { StrokeManager } from './StrokeManager.js';
import { ModeController } from './ModeController.js';
import { InputHandler } from './InputHandler.js';

const sceneManager = new SceneManager();
const drawingPlane = new DrawingPlane(sceneManager.scene);
const strokeManager = new StrokeManager(sceneManager.scene);
const modeController = new ModeController();

modeController.setUndoRedoHandlers(
  () => strokeManager.undo(),
  () => strokeManager.redo()
);

const inputHandler = new InputHandler(
  sceneManager.canvas,
  sceneManager.camera,
  drawingPlane,
  strokeManager,
  modeController
);
```

**Step 3: Verify**

```bash
npm run dev
```

Expected: Toolbar visible at bottom. On a tablet with pen: pen strokes appear as white lines on the grid plane. Undo/redo buttons work. Eraser mode allows deleting strokes. (On desktop without pen, verify no errors — just no drawing since only pen input triggers strokes.)

**Step 4: Commit**

```bash
git add src/InputHandler.js src/main.js
git commit -m "feat: add InputHandler for pen drawing and wire up all modules"
```

---

### Task 7: Camera Controls (Camera Mode)

**Files:**
- Modify: `src/InputHandler.js`
- Modify: `src/SceneManager.js`

**Step 1: Add OrbitControls to SceneManager**

Import `OrbitControls` from Three.js addons. Create an orbit controls instance. Disable it by default (starts in draw mode). Expose enable/disable methods.

```js
// Add to SceneManager.js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
```

In the constructor, after creating the renderer:

```js
this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
this.orbitControls.enableDamping = true;
this.orbitControls.dampingFactor = 0.1;
this.orbitControls.enableZoom = false; // Out of scope for MVP
this.orbitControls.enabled = false; // Start disabled (draw mode)
```

Update `_animate` to include `this.orbitControls.update()`.

**Step 2: Toggle OrbitControls based on mode**

In `main.js`, listen for mode changes:

```js
modeController.onModeChange((mode) => {
  sceneManager.orbitControls.enabled = (mode === 'camera');
});
```

**Step 3: Verify**

Expected: Toggle to Camera mode → one-finger touch orbits, two-finger pans. Toggle back to Draw → camera controls disabled, pen draws.

**Step 4: Commit**

```bash
git add src/SceneManager.js src/InputHandler.js src/main.js
git commit -m "feat: add OrbitControls for camera mode"
```

---

### Task 8: Plane Manipulation (Touch Gestures in Draw Mode)

**Files:**
- Modify: `src/InputHandler.js`

**Step 1: Add touch tracking for plane manipulation**

Extend InputHandler to track touch points. On one/two-finger drag in draw mode, translate the drawing plane parallel to the camera view. On two-finger twist, rotate the plane.

Key logic:
- Track active touches in a `Map` keyed by `pointerId`
- On single touch drag: compute screen delta, project into world-space movement along camera's right/up vectors, apply to `drawingPlane.group.position`
- On two-finger twist: compute angle change between the two touch points across frames, apply as rotation around the plane's normal axis (`drawingPlane.group.rotateOnAxis(normal, deltaAngle)`)

**Step 2: Verify**

Expected: In Draw mode, touch drags move the grid. Two-finger twist rotates it. Pen still draws correctly on the moved/rotated plane.

**Step 3: Commit**

```bash
git add src/InputHandler.js
git commit -m "feat: add touch gestures for plane translation and rotation"
```

---

### Task 9: XYZ Orientation Gizmo

**Files:**
- Modify: `src/SceneManager.js`

**Step 1: Add a small XYZ axis gizmo**

Create a small, separate scene + camera rendered in a corner of the viewport. Three colored lines (red=X, green=Y, blue=Z) that rotate to match the main camera's orientation but stay fixed in the corner.

Key approach:
- Create a second `THREE.Scene` with three short axis lines
- Create a second `THREE.PerspectiveCamera` pointing at origin
- In the render loop, copy the main camera's quaternion to the gizmo camera (so it matches orientation)
- Use `renderer.setViewport` and `renderer.setScissor` to render the gizmo in a small corner rectangle
- Render main scene first, then gizmo scene on top with `autoClear = false`

**Step 2: Verify**

Expected: Small RGB axis indicator in the bottom-right corner that rotates as the camera orbits.

**Step 3: Commit**

```bash
git add src/SceneManager.js
git commit -m "feat: add XYZ orientation gizmo in corner"
```

---

### Task 10: Polish and Integration Testing

**Files:**
- All files (minor tweaks)

**Step 1: Prevent default touch behaviors**

Ensure `touch-action: none` is on the canvas, and all pointer events call `preventDefault()` where needed to prevent browser scroll/zoom gestures interfering.

**Step 2: Test full workflow on tablet (or touch-enabled browser devtools)**

Manual test checklist:
- [ ] Draw mode: pen creates strokes on the grid
- [ ] Draw mode: touch moves/rotates the plane
- [ ] Camera mode: touch orbits/pans
- [ ] Strokes stay in world space when plane moves
- [ ] Undo removes last stroke
- [ ] Redo restores it
- [ ] Eraser deletes stroke near pen tap
- [ ] Eraser deletion is undoable
- [ ] Mode toggle visually updates
- [ ] XYZ gizmo rotates with camera
- [ ] No unintended scrolling or zooming

**Step 3: Fix any issues found**

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: polish touch handling and integration fixes"
```
