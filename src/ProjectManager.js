// src/ProjectManager.js

const STORAGE_KEY = 'sketch3d_project';
const PROJECT_VERSION = 1;

export class ProjectManager {
  constructor(strokeManager, drawingPlane, camera, orbitControls) {
    this.strokeManager = strokeManager;
    this.drawingPlane = drawingPlane;
    this.camera = camera;
    this.orbitControls = orbitControls;

    this._autoSaveTimer = null;
  }

  // Serialize entire project to JSON-compatible object
  serialize() {
    const plane = this.drawingPlane;
    const cam = this.camera;
    const target = this.orbitControls.target;

    return {
      version: PROJECT_VERSION,
      plane: {
        position: { x: plane.group.position.x, y: plane.group.position.y, z: plane.group.position.z },
        quaternion: { x: plane.group.quaternion.x, y: plane.group.quaternion.y, z: plane.group.quaternion.z, w: plane.group.quaternion.w },
      },
      camera: {
        position: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
        target: { x: target.x, y: target.y, z: target.z },
      },
      strokes: this.strokeManager.serializeStrokes(),
    };
  }

  // Restore project from serialized data
  deserialize(data) {
    if (!data || data.version !== PROJECT_VERSION) return false;

    // Restore plane
    if (data.plane) {
      const p = data.plane.position;
      const q = data.plane.quaternion;
      this.drawingPlane.group.position.set(p.x, p.y, p.z);
      this.drawingPlane.group.quaternion.set(q.x, q.y, q.z, q.w);
      this.drawingPlane.updatePlane();
    }

    // Restore camera
    if (data.camera) {
      const cp = data.camera.position;
      const ct = data.camera.target;
      this.camera.position.set(cp.x, cp.y, cp.z);
      this.orbitControls.target.set(ct.x, ct.y, ct.z);
      this.orbitControls.update();
    }

    // Restore strokes
    if (data.strokes) {
      this.strokeManager.loadStrokes(data.strokes);
    }

    return true;
  }

  // Auto-save to localStorage
  autoSave() {
    clearTimeout(this._autoSaveTimer);
    this._autoSaveTimer = setTimeout(() => {
      try {
        const json = JSON.stringify(this.serialize());
        localStorage.setItem(STORAGE_KEY, json);
      } catch (e) {
        console.warn('Auto-save failed:', e);
      }
    }, 500);
  }

  // Load from localStorage
  autoLoad() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      return this.deserialize(data);
    } catch (e) {
      console.warn('Auto-load failed:', e);
      return false;
    }
  }

  // Download project as .sketch3d file
  saveToFile() {
    const json = JSON.stringify(this.serialize(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sketch.sketch3d';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Load project from .sketch3d file
  loadFromFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.sketch3d,.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) { resolve(false); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const data = JSON.parse(ev.target.result);
            resolve(this.deserialize(data));
          } catch (err) {
            console.warn('Load failed:', err);
            resolve(false);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  // New project — clear everything
  newProject() {
    this.strokeManager.loadStrokes([]);
    this.drawingPlane.group.position.set(0, 0, 0);
    this.drawingPlane.group.quaternion.set(0, 0, 0, 1);
    this.drawingPlane.updatePlane();
    this.camera.position.set(0, 5, 10);
    this.orbitControls.target.set(0, 0, 0);
    this.orbitControls.update();
    this.autoSave();
  }
}
