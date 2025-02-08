class DrawablePlane {
  constructor(PlaneModel) {
    this.plane = PlaneModel;
  }

  draw() {
    push();

    const [rx, ry, rz] = this.plane.getNormal().multiply(HALF_PI).toArray();
    /*rotateX(rx);
    rotateY(ry);
    rotateZ(rz);*/

    translate(this.plane.getOrigin().x, this.plane.getOrigin().y, this.plane.getOrigin().z);
    rotate(HALF_PI, [ry, rx, rz]);
    

    fill(255, 165, 0, 100); // Orange with alpha=100 for transparency
    noStroke();
    plane(h);

    pop();
  }
}