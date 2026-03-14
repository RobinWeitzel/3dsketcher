# 3-Axis Plane Rotation — Design Document

## Purpose

Enable the drawing plane to be rotated freely in all three axes via two-finger touch gestures, replacing the current twist-only (yaw) rotation.

## Current Behavior

- One-finger drag: translates the plane
- Two-finger gesture: twist rotates around normal (yaw) + translates

## New Behavior

- One-finger drag: translates the plane (unchanged)
- Two-finger gesture: full 3-axis rotation (no translation)
  - **Twist** between fingers → yaw (rotate around local Y / normal)
  - **Midpoint vertical drag** (dy) → pitch (rotate around local X / right vector)
  - **Midpoint horizontal drag** (dx) → roll (rotate around local Z / forward vector)

All three rotation components are applied simultaneously each frame.

## Key Design Decision

Two-finger gestures become **rotation only**. Translation is removed from the two-finger path to avoid ambiguity. One-finger drag remains the sole way to translate the plane.

## Implementation

**File:** `src/InputHandler.js` only.

Changes:
1. In the two-finger branch of `_onPointerMove`, compute the midpoint delta (dx/dy) in addition to the twist angle
2. Remove the `_translatePlane` call from the two-finger branch
3. Apply three rotations using `rotateOnAxis` with local-space axes:
   - Twist → `rotateOnAxis(new Vector3(0, 1, 0), deltaAngle)`
   - Pitch → `rotateOnAxis(new Vector3(1, 0, 0), pitchAngle)` where `pitchAngle = dy * sensitivity`
   - Roll → `rotateOnAxis(new Vector3(0, 0, 1), rollAngle)` where `rollAngle = -dx * sensitivity`
4. Track the previous midpoint position to compute midpoint deltas
5. Sensitivity scaled by a constant (e.g., 0.005 radians per pixel)
