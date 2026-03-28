// src/LayerPanel.js

import { createElement } from 'lucide';
import { Eye, EyeOff, X } from 'lucide';

function lucideIconHtml(iconData, size = 16) {
  const el = createElement(iconData, { width: size, height: size, 'stroke-width': 2 });
  return el.outerHTML;
}

let nextId = 1;

function generateId() {
  return 'layer_' + (nextId++);
}

export class LayerPanel {
  constructor(strokeManager, toggleBtn) {
    this.strokeManager = strokeManager;
    this.layers = [];
    this.activeLayerId = null;
    this._changeCallbacks = [];

    this._createPanel(toggleBtn);
    this.addLayer('Layer 1');
  }

  _createPanel(toggleBtn) {
    // Use externally provided toggle button
    this.toggleBtn = toggleBtn;
    this.toggleBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.panel.style.display = this.panel.style.display === 'none' ? 'flex' : 'none';
    });

    // Panel
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: fixed;
      bottom: 72px;
      right: 12px;
      width: 210px;
      max-height: 400px;
      overflow-y: auto;
      display: none;
      flex-direction: column;
      gap: 6px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
      border-radius: 12px;
      backdrop-filter: blur(8px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 101;
      user-select: none;
      -webkit-user-select: none;
    `;
    document.body.appendChild(this.panel);

    // Add layer button
    this.addBtn = document.createElement('button');
    this.addBtn.textContent = '+ Add Layer';
    this.addBtn.style.cssText = `
      padding: 8px;
      border: none;
      border-radius: 8px;
      background: rgba(33, 150, 243, 0.12);
      color: #1565c0;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s;
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
    if (this.layers.length <= 1) return;
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx === -1) return;

    this._showConfirm(`Delete "${this.layers[idx].name}" and all its strokes?`, () => {
      this.strokeManager.removeStrokesByLayer(id);
      this.layers.splice(idx, 1);

      if (this.activeLayerId === id) {
        this.setActiveLayer(this.layers[0].id);
      }
      this._renderList();
      this._notifyChange();
    });
  }

  _showConfirm(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 200;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
    `;
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white; border-radius: 16px; padding: 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2); min-width: 260px; text-align: center;
    `;
    const text = document.createElement('div');
    text.textContent = message;
    text.style.cssText = 'font-size: 15px; color: #333; margin-bottom: 20px; line-height: 1.4;';
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Delete';
    confirmBtn.style.cssText = `
      display: block; width: 100%; padding: 12px; margin: 6px 0;
      border: none; border-radius: 10px; background: #f44336; color: white;
      font-size: 15px; font-weight: 500; cursor: pointer;
    `;
    confirmBtn.addEventListener('click', () => { overlay.remove(); onConfirm(); });
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      display: block; width: 100%; padding: 12px; margin: 6px 0 0;
      border: none; border-radius: 10px; background: rgba(0,0,0,0.05);
      font-size: 15px; color: #666; cursor: pointer;
    `;
    cancelBtn.addEventListener('click', () => overlay.remove());
    modal.append(text, confirmBtn, cancelBtn);
    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
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
        gap: 8px;
        padding: 8px 10px;
        border-radius: 8px;
        background: ${layer.id === this.activeLayerId ? 'rgba(33, 150, 243, 0.12)' : 'transparent'};
        cursor: pointer;
        transition: background 0.15s;
      `;

      const eyeBtn = document.createElement('button');
      eyeBtn.innerHTML = lucideIconHtml(layer.visible ? Eye : EyeOff, 15);
      eyeBtn.style.cssText = `border: none; background: none; cursor: pointer; padding: 2px; min-width: 24px; line-height: 1; color: ${layer.visible ? '#444' : '#bbb'}; display: flex; align-items: center; justify-content: center;`;
      eyeBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleVisibility(layer.id); });

      const nameEl = document.createElement('span');
      nameEl.textContent = layer.name;
      nameEl.style.cssText = `flex: 1; font-size: 13px; font-weight: 500; color: ${layer.visible ? '#333' : '#aaa'};`;

      row.addEventListener('pointerdown', (e) => { e.preventDefault(); this.setActiveLayer(layer.id); });

      const delBtn = document.createElement('button');
      delBtn.innerHTML = lucideIconHtml(X, 14);
      delBtn.style.cssText = 'border: none; background: none; color: #bbb; cursor: pointer; padding: 2px; transition: color 0.15s; display: flex; align-items: center; justify-content: center;';
      delBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.removeLayer(layer.id); });

      row.append(eyeBtn, nameEl, delBtn);
      this.listEl.appendChild(row);
    }
  }

  serialize() {
    return {
      layers: this.layers.map(l => ({ id: l.id, name: l.name, visible: l.visible })),
      activeLayerId: this.activeLayerId,
    };
  }

  deserialize(data) {
    if (!data || !data.layers) return;
    this.layers = data.layers.map(l => ({ id: l.id, name: l.name, visible: l.visible }));
    for (const l of this.layers) {
      const num = parseInt(l.id.replace('layer_', ''), 10);
      if (num >= nextId) nextId = num + 1;
    }
    this.activeLayerId = data.activeLayerId || this.layers[0]?.id;
    this.strokeManager.setActiveLayer(this.activeLayerId);
    for (const l of this.layers) {
      this.strokeManager.setLayerVisibility(l.id, l.visible);
    }
    this._renderList();
  }
}
