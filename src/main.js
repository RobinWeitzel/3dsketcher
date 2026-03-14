// src/main.js
import { SceneManager } from './SceneManager.js';
import { DrawingPlane } from './DrawingPlane.js';
import { StrokeManager } from './StrokeManager.js';
import { ModeController } from './ModeController.js';
import { InputHandler } from './InputHandler.js';
import { PlaneHandles } from './PlaneHandles.js';
import { ProjectManager } from './ProjectManager.js';
import { LayerPanel } from './LayerPanel.js';

const sceneManager = new SceneManager();
const drawingPlane = new DrawingPlane(sceneManager.scene);
const strokeManager = new StrokeManager(sceneManager.scene, drawingPlane, sceneManager.camera);
const modeController = new ModeController();
const layerPanel = new LayerPanel(strokeManager);

const projectManager = new ProjectManager(strokeManager, drawingPlane, sceneManager.camera, sceneManager.orbitControls, layerPanel);

layerPanel.onChange(() => projectManager.autoSave());

modeController.setUndoRedoHandlers(
  () => { modeController.exitAdjusting(); planeHandles.hide(); strokeManager.undo(); projectManager.autoSave(); },
  () => { modeController.exitAdjusting(); planeHandles.hide(); strokeManager.redo(); projectManager.autoSave(); }
);

// Update shader uniforms each frame
sceneManager.addUpdateCallback(() => strokeManager.updateUniforms());

const planeHandles = new PlaneHandles(sceneManager.scene, drawingPlane, sceneManager.camera);

// Show/hide handles when adjusting state changes
modeController.onAdjustingChange((adjusting) => {
  if (adjusting) planeHandles.show();
  else { planeHandles.hide(); projectManager.autoSave(); }
});

// Update handles each frame to stay in sync with plane
sceneManager.addUpdateCallback(() => planeHandles.update());

const inputHandler = new InputHandler(
  sceneManager.canvas,
  sceneManager.camera,
  drawingPlane,
  strokeManager,
  modeController,
  sceneManager.orbitControls,
  planeHandles
);

// Auto-save after each stroke
const origEndStroke = strokeManager.endStroke.bind(strokeManager);
strokeManager.endStroke = function() {
  origEndStroke();
  projectManager.autoSave();
};

// Auto-save after each erase
const origRemoveStroke = strokeManager.removeStroke.bind(strokeManager);
strokeManager.removeStroke = function(stroke) {
  origRemoveStroke(stroke);
  projectManager.autoSave();
};

// Wire save/load/new buttons from ModeController
modeController.onSave(() => projectManager.saveToFile());
modeController.onLoad(async () => {
  const ok = await projectManager.loadFromFile();
  if (ok) modeController.exitAdjusting();
});
modeController.onNew(() => {
  if (confirm('Start a new project? Current work will be lost.')) {
    projectManager.newProject();
    modeController.exitAdjusting();
    planeHandles.hide();
  }
});

// Auto-load on startup
projectManager.autoLoad();
