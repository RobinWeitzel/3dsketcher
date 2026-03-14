// src/ModeController.js

export class ModeController {
  constructor() {
    this.eraserActive = false;
    this.mode = 'camera'; // 'camera' | 'plane'
    this._modeChangeCallbacks = [];

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

    this.modeBtn = this._createButton('Camera', () => this._toggleMode());
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

  onModeChange(callback) {
    this._modeChangeCallbacks.push(callback);
  }

  _toggleMode() {
    this.mode = this.mode === 'camera' ? 'plane' : 'camera';
    this._updateButtonStates();
    for (const cb of this._modeChangeCallbacks) cb(this.mode);
  }

  _toggleEraser() {
    this.eraserActive = !this.eraserActive;
    this._updateButtonStates();
  }

  _updateButtonStates() {
    // Mode button
    this.modeBtn.textContent = this.mode === 'camera' ? 'Camera' : 'Plane';
    this.modeBtn.style.background = this.mode === 'plane'
      ? 'rgba(33, 150, 243, 0.2)' : 'rgba(0, 0, 0, 0.06)';
    this.modeBtn.style.color = this.mode === 'plane' ? '#1565c0' : '#333';

    // Eraser button
    this.eraserBtn.style.background = this.eraserActive
      ? 'rgba(244, 67, 54, 0.2)' : 'rgba(0, 0, 0, 0.06)';
    this.eraserBtn.style.color = this.eraserActive ? '#d32f2f' : '#333';
  }
}
