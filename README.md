# 3D Sketcher

> **Disclaimer:** This project was vibecoded with Claude Code. The entire codebase was generated through AI-assisted development.

A browser-based 3D drawing app that lets you sketch on a movable plane in 3D space using a pen/stylus or mouse.

**[Try it live](https://robinweitzel.github.io/3dsketcher/)**

## Features

- Draw on a 3D plane with pen pressure support
- Move and rotate the drawing plane with handles or snap to XZ/XY/YZ presets
- Color picker with presets and custom colors
- Adjustable stroke width (thin/medium/thick)
- Layer system for organizing strokes
- Eraser and ruler/measurement tools
- Undo/redo
- Save/load projects (auto-saves to local storage)
- Export to STL and OBJ formats
- Finger tap on canvas to toggle plane adjustment mode (for tablet users)

## Tech Stack

- Three.js for 3D rendering
- Lucide for icons
- Vite for build tooling
- Vanilla JavaScript (no framework)

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output goes to `dist/`.
