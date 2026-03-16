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
    // Toggle button with stacked-layers SVG icon
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;
    this.toggleBtn.title = 'Layers';
    this.toggleBtn.style.cssText = `
      position: fixed;
      top: 12px;
      left: 12px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: none;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.85);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(8px);
      color: #444;
      cursor: pointer;
      z-index: 101;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s;
    `;
    this.toggleBtn.addEventListener('pointerover', () => { this.toggleBtn.style.background = 'rgba(0,0,0,0.08)'; });
    this.toggleBtn.addEventListener('pointerout', () => { this.toggleBtn.style.background = 'rgba(255,255,255,0.85)'; });
    this.toggleBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.panel.style.display = this.panel.style.display === 'none' ? 'flex' : 'none';
    });
    document.body.appendChild(this.toggleBtn);

    // Panel
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: fixed;
      top: 58px;
      left: 12px;
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
        gap: 8px;
        padding: 8px 10px;
        border-radius: 8px;
        background: ${layer.id === this.activeLayerId ? 'rgba(33, 150, 243, 0.12)' : 'transparent'};
        cursor: pointer;
        transition: background 0.15s;
      `;

      const eyeBtn = document.createElement('button');
      eyeBtn.textContent = layer.visible ? '\u{1F441}' : '\u2014';
      eyeBtn.style.cssText = 'border: none; background: none; font-size: 15px; cursor: pointer; padding: 2px; min-width: 24px; line-height: 1;';
      eyeBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleVisibility(layer.id); });

      const nameEl = document.createElement('span');
      nameEl.textContent = layer.name;
      nameEl.style.cssText = `flex: 1; font-size: 13px; font-weight: 500; color: ${layer.visible ? '#333' : '#aaa'};`;

      row.addEventListener('pointerdown', (e) => { e.preventDefault(); this.setActiveLayer(layer.id); });

      const delBtn = document.createElement('button');
      delBtn.textContent = '\u2715';
      delBtn.style.cssText = 'border: none; background: none; color: #bbb; font-size: 13px; cursor: pointer; padding: 2px; transition: color 0.15s;';
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
