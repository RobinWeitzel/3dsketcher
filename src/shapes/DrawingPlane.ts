import * as p5 from 'p5';
import { CANVAS_HEIGHT, CANVAS_WIDTH, COLORS } from '../utils/constants';
import { ProjectionCalculator2d } from 'projection-3d-2d';

interface DrawingPoint {
    x: number;
    y: number;
}

export class DrawingPlane {
    private width: number;
    private height: number;
    private isDrawing: boolean;
    private currentStroke: DrawingPoint[];
    private completedStrokes: DrawingPoint[][];
    private points3d: [[number, number], [number, number], [number, number], [number, number]] = [
        [0, 0],
        [CANVAS_WIDTH, 0],
        [CANVAS_WIDTH, CANVAS_HEIGHT],
        [0, CANVAS_HEIGHT]
    ]

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.isDrawing = false;
        this.currentStroke = [];
        this.completedStrokes = [];
    }

    draw(p: p5): void {
        p.push();
        
        // Set material and color for the base plane
        p.noStroke();
        p.fill(COLORS.ORANGE);
        
        // Draw the plane
        p.plane(this.width, this.height);

        // Draw completed strokes
        p.stroke(0);
        p.strokeWeight(2);
        p.noFill();
        
        // Draw all completed strokes
        for (const stroke of this.completedStrokes) {
            p.beginShape();
            for (const point of stroke) {
                p.vertex(point.x, point.y);
            }
            p.endShape();
        }

        // Draw current stroke if drawing
        if (this.isDrawing && this.currentStroke.length > 0) {
            p.beginShape();
            for (const point of this.currentStroke) {
                p.vertex(point.x, point.y);
            }
            p.endShape();
        }
        
        p.pop();
    }

    startDrawing(x: number, y: number): void {
        this.isDrawing = true;
        this.currentStroke = [{x, y}];
    }

    continueDrawing(x: number, y: number): void {
        if (this.isDrawing) {
            this.currentStroke.push({x, y});
        }
    }

    stopDrawing(): void {
        if (this.isDrawing && this.currentStroke.length > 0) {
            this.completedStrokes.push([...this.currentStroke]);
            this.currentStroke = [];
            this.isDrawing = false;
        }
    }
} 