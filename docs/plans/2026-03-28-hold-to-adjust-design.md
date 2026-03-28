# Hold-to-Adjust Plane Switching Design

**Date:** 2026-03-28

## Problem

Switching between drawing and adjusting the drawing plane requires opening the Tools dropdown each time. On a pen/tablet, this is slow and interrupts flow — especially when frequently repositioning the plane.

## Solution

Hold the pen barrel button to temporarily enter Move Plane mode. Release to instantly resume drawing. Plane presets and a Move Plane toggle are always visible in the toolbar for quick access.

## Interaction Model

### Primary: Barrel Button Hold

1. User presses and holds pen barrel button (button index 5)
2. Plane handles appear immediately
3. User drags handles with the pen tip to adjust the plane
4. User releases barrel button → handles hide, back to draw mode

This works regardless of the current tool (draw, eraser, ruler). The barrel button always temporarily enters adjust mode.

### Fallback: Toolbar Toggle

For pens without a barrel button, a dedicated Move Plane toggle button sits in the toolbar. Single tap enters adjust mode, another tap exits. Same as current behavior but without the dropdown.

### Presets: Always Visible

XZ, XY, YZ preset buttons are always visible in the toolbar. One tap snaps the plane — no mode switch required. If the user is in adjust mode, handles update to the new orientation. If not, the plane just snaps (no handles shown).

## Toolbar Layout

```
[ Brush v ] [ Tools v ] | [ <- -> ] | [ XZ XY YZ ] [ Move ] | [ File v ] [ Layers ]
```

- **XZ / XY / YZ** — Small preset buttons, always visible
- **Move** — Direct toggle button (Lucide `move` icon)
- **Tools dropdown** — Now only contains: Draw, Eraser, Ruler, Clear Measurements

## Technical Changes

### InputHandler.js

- Listen for `pointerdown` with `e.button === 5` → `modeController.enterAdjusting()`, set `_barrelHold = true`
- Listen for `pointerup` with `e.button === 5` → if `_barrelHold` and `modeController._holdAdjusting`, call `modeController.exitAdjusting()`, reset `_barrelHold`
- During barrel hold: handle drags work as normal. Pen on empty space does NOT draw.

### ModeController.js

- Remove Move Plane and presets from Tools dropdown
- Add Move Plane toggle button to main toolbar bar
- Add XZ/XY/YZ preset buttons to main toolbar bar
- Add `_holdAdjusting` flag:
  - `enterAdjusting(hold=false)` — if `hold=true`, set `_holdAdjusting = true`
  - `exitAdjusting()` — only auto-exit if `_holdAdjusting` is true (barrel release)
  - Toolbar toggle always sets `_holdAdjusting = false` (persistent mode)
- Presets callable in any mode — if not adjusting, just snap the plane without showing handles

### Edge Cases

- Barrel hold while already in toggle-adjust → barrel release does NOT exit (toggle takes precedence)
- Preset during barrel hold → snap plane, handles stay visible
- Eraser/ruler activation during barrel hold → barrel release still exits adjust mode
- Undo during barrel hold → exits adjust mode (existing behavior preserved)

## Unchanged

- PlaneHandles.js — show/hide/drag logic unchanged
- DrawingPlane.js — preset/transform logic unchanged
- Export modal, layers panel — unaffected
