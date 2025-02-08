class PlaneModelBuilder {
  /**
   * Create a PlaneModel using a point and a normal vector.
   * @param VectorModel point 
   * @param VectorModel normal 
   * @returns PlaneModel
   * @throws {Error} if the point is not a VectorModel
   * @throws {Error} if the normal is not a VectorModel
   * @throws {Error} if the normal is the zero vector
   */
  static buildUsingPointAndNormal(point, normal) {
    if(!(point instanceof VectorModel)) {
      throw new Error('Point must be a VectorModel');
    }

    if(!(normal instanceof VectorModel)) {
      throw new Error('Normal must be a VectorModel');
    }

    if(normal.equals(new VectorModel(0, 0, 0))) {
      throw new Error('Normal cannot be the zero vector');
    }

    if(normal.magnitude() !== 1) {
      normal = normal.normalize();
    }

    return new PlaneModel(point, normal);
  }

  /**
   * Create a PlaneModel using three points.
   * @param VectorModel point1
   * @param VectorModel point2
   * @param VectorModel point3
   * @returns PlaneModel
   * @throws {Error} if the points are not VectorModels
   * @throws {Error} if the points are collinear
   */
  static buildUsingThreeVectors(v1, v2, v3) {
    if(!(v1 instanceof VectorModel) || !(v2 instanceof VectorModel) || !(v3 instanceof VectorModel)) {
      throw new Error('All points must be VectorModels');
    }

    const v1v2 = v2.subtract(v1);
    const v1v3 = v3.subtract(v1);

    if(v1v2.cross(v1v3).equals(new VectorModel(0, 0, 0))) {
      throw new Error('Points must not be collinear');
    }

    const normal = v1v2.cross(v1v3).normalize();
    return new PlaneModel(v1, normal);
  }
}