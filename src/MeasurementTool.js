// src/MeasurementTool.js
import * as THREE from 'three';

export class MeasurementTool {
  constructor(scene) {
    this.scene = scene;
    this.measurements = []; // [{line, label, p1, p2, distance}]
    this._pendingPoint = null;
    this._pendingMarker = null;
  }

  addPoint(point) {
    if (!this._pendingPoint) {
      this._pendingPoint = point.clone();
      this._pendingMarker = this._createMarker(point);
      this.scene.add(this._pendingMarker);
      return null;
    }

    const p1 = this._pendingPoint;
    const p2 = point.clone();
    const distance = p1.distanceTo(p2);

    const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const lineMat = new THREE.LineDashedMaterial({ color: 0xff6600, dashSize: 0.1, gapSize: 0.05 });
    const line = new THREE.Line(lineGeo, lineMat);
    line.computeLineDistances();
    this.scene.add(line);

    const label = this._createLabel(distance);
    const mid = p1.clone().add(p2).multiplyScalar(0.5);
    mid.y += 0.3;
    label.position.copy(mid);
    this.scene.add(label);

    const marker2 = this._createMarker(p2);
    this.scene.add(marker2);

    const measurement = { line, label, marker1: this._pendingMarker, marker2, p1, p2, distance };
    this.measurements.push(measurement);

    this._pendingPoint = null;
    this._pendingMarker = null;

    return measurement;
  }

  cancelPending() {
    if (this._pendingMarker) {
      this.scene.remove(this._pendingMarker);
      this._pendingMarker.geometry?.dispose();
      this._pendingMarker.material?.dispose();
    }
    this._pendingPoint = null;
    this._pendingMarker = null;
  }

  clearAll() {
    this.cancelPending();
    for (const m of this.measurements) {
      this.scene.remove(m.line);
      this.scene.remove(m.label);
      this.scene.remove(m.marker1);
      this.scene.remove(m.marker2);
      m.line.geometry.dispose();
      m.line.material.dispose();
      m.label.material.map.dispose();
      m.label.material.dispose();
      m.marker1.geometry?.dispose();
      m.marker1.material?.dispose();
      m.marker2.geometry?.dispose();
      m.marker2.material?.dispose();
    }
    this.measurements = [];
  }

  _createMarker(point) {
    const geo = new THREE.SphereGeometry(0.05, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(point);
    return mesh;
  }

  _createLabel(distance) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 120, 56, 8);
    ctx.fill();
    ctx.fillStyle = '#ff6600';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(distance.toFixed(2), 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.2, 0.6, 1);
    return sprite;
  }

  serialize() {
    return this.measurements.map(m => ({
      p1: { x: m.p1.x, y: m.p1.y, z: m.p1.z },
      p2: { x: m.p2.x, y: m.p2.y, z: m.p2.z },
    }));
  }

  deserialize(data) {
    this.clearAll();
    if (!data) return;
    for (const m of data) {
      this._pendingPoint = new THREE.Vector3(m.p1.x, m.p1.y, m.p1.z);
      this._pendingMarker = this._createMarker(this._pendingPoint);
      this.scene.add(this._pendingMarker);
      this.addPoint(new THREE.Vector3(m.p2.x, m.p2.y, m.p2.z));
    }
  }
}
