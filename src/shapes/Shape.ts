import * as p5 from 'p5';

export interface Shape {
    draw(p: p5): void;
    update?(): void;
}
