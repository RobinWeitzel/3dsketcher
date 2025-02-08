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
   * @param VectorModel v1 the origin of the plane
   * @param VectorModel v2
   * @param VectorModel v3
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
    const crossProduct = v1v2.cross(v1v3);

    if(crossProduct.equals(new VectorModel(0, 0, 0))) {
      throw new Error('Points must not be collinear');
    }

    const normal = crossProduct.normalize();
    return new PlaneModel(v1, normal);
  }

  /**
   * Create a PlaneModel using four variables following formular ax + by + cz = d.
   * @param number a
   * @param number b
   * @param number c
   * @param number d
   * @returns PlaneModel
   * @throws {Error} if a is 0 and b is 0 and c is 0
   * @throws {Error} if any variable is not a number
   */
  static buildUsingFourVariables(a, b, c, d) {
    if(typeof a !== 'number' || typeof b !== 'number' || typeof c !== 'number' || typeof d !== 'number') {
      throw new Error('All variables must be numbers');
    }

    if(a === 0 && b === 0 && c === 0) {
      throw new Error('Cannot create a plane with all variables being 0');
    }

    const normal = new VectorModel(a, b, c);

    // We need to consider that the plane may be vertical to one or two axes
    let da = 0, db = 0, dc = 0;
    if(a !== 0) {
      da = d / a;
    }
    if(b !== 0 && a === 0) {
      db = d / b;
    }
    if(c !== 0 && a === 0 && b === 0) {
      dc = d / c;
    }

    return new PlaneModel(new VectorModel(da, db, dc), normal);
  }
}