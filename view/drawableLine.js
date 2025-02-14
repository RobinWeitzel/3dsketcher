class DrawableLine {
  constructor(lineModel) {
    this.line = lineModel;
  }

  draw() {
    push();

    line(this.line.getOrigin().x, -this.line.getOrigin().y, this.line.getOrigin().z, this.line.getDirection().x * h, -this.line.getDirection().y * h, this.line.getDirection().z * h);

    pop();
  }
}