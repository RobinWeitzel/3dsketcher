// src/main.js
import { SceneManager } from './SceneManager.js';
import { DrawingPlane } from './DrawingPlane.js';

const sceneManager = new SceneManager();
const drawingPlane = new DrawingPlane(sceneManager.scene);
