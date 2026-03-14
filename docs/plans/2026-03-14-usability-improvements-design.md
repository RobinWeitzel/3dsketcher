# Comprehensive Usability Improvements Design

**Goal:** Transform the 3D sketcher from a drawing prototype into a complete sketching app for 3D printing workflows by adding persistence, export, drawing tools, layers, measurement, plane presets, and a viewport gizmo.

**Implementation Order:** Foundation-first — persistence and data model come first so every subsequent feature automatically gets save/load.

**Tech Stack:** Three.js v0.183, Vanilla JS ES modules, Vite

---

## 1. Data Model & Persistence

**Storage:** JSON project format. Auto-save to localStorage on every state change. Manual save/load via file download/upload (`.sketch3d` extension).

```
Project {
  version: 1,
  settings: { activeColor, activeWidth, activeLayerId },
  plane: { normal: [x,y,z], point: [x,y,z] },
  layers: [
    { id, name, visible, strokes: [
      { points: [{x,y,z}...], color, width }
    ]}
  ],
  camera: { position: [x,y,z], target: [x,y,z] }
}
```

- Auto-save to `localStorage['sketch3d_project']` on stroke end, undo/redo, layer change, plane move
- Manual save: downloads JSON as `.sketch3d` file
- Manual load: `<input type="file">` restores project state
- New Project: clears everything, creates default layer
- Undo/redo stack is NOT persisted (resets on load)
- Camera position IS persisted

**New file:** `src/ProjectManager.js` — handles serialize/deserialize, auto-save, file I/O

---

## 2. Layers

**Data model:** Each layer has id (uuid), name, visible flag. Strokes belong to exactly one layer. The drawing plane is shared (independent of layers).

**UI:** Collapsible side panel on left edge:
- Layer rows: eye toggle, name (editable), delete button
- "+" button adds new layer
- Tap row to set as active layer
- Active layer highlighted
- Default: "Layer 1" on new project

**Behavior:**
- New strokes are added to the active layer
- Hidden layers' stroke meshes set `visible = false`
- Eraser only affects visible layers' strokes
- Deleting a layer removes its strokes (confirm dialog)
- At least one layer must exist at all times

**New file:** `src/LayerPanel.js` — DOM overlay for layer management
**Modify:** `src/StrokeManager.js` — strokes tagged with layerId, visibility filtering

---

## 3. Color Picker

**UI:** Compact color palette in toolbar area:
- 8 preset swatches: black (#000), red (#f44336), blue (#2196f3), green (#4caf50), orange (#ff9800), purple (#9c27b0), white (#fff), gray (#9e9e9e)
- Plus a custom color button that opens `<input type="color">`
- Active color shown as colored dot on toolbar

**Behavior:**
- Color stored per-stroke at creation time
- Changing color only affects new strokes
- Color passed to `StrokeManager.beginStroke()` and stored in stroke data

**Modify:** `src/ModeController.js` — add color palette to toolbar
**Modify:** `src/StrokeManager.js` — accept color param, apply to material

---

## 4. Line Width

**UI:** 3 width buttons in toolbar: Thin (1), Medium (2), Thick (4) (in world units scaled appropriately)

**Implementation:** Since WebGL `linewidth` is unreliable (capped at 1 on most GPUs), use `THREE.TubeGeometry` for strokes with width > minimum threshold. For thin lines, keep current `THREE.Line` approach.

- Thin: `THREE.Line` (current approach, ~1px)
- Medium: `THREE.TubeGeometry` with radius 0.02
- Thick: `THREE.TubeGeometry` with radius 0.05

**Behavior:**
- Width stored per-stroke at creation time
- Width passed to `StrokeManager.beginStroke()`

**Modify:** `src/StrokeManager.js` — tube geometry generation, width parameter
**Modify:** `src/ModeController.js` — add width buttons to toolbar

---

## 5. Export (STL/OBJ)

**Formats:** OBJ (text, widely supported) and STL (binary, standard for slicers).

**Implementation:**
- Use `three/addons/exporters/OBJExporter` and `three/addons/exporters/STLExporter`
- Convert all visible strokes to tube meshes before export (lines have no volume)
- Tube radius matches stroke width setting
- Export button opens a small modal with format choice (OBJ / STL)
- Downloads the file

**New file:** `src/ExportManager.js` — handles mesh conversion and export
**Modify:** `src/ModeController.js` — add Export button to toolbar

---

## 6. Measurement Tools

**Ruler tool:** Point-to-point distance measurement mode.

**UI:** New toolbar button "Ruler" (like eraser, activates a mode)
- Tap first point on drawing plane → marker appears
- Tap second point → dashed line drawn between points with distance label
- Measurements shown as sprites (reuse label system from PlaneHandles)
- Press "Clear Measurements" to remove all
- Measurements are non-editable — clear and redo

**Behavior:**
- Measurements stored in project data and persisted
- Only measures on the current drawing plane
- Multiple measurements can be active simultaneously

**New file:** `src/MeasurementTool.js` — handles measurement mode and rendering
**Modify:** `src/ModeController.js` — add Ruler button, measurement mode state
**Modify:** `src/InputHandler.js` — measurement mode pointer handling

---

## 7. Plane Presets

**UI:** Three buttons visible when in adjust mode: "XY", "XZ", "YZ"

**Behavior:**
- XY: sets normal to (0,0,1), point to origin — top-down view plane
- XZ: sets normal to (0,1,0), point to origin — front view plane
- YZ: sets normal to (1,0,0), point to origin — side view plane
- Resets plane position to origin
- Keeps camera position unchanged (user can orbit to match)

**Modify:** `src/ModeController.js` — show preset buttons when adjusting
**Modify:** `src/DrawingPlane.js` — expose `setPreset(name)` method

---

## 8. Viewport Orientation Gizmo

**UI:** Small 3D cube in top-right corner (120x120px overlay)

**Implementation:**
- Secondary Three.js scene + OrthographicCamera
- Small canvas element positioned fixed top-right
- Camera rotation synced to main camera each frame
- Colored axes: X=red, Y=green, Z=blue
- Face labels: Top/Bottom/Front/Back/Left/Right
- Click a face → animate main camera to that orthographic view

**New file:** `src/ViewportGizmo.js` — secondary scene, camera sync, click handling
**Modify:** `src/SceneManager.js` — expose camera rotation for sync
**Modify:** `src/main.js` — instantiate gizmo, add update callback
