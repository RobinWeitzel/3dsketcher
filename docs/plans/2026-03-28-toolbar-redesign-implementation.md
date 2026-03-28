# Toolbar Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the two-row toolbar with a compact single-row bar using Lucide icons and dropdown groups.

**Architecture:** Refactor `ModeController.js` to use Lucide icon library, group actions into dropdown menus (Brush, Tools, File), keep Undo/Redo as direct buttons. All existing public API (callbacks, methods) preserved.

**Tech Stack:** Lucide (SVG icons), vanilla JS, Vite

---

### Task 1: Install Lucide

**Step 1: Install lucide package**

Run: `npm install lucide`

**Step 2: Verify installation**

Run: `grep lucide package.json`
Expected: `"lucide": "^0.x.x"` in dependencies

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add lucide icon library"
```

---

### Task 2: Rewrite ModeController.js — icon helpers and constants

**Files:**
- Modify: `src/ModeController.js`

**Step 1: Replace ICONS object and svgIcon/widthSvg helpers with Lucide imports**

Replace lines 1-36 of `ModeController.js` with:

```javascript
// src/ModeController.js
import { createElement } from 'lucide';
import {
  Palette, Pencil, Eraser, Ruler, Move, Undo2, Redo2,
  FilePlus, Save, FolderOpen, Download, Trash2, ChevronDown
} from 'lucide';

function lucideIcon(iconData, size = 18) {
  const el = createElement(iconData, { size, 'stroke-width': 2 });
  return el.outerHTML;
}

function widthSvg(thickness) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20">
    <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" stroke-width="${thickness}" stroke-linecap="round"/>
  </svg>`;
}

const BTN_BASE = `
  width: 40px; height: 40px; border: none; border-radius: 10px;
  background: rgba(0, 0, 0, 0.05); color: #444;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, color 0.15s;
`;

const DROPDOWN_BTN = `
  ${BTN_BASE}
  position: relative;
  gap: 2px;
`;

const DROPDOWN_PANEL = `
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 10px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 150;
  display: none;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
`;

const DROPDOWN_ITEM = `
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border: none; border-radius: 8px;
  background: transparent; color: #333; font-size: 13px;
  cursor: pointer; touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.12s;
  width: 100%; text-align: left;
`;

const SEPARATOR = 'width: 1px; align-self: stretch; background: rgba(0,0,0,0.08); margin: 2px 2px;';
const H_SEPARATOR = 'height: 1px; background: rgba(0,0,0,0.08); margin: 2px 0;';
```

**Step 2: Verify the file is syntactically valid**

Run: `npx vite build 2>&1 | head -20`
Expected: No import/syntax errors (build may warn about other things, but no errors in ModeController.js)

---

### Task 3: Rewrite _createToolbar — main bar structure

**Files:**
- Modify: `src/ModeController.js` — replace `_createToolbar()` method

**Step 1: Rewrite the _createToolbar method**

Replace the entire `_createToolbar()` method (currently lines 53-215) with the new implementation. The new toolbar creates a single row with 5 elements: Brush dropdown, Tools dropdown, Undo button, Redo button, File dropdown.

```javascript
_createToolbar() {
  const toolbar = document.createElement('div');
  toolbar.id = 'toolbar';
  toolbar.style.cssText = `
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 4px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0,0,0,0.04);
    border-radius: 14px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 100;
    user-select: none;
    -webkit-user-select: none;
    align-items: center;
  `;

  // --- Brush dropdown ---
  this._brushDropdown = this._createDropdownGroup(Palette, 'Brush');
  this._buildBrushPanel(this._brushDropdown.panel);
  this._updateBrushIndicator();

  // --- Tools dropdown ---
  this._toolsDropdown = this._createDropdownGroup(Pencil, 'Tools');
  this._buildToolsPanel(this._toolsDropdown.panel);

  // --- Separator ---
  const sep1 = document.createElement('div');
  sep1.style.cssText = SEPARATOR;

  // --- Undo / Redo (direct buttons) ---
  this.undoBtn = this._createDirectButton(Undo2, 'Undo');
  this.redoBtn = this._createDirectButton(Redo2, 'Redo');

  // --- Separator ---
  const sep2 = document.createElement('div');
  sep2.style.cssText = SEPARATOR;

  // --- File dropdown ---
  this._fileDropdown = this._createDropdownGroup(Save, 'File');
  this._buildFilePanel(this._fileDropdown.panel);

  toolbar.append(
    this._brushDropdown.wrapper,
    this._toolsDropdown.wrapper,
    sep1,
    this.undoBtn,
    this.redoBtn,
    sep2,
    this._fileDropdown.wrapper
  );

  document.body.appendChild(toolbar);

  // Close dropdowns when clicking outside
  document.addEventListener('pointerdown', (e) => {
    if (!toolbar.contains(e.target)) this._closeAllDropdowns();
  });
}
```

