import * as p5 from 'p5';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from './utils/constants';
import { CoordinateAxes } from './shapes/CoordinateAxes';
import { Camera } from './core/Camera';
import { DrawingPlane } from './shapes/DrawingPlane';

let coordinateAxes: CoordinateAxes;
let cameraManager: Camera;
let drawingPlane: DrawingPlane;
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
        drawingPlane = new DrawingPlane(CANVAS_WIDTH - 400, CANVAS_WIDTH - 400);
        isSetup = true;
    };

    p.draw = () => {
        if (!isSetup) return;
        
        p.background(COLORS.WHITE);
        cameraManager.update();
        coordinateAxes.draw(p);
        drawingPlane.draw(p);
    };

    const getMousePositionOnPlane = () => {
        // Get mouse position relative to center
        const mouseX = p.mouseX - p.width/2;
        const mouseY = p.mouseY - p.height/2;
    
        return {
            x: mouseX,
            y: mouseY
        };
    };

    p.mousePressed = () => {
        if (!isSetup) return;
        
        if (cameraManager.isCurrentlyLocked()) {
            // When camera is locked, handle drawing
            const { x, y } = getMousePositionOnPlane();
            drawingPlane.startDrawing(x, y);
        } else {
            // When camera is unlocked, handle camera movement
            cameraManager.handleMousePressed();
        }
    };

    p.mouseDragged = () => {
        if (!isSetup) return;
        
        if (cameraManager.isCurrentlyLocked()) {
            // When camera is locked, handle drawing
            const { x, y } = getMousePositionOnPlane();
            drawingPlane.continueDrawing(x, y);
        } else {
            // When camera is unlocked, handle camera movement
            cameraManager.handleMouseDragged();
        }
    };

    p.mouseReleased = () => {
        if (!isSetup) return;
        
        if (cameraManager.isCurrentlyLocked()) {
            // When camera is locked, handle drawing
            drawingPlane.stopDrawing();
        } else {
            // When camera is unlocked, handle camera movement
            cameraManager.handleMouseReleased();
        }
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