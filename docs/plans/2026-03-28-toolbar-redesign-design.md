# Toolbar Redesign: Grouped Dropdowns with Lucide Icons

**Date:** 2026-03-28

## Problem

The toolbar has too many icons displayed at once across two rows. Custom inline SVG icons look inconsistent.

## Solution

Replace the two-row toolbar with a single-row bar containing dropdown groups. Replace all custom SVGs with Lucide icons.

## Main Bar Layout

```
[ Brush ▾ ]  [ Tools ▾ ]  [ ← ]  [ → ]  [ File ▾ ]
```

- **Brush** — `palette` icon with colored dot showing current color. Opens color/width dropdown.
- **Tools** — Icon reflects active tool (`pencil`, `eraser`, `ruler`, `move`). Opens tool selector.
- **Undo** — `undo-2` icon. Direct button, no dropdown.
- **Redo** — `redo-2` icon. Direct button, no dropdown.
- **File** — `folder` icon. Opens file operations dropdown.

Layers toggle button remains in top-left corner unchanged.

## Dropdown Contents

### Brush Dropdown
- 8 color swatches (preset grid) + custom color picker
- Divider
- Stroke width: Thin / Medium / Thick with visual line indicators

### Tools Dropdown
- Draw (`pencil`) — default tool
- Eraser (`eraser`)
- Ruler (`ruler`)
- Move Plane (`move`)
- Contextual sub-items:
  - Move Plane active → XZ / XY / YZ plane preset buttons
  - Ruler active → Clear Measurements (`trash-2`)

### File Dropdown
- New (`file-plus`)
- Save (`save`)
- Load (`folder-open`)
- Divider
- Export (`download`) — opens existing format selection modal

## Behavior

- Dropdowns open upward from the toolbar
- Only one dropdown open at a time
- Click outside closes open dropdown
- Tools button icon changes to reflect active tool
- Brush button shows colored dot for current color

## Technical Approach

- Install `lucide` npm package (tree-shakeable SVG icons)
- Refactor `ModeController.js`: replace `ICONS` object and `svgIcon()` with Lucide imports
- Dropdown logic: vanilla DOM, positioned panels, click-outside listener
- Keep glass-morphism styling (backdrop-filter, semi-transparent backgrounds)
- No new dependencies beyond `lucide`

## Unchanged

- LayerPanel.js — top-left layers toggle and panel stay as-is
- Export modal — format selection dialog unchanged
- All existing callbacks and state management preserved
