// src/main.js
import { SceneManager } from './SceneManager.js';
import { DrawingPlane } from './DrawingPlane.js';
import { StrokeManager } from './StrokeManager.js';
import { ModeController } from './ModeController.js';
import { InputHandler } from './InputHandler.js';

const sceneManager = new SceneManager();
const drawingPlane = new DrawingPlane(sceneManager.scene);
const strokeManager = new StrokeManager(sceneManager.scene);
const modeController = new ModeController();

modeController.setUndoRedoHandlers(
  () => strokeManager.undo(),
  () => strokeManager.redo()
);

const inputHandler = new InputHandler(
  sceneManager.canvas,
  sceneManager.camera,
  drawingPlane,
  strokeManager,
  modeController
);

modeController.onModeChange((mode) => {
  sceneManager.orbitControls.enabled = (mode === 'camera');
});
