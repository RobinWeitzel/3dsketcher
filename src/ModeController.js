// src/ModeController.js

// SVG icon paths (20x20 viewBox)
const ICONS = {
  new: '<path d="M6 2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 2v4h4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 9v6M7 12h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  save: '<path d="M4 14v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M10 3v9M6.5 8.5 10 12l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  load: '<path d="M3 7h4l2-2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  undo: '<path d="M4 7h8a4 4 0 0 1 0 8H9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7 4 4 7l3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  redo: '<path d="M16 7H8a4 4 0 0 0 0 8h3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M13 4l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  eraser: '<path d="M16.24 3.56a2.21 2.21 0 0 1 .3 3.11l-8.5 8.5a2 2 0 0 1-1.42.59H3.5l-1 1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="m3.88 12.88 3.54 3.54" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m12.56 5.12 3.32 3.32" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  ruler: '<path d="M3 17 17 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7 17l-1-2M11 13l-1-2M15 9l-1-2M5 15l-2-1M9 11l-2-1M13 7l-2-1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  trash: '<path d="M5 5h10l-1 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 5z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 5h14M8 5V3h4v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  move: '<path d="M10 3v14M3 10h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M10 3l-2 2M10 3l2 2M10 17l-2-2M10 17l2-2M3 10l2-2M3 10l2 2M17 10l-2-2M17 10l-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  export: '<path d="M4 14v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M10 12V3M6.5 6.5 10 3l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
};

function svgIcon(name, size = 20) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none">${ICONS[name]}</svg>`;
}

function widthSvg(thickness) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
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

const SEPARATOR = 'width: 1px; align-self: stretch; background: rgba(0,0,0,0.08); margin: 2px 2px;';

export class ModeController {
  constructor() {
    this.eraserActive = false;
    this.rulerActive = false;
    this.adjustingPlane = false;
    this._adjustingCallbacks = [];
    this.activeColor = '#222222';
    this._colorCallbacks = [];
    this.activeWidth = 1;
    this._widthCallbacks = [];
    this._exportCallbacks = { stl: null, obj: null };

    this._createToolbar();
  }

