# 3D Sketcher — Design Document

## Purpose

A client-side web app for sketching 3D ideas on a tablet with pen input. The core concept: a movable drawing plane in 3D space. The user draws on this plane with a pen; strokes are placed in 3D world space. Moving the plane repositions future drawing without affecting existing strokes. This enables building up 3D sketches layer by layer — ideal for quickly prototyping ideas for 3D printing.

## Stack

- **Three.js** — 3D rendering, raycasting, camera controls
- **Vanilla JS** — no framework needed for a single-canvas app
- **Vite** — dev server and production bundling

## Architecture

### Modules

- **SceneManager** — Three.js scene, renderer, camera, resize handling, render loop.
- **DrawingPlane** — Manages the plane's 3D transform (position/rotation). Renders a semi-transparent grid. Provides the raycasting target to convert screen pen coordinates into 3D points on the plane.
- **StrokeManager** — Stores all strokes as arrays of 3D points. Each stroke is a `THREE.Line` in the scene. Manages undo/redo stack and eraser logic.
- **InputHandler** — Distinguishes pen vs touch via PointerEvents API. Routes pen events to drawing, touch events to camera or plane manipulation based on current mode.
- **ModeController** — Manages current mode (Camera vs Draw/Plane) and the toggle UI.

### Data Flow

```
Pen down → InputHandler → raycast onto DrawingPlane → 3D point → StrokeManager (accumulates points) → THREE.Line updates live
Pen up → StrokeManager finalizes stroke, pushes to undo stack

Touch (Draw/Plane mode) → InputHandler → DrawingPlane (translate/rotate)
Touch (Camera mode) → InputHandler → OrbitControls (orbit/pan)
```

## Input & Interaction Model

### Two Modes (toggle button)

1. **Draw/Plane mode** (default): Pen draws on the plane. Touch gestures manipulate the plane.
2. **Camera mode**: Touch gestures orbit and pan the camera. Pen inactive.

### Pen Input (Draw/Plane mode)

- Pen down: start new stroke, raycast to plane, begin collecting 3D points.
- Pen move: continue raycasting, append points, update live line.
- Pen up: finalize stroke, push to undo stack.
- Distinguished via `pointerType === "pen"` from PointerEvents API.

### Touch Input (Draw/Plane mode)

- One-finger drag: translate the drawing plane parallel to the camera's view.
- Two-finger drag: also translate.
- Two-finger twist: rotate the plane around its center.
- Existing strokes remain fixed in world space.

### Touch Input (Camera mode)

- One-finger drag: orbit camera around scene center.
- Two-finger drag: pan camera.

### Eraser

- Toolbar button toggles eraser mode.
- In eraser mode, pen taps/strokes near an existing stroke select and delete it (proximity-based raycasting).
- Eraser actions are pushed to the undo stack.

## Drawing Plane & Rendering

### Drawing Plane Visual

- Semi-transparent grid (`THREE.GridHelper`) parented to a transform group.
- Grid fades with distance from center to suggest infinity.
- Subtle axis indicator on the plane to show orientation.
- Mathematical `THREE.Plane` used for raycasting, paired with the visual grid.

### Stroke Rendering

- Each stroke: `THREE.Line` with `BufferGeometry`, points in world space.
- During drawing, geometry updated each frame with new points.
- Single fixed color and width (MVP — no color/width options).
- Strokes are children of scene root, not the plane.

### Scene

- Dark/neutral background.
- No ground plane or skybox.
- Small XYZ axis indicator in a corner for orientation reference.

## Undo/Redo

- Undo stack: array of actions, each either "add stroke" or "remove stroke".
- Undo reverses the last action (removes line from scene, or re-adds it).
- Redo replays it.
- Eraser deletions are also undo-able.

## UI Layout

- **Full-screen canvas** — Three.js renderer fills viewport. No scrolling, no panels.
- **Floating toolbar** — compact, along one edge. Contains:
  - Mode toggle (Camera / Draw+Plane)
  - Undo button
  - Redo button
  - Eraser toggle
- Touch targets minimum 44x44px.
- Current mode and eraser state clearly indicated visually.

## Out of Scope (MVP)

- Colors, line widths, zoom
- Save/load/export
- Grid snapping
- Multiple drawing planes
- Desktop/mouse input optimization

## Target Platform

- Tablets (iPad, Android tablets) with pen input
- Modern browsers with WebGL and PointerEvents support
