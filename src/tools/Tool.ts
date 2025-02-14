import * as p5 from 'p5';

export interface Tool {
    name: string;
    activate(): void;
    deactivate(): void;
    mousePressed(p: p5): void;
    mouseDragged(p: p5): void;
    mouseReleased(p: p5): void;
}
