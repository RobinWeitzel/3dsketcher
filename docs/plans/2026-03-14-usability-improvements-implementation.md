# Comprehensive Usability Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add persistence, layers, color/width tools, export, measurement, plane presets, and a viewport gizmo to make the 3D sketcher a complete app for 3D printing workflows.

**Architecture:** Foundation-first approach — build the data model and persistence layer first (ProjectManager), then layer system, then drawing tools (color/width), then export/measurement/presets/gizmo. Each feature extends the serializable data model so save/load works automatically. All UI is DOM overlays (like the existing toolbar), except the viewport gizmo which uses a secondary Three.js scene.

**Tech Stack:** Three.js v0.183, Vanilla JS ES modules, Vite, localStorage for auto-save

---

### Task 1: Create ProjectManager with Serialize/Deserialize

**Files:**
- Create: `src/ProjectManager.js`
- Modify: `src/StrokeManager.js`

**Step 1: Add stroke serialization to StrokeManager**

Add two methods to `StrokeManager`: `serializeStrokes()` and `loadStrokes(data)`. Each stroke serializes to `{ points: [{x,y,z}...], color: "#hex", width: number }`. For now color is always `"#222222"` and width is always `1` (these will be extended in later tasks).

In `src/StrokeManager.js`, add after the `findNearestStroke` method:

```js
  serializeStrokes() {
    return this.strokes.map(stroke => {
      const positions = stroke.geometry.attributes.position;
      const points = [];
      for (let i = 0; i < positions.count; i++) {
        points.push({ x: positions.getX(i), y: positions.getY(i), z: positions.getZ(i) });
      }
      return {
        points,
        color: stroke.userData.color || '#222222',
        width: stroke.userData.width || 1,
      };
    });
  }

  loadStrokes(strokeDataArray) {
    // Clear existing strokes
    for (const stroke of this.strokes) {
      this.scene.remove(stroke);
      stroke.geometry.dispose();
      stroke.material.dispose();
    }
    this.strokes = [];
    this.undoStack = [];
    this.redoStack = [];
    this.currentStroke = null;

    // Rebuild strokes from data
    for (const data of strokeDataArray) {
      if (data.points.length < 2) continue;
      const positions = new Float32Array(data.points.length * 3);
      for (let i = 0; i < data.points.length; i++) {
        positions[i * 3] = data.points[i].x;
        positions[i * 3 + 1] = data.points[i].y;
        positions[i * 3 + 2] = data.points[i].z;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setDrawRange(0, data.points.length);

      const material = this._createMaterial();
      const stroke = new THREE.Line(geometry, material);
      stroke.userData.color = data.color || '#222222';
      stroke.userData.width = data.width || 1;
      this.scene.add(stroke);
      this.strokes.push(stroke);
    }
  }
```

Also in `endStroke()`, after `this.strokes.push(this.currentStroke);`, add:

```js
    this.currentStroke.userData.color = '#222222';
    this.currentStroke.userData.width = 1;
```

**Step 2: Create ProjectManager**

Create `src/ProjectManager.js`:

```js
// src/ProjectManager.js

const STORAGE_KEY = 'sketch3d_project';
const PROJECT_VERSION = 1;

export class ProjectManager {
  constructor(strokeManager, drawingPlane, camera, orbitControls) {
    this.strokeManager = strokeManager;
    this.drawingPlane = drawingPlane;
    this.camera = camera;
    this.orbitControls = orbitControls;

    this._autoSaveTimer = null;
  }

  // Serialize entire project to JSON-compatible object
  serialize() {
    const plane = this.drawingPlane;
    const cam = this.camera;
    const target = this.orbitControls.target;

    return {
      version: PROJECT_VERSION,
      plane: {
        position: { x: plane.group.position.x, y: plane.group.position.y, z: plane.group.position.z },
        quaternion: { x: plane.group.quaternion.x, y: plane.group.quaternion.y, z: plane.group.quaternion.z, w: plane.group.quaternion.w },
      },
      camera: {
        position: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
        target: { x: target.x, y: target.y, z: target.z },
      },
      strokes: this.strokeManager.serializeStrokes(),
    };
  }

  // Restore project from serialized data
  deserialize(data) {
    if (!data || data.version !== PROJECT_VERSION) return false;

    // Restore plane
    if (data.plane) {
      const p = data.plane.position;
      const q = data.plane.quaternion;
      this.drawingPlane.group.position.set(p.x, p.y, p.z);
      this.drawingPlane.group.quaternion.set(q.x, q.y, q.z, q.w);
      this.drawingPlane.updatePlane();
    }

    // Restore camera
    if (data.camera) {
      const cp = data.camera.position;
      const ct = data.camera.target;
      this.camera.position.set(cp.x, cp.y, cp.z);
      this.orbitControls.target.set(ct.x, ct.y, ct.z);
      this.orbitControls.update();
    }

    // Restore strokes
    if (data.strokes) {
      this.strokeManager.loadStrokes(data.strokes);
    }

    return true;
  }

  // Auto-save to localStorage
  autoSave() {
    clearTimeout(this._autoSaveTimer);
    this._autoSaveTimer = setTimeout(() => {
      try {
        const json = JSON.stringify(this.serialize());
        localStorage.setItem(STORAGE_KEY, json);
      } catch (e) {
        console.warn('Auto-save failed:', e);
      }
    }, 500);
  }

  // Load from localStorage
  autoLoad() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return this.deserialize(data);
    } catch (e) {
      console.warn('Auto-load failed:', e);
      return false;
    }
  }

  // Download project as .sketch3d file
  saveToFile() {
    const json = JSON.stringify(this.serialize(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sketch.sketch3d';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Load project from .sketch3d file
  loadFromFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.sketch3d,.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) { resolve(false); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const data = JSON.parse(ev.target.result);
            resolve(this.deserialize(data));
          } catch (err) {
            console.warn('Load failed:', err);
            resolve(false);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  // New project — clear everything
  newProject() {
    this.strokeManager.loadStrokes([]);
    this.drawingPlane.group.position.set(0, 0, 0);
    this.drawingPlane.group.quaternion.set(0, 0, 0, 1);
    this.drawingPlane.updatePlane();
    this.camera.position.set(0, 5, 10);
    this.orbitControls.target.set(0, 0, 0);
    this.orbitControls.update();
    this.autoSave();
  }
}
```

**Step 3: Wire ProjectManager into main.js**

In `src/main.js`, add the import and instantiation. Add auto-save triggers on stroke end and plane move. Add auto-load on startup.

Replace the entire `src/main.js` with:

