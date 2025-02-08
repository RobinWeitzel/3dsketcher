/**
 * This class represents a plane in 3D space.
 * It is stored based on its normal vector and a point on the plane.
 * 
 */
class PlaneModel extends GeometryModel {
    constructor(origin, normal) {
        super();

        this.origin = origin;
        this.normal = normal;
    }

    getOrigin() {
        return this.origin;
    }

    getNormal() {
        return this.normal;
    }

    /**
     * Returns the string representation of the plane
     * @returns string the string representation of the plane
     */
    toString() {
      return `Origin: ${this.origin}, normal ${this.normal}`;
    }
}