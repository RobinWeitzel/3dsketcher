import * as p5 from 'p5';

export class Canvas {
    private p: p5;

    constructor(p: p5) {
        this.p = p;
    }

    setup(): void {
        this.p.createCanvas(400, 400);
    }

    draw(): void {
        this.p.background(220);
        // Drawing logic will go here
    }
} 