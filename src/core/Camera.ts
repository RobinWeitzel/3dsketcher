import * as p5 from 'p5';
import { COLORS } from '../utils/constants';

export class Camera {
    private camera: p5.Camera;
    private p: p5;
    private isLocked: boolean = true;
    private font: p5.Font | null = null;
    
    constructor(p: p5) {
        this.p = p;
        
        this.camera = p.createCamera();
        this.setupCamera();
    }

    private setupCamera(): void {
        this.camera.ortho();
    }

    setFont(font: p5.Font): void {
        this.font = font;
    }

    public update(): void {
        if (!this.isLocked) {
            // p5's orbitControl allows rotation around a center point
            // Parameters: sensitivity X, sensitivity Y, sensitivityZ (all optional)
            this.p.orbitControl(1, 1, 0);
        }
        
        // Display camera state
        this.displayCameraState();
    }

    private displayCameraState(): void {
        if (this.font) {
            // Save current camera state
            this.p.push();
            
            // Switch to 2D mode
            this.camera.ortho();
            this.p.translate(-this.p.width/2, -this.p.height/2, 0);
            
            // Set up the text properties
            this.p.textFont(this.font);
            this.p.textSize(16);
            this.p.textAlign(this.p.LEFT, this.p.TOP);
            this.p.fill(COLORS.BLACK);
            
            // Draw the text
            const state = this.isLocked ? "🔒 Camera Locked" : "🔓 Camera Unlocked";
            this.p.text(state, 10, 10);
            
            // Restore the previous state
            this.p.pop();
        }
    }

    public toggleLock(): void {
        this.isLocked = !this.isLocked;
    }

    public isCurrentlyLocked(): boolean {
        return this.isLocked;
    }

    public handleMousePressed(): void {
        // Camera mouse pressed logic here
    }

    public handleMouseDragged(): void {
        // Camera mouse dragged logic here
    }

    public handleMouseReleased(): void {
        // Camera mouse released logic here
    }
} 