---

### Task 4: Implement dropdown infrastructure methods

**Files:**
- Modify: `src/ModeController.js` — add new helper methods

**Step 1: Add _createDropdownGroup, _createDirectButton, _closeAllDropdowns, _createDropdownItem methods**

Add these methods to the ModeController class:

```javascript
_createDropdownGroup(iconData, title) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position: relative;';

  const btn = document.createElement('button');
  btn.title = title;
  btn.style.cssText = DROPDOWN_BTN;
  btn.innerHTML = lucideIcon(iconData);

  const panel = document.createElement('div');
  panel.style.cssText = DROPDOWN_PANEL;

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = panel.style.display === 'flex';
    this._closeAllDropdowns();
    if (!isOpen) panel.style.display = 'flex';
  });

  wrapper.append(btn, panel);
  return { wrapper, btn, panel };
}

_createDirectButton(iconData, title) {
  const btn = document.createElement('button');
  btn.title = title;
  btn.style.cssText = BTN_BASE;
  btn.innerHTML = lucideIcon(iconData);
  return btn;
}

_closeAllDropdowns() {
  for (const dd of [this._brushDropdown, this._toolsDropdown, this._fileDropdown]) {
    if (dd?.panel) dd.panel.style.display = 'none';
  }
}

_createDropdownItem(iconData, label, onClick, extraStyle = '') {
  const btn = document.createElement('button');
  btn.style.cssText = DROPDOWN_ITEM + extraStyle;
  btn.innerHTML = `${lucideIcon(iconData, 16)}<span>${label}</span>`;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    onClick();
  });
  btn.addEventListener('pointerenter', () => { btn.style.background = 'rgba(0,0,0,0.05)'; });
  btn.addEventListener('pointerleave', () => { btn.style.background = extraStyle.includes('background') ? '' : 'transparent'; });
  return btn;
}
```

---

### Task 5: Build Brush dropdown panel

**Files:**
- Modify: `src/ModeController.js` — add `_buildBrushPanel` and `_updateBrushIndicator`

**Step 1: Add _buildBrushPanel method**

```javascript
_buildBrushPanel(panel) {
  // Color swatches section
  const colorLabel = document.createElement('div');
  colorLabel.textContent = 'Color';
  colorLabel.style.cssText = 'font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; padding: 0 4px;';
  panel.appendChild(colorLabel);

  const colorGrid = document.createElement('div');
  colorGrid.style.cssText = 'display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; padding: 2px;';

  const presetColors = ['#222222', '#f44336', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#ffffff', '#9e9e9e'];
  this._colorSwatches = [];

  for (const color of presetColors) {
    const swatch = document.createElement('button');
    swatch.style.cssText = `
      width: 28px; height: 28px; border-radius: 50%;
      border: 2.5px solid transparent;
      background: ${color}; cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: border-color 0.15s, box-shadow 0.15s;
      ${color === '#ffffff' ? 'box-shadow: inset 0 0 0 1px rgba(0,0,0,0.15);' : ''}
    `;
    swatch.addEventListener('pointerdown', (e) => { e.preventDefault(); this._setColor(color); });
    colorGrid.appendChild(swatch);
    this._colorSwatches.push({ el: swatch, color });
  }

  // Custom color picker
  const customWrapper = document.createElement('div');
  customWrapper.style.cssText = 'position: relative; width: 28px; height: 28px;';
  const customInput = document.createElement('input');
  customInput.type = 'color';
  customInput.value = '#222222';
  customInput.style.cssText = `
    width: 28px; height: 28px; border: none; padding: 0;
    cursor: pointer; border-radius: 50%; overflow: hidden;
    -webkit-appearance: none; appearance: none;
  `;
  customInput.addEventListener('input', (e) => { this._setColor(e.target.value); });
  customWrapper.appendChild(customInput);
  colorGrid.appendChild(customWrapper);
  this._customColorInput = customInput;

  panel.appendChild(colorGrid);

  // Separator
  const sep = document.createElement('div');
  sep.style.cssText = H_SEPARATOR;
  panel.appendChild(sep);

  // Width section
  const widthLabel = document.createElement('div');
  widthLabel.textContent = 'Stroke Width';
  widthLabel.style.cssText = 'font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; padding: 0 4px;';
  panel.appendChild(widthLabel);

  const widthRow = document.createElement('div');
  widthRow.style.cssText = 'display: flex; gap: 4px;';

  this._widthButtons = [];
  const widths = [
    { thickness: 1.5, value: 1, title: 'Thin' },
    { thickness: 3, value: 2, title: 'Medium' },
    { thickness: 5, value: 3, title: 'Thick' },
  ];

  for (const w of widths) {
    const btn = document.createElement('button');
    btn.innerHTML = widthSvg(w.thickness);
    btn.title = w.title;
    btn.style.cssText = `
      flex: 1; height: 32px; border: 2px solid transparent;
      border-radius: 8px; background: rgba(0,0,0,0.04); color: #555;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: border-color 0.15s, background 0.15s;
    `;
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this._setWidth(w.value); });
    widthRow.appendChild(btn);
    this._widthButtons.push({ el: btn, value: w.value });
  }

  panel.appendChild(widthRow);

  this._updateColorSwatches();
  this._updateWidthButtons();
}

_updateBrushIndicator() {
  if (!this._brushDropdown) return;
  // Show a colored dot on the brush button to indicate current color
  const btn = this._brushDropdown.btn;
  const existing = btn.querySelector('.color-dot');
  if (existing) existing.remove();
  const dot = document.createElement('div');
  dot.className = 'color-dot';
  dot.style.cssText = `
    position: absolute; bottom: 4px; right: 4px;
    width: 8px; height: 8px; border-radius: 50%;
    background: ${this.activeColor};
    border: 1px solid rgba(0,0,0,0.15);
  `;
  btn.appendChild(dot);
}
```