```js
// src/main.js
import { SceneManager } from './SceneManager.js';
import { DrawingPlane } from './DrawingPlane.js';
import { StrokeManager } from './StrokeManager.js';
import { ModeController } from './ModeController.js';
import { InputHandler } from './InputHandler.js';
import { PlaneHandles } from './PlaneHandles.js';
import { ProjectManager } from './ProjectManager.js';

const sceneManager = new SceneManager();
const drawingPlane = new DrawingPlane(sceneManager.scene);
const strokeManager = new StrokeManager(sceneManager.scene, drawingPlane, sceneManager.camera);
const modeController = new ModeController();

const projectManager = new ProjectManager(strokeManager, drawingPlane, sceneManager.camera, sceneManager.orbitControls);

modeController.setUndoRedoHandlers(
  () => { modeController.exitAdjusting(); planeHandles.hide(); strokeManager.undo(); projectManager.autoSave(); },
  () => { modeController.exitAdjusting(); planeHandles.hide(); strokeManager.redo(); projectManager.autoSave(); }
);

// Update shader uniforms each frame
sceneManager.addUpdateCallback(() => strokeManager.updateUniforms());

const planeHandles = new PlaneHandles(sceneManager.scene, drawingPlane, sceneManager.camera);

// Show/hide handles when adjusting state changes
modeController.onAdjustingChange((adjusting) => {
  if (adjusting) planeHandles.show();
  else { planeHandles.hide(); projectManager.autoSave(); }
});

// Update handles each frame to stay in sync with plane
sceneManager.addUpdateCallback(() => planeHandles.update());

const inputHandler = new InputHandler(
  sceneManager.canvas,
  sceneManager.camera,
  drawingPlane,
  strokeManager,
  modeController,
  sceneManager.orbitControls,
  planeHandles
);

// Auto-save after each stroke
const origEndStroke = strokeManager.endStroke.bind(strokeManager);
strokeManager.endStroke = function() {
  origEndStroke();
  projectManager.autoSave();
};

// Auto-save after each erase
const origRemoveStroke = strokeManager.removeStroke.bind(strokeManager);
strokeManager.removeStroke = function(stroke) {
  origRemoveStroke(stroke);
  projectManager.autoSave();
};

// Wire save/load/new buttons from ModeController
modeController.onSave(() => projectManager.saveToFile());
modeController.onLoad(async () => {
  const ok = await projectManager.loadFromFile();
  if (ok) modeController.exitAdjusting();
});
modeController.onNew(() => {
  if (confirm('Start a new project? Current work will be lost.')) {
    projectManager.newProject();
    modeController.exitAdjusting();
    planeHandles.hide();
  }
});

// Auto-load on startup
projectManager.autoLoad();
```

**Step 4: Add Save/Load/New buttons to ModeController**

In `src/ModeController.js`, add three new buttons and callback methods. Add these buttons BEFORE the existing ones.

In `_createToolbar()`, add before the `toolbar.append(...)` line:

```js
    this.newBtn = this._createButton('New', null);
    this.saveBtn = this._createButton('Save', null);
    this.loadBtn = this._createButton('Load', null);
```

Change the `toolbar.append(...)` line to:

```js
    toolbar.append(this.newBtn, this.saveBtn, this.loadBtn, this.undoBtn, this.redoBtn, this.eraserBtn, this.moveBtn);
```

Add callback registration methods after `setUndoRedoHandlers`:

```js
  onSave(fn) { this.saveBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); }); }
  onLoad(fn) { this.loadBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); }); }
  onNew(fn) { this.newBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); }); }
```

**Step 5: Verify app loads**

Run dev server, check:
- App loads without console errors
- Existing strokes draw correctly
- New/Save/Load buttons visible in toolbar
- Draw a few strokes, refresh page → strokes persist via auto-save
- Click Save → downloads .sketch3d file
- Click New → clears everything
- Click Load → restores from file

**Step 6: Commit**

```bash
git add src/ProjectManager.js src/StrokeManager.js src/ModeController.js src/main.js
git commit -m "Add ProjectManager with auto-save, file save/load, and new project"
```

---

### Task 2: Add Layer System

**Files:**
- Create: `src/LayerPanel.js`
- Modify: `src/StrokeManager.js`
- Modify: `src/ProjectManager.js`
- Modify: `src/main.js`

**Step 1: Add layer support to StrokeManager**

Add layer tracking to StrokeManager. Each stroke gets a `layerId` in `userData`. Add methods to set active layer, get strokes by layer, and toggle layer visibility.

In `src/StrokeManager.js`, add to the constructor after `this.currentPointCount = 0;`:

```js
    this.activeLayerId = null;
    this.layers = []; // [{id, name, visible}]
```

Add these methods:

```js
  setActiveLayer(layerId) {
    this.activeLayerId = layerId;
  }

  setLayerVisibility(layerId, visible) {
    for (const stroke of this.strokes) {
      if (stroke.userData.layerId === layerId) {
        stroke.visible = visible;
      }
    }
  }

  getStrokesByLayer(layerId) {
    return this.strokes.filter(s => s.userData.layerId === layerId);
  }

  removeStrokesByLayer(layerId) {
    const toRemove = this.strokes.filter(s => s.userData.layerId === layerId);
    for (const stroke of toRemove) {
      this.scene.remove(stroke);
      stroke.geometry.dispose();
      stroke.material.dispose();
    }
    this.strokes = this.strokes.filter(s => s.userData.layerId !== layerId);
    // Clear undo/redo since layer state changed
    this.undoStack = [];
    this.redoStack = [];
  }
```

In `endStroke()`, after the `userData.width` line, add:

```js
    this.currentStroke.userData.layerId = this.activeLayerId;
```

In `findNearestStroke()`, update to only find strokes in visible layers:

Replace `for (const stroke of this.strokes) {` with:

```js
    for (const stroke of this.strokes) {
      if (!stroke.visible) continue;
```

Update `serializeStrokes()` to include layerId:

```js
  serializeStrokes() {
    return this.strokes.map(stroke => {
      const positions = stroke.geometry.attributes.position;
      const points = [];
      for (let i = 0; i < positions.count; i++) {
        points.push({ x: positions.getX(i), y: positions.getY(i), z: positions.getZ(i) });
      }
      return {
        points,
        color: stroke.userData.color || '#222222',
        width: stroke.userData.width || 1,
        layerId: stroke.userData.layerId || null,
      };
    });
  }
```

Update `loadStrokes()` to restore layerId:

After `stroke.userData.width = data.width || 1;`, add:

```js
      stroke.userData.layerId = data.layerId || null;
```

**Step 2: Create LayerPanel**

Create `src/LayerPanel.js`:

