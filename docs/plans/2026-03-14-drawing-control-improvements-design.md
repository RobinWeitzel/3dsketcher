# Drawing Control Improvements Design

**Date:** 2026-03-14

## Overview

Simplify plane controls by removing draw-to-place, adding rotation snapping, and showing push/pull distance feedback.

## Changes

### 1. Remove Place Button & Draw-to-Place

- Remove "Place" button from toolbar → toolbar becomes: [Undo] [Redo] [Eraser] [Move]
- Remove `placingPlane` state, `_placingCallbacks`, `_togglePlacing`, `exitPlacing`, `onPlacingChange` from `ModeController`
- Remove from `InputHandler`: preview line logic, snap constants/methods, `_applyPlacement`, `_rayAtTargetDist`, `_placeStartNDC`, and all related code
- The "Move" button + handles is the sole mechanism for repositioning the plane

### 2. Rotation Snaps to 5° Increments

- In `PlaneHandles.drag()`, snap total rotation to nearest 5° (`Math.PI / 36`)
- Formula: `snappedAngle = Math.round(totalAngle / SNAP_STEP) * SNAP_STEP`
- Applies to all three ring handles (ringA, ringB, ringC)

### 3. Push/Pull Distance Label

- `THREE.Sprite` with `CanvasTexture` positioned near the arrow tip, always camera-facing
- `PlaneHandles` tracks `_distanceOrigin` (plane position at first push/pull)
- On each `endDrag()` for arrow: update displayed distance but keep `_distanceOrigin`
- Distance = `|currentPosition - _distanceOrigin|` (projected onto normal)
- **Reset triggers:**
  - Any ring rotation → sets `_distanceOrigin = null`, hides label
  - Exiting adjusting mode (draw/eraser switch) → same reset
- Label only visible after first push/pull in a session

### 4. Files Modified

- `src/ModeController.js` — remove Place button, placing state, placing callbacks
- `src/InputHandler.js` — remove all placement code, snap constants
- `src/PlaneHandles.js` — add rotation snapping, distance label sprite, reset logic
- `src/main.js` — remove placing-related wiring
