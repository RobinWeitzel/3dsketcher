import * as p5 from 'p5';

export class Camera {
    private camera: p5.Camera;
    private p: p5;
    private isLocked: boolean = true;
    private hudElement: HTMLDivElement;
    
    constructor(p: p5) {
        this.p = p;
        this.camera = p.createCamera();
        
        // Create HUD element
        this.hudElement = document.createElement('div');
        this.hudElement.style.position = 'absolute';
        this.hudElement.style.top = '10px';
        this.hudElement.style.left = '10px';
        this.hudElement.style.color = 'black';
        this.hudElement.style.fontFamily = 'Arial';
        this.hudElement.style.fontSize = '16px';
        this.hudElement.style.zIndex = '1000';
        document.body.appendChild(this.hudElement);
        
        this.setupCamera();
    }

    private setupCamera(): void {
        this.camera.ortho();
    }

    public getCamera(): p5.Camera {
        return this.camera;
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
        const state = this.isLocked ? "🔒 Camera Locked" : "🔓 Camera Unlocked";
        this.hudElement.textContent = state;
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