```js
// src/LayerPanel.js

let nextId = 1;

function generateId() {
  return 'layer_' + (nextId++);
}

export class LayerPanel {
  constructor(strokeManager) {
    this.strokeManager = strokeManager;
    this.layers = [];
    this.activeLayerId = null;
    this._changeCallbacks = [];

    this._createPanel();
    this.addLayer('Layer 1');
  }

  _createPanel() {
    // Toggle button
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.textContent = 'Layers';
    this.toggleBtn.style.cssText = `
      position: fixed;
      top: 12px;
      left: 12px;
      padding: 8px 12px;
      border: none;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.85);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(8px);
      font-size: 14px;
      cursor: pointer;
      z-index: 101;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    `;
    this.toggleBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.panel.style.display = this.panel.style.display === 'none' ? 'flex' : 'none';
    });
    document.body.appendChild(this.toggleBtn);

    // Panel
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: fixed;
      top: 52px;
      left: 12px;
      width: 200px;
      max-height: 400px;
      overflow-y: auto;
      display: none;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
      border-radius: 12px;
      backdrop-filter: blur(8px);
      z-index: 101;
      user-select: none;
      -webkit-user-select: none;
    `;
    document.body.appendChild(this.panel);

    // Add layer button
    this.addBtn = document.createElement('button');
    this.addBtn.textContent = '+ Add Layer';
    this.addBtn.style.cssText = `
      padding: 6px;
      border: none;
      border-radius: 6px;
      background: rgba(33, 150, 243, 0.15);
      color: #1565c0;
      font-size: 13px;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    `;
    this.addBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.addLayer(`Layer ${this.layers.length + 1}`);
    });
    this.panel.appendChild(this.addBtn);

    this.listEl = document.createElement('div');
    this.listEl.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
    this.panel.insertBefore(this.listEl, this.addBtn);
  }

  addLayer(name) {
    const id = generateId();
    const layer = { id, name, visible: true };
    this.layers.push(layer);
    this.setActiveLayer(id);
    this._renderList();
    this._notifyChange();
    return layer;
  }

  removeLayer(id) {
    if (this.layers.length <= 1) return; // Must have at least one layer
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx === -1) return;
    if (!confirm(`Delete "${this.layers[idx].name}" and all its strokes?`)) return;

    this.strokeManager.removeStrokesByLayer(id);
    this.layers.splice(idx, 1);

    if (this.activeLayerId === id) {
      this.setActiveLayer(this.layers[0].id);
    }
    this._renderList();
    this._notifyChange();
  }

  setActiveLayer(id) {
    this.activeLayerId = id;
    this.strokeManager.setActiveLayer(id);
    this._renderList();
    this._notifyChange();
  }

  toggleVisibility(id) {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;
    layer.visible = !layer.visible;
    this.strokeManager.setLayerVisibility(id, layer.visible);
    this._renderList();
    this._notifyChange();
  }

  onChange(fn) {
    this._changeCallbacks.push(fn);
  }

  _notifyChange() {
    for (const fn of this._changeCallbacks) fn();
  }

  _renderList() {
    this.listEl.innerHTML = '';
    for (const layer of this.layers) {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        border-radius: 6px;
        background: ${layer.id === this.activeLayerId ? 'rgba(33, 150, 243, 0.15)' : 'transparent'};
        cursor: pointer;
      `;

      // Visibility toggle
      const eyeBtn = document.createElement('button');
      eyeBtn.textContent = layer.visible ? '👁' : '—';
      eyeBtn.style.cssText = 'border: none; background: none; font-size: 14px; cursor: pointer; padding: 2px; min-width: 24px;';
      eyeBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleVisibility(layer.id); });

      // Name
      const nameEl = document.createElement('span');
      nameEl.textContent = layer.name;
      nameEl.style.cssText = `flex: 1; font-size: 13px; color: ${layer.visible ? '#333' : '#999'};`;

      // Select layer on tap
      row.addEventListener('pointerdown', (e) => { e.preventDefault(); this.setActiveLayer(layer.id); });

      // Delete button
      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.style.cssText = 'border: none; background: none; color: #999; font-size: 12px; cursor: pointer; padding: 2px;';
      delBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.removeLayer(layer.id); });

      row.append(eyeBtn, nameEl, delBtn);
      this.listEl.appendChild(row);
    }
  }

  // Serialize layers for persistence
  serialize() {
    return {
      layers: this.layers.map(l => ({ id: l.id, name: l.name, visible: l.visible })),
      activeLayerId: this.activeLayerId,
    };
  }

  // Restore layers from persistence
  deserialize(data) {
    if (!data || !data.layers) return;
    this.layers = data.layers.map(l => ({ id: l.id, name: l.name, visible: l.visible }));
    // Ensure nextId doesn't collide
    for (const l of this.layers) {
      const num = parseInt(l.id.replace('layer_', ''), 10);
      if (num >= nextId) nextId = num + 1;
    }
    this.activeLayerId = data.activeLayerId || this.layers[0]?.id;
    this.strokeManager.setActiveLayer(this.activeLayerId);
    // Apply visibility
    for (const l of this.layers) {
      this.strokeManager.setLayerVisibility(l.id, l.visible);
    }
    this._renderList();
  }
}
```

**Step 3: Integrate layers into ProjectManager**

In `src/ProjectManager.js`, update constructor to accept layerPanel:

```js
  constructor(strokeManager, drawingPlane, camera, orbitControls, layerPanel) {
    this.strokeManager = strokeManager;
    this.drawingPlane = drawingPlane;
    this.camera = camera;
    this.orbitControls = orbitControls;
    this.layerPanel = layerPanel;
    this._autoSaveTimer = null;
  }
```

In `serialize()`, add after the strokes line:

```js
      layers: this.layerPanel ? this.layerPanel.serialize() : null,
```

In `deserialize()`, add after restoring strokes:

```js
    // Restore layers
    if (data.layers && this.layerPanel) {
      this.layerPanel.deserialize(data.layers);
    }
```

In `newProject()`, add after `this.strokeManager.loadStrokes([]);`:

```js
    if (this.layerPanel) {
      this.layerPanel.layers = [];
      this.layerPanel.addLayer('Layer 1');
    }
```

**Step 4: Wire LayerPanel into main.js**

In `src/main.js`, add the import:

```js
import { LayerPanel } from './LayerPanel.js';
```

After the `strokeManager` creation, add:

```js
const layerPanel = new LayerPanel(strokeManager);
```

Update the ProjectManager instantiation to include layerPanel:

```js
const projectManager = new ProjectManager(strokeManager, drawingPlane, sceneManager.camera, sceneManager.orbitControls, layerPanel);
```

Add auto-save trigger on layer change, after layerPanel creation:

```js
layerPanel.onChange(() => projectManager.autoSave());
```

**Step 5: Verify layers work**

Run dev server, check:
- Layers button visible top-left
- Click Layers → panel shows with "Layer 1"
- Draw strokes → they belong to Layer 1
- Add Layer 2, select it, draw → new strokes separate
- Toggle eye icon → hides/shows layer strokes
- Delete layer → removes strokes
- Refresh → layers and strokes persist

**Step 6: Commit**

```bash
git add src/LayerPanel.js src/StrokeManager.js src/ProjectManager.js src/main.js
git commit -m "Add layer system with panel, visibility toggle, and persistence"
```

---

### Task 3: Add Color Picker

**Files:**
- Modify: `src/ModeController.js`
- Modify: `src/StrokeManager.js`
- Modify: `src/main.js`

**Step 1: Add color state and UI to ModeController**

In `src/ModeController.js`, add to the constructor after `this._adjustingCallbacks = [];`:

```js
    this.activeColor = '#222222';
    this._colorCallbacks = [];
```

Add color palette in `_createToolbar()`, after the toolbar element creation but before button creation. Insert the following code right after the toolbar `style.cssText` block:

```js
    // Color palette
    const colorBar = document.createElement('div');
    colorBar.style.cssText = 'display: flex; gap: 4px; align-items: center; padding-right: 8px; border-right: 1px solid rgba(0,0,0,0.1);';

    const presetColors = ['#222222', '#f44336', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#ffffff', '#9e9e9e'];
    this._colorSwatches = [];

    for (const color of presetColors) {
      const swatch = document.createElement('button');
      swatch.style.cssText = `
        width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent;
        background: ${color}; cursor: pointer; touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        ${color === '#ffffff' ? 'box-shadow: inset 0 0 0 1px #ccc;' : ''}
      `;
      swatch.addEventListener('pointerdown', (e) => { e.preventDefault(); this._setColor(color); });
      colorBar.appendChild(swatch);
      this._colorSwatches.push({ el: swatch, color });
    }

    // Custom color picker
    const customInput = document.createElement('input');
    customInput.type = 'color';
    customInput.value = '#222222';
    customInput.style.cssText = 'width: 28px; height: 28px; border: none; padding: 0; cursor: pointer; border-radius: 50%; overflow: hidden;';
    customInput.addEventListener('input', (e) => { this._setColor(e.target.value); });
    colorBar.appendChild(customInput);
    this._customColorInput = customInput;
```

Change the toolbar.append to include colorBar first:

```js
    toolbar.append(colorBar, this.newBtn, this.saveBtn, this.loadBtn, this.undoBtn, this.redoBtn, this.eraserBtn, this.moveBtn);
```

Add these methods:

```js
  _setColor(color) {
    this.activeColor = color;
    this._updateColorSwatches();
    for (const cb of this._colorCallbacks) cb(color);
  }

  _updateColorSwatches() {
    for (const s of this._colorSwatches) {
      s.el.style.borderColor = s.color === this.activeColor ? '#1565c0' : 'transparent';
    }
  }

  onColorChange(fn) {
    this._colorCallbacks.push(fn);
  }
```

Call `this._updateColorSwatches()` at the end of `_createToolbar()`.

**Step 2: Apply color to strokes in StrokeManager**

In `src/StrokeManager.js`, update the shader to use per-stroke color:

Change `_createMaterial()` to accept an optional color parameter:

```js
  _createMaterial(color) {
    const uniforms = {
      uColor: { value: color ? new THREE.Color(color) : STROKE_COLOR.clone() },
      uPlaneNormal: this.sharedUniforms.uPlaneNormal,
      uPlanePoint: this.sharedUniforms.uPlanePoint,
      uCameraPosition: this.sharedUniforms.uCameraPosition,
    };
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
    });
  }
```

Update `beginStroke` to accept and use color:

```js
  beginStroke(point, color) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_POINTS_PER_STROKE * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setDrawRange(0, 0);

    const material = this._createMaterial(color);
    this.currentStroke = new THREE.Line(geometry, material);
    this.currentStroke.userData.color = color || '#222222';
    this.currentPointCount = 0;
    this.scene.add(this.currentStroke);

    this.addPoint(point);
  }
```

Update `loadStrokes` to use stored color:

In the stroke rebuild loop, change `const material = this._createMaterial();` to:

```js
      const material = this._createMaterial(data.color);
```

**Step 3: Wire color to InputHandler**

In `src/InputHandler.js`, update `_onPointerDown` draw section:

Change `this.strokeManager.beginStroke(point);` to:

```js
    this.strokeManager.beginStroke(point, this.modeController.activeColor);
```

**Step 4: Verify colors work**

Run dev server, check:
- Color swatches visible in toolbar
- Tap red swatch → active indicator appears
- Draw → strokes are red
- Switch colors, draw → different colored strokes
- Save/load → colors preserved

**Step 5: Commit**

```bash
git add src/ModeController.js src/StrokeManager.js src/InputHandler.js
git commit -m "Add color picker with preset swatches and custom color input"
```

---

### Task 4: Add Line Width Control

**Files:**
- Modify: `src/ModeController.js`
- Modify: `src/StrokeManager.js`
- Modify: `src/InputHandler.js`

**Step 1: Add width buttons to ModeController**

In `src/ModeController.js`, add to constructor after `this._colorCallbacks = [];`:

```js
    this.activeWidth = 1; // 1=thin, 2=medium, 3=thick
    this._widthCallbacks = [];
```

In `_createToolbar()`, after the color bar section, add a width bar:

```js
    // Width selector
    const widthBar = document.createElement('div');
    widthBar.style.cssText = 'display: flex; gap: 4px; align-items: center; padding-right: 8px; border-right: 1px solid rgba(0,0,0,0.1);';

    this._widthButtons = [];
    const widths = [
      { label: '╌', value: 1, title: 'Thin' },
      { label: '─', value: 2, title: 'Medium' },
      { label: '━', value: 3, title: 'Thick' },
    ];

    for (const w of widths) {
      const btn = document.createElement('button');
      btn.textContent = w.label;
      btn.title = w.title;
      btn.style.cssText = `
        min-width: 36px; min-height: 36px; border: 2px solid transparent;
        border-radius: 6px; background: rgba(0,0,0,0.06); font-size: 16px;
        cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
      `;
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this._setWidth(w.value); });
      widthBar.appendChild(btn);
      this._widthButtons.push({ el: btn, value: w.value });
    }
```

Update toolbar.append to include widthBar:

```js
    toolbar.append(colorBar, widthBar, this.newBtn, this.saveBtn, this.loadBtn, this.undoBtn, this.redoBtn, this.eraserBtn, this.moveBtn);
```

Add methods:

```js
  _setWidth(value) {
    this.activeWidth = value;
    this._updateWidthButtons();
    for (const cb of this._widthCallbacks) cb(value);
  }

  _updateWidthButtons() {
    for (const w of this._widthButtons) {
      w.el.style.borderColor = w.value === this.activeWidth ? '#1565c0' : 'transparent';
      w.el.style.background = w.value === this.activeWidth ? 'rgba(33, 150, 243, 0.15)' : 'rgba(0,0,0,0.06)';
    }
  }

  onWidthChange(fn) {
    this._widthCallbacks.push(fn);
  }
```

Call `this._updateWidthButtons()` at the end of `_createToolbar()`.

**Step 2: Add TubeGeometry stroke support to StrokeManager**

In `src/StrokeManager.js`, add a method to create a tube mesh from points. Update `beginStroke` to accept width. Update `endStroke` to convert to tube if width > 1.

Add width parameter to `beginStroke`:

```js
  beginStroke(point, color, width) {
    // ... existing code ...
    this.currentStroke.userData.color = color || '#222222';
    this.currentStroke.userData.width = width || 1;
    // ... rest ...
  }
```

Add tube conversion at the end of `endStroke()`, after trimming positions but before `this.strokes.push(...)`:

```js
    const width = this.currentStroke.userData.width || 1;
    if (width > 1) {
      // Convert line to tube mesh for visible thickness
      const pts = [];
      for (let i = 0; i < this.currentPointCount; i++) {
        pts.push(new THREE.Vector3(trimmed[i*3], trimmed[i*3+1], trimmed[i*3+2]));
      }
      if (pts.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(pts, false);
        const radius = width === 2 ? 0.02 : 0.05;
        const tubeGeo = new THREE.TubeGeometry(curve, Math.max(pts.length * 2, 8), radius, 6, false);
        const tubeMat = this._createTubeMaterial(this.currentStroke.userData.color);

        // Remove the line, replace with tube
        this.scene.remove(this.currentStroke);
        this.currentStroke.geometry.dispose();
        this.currentStroke.material.dispose();

        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.userData = { color: this.currentStroke.userData.color, width, layerId: this.currentStroke.userData.layerId };
        // Store original points for serialization
        tubeMesh.userData._points = trimmed;
        tubeMesh.userData._pointCount = this.currentPointCount;
        this.scene.add(tubeMesh);
        this.currentStroke = tubeMesh;
      }
    }
```

Add the tube material method (uses the same depth-fading shader but for meshes):

```js
  _createTubeMaterial(color) {
    const TUBE_VERTEX_SHADER = `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `;
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color || '#222222') },
        uPlaneNormal: this.sharedUniforms.uPlaneNormal,
        uPlanePoint: this.sharedUniforms.uPlanePoint,
        uCameraPosition: this.sharedUniforms.uCameraPosition,
      },
      vertexShader: TUBE_VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
    });
  }
```

Update `serializeStrokes()` to handle tube meshes (they store points in userData):

```js
  serializeStrokes() {
    return this.strokes.map(stroke => {
      let points = [];
      if (stroke.userData._points) {
        // Tube mesh — points stored in userData
        const arr = stroke.userData._points;
        const count = stroke.userData._pointCount;
        for (let i = 0; i < count; i++) {
          points.push({ x: arr[i*3], y: arr[i*3+1], z: arr[i*3+2] });
        }
      } else {
        // Line — points in geometry
        const positions = stroke.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          points.push({ x: positions.getX(i), y: positions.getY(i), z: positions.getZ(i) });
        }
      }
      return {
        points,
        color: stroke.userData.color || '#222222',
        width: stroke.userData.width || 1,
        layerId: stroke.userData.layerId || null,
      };
    });
  }
```

Update `loadStrokes()` to rebuild tubes for width > 1:

```js
  loadStrokes(strokeDataArray) {
    for (const stroke of this.strokes) {
      this.scene.remove(stroke);
      stroke.geometry.dispose();
      stroke.material.dispose();
    }
    this.strokes = [];
    this.undoStack = [];
    this.redoStack = [];
    this.currentStroke = null;

    for (const data of strokeDataArray) {
      if (data.points.length < 2) continue;
      const width = data.width || 1;

      if (width > 1) {
        // Rebuild as tube
        const pts = data.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        const curve = new THREE.CatmullRomCurve3(pts, false);
        const radius = width === 2 ? 0.02 : 0.05;
        const tubeGeo = new THREE.TubeGeometry(curve, Math.max(pts.length * 2, 8), radius, 6, false);
        const tubeMat = this._createTubeMaterial(data.color);
        const mesh = new THREE.Mesh(tubeGeo, tubeMat);
        const posArr = new Float32Array(data.points.length * 3);
        for (let i = 0; i < data.points.length; i++) {
          posArr[i*3] = data.points[i].x;
          posArr[i*3+1] = data.points[i].y;
          posArr[i*3+2] = data.points[i].z;
        }
        mesh.userData = { color: data.color, width, layerId: data.layerId, _points: posArr, _pointCount: data.points.length };
        this.scene.add(mesh);
        this.strokes.push(mesh);
      } else {
        // Rebuild as line
        const positions = new Float32Array(data.points.length * 3);
        for (let i = 0; i < data.points.length; i++) {
          positions[i * 3] = data.points[i].x;
          positions[i * 3 + 1] = data.points[i].y;
          positions[i * 3 + 2] = data.points[i].z;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, data.points.length);
        const material = this._createMaterial(data.color);
        const stroke = new THREE.Line(geometry, material);
        stroke.userData = { color: data.color || '#222222', width: 1, layerId: data.layerId || null };
        this.scene.add(stroke);
        this.strokes.push(stroke);
      }
    }
  }
```

**Step 3: Pass width from InputHandler**

In `src/InputHandler.js`, update the draw section in `_onPointerDown`:

Change `this.strokeManager.beginStroke(point, this.modeController.activeColor);` to:

```js
    this.strokeManager.beginStroke(point, this.modeController.activeColor, this.modeController.activeWidth);
```

**Step 4: Verify width controls work**

Run dev server, check:
- Three width buttons visible in toolbar
- Select medium → draw → slightly thicker tube strokes
- Select thick → draw → visibly thick tubes
- Thin still uses line rendering
- Save/load preserves widths

**Step 5: Commit**

```bash
git add src/ModeController.js src/StrokeManager.js src/InputHandler.js
git commit -m "Add line width control with TubeGeometry for thick strokes"
```

---

### Task 5: Add STL/OBJ Export

**Files:**
- Create: `src/ExportManager.js`
- Modify: `src/ModeController.js`
- Modify: `src/main.js`

**Step 1: Create ExportManager**

Create `src/ExportManager.js`:

```js
// src/ExportManager.js
import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

const DEFAULT_TUBE_RADIUS = 0.015;

export class ExportManager {
  constructor(strokeManager) {
    this.strokeManager = strokeManager;
  }

  // Convert all visible strokes to a scene of tube meshes for export
  _buildExportScene() {
    const exportScene = new THREE.Scene();

    for (const stroke of this.strokeManager.strokes) {
      if (!stroke.visible) continue;

      // Get points
      let points = [];
      if (stroke.userData._points) {
        const arr = stroke.userData._points;
        const count = stroke.userData._pointCount;
        for (let i = 0; i < count; i++) {
          points.push(new THREE.Vector3(arr[i*3], arr[i*3+1], arr[i*3+2]));
        }
      } else if (stroke.geometry?.attributes?.position) {
        const positions = stroke.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          points.push(new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i)));
        }
      }

      if (points.length < 2) continue;

      const width = stroke.userData.width || 1;
      const radius = width === 3 ? 0.05 : width === 2 ? 0.02 : DEFAULT_TUBE_RADIUS;
      const color = stroke.userData.color || '#222222';

      const curve = new THREE.CatmullRomCurve3(points, false);
      const tubeGeo = new THREE.TubeGeometry(curve, Math.max(points.length * 2, 8), radius, 8, false);
      const material = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(tubeGeo, material);
      exportScene.add(mesh);
    }

    return exportScene;
  }

  exportSTL() {
    const scene = this._buildExportScene();
    const exporter = new STLExporter();
    const result = exporter.parse(scene, { binary: true });
    const blob = new Blob([result], { type: 'application/octet-stream' });
    this._download(blob, 'sketch.stl');
    this._disposeScene(scene);
  }

  exportOBJ() {
    const scene = this._buildExportScene();
    const exporter = new OBJExporter();
    const result = exporter.parse(scene);
    const blob = new Blob([result], { type: 'text/plain' });
    this._download(blob, 'sketch.obj');
    this._disposeScene(scene);
  }

  _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  _disposeScene(scene) {
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}
```

**Step 2: Add Export button and modal to ModeController**

In `src/ModeController.js`, add an export button in `_createToolbar()`:

```js
    this.exportBtn = this._createButton('Export', () => this._showExportModal());
```

Add it to toolbar.append (at the end):

```js
    toolbar.append(colorBar, widthBar, this.newBtn, this.saveBtn, this.loadBtn, this.undoBtn, this.redoBtn, this.eraserBtn, this.moveBtn, this.exportBtn);
```

Add to constructor:

```js
    this._exportCallbacks = { stl: null, obj: null };
```

Add methods:

```js
  _showExportModal() {
    // Simple modal with format choice
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 200;
      display: flex; align-items: center; justify-content: center;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white; border-radius: 12px; padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2); min-width: 200px; text-align: center;
    `;

    const title = document.createElement('div');
    title.textContent = 'Export Format';
    title.style.cssText = 'font-size: 16px; font-weight: bold; margin-bottom: 12px;';

    const stlBtn = document.createElement('button');
    stlBtn.textContent = 'STL (3D Printing)';
    stlBtn.style.cssText = 'display: block; width: 100%; padding: 10px; margin: 4px 0; border: none; border-radius: 8px; background: #2196f3; color: white; font-size: 14px; cursor: pointer;';
    stlBtn.addEventListener('click', () => { overlay.remove(); if (this._exportCallbacks.stl) this._exportCallbacks.stl(); });

    const objBtn = document.createElement('button');
    objBtn.textContent = 'OBJ (Universal)';
    objBtn.style.cssText = 'display: block; width: 100%; padding: 10px; margin: 4px 0; border: none; border-radius: 8px; background: #4caf50; color: white; font-size: 14px; cursor: pointer;';
    objBtn.addEventListener('click', () => { overlay.remove(); if (this._exportCallbacks.obj) this._exportCallbacks.obj(); });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'display: block; width: 100%; padding: 10px; margin: 8px 0 0 0; border: none; border-radius: 8px; background: rgba(0,0,0,0.06); font-size: 14px; cursor: pointer;';
    cancelBtn.addEventListener('click', () => overlay.remove());

    modal.append(title, stlBtn, objBtn, cancelBtn);
    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  onExport(format, fn) {
    this._exportCallbacks[format] = fn;
  }
```

**Step 3: Wire ExportManager in main.js**

In `src/main.js`, add:

```js
import { ExportManager } from './ExportManager.js';
```

After projectManager creation:

```js
const exportManager = new ExportManager(strokeManager);
modeController.onExport('stl', () => exportManager.exportSTL());
modeController.onExport('obj', () => exportManager.exportOBJ());
```

**Step 4: Verify export works**

Run dev server, draw some strokes, click Export:
- Modal appears with STL/OBJ/Cancel
- Click STL → downloads sketch.stl
- Click OBJ → downloads sketch.obj
- Import into a 3D viewer to verify geometry

**Step 5: Commit**

```bash
git add src/ExportManager.js src/ModeController.js src/main.js
git commit -m "Add STL and OBJ export with tube geometry conversion"
```

---

### Task 6: Add Measurement Tool

**Files:**
- Create: `src/MeasurementTool.js`
- Modify: `src/ModeController.js`
- Modify: `src/InputHandler.js`
- Modify: `src/ProjectManager.js`
- Modify: `src/main.js`

**Step 1: Create MeasurementTool**

Create `src/MeasurementTool.js`:

```js
// src/MeasurementTool.js
import * as THREE from 'three';

export class MeasurementTool {
  constructor(scene) {
    this.scene = scene;
    this.measurements = []; // [{line, label, p1, p2, distance}]
    this._pendingPoint = null;
    this._pendingMarker = null;
  }

  // Called when user taps a point in measurement mode
  addPoint(point) {
    if (!this._pendingPoint) {
      // First point — show marker
      this._pendingPoint = point.clone();
      this._pendingMarker = this._createMarker(point);
      this.scene.add(this._pendingMarker);
      return null;
    }

    // Second point — create measurement
    const p1 = this._pendingPoint;
    const p2 = point.clone();
    const distance = p1.distanceTo(p2);

    // Line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const lineMat = new THREE.LineDashedMaterial({ color: 0xff6600, dashSize: 0.1, gapSize: 0.05 });
    const line = new THREE.Line(lineGeo, lineMat);
    line.computeLineDistances();
    this.scene.add(line);

    // Label
    const label = this._createLabel(distance);
    const mid = p1.clone().add(p2).multiplyScalar(0.5);
    mid.y += 0.3;
    label.position.copy(mid);
    this.scene.add(label);

    // End markers
    const marker2 = this._createMarker(p2);
    this.scene.add(marker2);

    const measurement = { line, label, marker1: this._pendingMarker, marker2, p1, p2, distance };
    this.measurements.push(measurement);

    // Reset pending
    this._pendingPoint = null;
    this._pendingMarker = null;

    return measurement;
  }

  cancelPending() {
    if (this._pendingMarker) {
      this.scene.remove(this._pendingMarker);
      this._pendingMarker.geometry?.dispose();
      this._pendingMarker.material?.dispose();
    }
    this._pendingPoint = null;
    this._pendingMarker = null;
  }

  clearAll() {
    this.cancelPending();
    for (const m of this.measurements) {
      this.scene.remove(m.line);
      this.scene.remove(m.label);
      this.scene.remove(m.marker1);
      this.scene.remove(m.marker2);
      m.line.geometry.dispose();
      m.line.material.dispose();
      m.label.material.map.dispose();
      m.label.material.dispose();
      m.marker1.geometry?.dispose();
      m.marker1.material?.dispose();
      m.marker2.geometry?.dispose();
      m.marker2.material?.dispose();
    }
    this.measurements = [];
  }

  _createMarker(point) {
    const geo = new THREE.SphereGeometry(0.05, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(point);
    return mesh;
  }

  _createLabel(distance) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 120, 56, 8);
    ctx.fill();
    ctx.fillStyle = '#ff6600';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(distance.toFixed(2), 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.2, 0.6, 1);
    return sprite;
  }

  // Serialize for persistence
  serialize() {
    return this.measurements.map(m => ({
      p1: { x: m.p1.x, y: m.p1.y, z: m.p1.z },
      p2: { x: m.p2.x, y: m.p2.y, z: m.p2.z },
    }));
  }

  // Restore from persistence
  deserialize(data) {
    this.clearAll();
    if (!data) return;
    for (const m of data) {
      this._pendingPoint = new THREE.Vector3(m.p1.x, m.p1.y, m.p1.z);
      this._pendingMarker = this._createMarker(this._pendingPoint);
      this.scene.add(this._pendingMarker);
      this.addPoint(new THREE.Vector3(m.p2.x, m.p2.y, m.p2.z));
    }
  }
}
```

**Step 2: Add Ruler mode to ModeController**

In `src/ModeController.js`, add to constructor:

```js
    this.rulerActive = false;
    this._rulerCallbacks = [];
```

In `_createToolbar()`, add a ruler button:

```js
    this.rulerBtn = this._createButton('Ruler', () => this._toggleRuler());
    this.clearMeasBtn = this._createButton('Clear', null);
    this.clearMeasBtn.style.display = 'none';
```

Add to toolbar.append:

```js
    toolbar.append(colorBar, widthBar, this.newBtn, this.saveBtn, this.loadBtn, this.undoBtn, this.redoBtn, this.eraserBtn, this.rulerBtn, this.clearMeasBtn, this.moveBtn, this.exportBtn);
```

Add methods:

```js
  _toggleRuler() {
    this.rulerActive = !this.rulerActive;
    if (this.rulerActive) {
      this.eraserActive = false;
      if (this.adjustingPlane) this.exitAdjusting();
    }
    this._updateButtonStates();
  }

  onClearMeasurements(fn) {
    this.clearMeasBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
  }
```

In `_updateButtonStates()`, add:

```js
    // Ruler button
    this.rulerBtn.style.background = this.rulerActive
      ? 'rgba(255, 152, 0, 0.2)' : 'rgba(0, 0, 0, 0.06)';
    this.rulerBtn.style.color = this.rulerActive ? '#e65100' : '#333';
    this.clearMeasBtn.style.display = this.rulerActive ? '' : 'none';
```

In `_toggleEraser()`, add `this.rulerActive = false;` when eraser activates.
In `_toggleAdjusting()`, add `this.rulerActive = false;` before `this.enterAdjusting()`.

**Step 3: Handle ruler input in InputHandler**

In `src/InputHandler.js`, add a `measurementTool` property. Update constructor to accept it:

```js
  constructor(canvas, camera, drawingPlane, strokeManager, modeController, orbitControls, planeHandles, measurementTool) {
    // ... existing ...
    this.measurementTool = measurementTool;
```

In `_onPointerDown`, add after the adjusting block and before the eraser block:

```js
    // Ruler
    if (this.modeController.rulerActive) {
      const point = this.drawingPlane.raycast(ndc.x, ndc.y, this.camera);
      if (point) {
        this.measurementTool.addPoint(point);
      }
      e.preventDefault();
      return;
    }
```

**Step 4: Wire MeasurementTool in main.js**

In `src/main.js`:

```js
import { MeasurementTool } from './MeasurementTool.js';
```

After planeHandles creation:

```js
const measurementTool = new MeasurementTool(sceneManager.scene);
```

Update InputHandler to pass measurementTool:

```js
const inputHandler = new InputHandler(
  sceneManager.canvas,
  sceneManager.camera,
  drawingPlane,
  strokeManager,
  modeController,
  sceneManager.orbitControls,
  planeHandles,
  measurementTool
);
```

Wire clear button:

```js
modeController.onClearMeasurements(() => measurementTool.clearAll());
```

Update ProjectManager serialize/deserialize to include measurements:

In serialize(), add: `measurements: measurementTool.serialize(),`
In deserialize(), add: `if (data.measurements) measurementTool.deserialize(data.measurements);`

(This requires passing measurementTool to ProjectManager constructor — add it as an additional parameter.)

**Step 5: Verify ruler works**

Run dev server:
- Tap Ruler → button highlights
- Tap first point → orange marker appears
- Tap second point → dashed line + distance label
- Clear button removes all measurements
- Save/load preserves measurements

**Step 6: Commit**

```bash
git add src/MeasurementTool.js src/ModeController.js src/InputHandler.js src/ProjectManager.js src/main.js
git commit -m "Add measurement ruler tool with persistence"
```

---

### Task 7: Add Plane Presets

**Files:**
- Modify: `src/ModeController.js`
- Modify: `src/DrawingPlane.js`
- Modify: `src/main.js`

**Step 1: Add preset method to DrawingPlane**

In `src/DrawingPlane.js`, add:

```js
  setPreset(name) {
    const presets = {
      XZ: { normal: new THREE.Vector3(0, 1, 0), point: new THREE.Vector3(0, 0, 0) },
      XY: { normal: new THREE.Vector3(0, 0, 1), point: new THREE.Vector3(0, 0, 0) },
      YZ: { normal: new THREE.Vector3(1, 0, 0), point: new THREE.Vector3(0, 0, 0) },
    };
    const p = presets[name];
    if (p) this.setFromNormalAndPoint(p.normal, p.point);
  }
```

**Step 2: Add preset buttons to ModeController**

These buttons should only appear when adjusting mode is active. In `_createToolbar()`, create a preset container:

```js
    // Plane presets (visible only in adjust mode)
    this._presetBar = document.createElement('div');
    this._presetBar.style.cssText = 'display: none; gap: 4px; align-items: center;';

    this._presetCallbacks = [];
    for (const name of ['XZ', 'XY', 'YZ']) {
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.style.cssText = `
        min-width: 36px; min-height: 36px; border: none; border-radius: 6px;
        background: rgba(33, 150, 243, 0.1); color: #1565c0; font-size: 13px; font-weight: bold;
        cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
      `;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        for (const cb of this._presetCallbacks) cb(name);
      });
      this._presetBar.appendChild(btn);
    }
