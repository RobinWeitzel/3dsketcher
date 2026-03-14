// src/main.js
import { SceneManager } from './SceneManager.js';
import { DrawingPlane } from './DrawingPlane.js';
import { StrokeManager } from './StrokeManager.js';
import { ModeController } from './ModeController.js';
import { InputHandler } from './InputHandler.js';
import { RotationController } from './RotationController.js';
import { RotationCube } from './RotationCube.js';

const sceneManager = new SceneManager();
const drawingPlane = new DrawingPlane(sceneManager.scene);
const strokeManager = new StrokeManager(sceneManager.scene, drawingPlane, sceneManager.camera);
const modeController = new ModeController();
const rotationController = new RotationController();

modeController.setUndoRedoHandlers(
  () => strokeManager.undo(),
  () => strokeManager.redo()
);

// Update shader uniforms each frame
sceneManager.addUpdateCallback(() => strokeManager.updateUniforms());

const inputHandler = new InputHandler(
  sceneManager.canvas,
  sceneManager.camera,
  drawingPlane,
  strokeManager,
  modeController,
  sceneManager.orbitControls
);

const rotationCube = new RotationCube(drawingPlane, rotationController);
