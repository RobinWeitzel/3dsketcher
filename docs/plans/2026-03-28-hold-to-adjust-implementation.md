# Hold-to-Adjust Plane Switching Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable hold-pen-barrel-button to temporarily enter plane adjustment mode, and promote plane presets + Move Plane toggle to the main toolbar for quick access.

**Architecture:** Add barrel button detection in InputHandler, add `_holdAdjusting` flag in ModeController to distinguish barrel-hold from toggle, move Move Plane and presets out of the Tools dropdown into the toolbar bar.

**Tech Stack:** Vanilla JS, Lucide icons, pointer events API

---

### Task 1: Add barrel button hold-to-adjust in InputHandler

**Files:**
- Modify: `src/InputHandler.js`

**Step 1: Add barrel hold state to constructor**

In the constructor (after line 16 `this.isErasing = false;`), add:

```javascript
this._barrelHold = false;
```

**Step 2: Add barrel button detection to _onPointerDown**

At the top of `_onPointerDown`, before the existing `if (e.pointerType !== 'pen') return;` check, add barrel button handling. The pen barrel button is `e.button === 5`. When pressed, enter adjust mode temporarily:

Replace the entire `_onPointerDown` method with:

```javascript
_onPointerDown(e) {
  if (e.pointerType !== 'pen') return;

  // Barrel button → hold-to-adjust
  if (e.button === 5) {
    this._barrelHold = true;
    this.modeController.enterAdjusting(true); // true = hold mode
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
```

**Step 3: Add barrel button release to _onPointerUp**

Replace the entire `_onPointerUp` method with:

```javascript
_onPointerUp(e) {
  if (e.pointerType !== 'pen') return;

  // Barrel button release → exit hold-to-adjust
  if (e.button === 5 && this._barrelHold) {
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
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: Build will fail because `exitHoldAdjusting` doesn't exist yet on ModeController. That's OK — we'll add it in Task 2.

---

### Task 2: Add hold-adjust support to ModeController

**Files:**
- Modify: `src/ModeController.js`

**Step 1: Add `_holdAdjusting` flag to constructor**

In the constructor (after `this.adjustingPlane = false;`), add:

```javascript
this._holdAdjusting = false;
```

**Step 2: Update `enterAdjusting` to accept hold parameter**

Replace the `enterAdjusting` method with:

```javascript
enterAdjusting(hold = false) {
  this._holdAdjusting = hold;
  this.adjustingPlane = true;
  this._updateButtonStates();
  for (const cb of this._adjustingCallbacks) cb(true);
}
```

**Step 3: Add `exitHoldAdjusting` method**

Add this new method after `exitAdjusting`:

```javascript
exitHoldAdjusting() {
  if (!this._holdAdjusting) return; // Don't exit if in toggle mode
  this._holdAdjusting = false;
  this.exitAdjusting();
}
```

**Step 4: Update `_toggleAdjusting` to clear hold flag**

Replace the `_toggleAdjusting` method with:

```javascript
_toggleAdjusting() {
  if (this.adjustingPlane) {
    this._holdAdjusting = false;
    this.exitAdjusting();
    return;
  }
  this.eraserActive = false;
  this.rulerActive = false;
  this.enterAdjusting(false); // false = toggle mode, not hold
}
```

**Step 5: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/InputHandler.js src/ModeController.js
git commit -m "feat: add barrel button hold-to-adjust for quick plane switching"
```

---

### Task 3: Move plane presets and Move button to main toolbar

**Files:**
- Modify: `src/ModeController.js`

**Step 1: Remove Move Plane item and presets from Tools dropdown**

In `_buildToolsDropdown()`, remove these lines (the Move Plane item, preset container, and their append):

Remove the Move Plane dropdown item creation (lines starting with `// Move Plane` through `this._moveItem = ...`).

Remove the preset container creation (lines starting with `// Plane presets` through the closing `}`).

Update the `panel.append(...)` call to only include: `this._drawItem, this._eraserItem, this._rulerItem, this._clearMeasItem`

The updated `_buildToolsDropdown` should look like:

```javascript
_buildToolsDropdown() {
  const panel = this._makeDropdownPanel();

  // Draw
  this._drawItem = this._makeDropdownItem(Pencil, 'Draw', () => {
    this.eraserActive = false;
    this.rulerActive = false;
    if (this.adjustingPlane) this.exitAdjusting();
    this._updateButtonStates();
    this._closeDropdowns();
  });

  // Eraser
  this._eraserItem = this._makeDropdownItem(Eraser, 'Eraser', () => {
    this._toggleEraser();
    this._closeDropdowns();
  });

  // Ruler
  this._rulerItem = this._makeDropdownItem(Ruler, 'Ruler', () => {
    this._toggleRuler();
    this._closeDropdowns();
  });

  // Clear Measurements
  this._clearMeasItem = this._makeDropdownItem(Trash2, 'Clear Measurements', () => {
    this._closeDropdowns();
    if (this._clearMeasHandler) this._clearMeasHandler();
  });
  this._clearMeasItem.style.display = 'none';

  panel.append(this._drawItem, this._eraserItem, this._rulerItem, this._clearMeasItem);
  return panel;
}
```

