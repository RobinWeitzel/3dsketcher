// src/PlaneHandles.js
import * as THREE from 'three';

const RING_SEGMENTS = 64;
const RING_ARC = Math.PI * 1.5; // 270 degrees (gap for clarity)
const RING_RADIUS = 2;
const ARROW_LENGTH = 1.5;
const ARROWHEAD_SIZE = 0.15;
const HIT_THRESHOLD = 0.3;
const ARROW_MAX_STEP = 0.15; // max displacement per drag event
const RING_MAX_STEP = 0.05;  // max rotation in radians per drag event (~3°)
const ROTATION_SNAP = Math.PI / 36; // 5 degrees

const COLOR_RING = 0xff8844;
const COLOR_ARROW = 0x00cccc;
const COLOR_ACTIVE = 0xffcc00;

export class PlaneHandles {
  constructor(scene, drawingPlane, camera) {
    this.scene = scene;
    this.drawingPlane = drawingPlane;
    this.camera = camera;

    this.visible = false;
    this._meshes = [];

    // Which handle is being dragged: 'ringA' | 'ringB' | 'arrow' | null
    this.activeHandle = null;
    this._dragStartPoint = null;

    this._ringAMaterial = new THREE.LineBasicMaterial({ color: COLOR_RING });
    this._ringBMaterial = new THREE.LineBasicMaterial({ color: COLOR_RING });
    this._ringCMaterial = new THREE.LineBasicMaterial({ color: COLOR_RING });
    this._arrowMaterial = new THREE.LineBasicMaterial({ color: COLOR_ARROW });

    this._createHandles();

    // Distance tracking
    this._distanceOrigin = null;
    this._distanceLabel = this._createLabel();
    this.scene.add(this._distanceLabel);
    this._distanceLabel.visible = false;

    // Rotation tracking (persistent across drags on same axis)
    this._rotationOriginQuat = null; // quaternion when tracking started
    this._rotationHandleName = null; // which ring is being tracked
    this._rotationLabel = this._createLabel();
    this.scene.add(this._rotationLabel);
    this._rotationLabel.visible = false;

    this.hide();
  }