---

### Task 6: Build Tools dropdown panel

**Files:**
- Modify: `src/ModeController.js` — add `_buildToolsPanel` method

**Step 1: Add _buildToolsPanel method**

```javascript
_buildToolsPanel(panel) {
  // Draw tool (default)
  const drawItem = this._createDropdownItem(Pencil, 'Draw', () => {
    this.eraserActive = false;
    this.rulerActive = false;
    if (this.adjustingPlane) this.exitAdjusting();
    this._updateButtonStates();
    this._closeAllDropdowns();
  });
  this._drawItem = drawItem;

  // Eraser
  const eraserItem = this._createDropdownItem(Eraser, 'Eraser', () => {
    this._toggleEraser();
    this._updateButtonStates();
    this._closeAllDropdowns();
  });
  this._eraserItem = eraserItem;

  // Ruler
  const rulerItem = this._createDropdownItem(Ruler, 'Ruler', () => {
    this._toggleRuler();
    this._updateButtonStates();
    this._closeAllDropdowns();
  });
  this._rulerItem = rulerItem;

  // Clear measurements (shown when ruler active)
  this.clearMeasBtn = this._createDropdownItem(Trash2, 'Clear Measurements', () => {});
  this.clearMeasBtn.style.display = 'none';
  this._clearMeasItem = this.clearMeasBtn;

  // Move plane
  const moveItem = this._createDropdownItem(Move, 'Move Plane', () => {
    this._toggleAdjusting();
    this._updateButtonStates();
    this._closeAllDropdowns();
  });
  this._moveItem = moveItem;

  // Plane presets (shown when move active)
  this._presetBar = document.createElement('div');
  this._presetBar.style.cssText = 'display: none; gap: 3px; padding: 0 4px;';

  this._presetCallbacks = [];
  for (const name of ['XZ', 'XY', 'YZ']) {
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.title = `Snap to ${name} plane`;
    btn.style.cssText = `
      flex: 1; height: 28px; border: none; border-radius: 6px;
      background: rgba(33, 150, 243, 0.1); color: #1565c0;
      font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
      cursor: pointer; touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    `;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      for (const cb of this._presetCallbacks) cb(name);
    });
    this._presetBar.appendChild(btn);
  }

  panel.append(drawItem, eraserItem, rulerItem, this.clearMeasBtn, moveItem, this._presetBar);
}
```

---

### Task 7: Build File dropdown panel

**Files:**
- Modify: `src/ModeController.js` — add `_buildFilePanel` method

**Step 1: Add _buildFilePanel method**

```javascript
_buildFilePanel(panel) {
  this.newBtn = this._createDropdownItem(FilePlus, 'New Project', () => {});
  this.saveBtn = this._createDropdownItem(Save, 'Save', () => {});
  this.loadBtn = this._createDropdownItem(FolderOpen, 'Open', () => {});

  const sep = document.createElement('div');
  sep.style.cssText = H_SEPARATOR;

  this.exportBtn = this._createDropdownItem(Download, 'Export', () => {
    this._closeAllDropdowns();
    this._showExportModal();
  });

  panel.append(this.newBtn, this.saveBtn, this.loadBtn, sep, this.exportBtn);
}
```

---

### Task 8: Update _updateButtonStates for dropdown-based tools

**Files:**
- Modify: `src/ModeController.js` — update `_updateButtonStates` method

