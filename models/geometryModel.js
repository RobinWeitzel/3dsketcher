class GeometryModel {
  constructor() {

  }

  intersects(other) {
    if (this instanceof LineModel && other instanceof LineModel) {
      return this.intersectsLine(other);
    } else if (this instanceof LineModel && other instanceof PlaneModel) {
      return this.intersectsPlane(other);
    } else if (this instanceof PlaneModel && other instanceof LineModel) {
      return other.intersectsPlane(this);
    } else {
      throw new Error('Not implemented');
    }
  }

  /*
    * @param {LineModel} other
    * @returns PointModel | null the point of intersection or null if the lines do not intersect
    */
  intersectsLine(other) {
    // If the noramlized direction vectors are equal, the lines are parallel
    const crossProduct = this.direction.cross(other.direction);

    // If the cross product is the zero vector, the lines are parallel
    if (crossProduct.equals(new VectorModel(0, 0, 0))) {
      return null;
    }

    // Uses formular |n .  (r1 - r2) | / ||n||
    const distance = Math.abs(crossProduct.dot(this.getOrigin().subtract(other.getOrigin())) / crossProduct.magnitude());

    // If the distance is greater than 0.0001, the lines do not intersect
    // This is to account for floating point errors
    // TODO: Find a better way to handle floating point errors
    if(distance > 0.0001) {
      return null;
    }

    // The lines intersect
    // Calculate the point of intersection
    const t2 = other.getDirection().cross(crossProduct).dot(other.getOrigin().subtract(this.getOrigin())) / crossProduct.dot(crossProduct);
    return this.getOrigin().add(this.getDirection().multiply(t2));
  }

  intersectsPlane(other) {
    
  }
}