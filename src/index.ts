import * as p5 from 'p5';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from './utils/constants';
import { CoordinateAxes } from './shapes/CoordinateAxes';
import { Camera } from './core/Camera';

let coordinateAxes: CoordinateAxes;
let cameraManager: Camera;
let font: p5.Font;
let isSetup = false;

// Load font globally before starting
p5.prototype.preload = function() {
    font = this.loadFont('/assets/fonts/inconsolata.otf');
};

const sketch = (p: p5) => {
    p.setup = () => {
        // Initialize canvas with constants
        p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT, p.WEBGL);
        coordinateAxes = new CoordinateAxes(CANVAS_WIDTH/2 - 200);
        coordinateAxes.setFont(font);
        cameraManager = new Camera(p);
        cameraManager.setFont(font);
        isSetup = true;
    };

    p.draw = () => {
        if (!isSetup) return;
        
        p.background(COLORS.WHITE);
        cameraManager.update();
        coordinateAxes.draw(p);
    };

    // Handle mouse events
    p.mousePressed = () => {
        if (!isSetup) return;
        cameraManager.handleMousePressed();
    };

    p.mouseDragged = () => {
        if (!isSetup) return;
        cameraManager.handleMouseDragged();
    };

    p.mouseReleased = () => {
        if (!isSetup) return;
        cameraManager.handleMouseReleased();
    };

    p.keyPressed = () => {
        if (!isSetup) return;
        if (p.key === 'l' || p.key === 'L') {
            cameraManager.toggleLock();
        }
    };
};

// Create the p5 instance
export const myp5 = new p5(sketch, document.body);