**Step 1: Rewrite _updateButtonStates**

Replace the existing `_updateButtonStates` method:

```javascript
_updateButtonStates() {
  // Update tools dropdown items highlight
  if (this._drawItem) {
    const drawActive = !this.eraserActive && !this.rulerActive && !this.adjustingPlane;
    this._drawItem.style.background = drawActive ? 'rgba(33, 150, 243, 0.1)' : 'transparent';
    this._drawItem.style.color = drawActive ? '#1565c0' : '#333';
  }
  if (this._eraserItem) {
    this._eraserItem.style.background = this.eraserActive ? 'rgba(244, 67, 54, 0.1)' : 'transparent';
    this._eraserItem.style.color = this.eraserActive ? '#d32f2f' : '#333';
  }
  if (this._rulerItem) {
    this._rulerItem.style.background = this.rulerActive ? 'rgba(255, 152, 0, 0.1)' : 'transparent';
    this._rulerItem.style.color = this.rulerActive ? '#e65100' : '#333';
  }
  if (this._moveItem) {
    this._moveItem.style.background = this.adjustingPlane ? 'rgba(33, 150, 243, 0.1)' : 'transparent';
    this._moveItem.style.color = this.adjustingPlane ? '#1565c0' : '#333';
  }

  // Show/hide contextual items
  if (this._clearMeasItem) this._clearMeasItem.style.display = this.rulerActive ? '' : 'none';
  if (this._presetBar) this._presetBar.style.display = this.adjustingPlane ? 'flex' : 'none';

  // Update the tools dropdown button icon to reflect active tool
  if (this._toolsDropdown) {
    let activeIcon = Pencil;
    if (this.eraserActive) activeIcon = Eraser;
    else if (this.rulerActive) activeIcon = Ruler;
    else if (this.adjustingPlane) activeIcon = Move;
    this._toolsDropdown.btn.innerHTML = lucideIcon(activeIcon);
  }
}
```

---

### Task 9: Update _setColor to refresh brush indicator

**Files:**
- Modify: `src/ModeController.js` — update `_setColor`

**Step 1: Add _updateBrushIndicator call to _setColor**

In the `_setColor` method, add `this._updateBrushIndicator();` after `this._updateColorSwatches();`:

```javascript
_setColor(color) {
  this.activeColor = color;
  this._updateColorSwatches();
  this._updateBrushIndicator();
  for (const cb of this._colorCallbacks) cb(color);
}
```

---

### Task 10: Update public API methods for new button references

**Files:**
- Modify: `src/ModeController.js`

**Step 1: Update onSave, onLoad, onNew, onClearMeasurements to work with dropdown items**

The `newBtn`, `saveBtn`, `loadBtn`, and `clearMeasBtn` are now dropdown items, but they still have `pointerdown` event listeners attached via the public API methods (`onSave`, `onLoad`, `onNew`, `onClearMeasurements`). These methods attach listeners, so they continue to work as-is since the elements are still DOM buttons. No changes needed to these methods.

However, the `_createDropdownItem` currently receives an `onClick` that does nothing for file buttons. We need to ensure the public API handlers get wired up. The current pattern in main.js calls `modeController.onSave(fn)` which adds a `pointerdown` listener to `this.saveBtn`. Since `saveBtn` is now a dropdown item button, this still works. But we should also close the dropdown after the action.

Update `onSave`, `onLoad`, `onNew` to close dropdowns:

```javascript
onSave(fn) { this.saveBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this._closeAllDropdowns(); fn(); }); }
onLoad(fn) { this.loadBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this._closeAllDropdowns(); fn(); }); }
onNew(fn) { this.newBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this._closeAllDropdowns(); fn(); }); }

onClearMeasurements(fn) {
  this.clearMeasBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); this._closeAllDropdowns(); fn(); });
}
```

---

### Task 11: Remove legacy _createButton and _createIconButton methods

**Files:**
- Modify: `src/ModeController.js`

**Step 1: Remove unused methods**

Remove the `_createIconButton` and `_createButton` methods since all buttons now use `_createDropdownItem` or `_createDirectButton`.

---

### Task 12: Build and test

**Step 1: Run the build**

Run: `npm run build`
Expected: Build succeeds without errors

**Step 2: Run dev server and visual check**

Run: `npm run dev`
Expected: Toolbar shows single row with Brush, Tools, Undo, Redo, File buttons. Dropdowns open on click.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: redesign toolbar with Lucide icons and dropdown groups

Replace two-row toolbar with compact single-row bar. Group related
actions (Brush, Tools, File) into dropdown menus. Replace custom
inline SVGs with Lucide icon library for consistent icon styling."
```
