class LineModel extends GeometryModel  {
    /**
     * Represents a line in 3D space.
     * @param {number} x x-coordinate of the base point
     * @param {number} y y-coordinate of the base point
     * @param {number} z z-coordinate of the base point
     * @param {number} ax the normalized gradient in the x direction
     * @param {number} ay the normalized gradient in the y direction
     * @param {number} az the normalized gradient in the z direction
     */
    constructor(x, y, z, ax, ay, az) {
        super();

        this.origin = new VectorModel(x, y, z);
        this.direction = new VectorModel(ax, ay, az);
    }

    getOrigin() {
        return this.origin;
    }

    getDirection() {
        return this.direction;
    }
}