import * as p5 from 'p5';
import { mat3, ReadonlyMat3 } from 'gl-matrix';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from './utils/constants';
import { CoordinateAxes } from './shapes/CoordinateAxes';
import { Camera } from './core/Camera';
import { DrawingPlane } from './shapes/DrawingPlane';
import { cross, normalize } from './utils/helper';

let coordinateAxes: CoordinateAxes;
let cameraManager: Camera;
let drawingPlane: DrawingPlane;
let font: p5.Font;
let isSetup = false;
let hudElement: HTMLDivElement;

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

        // Create HUD element
        hudElement = document.createElement('div');
        hudElement.style.position = 'absolute';
        hudElement.style.top = '10px';
        hudElement.style.left = '10px';
        hudElement.style.color = 'black';
        hudElement.style.fontFamily = 'Arial';
        hudElement.style.fontSize = '16px';
        hudElement.style.zIndex = '1000';
        document.body.appendChild(hudElement);
    };

    p.draw = () => {
        if (!isSetup) return;
        
        p.background(COLORS.WHITE);
        cameraManager.update();
        coordinateAxes.draw(p);
        drawingPlane.draw(p);
    };

    const getMousePositionOnPlane2 = () => {
        const cam = cameraManager.getCamera();
        const mouseX = p.mouseX - CANVAS_WIDTH / 2;
        const mouseY = p.mouseY - CANVAS_HEIGHT / 2;
        
        const initalCamVector = new p5.Vector(0, 800);
        const currentCamVector = new p5.Vector(cam.eyeX, cam.eyeZ);

        const angle = p.acos(initalCamVector.dot(currentCamVector) / (initalCamVector.mag() * currentCamVector.mag()));

        const Ry = [
            Math.cos(angle), 0, Math.sin(angle), 
            0, 1, 0,
            -Math.sin(angle), 0, Math.cos(angle)
        ]

        const Ry_diag = [
            Math.cos(angle), Math.cos(angle), Math.cos(angle),
            1, 1, 1,
            Math.cos(angle), Math.cos(angle), Math.cos(angle)
        ]
        
        const Apy = Ry.map((value, index) => 
            Ry_diag[index] !== 0 ? value / Ry_diag[index] : 0
        );

        const result = [0,0,0]
        const mouseVec = [mouseX, mouseY, 0];
        for(let i = 0; i < Apy.length; i++) {
            const p = Math.floor(i/3);
            result[p] += mouseVec[p] * Apy[i];
        }

        console.log(`mouseVec: ${mouseVec}`);
        console.log(`x: ${result[0]} y: ${result[1]}`);

        return {
            x: result[0],
            y: result[1]
        }
    }

    const getMousePositionOnPlane = () => {
        const cam = cameraManager.getCamera();

        // Compute camera's coordinate system
        // Forward vector (camera's viewing direction)
        let forward = normalize([cam.eyeX - cam.centerX, cam.eyeY - cam.centerY, cam.eyeZ - cam.centerZ]); // eye - center

        // Right vector (perpendicular to forward and up vectors)
        let right = normalize(cross([cam.upX, cam.upY, cam.upZ], forward)); // cross(up, forward)

        // Recompute up vector to ensure orthogonality
        let up = cross(forward, right);

        // Field of View and aspect ratio
        let fov = Math.PI / 3; // Default field of view in p5.js is 60 degrees
        let aspect = p.width / p.height;
        let near = 1; // Arbitrary value, used for calculations

        // Map mouse coordinates to Normalized Device Coordinates (NDC)
        let ndcX = (p.mouseX / p.width) * 2 - 1;
        let ndcY = (p.mouseY / p.height) * 2 - 1; // No inversion

        // Compute dimensions of the near plane
        let nearHeight = 2 * near * Math.tan(fov / 2);
        let nearWidth = nearHeight * aspect;

        // Compute point on near plane in camera space
        let px = ndcX * nearWidth / 2;
        let py = ndcY * nearHeight / 2;
        let pz = -near; // Negative because camera looks along negative Z in camera space

        // Transform the point to world space to get the direction vector
        let dir: [number, number, number] = [
            px * right[0] + py * up[0] + pz * forward[0],
            px * right[1] + py * up[1] + pz * forward[1],
            px * right[2] + py * up[2] + pz * forward[2]
        ];

        // Normalize the direction vector
        dir = normalize(dir);

        // Avoid division by zero if dir[2] is zero (ray is parallel to the plane)
        if (dir[2] === 0) {
            console.log('The ray is parallel to the plane z=0 and does not intersect.');
            return;
        }

        // Compute the intersection with the plane z = 0
        let t = -cam.eyeZ / dir[2];
        let x = cam.eyeX + t * dir[0];
        let y = cam.eyeY + t * dir[1];
    
        return {
            x: x,
            y: y
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
   
        if(p.key === 't' || p.key === 'T') {
            const cam = cameraManager.getCamera();
            cam.setPosition(565, 0, 565);
            cam.lookAt(0, 0, 0);
        }
        if(p.key === 'y' || p.key === 'Y') {
            const cam = cameraManager.getCamera();
            cam.setPosition(0, 0, 0);
            cam.lookAt(0, 0, 0);
        }
        if(p.key === 'u' || p.key === 'U') {
            getMousePositionOnPlane2();
        }
    };
};

// Create the p5 instance
export const myp5 = new p5(sketch, document.body);