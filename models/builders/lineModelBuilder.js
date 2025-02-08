class LineModelBuilder {
  /**
   * Builds a LineModel using two points.
   * @param [number, number, number] point1 first point on the vector with x, y, z coordinates
   * @param [number, number, number] point1 first point on the vector with x, y, z coordinates 
   * @returns LineModel
   */
  static buildUsingTwoPoints(point1, point2) {
    const [x1, y1, z1] = point1;
    const [x2, y2, z2] = point2;

    // Calculate the direction of the vector
    const ax = x2 - x1;
    const ay = y2 - y1;
    const az = z2 - z1;

    // Normalize the direction of the vector
    const length = Math.sqrt(ax * ax + ay * ay + az * az);
    const axNorm = ax / length;
    const ayNorm = ay / length;
    const azNorm = az / length;

    return new LineModel(x1, y1, z1, axNorm, ayNorm, azNorm);
  }
}