**Step 2: Add preset buttons and Move Plane toggle to main toolbar**

In `_createToolbar()`, after the File dropdown section and before the Layers button section, add preset buttons and a Move Plane toggle:

Replace this section:

```javascript
    // Separator
    const sep3 = this._sep();

    // Layers button
    this.layersBtn = this._makeBtn(Layers, 'Layers');

    toolbar.append(
      this._brushBtn.wrapper,
      this._toolsBtn.wrapper,
      sep1,
      this.undoBtn,
      this.redoBtn,
      sep2,
      this._fileBtn.wrapper,
      sep3,
      this.layersBtn
    );
```

With:

```javascript
    // Separator
    const sep3 = this._sep();

    // Plane presets (always visible)
    this._presetCallbacks = [];
    this._presetBtns = {};
    const presetGroup = document.createElement('div');
    presetGroup.style.cssText = 'display: flex; gap: 2px; align-items: center;';
    for (const name of ['XZ', 'XY', 'YZ']) {
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.title = `Snap to ${name} plane`;
      btn.style.cssText = `
        width: 30px; height: 30px; border: none; border-radius: 8px;
        background: rgba(0,0,0,0.05); color: #666;
        font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
        cursor: pointer; touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        transition: background 0.15s, color 0.15s;
      `;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        for (const cb of this._presetCallbacks) cb(name);
      });
      btn.addEventListener('pointerenter', () => { btn.style.background = 'rgba(33, 150, 243, 0.15)'; btn.style.color = '#1565c0'; });
      btn.addEventListener('pointerleave', () => { btn.style.background = 'rgba(0,0,0,0.05)'; btn.style.color = '#666'; });
      presetGroup.appendChild(btn);
      this._presetBtns[name] = btn;
    }

    // Move Plane toggle button
    this.moveBtn = this._makeBtn(Move, 'Move Plane');
    this.moveBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._toggleAdjusting();
    });

    // Separator
    const sep4 = this._sep();

    // Layers button
    this.layersBtn = this._makeBtn(Layers, 'Layers');

    toolbar.append(
      this._brushBtn.wrapper,
      this._toolsBtn.wrapper,
      sep1,
      this.undoBtn,
      this.redoBtn,
      sep2,
      presetGroup,
      this.moveBtn,
      sep3,
      this._fileBtn.wrapper,
      sep4,
      this.layersBtn
    );
```

**Step 3: Update `_updateButtonStates` to highlight the Move button**

In the `_updateButtonStates` method, add Move button styling. Find where it updates `_moveItem` and replace with `moveBtn`:

Add at the end of `_updateButtonStates`, after the existing tool icon update logic:

```javascript
// Move Plane toolbar button
if (this.moveBtn) {
  this.moveBtn.style.background = this.adjustingPlane
    ? 'rgba(33, 150, 243, 0.15)' : 'rgba(0, 0, 0, 0.05)';
  this.moveBtn.style.color = this.adjustingPlane ? '#1565c0' : '#444';
}
```

Also remove any references to `this._moveItem` and `this._presetContainer` from `_updateButtonStates` since those no longer exist.

**Step 4: Remove the old `_presetCallbacks` initialization**

If `this._presetCallbacks = [];` was previously set in the constructor, it can stay. If it was set in `_buildToolsDropdown`, that's now gone, so make sure it's initialized in `_createToolbar` (as shown in step 2 above).

**Step 5: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/ModeController.js
git commit -m "feat: promote plane presets and Move button to main toolbar"
```

---

### Task 4: Verify and final commit

**Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 2: Run dev server and verify**

Run: `npm run dev`
Expected:
- Toolbar shows: Brush, Tools, | Undo, Redo, | XZ, XY, YZ, Move, | File, | Layers
- Clicking XZ/XY/YZ snaps the plane without entering adjust mode
- Clicking Move toggles adjust mode on/off (handles appear/disappear)
- Tools dropdown now only shows: Draw, Eraser, Ruler, Clear Measurements
- Pen barrel button hold enters adjust mode, release exits

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: hold-to-adjust plane switching with barrel button

Add pen barrel button (button 5) hold-to-adjust for quick plane switching.
Promote XZ/XY/YZ presets and Move Plane toggle to main toolbar bar.
Simplify Tools dropdown to only draw/eraser/ruler tools."
```
