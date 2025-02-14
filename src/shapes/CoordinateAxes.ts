import * as p5 from 'p5';
import { Shape } from './Shape';

export class CoordinateAxes implements Shape {
    private axisLength: number;
    private font: p5.Font | null = null;
    
    constructor(axisLength: number = 100) {
        this.axisLength = axisLength;
    }

    setFont(font: p5.Font): void {
        this.font = font;
    }

    draw(p: p5): void {
        // Save current drawing style
        p.push();
        
        // Set line weight for axes
        p.strokeWeight(2);
        
        // Draw X axis in red
        p.stroke(255, 0, 0);
        p.line(0, 0, 0, this.axisLength, 0, 0);
        
        // Draw Y axis in green
        p.stroke(0, 255, 0);
        p.line(0, 0, 0, 0, -this.axisLength, 0); // Negative because p5.js Y is inverted
        
        // Draw Z axis in blue
        p.stroke(0, 0, 255);
        p.line(0, 0, 0, 0, 0, this.axisLength);
        
        // Optional: Add labels (only if font is loaded)
        if (this.font) {
            p.textFont(this.font);
            p.noStroke();
            p.textSize(16);
            p.textAlign(p.CENTER, p.CENTER);
            
            // X axis label (red)
            p.push();
            p.translate(this.axisLength + 15, 0, 0);
            p.fill(255, 0, 0);
            p.textFont(this.font);
            p.text('X', 0, 0);
            p.pop();
            
            // Y axis label (green)
            p.push();
            p.translate(0, -this.axisLength - 15, 0);
            p.fill(0, 255, 0);
            p.textFont(this.font);
            p.text('Y', 0, 0);
            p.pop();
            
            // Z axis label (blue)
            p.push();
            p.translate(0, 0, this.axisLength + 15);
            p.fill(0, 0, 255);
            p.textFont(this.font);
            p.text('Z', 0, 0);
            p.pop();
        }
        
        // Restore original drawing style
        p.pop();
    }
} 