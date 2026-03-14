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
    if (this.layers.length <= 1) return;
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

      const eyeBtn = document.createElement('button');
      eyeBtn.textContent = layer.visible ? '\u{1F441}' : '\u2014';
      eyeBtn.style.cssText = 'border: none; background: none; font-size: 14px; cursor: pointer; padding: 2px; min-width: 24px;';
      eyeBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleVisibility(layer.id); });

      const nameEl = document.createElement('span');
      nameEl.textContent = layer.name;
      nameEl.style.cssText = `flex: 1; font-size: 13px; color: ${layer.visible ? '#333' : '#999'};`;

      row.addEventListener('pointerdown', (e) => { e.preventDefault(); this.setActiveLayer(layer.id); });

      const delBtn = document.createElement('button');
      delBtn.textContent = '\u2715';
      delBtn.style.cssText = 'border: none; background: none; color: #999; font-size: 12px; cursor: pointer; padding: 2px;';
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
