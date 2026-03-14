// src/DrawingPlane.js
import * as THREE from 'three';

export class DrawingPlane {
  constructor(scene) {
    this.scene = scene;

    // Group holds the visual grid and can be transformed
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Semi-transparent grid
    const gridSize = 20;
    const gridDivisions = 20;
    this.grid = new THREE.GridHelper(gridSize, gridDivisions, 0x4a4a6a, 0x3a3a5a);
    const materials = Array.isArray(this.grid.material) ? this.grid.material : [this.grid.material];
    materials.forEach(m => { m.transparent = true; m.opacity = 0.4; });
    this.group.add(this.grid);

    // Axis indicator on the plane: small colored lines at center
    const axisLength = 1;
    const xAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(axisLength, 0, 0),
    ]);
    const zAxisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, axisLength),
    ]);
    this.group.add(new THREE.Line(xAxisGeo, new THREE.LineBasicMaterial({ color: 0xff4444 })));
    this.group.add(new THREE.Line(zAxisGeo, new THREE.LineBasicMaterial({ color: 0x4444ff })));

    // Mathematical plane for raycasting (starts as Y=0, i.e. XZ plane)
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.raycaster = new THREE.Raycaster();
  }

  // Update the mathematical plane to match the group's transform
  updatePlane() {
    const normal = new THREE.Vector3(0, 1, 0);
    normal.applyQuaternion(this.group.quaternion);
    const point = this.group.position.clone();
    this.plane.setFromNormalAndCoplanarPoint(normal, point);
  }

  // Raycast from screen coordinates to the drawing plane
  // Returns a Vector3 in world space, or null if no intersection
  raycast(ndcX, ndcY, camera) {
    this.updatePlane();
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const intersection = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.plane, intersection);
    return hit ? intersection : null;
  }

  // Get the plane's normal in world space
  getNormal() {
    const normal = new THREE.Vector3(0, 1, 0);
    normal.applyQuaternion(this.group.quaternion);
    return normal;
  }

  // Get the plane's right vector in world space
  getRight() {
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.group.quaternion);
    return right;
  }

  // Get the plane's forward vector in world space
  getForward() {
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(this.group.quaternion);
    return forward;
  }
}