  _createToolbar() {
    // Outer wrapper
    const toolbar = document.createElement('div');
    toolbar.id = 'toolbar';
    toolbar.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.88);
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0,0,0,0.04);
      border-radius: 16px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 100;
      user-select: none;
      -webkit-user-select: none;
    `;

    // --- Top row: Colors + Width ---
    const topRow = document.createElement('div');
    topRow.style.cssText = 'display: flex; gap: 5px; align-items: center; justify-content: center;';

    // Color swatches
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
      topRow.appendChild(swatch);
      this._colorSwatches.push({ el: swatch, color });
    }

    // Custom color
    const customInput = document.createElement('input');
    customInput.type = 'color';
    customInput.value = '#222222';
    customInput.style.cssText = `
      width: 28px; height: 28px; border: none; padding: 0;
      cursor: pointer; border-radius: 50%; overflow: hidden;
      -webkit-appearance: none; appearance: none;
    `;
    customInput.addEventListener('input', (e) => { this._setColor(e.target.value); });
    topRow.appendChild(customInput);
    this._customColorInput = customInput;

    // Separator
    const sep1 = document.createElement('div');
    sep1.style.cssText = SEPARATOR;
    topRow.appendChild(sep1);

    // Width buttons (SVG lines)
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
        width: 36px; height: 28px; border: 2px solid transparent;
        border-radius: 8px; background: rgba(0,0,0,0.04); color: #555;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        transition: border-color 0.15s, background 0.15s;
      `;
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this._setWidth(w.value); });
      topRow.appendChild(btn);
      this._widthButtons.push({ el: btn, value: w.value });
    }

    // --- Bottom row: Action buttons ---
    const bottomRow = document.createElement('div');
    bottomRow.style.cssText = 'display: flex; gap: 4px; align-items: center; justify-content: center;';

    // File group
    this.newBtn = this._createIconButton('new', 'New Project', null);
    this.saveBtn = this._createIconButton('save', 'Save', null);
    this.loadBtn = this._createIconButton('load', 'Open', null);

    const sep2 = document.createElement('div');
    sep2.style.cssText = SEPARATOR;

    // Undo/Redo
    this.undoBtn = this._createIconButton('undo', 'Undo', null);
    this.redoBtn = this._createIconButton('redo', 'Redo', null);

    const sep3 = document.createElement('div');
    sep3.style.cssText = SEPARATOR;

    // Tools
    this.eraserBtn = this._createIconButton('eraser', 'Eraser', () => this._toggleEraser());
    this.rulerBtn = this._createIconButton('ruler', 'Ruler', () => this._toggleRuler());
    this.clearMeasBtn = this._createIconButton('trash', 'Clear Measurements', null);
    this.clearMeasBtn.style.display = 'none';
    this.moveBtn = this._createIconButton('move', 'Move Plane', () => this._toggleAdjusting());

    // Plane presets (visible only in adjust mode)
    this._presetBar = document.createElement('div');
    this._presetBar.style.cssText = 'display: none; gap: 3px; align-items: center;';

    this._presetCallbacks = [];
    for (const name of ['XZ', 'XY', 'YZ']) {
      const btn = document.createElement('button');
      btn.textContent = name;
      btn.title = `Snap to ${name} plane`;
      btn.style.cssText = `
        width: 32px; height: 32px; border: none; border-radius: 8px;
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

    const sep4 = document.createElement('div');
    sep4.style.cssText = SEPARATOR;

    // Export
    this.exportBtn = this._createIconButton('export', 'Export', () => this._showExportModal());

    bottomRow.append(
      this.newBtn, this.saveBtn, this.loadBtn,
      sep2,
      this.undoBtn, this.redoBtn,
      sep3,
      this.eraserBtn, this.rulerBtn, this.clearMeasBtn, this.moveBtn,
      this._presetBar,
      sep4,
      this.exportBtn
    );

    toolbar.append(topRow, bottomRow);
    document.body.appendChild(toolbar);

    this._updateButtonStates();
    this._updateColorSwatches();
    this._updateWidthButtons();
  }

  _createIconButton(iconName, title, onClick) {
    const btn = document.createElement('button');
    btn.innerHTML = svgIcon(iconName);
    btn.title = title;
    btn.style.cssText = BTN_BASE;
    if (onClick) btn.addEventListener('pointerdown', (e) => { e.preventDefault(); onClick(); });
    return btn;
  }

  // Keep legacy method for any external callers
  _createButton(label, onClick) {
    return this._createIconButton('new', label, onClick);
  }

  setUndoRedoHandlers(onUndo, onRedo) {
    this.undoBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); onUndo(); });
    this.redoBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); onRedo(); });
  }

  onSave(fn) { this.saveBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); }); }
  onLoad(fn) { this.loadBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); }); }
  onNew(fn) { this.newBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); }); }

  onAdjustingChange(callback) {
    this._adjustingCallbacks.push(callback);
  }

  _toggleAdjusting() {
    if (this.adjustingPlane) {
      this.exitAdjusting();
      return;
    }
    this.eraserActive = false;
    this.rulerActive = false;
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

  _toggleEraser() {
    this.eraserActive = !this.eraserActive;
    if (this.eraserActive) {
      this.rulerActive = false;
      if (this.adjustingPlane) this.exitAdjusting();
    }
    this._updateButtonStates();
  }

  _setColor(color) {
    this.activeColor = color;
    this._updateColorSwatches();
    for (const cb of this._colorCallbacks) cb(color);
  }

  _updateColorSwatches() {
    for (const s of this._colorSwatches) {
      const isActive = s.color === this.activeColor;
      s.el.style.borderColor = isActive ? '#1976d2' : 'transparent';
      if (isActive && s.color !== '#ffffff') {
        s.el.style.boxShadow = '0 0 0 2px rgba(25, 118, 210, 0.3)';
      } else if (s.color === '#ffffff') {
        s.el.style.boxShadow = isActive
          ? 'inset 0 0 0 1px rgba(0,0,0,0.15), 0 0 0 2px rgba(25, 118, 210, 0.3)'
          : 'inset 0 0 0 1px rgba(0,0,0,0.15)';
      } else {
        s.el.style.boxShadow = 'none';
      }
    }
  }

  onColorChange(fn) {
    this._colorCallbacks.push(fn);
  }

  _setWidth(value) {
    this.activeWidth = value;
    this._updateWidthButtons();
    for (const cb of this._widthCallbacks) cb(value);
  }

  _updateWidthButtons() {
    for (const w of this._widthButtons) {
      const isActive = w.value === this.activeWidth;
      w.el.style.borderColor = isActive ? '#1976d2' : 'transparent';
      w.el.style.background = isActive ? 'rgba(25, 118, 210, 0.1)' : 'rgba(0,0,0,0.04)';
      w.el.style.color = isActive ? '#1565c0' : '#555';
    }
  }

  onWidthChange(fn) {
    this._widthCallbacks.push(fn);
  }

  onPreset(fn) {
    this._presetCallbacks.push(fn);
  }

  _updateButtonStates() {
    // Eraser
    this.eraserBtn.style.background = this.eraserActive
      ? 'rgba(244, 67, 54, 0.15)' : 'rgba(0, 0, 0, 0.05)';
    this.eraserBtn.style.color = this.eraserActive ? '#d32f2f' : '#444';

    // Ruler
    this.rulerBtn.style.background = this.rulerActive
      ? 'rgba(255, 152, 0, 0.15)' : 'rgba(0, 0, 0, 0.05)';
    this.rulerBtn.style.color = this.rulerActive ? '#e65100' : '#444';
    this.clearMeasBtn.style.display = this.rulerActive ? '' : 'none';

    // Move
    this.moveBtn.style.background = this.adjustingPlane
      ? 'rgba(33, 150, 243, 0.15)' : 'rgba(0, 0, 0, 0.05)';
    this.moveBtn.style.color = this.adjustingPlane ? '#1565c0' : '#444';

    // Presets
    this._presetBar.style.display = this.adjustingPlane ? 'flex' : 'none';
  }

  _showExportModal() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 200;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white; border-radius: 16px; padding: 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2); min-width: 220px; text-align: center;
    `;

    const title = document.createElement('div');
    title.textContent = 'Export Format';
    title.style.cssText = 'font-size: 17px; font-weight: 600; margin-bottom: 16px; color: #222;';

    const makeBtn = (text, bg, fn) => {
      const b = document.createElement('button');
      b.textContent = text;
      b.style.cssText = `
        display: block; width: 100%; padding: 12px; margin: 6px 0;
        border: none; border-radius: 10px; background: ${bg}; color: white;
        font-size: 15px; font-weight: 500; cursor: pointer;
        transition: opacity 0.15s;
      `;
      b.addEventListener('click', () => { overlay.remove(); fn(); });
      return b;
    };

    const stlBtn = makeBtn('STL (3D Printing)', '#2196f3', () => { if (this._exportCallbacks.stl) this._exportCallbacks.stl(); });
    const objBtn = makeBtn('OBJ (Universal)', '#4caf50', () => { if (this._exportCallbacks.obj) this._exportCallbacks.obj(); });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      display: block; width: 100%; padding: 12px; margin: 10px 0 0;
      border: none; border-radius: 10px; background: rgba(0,0,0,0.05);
      font-size: 15px; color: #666; cursor: pointer;
    `;
    cancelBtn.addEventListener('click', () => overlay.remove());

    modal.append(title, stlBtn, objBtn, cancelBtn);
    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  onExport(format, fn) {
    this._exportCallbacks[format] = fn;
  }
}
