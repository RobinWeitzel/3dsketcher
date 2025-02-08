class VectorModel extends GeometryModel {
  /**
   * Represents a vector in 3D space.
   * @param {number} x x-coordinate of the vector
   * @param {number} y y-coordinate of the vector
   * @param {number} z z-coordinate of the vector
   */
  constructor(x, y, z) {
    super();
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * @returns string the string representation of the vector
   */
  toString() {
    return `(${this.x}, ${this.y}, ${this.z})`;
  }

  /**
   * @returns [number, number, number] the vector as an array
   */
  toArray() {
    return [this.x, this.y, this.z];
  }

  /**
   * Checks if this vector is equal to another vector
   * @param VectorModel other
   * @returns boolean true if the vectors are equal, false otherwise
   * @throws {Error} if the other vector is not a VectorModel
   */
  equals(other) {
    if(!(other instanceof VectorModel)) {
      throw new Error('Can only compare vectors to vectors');
    }
    return this.x === other.x && this.y === other.y && this.z === other.z;
  }

  /**
   * Returns the magnitued of the vector
   * @returns number the magnitude of the vector
   */
  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /**
   * Returns the normalized vector
   * @returns VectorModel the normalized vector
   * @throws {Error} if the magnitude of the vector is 0
   */
  normalize() {
    const magnitude = this.magnitude();

    if(magnitude === 0) {
      throw new Error('Cannot normalize the zero vector');
    }

    return new VectorModel(this.x / magnitude, this.y / magnitude, this.z / magnitude);
  }

  /**
   * Adds another vector to this vector
   * @param VectorModel other
   * @returns VectorModel the sum of the two vectors
   * @throws {Error} if the other vector is not a VectorModel
   */
  add(other) {
    if(!(other instanceof VectorModel)) {
      throw new Error('Can only add vectors to vectors');
    }
    return new VectorModel(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  /**
   * Subtracts another vector from this vector
   * @param VectorModel other
   * @returns VectorModel the difference of the two vectors
   * @throws {Error} if the other vector is not a VectorModel
   */
  subtract(other) {
    if(!(other instanceof VectorModel)) {
      throw new Error('Can only subtract vectors to vectors');
    }
    return new VectorModel(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  /**
   * Calculates the cross product of two vectors.
   * @param VectorModel other vector to calculate the cross product with
   * @returns VectorModel with the cross product of the two vectors
   * @throws {Error} if the other vector is not a VectorModel
   */
  cross(other) {
    if(!(other instanceof VectorModel)) {
      throw new Error('Can only calculate the cross product of vectors');
    }
    return new VectorModel(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x
    );
  }

  /**
   * Calculates the dot product of two vectors.
   * @param VectorModel other vector to calculate the dot product with
   * @returns number the dot product of the two vectors
   * @throws {Error} if the other vector is not a VectorModel
   */
  dot(other) {
    if(!(other instanceof VectorModel)) {
      throw new Error('Can only calculate the dot product of vectors');
    }
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  /**
   * Multiplies the vector by a scalar
   * @param number scalar
   * @returns VectorModel the vector multiplied by the scalar
   * @throws {Error} if the scalar is not a number
   */
  multiply(scalar) {
    if(typeof scalar !== 'number') {
      throw new Error('Can only multiply vectors by scalars');
    }
    return new VectorModel(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  /**
   * Divides the vector by a scalar
   * @param number scalar
   * @returns VectorModel the vector divided by the scalar
   * @throws {Error} if the scalar is not a number
   * @throws {Error} if the scalar is 0
   */
  divide(scalar) {
    if(typeof scalar !== 'number') {
      throw new Error('Can only divide vectors by scalars');
    }
    if(scalar === 0) {
      throw new Error('Cannot divide by zero');
    }
    return new VectorModel(this.x / scalar, this.y / scalar, this.z / scalar);
  }
}