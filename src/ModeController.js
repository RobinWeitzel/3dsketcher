// src/ModeController.js

import { createElement } from 'lucide';
import {
  Palette, Pencil, Eraser, Ruler, Move,
  Undo2, Redo2, FilePlus, Save, FolderOpen,
  Download, Trash2, ChevronDown, Layers
} from 'lucide';

function lucideIcon(iconData, size = 18) {
  const el = createElement(iconData, { width: size, height: size, 'stroke-width': 2 });
  return el.outerHTML;
}

function widthSvg(thickness) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" stroke-width="${thickness}" stroke-linecap="round"/>
  </svg>`;
}

const TOOL_COLORS = {
  draw: { bg: 'rgba(33, 150, 243, 0.15)', fg: '#1565c0' },
  eraser: { bg: 'rgba(244, 67, 54, 0.15)', fg: '#d32f2f' },
  ruler: { bg: 'rgba(255, 152, 0, 0.15)', fg: '#e65100' },
  move: { bg: 'rgba(33, 150, 243, 0.15)', fg: '#1565c0' },
};

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
    this._presetCallbacks = [];
    this._openDropdown = null;

    this._createToolbar();
    this._setupGlobalClose();
  }

  // ── Toolbar construction ──────────────────────────────────────

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
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.88);
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0,0,0,0.04);
      border-radius: 16px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 100;
      user-select: none;
      -webkit-user-select: none;
      align-items: center;
    `;

    // Brush dropdown
    this._brushDropdown = this._buildBrushDropdown();
    this._brushBtn = this._makeDropdownToggle(Palette, 'Brush', this._brushDropdown);
    this._brushIndicator = this._createColorIndicator();
    this._brushBtn.wrapper.style.position = 'relative';
    this._brushBtn.wrapper.appendChild(this._brushIndicator);

    // Tools dropdown
    this._toolsDropdown = this._buildToolsDropdown();
    this._toolsBtn = this._makeDropdownToggle(Pencil, 'Tools', this._toolsDropdown);

    // Separator
    const sep1 = this._sep();

    // Undo / Redo
    this.undoBtn = this._makeBtn(Undo2, 'Undo');
    this.redoBtn = this._makeBtn(Redo2, 'Redo');

    // Separator
    const sep2 = this._sep();

    // File dropdown
    this._fileDropdown = this._buildFileDropdown();
    this._fileBtn = this._makeDropdownToggle(Save, 'File', this._fileDropdown);

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

    document.body.appendChild(toolbar);
    this._updateButtonStates();
    this._updateBrushIndicator();
  }

  // ── Dropdown builders ─────────────────────────────────────────

  _buildBrushDropdown() {
    const panel = this._makeDropdownPanel();

    // Color swatches
    const colorGrid = document.createElement('div');
    colorGrid.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 4px 0;';
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

    // Custom color
    const customRow = document.createElement('div');
    customRow.style.cssText = 'display: flex; align-items: center; gap: 6px; padding: 4px 0;';
    const customInput = document.createElement('input');
    customInput.type = 'color';
    customInput.value = '#222222';
    customInput.style.cssText = `
      width: 28px; height: 28px; border: none; padding: 0;
      cursor: pointer; border-radius: 50%; overflow: hidden;
      -webkit-appearance: none; appearance: none;
    `;
    customInput.addEventListener('input', (e) => { this._setColor(e.target.value); });
    this._customColorInput = customInput;
    const customLabel = document.createElement('span');
    customLabel.textContent = 'Custom';
    customLabel.style.cssText = 'font-size: 12px; color: #666;';
    customRow.append(customInput, customLabel);

    // Separator
    const sep = document.createElement('div');
    sep.style.cssText = 'height: 1px; background: rgba(0,0,0,0.08); margin: 6px 0;';

    // Width buttons
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
      btn.innerHTML = widthSvg(w.thickness) + `<span style="font-size:11px;margin-left:2px;">${w.title}</span>`;
      btn.title = w.title;
      btn.style.cssText = `
        flex: 1; height: 32px; border: 2px solid transparent;
        border-radius: 8px; background: rgba(0,0,0,0.04); color: #555;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        transition: border-color 0.15s, background 0.15s;
        gap: 2px;
      `;
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this._setWidth(w.value); });
      widthRow.appendChild(btn);
      this._widthButtons.push({ el: btn, value: w.value });
    }

    panel.append(colorGrid, customRow, sep, widthRow);
    return panel;
  }

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

    // Move Plane
    this._moveItem = this._makeDropdownItem(Move, 'Move Plane', () => {
      this._toggleAdjusting();
      this._closeDropdowns();
    });

    // Plane presets
    this._presetContainer = document.createElement('div');
    this._presetContainer.style.cssText = 'display: none; gap: 3px; padding: 2px 0;';
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
        this._closeDropdowns();
      });
      this._presetContainer.appendChild(btn);
    }

    panel.append(this._drawItem, this._eraserItem, this._rulerItem, this._clearMeasItem, this._moveItem, this._presetContainer);
    return panel;
  }

  _buildFileDropdown() {
    const panel = this._makeDropdownPanel();

    this._newItem = this._makeDropdownItem(FilePlus, 'New Project', () => {
      this._closeDropdowns();
      if (this._newHandler) this._newHandler();
    });
    this._saveItem = this._makeDropdownItem(Save, 'Save', () => {
      this._closeDropdowns();
      if (this._saveHandler) this._saveHandler();
    });
    this._loadItem = this._makeDropdownItem(FolderOpen, 'Open', () => {
      this._closeDropdowns();
      if (this._loadHandler) this._loadHandler();
    });

    const sep = document.createElement('div');
    sep.style.cssText = 'height: 1px; background: rgba(0,0,0,0.08); margin: 4px 0;';

    this._exportItem = this._makeDropdownItem(Download, 'Export', () => {
      this._closeDropdowns();
      this._showExportModal();
    });

    panel.append(this._newItem, this._saveItem, this._loadItem, sep, this._exportItem);
    return panel;
  }

  // ── UI primitives ─────────────────────────────────────────────

  _makeDropdownPanel() {
    const panel = document.createElement('div');
    panel.style.cssText = `
      display: none;
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      min-width: 160px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
      border-radius: 12px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 110;
      flex-direction: column;
      gap: 2px;
    `;
    return panel;
  }

  _makeDropdownItem(iconData, label, onClick) {
    const item = document.createElement('button');
    item.innerHTML = `${lucideIcon(iconData, 16)}<span style="margin-left:8px;font-size:13px;">${label}</span>`;
    item.style.cssText = `
      display: flex; align-items: center; width: 100%;
      padding: 6px 8px; border: none; border-radius: 8px;
      background: transparent; color: #444; cursor: pointer;
      touch-action: manipulation; -webkit-tap-highlight-color: transparent;
      transition: background 0.12s;
      text-align: left;
    `;
    item.addEventListener('mouseenter', () => { if (!item._activeColor) item.style.background = 'rgba(0,0,0,0.05)'; });
    item.addEventListener('mouseleave', () => { if (!item._activeColor) item.style.background = 'transparent'; });
    item.addEventListener('pointerdown', (e) => { e.preventDefault(); onClick(); });
    return item;
  }

  _makeDropdownToggle(iconData, title, dropdownPanel) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative;';

    const btn = document.createElement('button');
    btn.innerHTML = `${lucideIcon(iconData, 18)}<span style="margin-left:1px;">${lucideIcon(ChevronDown, 12)}</span>`;
    btn.title = title;
    btn.style.cssText = `
      height: 40px; padding: 0 8px; border: none; border-radius: 10px;
      background: rgba(0, 0, 0, 0.05); color: #444;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s, color 0.15s;
      gap: 2px;
    `;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._toggleDropdown(dropdownPanel);
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(dropdownPanel);
    return { wrapper, btn };
  }

  _makeBtn(iconData, title) {
    const btn = document.createElement('button');
    btn.innerHTML = lucideIcon(iconData, 18);
    btn.title = title;
    btn.style.cssText = `
      width: 40px; height: 40px; border: none; border-radius: 10px;
      background: rgba(0, 0, 0, 0.05); color: #444;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s, color 0.15s;
    `;
    return btn;
  }

  _sep() {
    const el = document.createElement('div');
    el.style.cssText = 'width: 1px; align-self: stretch; background: rgba(0,0,0,0.08); margin: 2px 2px;';
    return el;
  }

  _createColorIndicator() {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position: absolute; bottom: 2px; right: 2px;
      width: 10px; height: 10px; border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,0.9);
      box-shadow: 0 0 2px rgba(0,0,0,0.2);
      pointer-events: none;
    `;
    return dot;
  }

  _updateBrushIndicator() {
    this._brushIndicator.style.background = this.activeColor;
    // For white color, add a subtle border to keep it visible
    if (this.activeColor === '#ffffff') {
      this._brushIndicator.style.border = '1.5px solid rgba(0,0,0,0.2)';
    } else {
      this._brushIndicator.style.border = '1.5px solid rgba(255,255,255,0.9)';
    }
  }

  // ── Dropdown management ───────────────────────────────────────

  _toggleDropdown(panel) {
    if (this._openDropdown === panel) {
      this._closeDropdowns();
    } else {
      this._closeDropdowns();
      panel.style.display = 'flex';
      this._openDropdown = panel;
    }
  }

  _closeDropdowns() {
    if (this._openDropdown) {
      this._openDropdown.style.display = 'none';
      this._openDropdown = null;
    }
  }

  _setupGlobalClose() {
    document.addEventListener('pointerdown', (e) => {
      if (this._openDropdown && !this._openDropdown.contains(e.target) &&
          !this._openDropdown.parentElement.contains(e.target)) {
        this._closeDropdowns();
      }
    });
  }

  // ── Public API (preserved for main.js) ────────────────────────

  setUndoRedoHandlers(onUndo, onRedo) {
    this.undoBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); onUndo(); });
    this.redoBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); onRedo(); });
  }

  onSave(fn) { this._saveHandler = fn; }
  onLoad(fn) { this._loadHandler = fn; }
  onNew(fn) { this._newHandler = fn; }

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

  onClearMeasurements(fn) { this._clearMeasHandler = fn; }

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
    this._updateBrushIndicator();
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
    // Determine active tool for the Tools dropdown button icon
    let activeIcon = Pencil;
    let activeBg = 'rgba(0, 0, 0, 0.05)';
    let activeFg = '#444';

    if (this.eraserActive) {
      activeIcon = Eraser;
      activeBg = TOOL_COLORS.eraser.bg;
      activeFg = TOOL_COLORS.eraser.fg;
    } else if (this.rulerActive) {
      activeIcon = Ruler;
      activeBg = TOOL_COLORS.ruler.bg;
      activeFg = TOOL_COLORS.ruler.fg;
    } else if (this.adjustingPlane) {
      activeIcon = Move;
      activeBg = TOOL_COLORS.move.bg;
      activeFg = TOOL_COLORS.move.fg;
    }

    // Update tools button icon to reflect active tool
    this._toolsBtn.btn.innerHTML = `${lucideIcon(activeIcon, 18)}<span style="margin-left:1px;">${lucideIcon(ChevronDown, 12)}</span>`;
    this._toolsBtn.btn.style.background = activeBg;
    this._toolsBtn.btn.style.color = activeFg;

    // Update dropdown items active state
    this._setItemActive(this._drawItem, !this.eraserActive && !this.rulerActive && !this.adjustingPlane, TOOL_COLORS.draw);
    this._setItemActive(this._eraserItem, this.eraserActive, TOOL_COLORS.eraser);
    this._setItemActive(this._rulerItem, this.rulerActive, TOOL_COLORS.ruler);
    this._setItemActive(this._moveItem, this.adjustingPlane, TOOL_COLORS.move);

    // Show/hide conditional items
    this._clearMeasItem.style.display = this.rulerActive ? 'flex' : 'none';
    this._presetContainer.style.display = this.adjustingPlane ? 'flex' : 'none';
  }

  _setItemActive(item, isActive, colors) {
    item._activeColor = isActive;
    if (isActive) {
      item.style.background = colors.bg;
      item.style.color = colors.fg;
    } else {
      item.style.background = 'transparent';
      item.style.color = '#444';
    }
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
