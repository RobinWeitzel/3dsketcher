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