  _createRingGeometry() {
    const points = [];
    for (let i = 0; i <= RING_SEGMENTS; i++) {
      const angle = (i / RING_SEGMENTS) * RING_ARC;
      points.push(new THREE.Vector3(
        Math.cos(angle) * RING_RADIUS,
        0,
        Math.sin(angle) * RING_RADIUS
      ));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }

  _createArrowGeometry() {
    const points = [
      // Main shaft
      new THREE.Vector3(0, -ARROW_LENGTH, 0),
      new THREE.Vector3(0, ARROW_LENGTH, 0),
      // Top arrowhead
      new THREE.Vector3(0, ARROW_LENGTH, 0),
      new THREE.Vector3(-ARROWHEAD_SIZE, ARROW_LENGTH - ARROWHEAD_SIZE, 0),
      new THREE.Vector3(0, ARROW_LENGTH, 0),
      new THREE.Vector3(ARROWHEAD_SIZE, ARROW_LENGTH - ARROWHEAD_SIZE, 0),
      // Bottom arrowhead
      new THREE.Vector3(0, -ARROW_LENGTH, 0),
      new THREE.Vector3(-ARROWHEAD_SIZE, -ARROW_LENGTH + ARROWHEAD_SIZE, 0),
      new THREE.Vector3(0, -ARROW_LENGTH, 0),
      new THREE.Vector3(ARROWHEAD_SIZE, -ARROW_LENGTH + ARROWHEAD_SIZE, 0),
    ];
    return new THREE.BufferGeometry().setFromPoints(points);
  }

  _createHandles() {
    // Ring A: lies in XZ plane, rotates around normal (Y local)
    this.ringA = new THREE.Line(this._createRingGeometry(), this._ringAMaterial);
    this.scene.add(this.ringA);
    this._meshes.push(this.ringA);

    // Ring B: lies in YZ plane, rotates around right (X local)
    this.ringB = new THREE.Line(this._createRingGeometry(), this._ringBMaterial);
    this.ringB.geometry.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    this.scene.add(this.ringB);
    this._meshes.push(this.ringB);

    // Ring C: lies in XY plane, rotates around forward (Z local)
    this.ringC = new THREE.Line(this._createRingGeometry(), this._ringCMaterial);
    this.ringC.geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    this.scene.add(this.ringC);
    this._meshes.push(this.ringC);

    // Arrow: along normal (Y in local space)
    this.arrow = new THREE.LineSegments(this._createArrowGeometry(), this._arrowMaterial);
    this.scene.add(this.arrow);
    this._meshes.push(this.arrow);
  }

  show() {
    this.visible = true;
    this.update();
    for (const m of this._meshes) m.visible = true;
  }

  hide() {
    this.visible = false;
    this.activeHandle = null;
    for (const m of this._meshes) m.visible = false;
    this._resetColors();
    this._distanceOrigin = null;
    this._rotationOriginQuat = null;
    this._rotationHandleName = null;
    if (this._distanceLabel) this._distanceLabel.visible = false;
    if (this._rotationLabel) this._rotationLabel.visible = false;
  }

  // Sync handle transforms to match the drawing plane
  update() {
    if (!this.visible) return;
    const pos = this.drawingPlane.group.position;
    const quat = this.drawingPlane.group.quaternion;

    for (const m of this._meshes) {
      m.position.copy(pos);
      m.quaternion.copy(quat);
    }
  }

  // Returns 'ringA' | 'ringB' | 'ringC' | 'arrow' | null
  hitTest(ray) {
    if (!this.visible) return null;

    const center = this.drawingPlane.group.position.clone();
    const normal = this.drawingPlane.getNormal();
    const right = this.drawingPlane.getRight();
    const forward = this.drawingPlane.getForward();

    // Test arrow: distance from ray to the normal line through center
    const arrowDist = this._rayToLineDist(ray, center, normal, ARROW_LENGTH);
    if (arrowDist < HIT_THRESHOLD) return 'arrow';

    // Test rings: each ring's plane normal = the axis it rotates around
    const ringADist = this._rayToRingDist(ray, center, normal, RING_RADIUS);
    if (ringADist < HIT_THRESHOLD) return 'ringA';

    const ringBDist = this._rayToRingDist(ray, center, right, RING_RADIUS);
    if (ringBDist < HIT_THRESHOLD) return 'ringB';

    const ringCDist = this._rayToRingDist(ray, center, forward, RING_RADIUS);
    if (ringCDist < HIT_THRESHOLD) return 'ringC';

    return null;
  }

  _rayToLineDist(ray, center, direction, halfLength) {
    const p1 = center.clone().addScaledVector(direction, -halfLength);
    const p2 = center.clone().addScaledVector(direction, halfLength);
    return this._closestDistBetweenRayAndSegment(ray, p1, p2);
  }

  _closestDistBetweenRayAndSegment(ray, p1, p2) {
    const u = ray.direction.clone();
    const v = p2.clone().sub(p1);
    const w = ray.origin.clone().sub(p1);

    const a = u.dot(u);
    const b = u.dot(v);
    const c = v.dot(v);
    const d = u.dot(w);
    const e = v.dot(w);
    const denom = a * c - b * b;

    let sN, sD = denom, tN, tD = denom;

    if (denom < 0.00001) {
      sN = 0; sD = 1; tN = e; tD = c;
    } else {
      sN = b * e - c * d;
      tN = a * e - b * d;
      if (sN < 0) { sN = 0; tN = e; tD = c; }
    }

    if (tN < 0) { tN = 0; if (-d < 0) sN = 0; else sN = -d; sD = a; }
    else if (tN > tD) { tN = tD; if (-d + b < 0) sN = 0; else sN = -d + b; sD = a; }

    const sc = Math.abs(sN) < 0.00001 ? 0 : sN / sD;
    const tc = Math.abs(tN) < 0.00001 ? 0 : tN / tD;

    const closest = w.add(u.multiplyScalar(sc)).sub(v.multiplyScalar(tc));
    return closest.length();
  }

  _rayToRingDist(ray, center, ringNormal, radius) {
    const planeObj = new THREE.Plane().setFromNormalAndCoplanarPoint(ringNormal, center);
    const intersection = new THREE.Vector3();
    const hit = ray.intersectPlane(planeObj, intersection);

    if (!hit) {
      const closest = new THREE.Vector3();
      ray.closestPointToPoint(center, closest);
      const distToCenter = closest.distanceTo(center);
      return Math.abs(distToCenter - radius);
    }

    const distToCenter = intersection.distanceTo(center);
    return Math.abs(distToCenter - radius);
  }

  beginDrag(handleName, ray) {
    this.activeHandle = handleName;

    if (handleName === 'arrow') {
      this._arrowMaterial.color.setHex(COLOR_ACTIVE);
      this._arrowNormal = this.drawingPlane.getNormal();
      this._arrowOrigin = this.drawingPlane.group.position.clone();
      this._arrowStartProj = this._projectRayOntoLine(ray, this._arrowOrigin, this._arrowNormal);
      this._arrowOffset = 0;

      // Set distance origin on first push/pull
      if (!this._distanceOrigin) {
        this._distanceOrigin = this._arrowOrigin.clone();
      }

      // Reset rotation tracking on push/pull
      this._rotationOriginQuat = null;
      this._rotationHandleName = null;
      this._rotationLabel.visible = false;
    } else {
      // Reset distance tracking on rotation
      this._distanceOrigin = null;
      this._distanceLabel.visible = false;

      // Reset rotation tracking if switching to a different axis
      if (this._rotationHandleName !== handleName) {
        this._rotationOriginQuat = this.drawingPlane.group.quaternion.clone();
        this._rotationHandleName = handleName;
      }

      const mats = { ringA: this._ringAMaterial, ringB: this._ringBMaterial, ringC: this._ringCMaterial };
      mats[handleName].color.setHex(COLOR_ACTIVE);

      // Each ring rotates around its axis; basis vectors span the perpendicular plane
      const normal = this.drawingPlane.getNormal();
      const right = this.drawingPlane.getRight();
      const forward = this.drawingPlane.getForward();

      if (handleName === 'ringA') {
        // Lies in XZ (right-forward), rotates around normal
        this._ringAxis = normal;
        this._ringBasisA = right;
        this._ringBasisB = forward;
      } else if (handleName === 'ringB') {
        // Lies in YZ (normal-forward), rotates around right
        this._ringAxis = right;
        this._ringBasisA = forward;
        this._ringBasisB = normal;
      } else {
        // Lies in XY (right-normal), rotates around forward
        this._ringAxis = forward;
        this._ringBasisA = right;
        this._ringBasisB = normal;
      }

      this._ringCenter = this.drawingPlane.group.position.clone();
      this._ringStartQuat = this.drawingPlane.group.quaternion.clone();
      this._ringStartAngle = this._getRingAngleFixed(ray);
      this._ringTotalAngle = 0;
    }
  }

  drag(ray) {
    if (!this.activeHandle) return;

    if (this.activeHandle === 'arrow') {
      // Project onto the fixed reference line from drag start
      const currentPoint = this._projectRayOntoLine(ray, this._arrowOrigin, this._arrowNormal);
      const delta = currentPoint.clone().sub(this._arrowStartProj);
      const raw = -delta.dot(this._arrowNormal);
      // Clamp total offset, not per-frame delta
      const maxOffset = 3;
      const newOffset = Math.max(-maxOffset, Math.min(maxOffset, raw));

      this.drawingPlane.group.position.copy(this._arrowOrigin).addScaledVector(this._arrowNormal, newOffset);
      this.drawingPlane.updatePlane();
      this._arrowOffset = newOffset;

      // Update distance label
      if (this._distanceOrigin) {
        const currentPos = this.drawingPlane.group.position;
        const dist = currentPos.distanceTo(this._distanceOrigin);
        this._updateLabel(this._distanceLabel, dist.toFixed(2));
        this._distanceLabel.visible = true;
        const normal = this._arrowNormal;
        this._distanceLabel.position.copy(currentPos).addScaledVector(normal, ARROW_LENGTH + 0.5);
      }
    } else {
      const currentAngle = this._getRingAngleFixed(ray);
      // Normalize delta to [-π, π] to prevent atan2 discontinuity jumps
      const rawDelta = Math.atan2(
        Math.sin(-(currentAngle - this._ringStartAngle)),
        Math.cos(-(currentAngle - this._ringStartAngle))
      );
      // Clamp and snap to 5° increments
      const maxAngle = Math.PI; // 180° max
      const clamped = Math.max(-maxAngle, Math.min(maxAngle, rawDelta));
      const totalAngle = Math.round(clamped / ROTATION_SNAP) * ROTATION_SNAP;

      // Apply rotation from the original quaternion
      const rotQ = new THREE.Quaternion().setFromAxisAngle(this._ringAxis, totalAngle);
      this.drawingPlane.group.quaternion.copy(this._ringStartQuat).premultiply(rotQ);
      this.drawingPlane.updatePlane();
      this._ringTotalAngle = totalAngle;

      // Update rotation angle label (cumulative from origin)
      if (this._rotationOriginQuat) {
        const currentQuat = this.drawingPlane.group.quaternion;
        const deltaQuat = this._rotationOriginQuat.clone().conjugate().premultiply(currentQuat);
        const cumulativeAngle = 2 * Math.acos(Math.min(1, Math.abs(deltaQuat.w)));
        const cumulativeDegrees = Math.round(cumulativeAngle * 180 / Math.PI);
        if (cumulativeDegrees !== 0) {
          this._updateLabel(this._rotationLabel, `${cumulativeDegrees}°`);
          this._rotationLabel.visible = true;
          const center = this.drawingPlane.group.position;
          this._rotationLabel.position.copy(center).addScaledVector(this._ringAxis, RING_RADIUS + 0.5);
        } else {
          this._rotationLabel.visible = false;
        }
      }
    }

    this.update();
  }

  endDrag() {
    this._resetColors();
    this.activeHandle = null;
    // Rotation label stays visible between drags (persistent tracking)
  }

  _resetColors() {
    this._ringAMaterial.color.setHex(COLOR_RING);
    this._ringBMaterial.color.setHex(COLOR_RING);
    this._ringCMaterial.color.setHex(COLOR_RING);
    this._arrowMaterial.color.setHex(COLOR_ARROW);
  }

  _projectRayOntoLine(ray, linePoint, lineDir) {
    const w = ray.origin.clone().sub(linePoint);
    const a = ray.direction.dot(ray.direction);
    const b = ray.direction.dot(lineDir);
    const c = lineDir.dot(lineDir);
    const d = ray.direction.dot(w);
    const e = lineDir.dot(w);
    const denom = a * c - b * b;
    const t = denom > 0.00001 ? (b * d - a * e) / denom : 0;
    return linePoint.clone().addScaledVector(lineDir, t);
  }

  _getRingAngleFixed(ray) {
    const planeObj = new THREE.Plane().setFromNormalAndCoplanarPoint(this._ringAxis, this._ringCenter);
    const intersection = new THREE.Vector3();
    const hit = ray.intersectPlane(planeObj, intersection);
    if (!hit) return this._ringStartAngle || 0;

    const diff = intersection.sub(this._ringCenter);
    return Math.atan2(diff.dot(this._ringBasisB), diff.dot(this._ringBasisA));
  }

  _createLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.5, 0.75, 1);
    sprite._canvas = canvas;
    sprite._ctx = canvas.getContext('2d');
    sprite._texture = texture;
    return sprite;
  }

  _updateLabel(sprite, text) {
    const ctx = sprite._ctx;
    ctx.clearRect(0, 0, 128, 64);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 120, 56, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 32);
    sprite._texture.needsUpdate = true;
  }

  dispose() {
    this.hide();
    for (const m of this._meshes) {
      this.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
    this._meshes = [];
    for (const label of [this._distanceLabel, this._rotationLabel]) {
      this.scene.remove(label);
      label.material.map.dispose();
      label.material.dispose();
    }
  }
}