```

Add `this._presetBar` to toolbar.append.

In `_updateButtonStates()`, add:

```js
    // Preset bar visibility
    this._presetBar.style.display = this.adjustingPlane ? 'flex' : 'none';
```

Add callback method:

```js
  onPreset(fn) {
    this._presetCallbacks.push(fn);
  }
```

**Step 3: Wire presets in main.js**

```js
modeController.onPreset((name) => {
  drawingPlane.setPreset(name);
  planeHandles.update();
  projectManager.autoSave();
});
```

**Step 4: Verify presets work**

Run dev server, tap Move, preset buttons appear:
- Tap XZ → plane resets to horizontal
- Tap XY → plane vertical facing camera
- Tap YZ → plane vertical side view

**Step 5: Commit**

```bash
git add src/DrawingPlane.js src/ModeController.js src/main.js
git commit -m "Add plane preset buttons (XZ, XY, YZ) in adjust mode"
```

---

### Task 8: Add Viewport Orientation Gizmo

**Files:**
- Create: `src/ViewportGizmo.js`
- Modify: `src/main.js`

**Step 1: Create ViewportGizmo**

Create `src/ViewportGizmo.js`:

```js
// src/ViewportGizmo.js
import * as THREE from 'three';

const SIZE = 120;
const AXIS_LENGTH = 0.8;
const LABEL_OFFSET = 1.0;

