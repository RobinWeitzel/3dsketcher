// src/ExportManager.js
import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

const DEFAULT_TUBE_RADIUS = 0.015;

export class ExportManager {
  constructor(strokeManager) {
    this.strokeManager = strokeManager;
  }

  _buildExportScene() {
    const exportScene = new THREE.Scene();

    for (const stroke of this.strokeManager.strokes) {
      if (!stroke.visible) continue;

      let points = [];
      if (stroke.userData._points) {
        const arr = stroke.userData._points;
        const count = stroke.userData._pointCount;
        for (let i = 0; i < count; i++) {
          points.push(new THREE.Vector3(arr[i*3], arr[i*3+1], arr[i*3+2]));
        }
      } else if (stroke.geometry?.attributes?.position) {
        const positions = stroke.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          points.push(new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i)));
        }
      }

      if (points.length < 2) continue;

      const width = stroke.userData.width || 1;
      const radius = width === 3 ? 0.05 : width === 2 ? 0.02 : DEFAULT_TUBE_RADIUS;
      const color = stroke.userData.color || '#222222';

      const curve = new THREE.CatmullRomCurve3(points, false);
      const tubeGeo = new THREE.TubeGeometry(curve, Math.max(points.length * 2, 8), radius, 8, false);
      const material = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(tubeGeo, material);
      exportScene.add(mesh);
    }

    return exportScene;
  }

  exportSTL() {
    const scene = this._buildExportScene();
    const exporter = new STLExporter();
    const result = exporter.parse(scene, { binary: true });
    const blob = new Blob([result], { type: 'application/octet-stream' });
    this._download(blob, 'sketch.stl');
    this._disposeScene(scene);
  }

  exportOBJ() {
    const scene = this._buildExportScene();
    const exporter = new OBJExporter();
    const result = exporter.parse(scene);
    const blob = new Blob([result], { type: 'text/plain' });
    this._download(blob, 'sketch.obj');
    this._disposeScene(scene);
  }

  _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  _disposeScene(scene) {
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }
}
