// src/ModeController.js

export class ModeController {
  constructor() {
    this.eraserActive = false;
    this.adjustingPlane = false;
    this._adjustingCallbacks = [];
    this.activeColor = '#222222';
    this._colorCallbacks = [];
    this.activeWidth = 1; // 1=thin, 2=medium, 3=thick
    this._widthCallbacks = [];

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

    this.newBtn = this._createButton('New', null);
    this.saveBtn = this._createButton('Save', null);
    this.loadBtn = this._createButton('Load', null);
    this.undoBtn = this._createButton('Undo', null);
    this.redoBtn = this._createButton('Redo', null);
    this.eraserBtn = this._createButton('Eraser', () => this._toggleEraser());
    this.moveBtn = this._createButton('Move', () => this._toggleAdjusting());

    toolbar.append(colorBar, widthBar, this.newBtn, this.saveBtn, this.loadBtn, this.undoBtn, this.redoBtn, this.eraserBtn, this.moveBtn);
    document.body.appendChild(toolbar);

    this._updateButtonStates();
    this._updateColorSwatches();
    this._updateWidthButtons();
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
