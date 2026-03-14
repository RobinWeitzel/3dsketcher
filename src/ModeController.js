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