export class ViewportGizmo {
  constructor(mainCamera, orbitControls) {
    this.mainCamera = mainCamera;
    this.orbitControls = orbitControls;
    this._animating = false;

    // Create overlay canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIZE * window.devicePixelRatio;
    this.canvas.height = SIZE * window.devicePixelRatio;
    this.canvas.style.cssText = `
      position: fixed;
      top: 12px;
      right: 12px;
      width: ${SIZE}px;
      height: ${SIZE}px;
      z-index: 100;
      cursor: pointer;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.3);
      touch-action: none;
    `;
    document.body.appendChild(this.canvas);

    // Secondary scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 10);
    this.camera.position.set(0, 0, 3);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(SIZE, SIZE);
    this.renderer.setClearColor(0x000000, 0);

    this._createAxes();
    this._createLabels();

    // Click to snap camera
    this.canvas.addEventListener('pointerdown', (e) => this._onClick(e));
  }

  _createAxes() {
    // X axis (red)
    const xGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(AXIS_LENGTH, 0, 0),
    ]);
    this.scene.add(new THREE.Line(xGeo, new THREE.LineBasicMaterial({ color: 0xff4444, linewidth: 2 })));

    // Y axis (green)
    const yGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, AXIS_LENGTH, 0),
    ]);
    this.scene.add(new THREE.Line(yGeo, new THREE.LineBasicMaterial({ color: 0x44cc44, linewidth: 2 })));

    // Z axis (blue)
    const zGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, AXIS_LENGTH),
    ]);
    this.scene.add(new THREE.Line(zGeo, new THREE.LineBasicMaterial({ color: 0x4444ff, linewidth: 2 })));

    // Axis endpoint spheres
    const sphereGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const xSphere = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: 0xff4444 }));
    xSphere.position.set(AXIS_LENGTH, 0, 0);
    this.scene.add(xSphere);

    const ySphere = new THREE.Mesh(sphereGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x44cc44 }));
    ySphere.position.set(0, AXIS_LENGTH, 0);
    this.scene.add(ySphere);

    const zSphere = new THREE.Mesh(sphereGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x4444ff }));
    zSphere.position.set(0, 0, AXIS_LENGTH);
    this.scene.add(zSphere);
  }

  _createLabels() {
    this._labels = [];
    const labelData = [
      { text: 'X', color: '#ff4444', pos: new THREE.Vector3(LABEL_OFFSET, 0, 0) },
      { text: 'Y', color: '#44cc44', pos: new THREE.Vector3(0, LABEL_OFFSET, 0) },
      { text: 'Z', color: '#4444ff', pos: new THREE.Vector3(0, 0, LABEL_OFFSET) },
    ];

    for (const ld of labelData) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = ld.color;
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ld.text, 32, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.4, 0.4, 1);
      sprite.position.copy(ld.pos);
      this.scene.add(sprite);
      this._labels.push(sprite);
    }
  }

  _onClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Map click to camera direction
    const views = [
      { dir: new THREE.Vector3(0, 0, 1), label: 'Front', range: { x: [-0.3, 0.3], y: [-0.3, 0.3] } },
      { dir: new THREE.Vector3(0, 1, 0), label: 'Top' },
      { dir: new THREE.Vector3(1, 0, 0), label: 'Right' },
      { dir: new THREE.Vector3(0, -1, 0), label: 'Bottom' },
      { dir: new THREE.Vector3(-1, 0, 0), label: 'Left' },
      { dir: new THREE.Vector3(0, 0, -1), label: 'Back' },
    ];

    // Use raycasting on the gizmo scene
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // Simple approach: determine which axis direction is closest to click
    // Project axis endpoints to screen and find closest to click
    let closestView = null;
    let closestDist = Infinity;

    for (const view of views) {
      const screenPos = view.dir.clone().project(this.camera);
      const dx = screenPos.x - x;
      const dy = screenPos.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist && dist < 0.8) {
        closestDist = dist;
        closestView = view;
      }
    }

    if (closestView) {
      this._animateToView(closestView.dir);
    }
  }

  _animateToView(direction) {
    if (this._animating) return;
    this._animating = true;

    const target = this.orbitControls.target.clone();
    const distance = this.mainCamera.position.distanceTo(target);
    const endPos = target.clone().addScaledVector(direction, distance);

    const startPos = this.mainCamera.position.clone();
    const startTime = performance.now();
    const duration = 400;

    const animate = () => {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      const eased = t * (2 - t); // ease-out quadratic
      this.mainCamera.position.lerpVectors(startPos, endPos, eased);
      this.mainCamera.lookAt(target);
      this.orbitControls.update();

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this._animating = false;
      }
    };

    requestAnimationFrame(animate);
  }

  // Call each frame to sync orientation with main camera
  update() {
    // Copy main camera's rotation to gizmo camera
    const dir = new THREE.Vector3();
    this.mainCamera.getWorldDirection(dir);
    this.camera.position.copy(dir.multiplyScalar(-3));
    this.camera.lookAt(0, 0, 0);
    this.camera.up.copy(this.mainCamera.up);

    this.renderer.render(this.scene, this.camera);
  }
}
```

**Step 2: Wire ViewportGizmo into main.js**

In `src/main.js`, add:

```js
import { ViewportGizmo } from './ViewportGizmo.js';
```

After orbitControls setup (after inputHandler creation):

```js
const viewportGizmo = new ViewportGizmo(sceneManager.camera, sceneManager.orbitControls);
sceneManager.addUpdateCallback(() => viewportGizmo.update());
```

**Step 3: Verify gizmo works**

Run dev server:
- Small gizmo visible top-right with colored X/Y/Z axes
- Rotate the scene → gizmo rotates to match
- Click on an axis in the gizmo → camera animates to that view

**Step 4: Commit**

```bash
git add src/ViewportGizmo.js src/main.js
git commit -m "Add viewport orientation gizmo with click-to-snap camera"
```

---

## Summary

| Task | Feature | New Files | Modified Files |
|------|---------|-----------|----------------|
| 1 | Persistence | `ProjectManager.js` | `StrokeManager.js`, `ModeController.js`, `main.js` |
| 2 | Layers | `LayerPanel.js` | `StrokeManager.js`, `ProjectManager.js`, `main.js` |
| 3 | Color Picker | — | `ModeController.js`, `StrokeManager.js`, `InputHandler.js` |
| 4 | Line Width | — | `ModeController.js`, `StrokeManager.js`, `InputHandler.js` |
| 5 | Export STL/OBJ | `ExportManager.js` | `ModeController.js`, `main.js` |
| 6 | Measurement | `MeasurementTool.js` | `ModeController.js`, `InputHandler.js`, `ProjectManager.js`, `main.js` |
| 7 | Plane Presets | — | `DrawingPlane.js`, `ModeController.js`, `main.js` |
| 8 | Viewport Gizmo | `ViewportGizmo.js` | `main.js` |
