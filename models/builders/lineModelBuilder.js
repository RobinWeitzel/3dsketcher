class LineModelBuilder {
  /**
   * Builds a LineModel using two vectors.
   * @param VectorModel v1 the origin of the line
   * @param VectorModel v2 
   * @returns LineModel
   */
  static buildUsingTwoPoints(v1, v2) {
    const [x1, y1, z1] = v1.toArray();
    const [x2, y2, z2] = v2.toArray();

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