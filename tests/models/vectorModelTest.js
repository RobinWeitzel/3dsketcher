{
  const toString_ReturnsStringRepresentation = () => {
    // arrange
    const vector = new VectorModel(1, 2, 3);

    // act
    const vectorString = vector.toString();

    // assert
    if(vectorString !== '(1, 2, 3)') {
      throw new Error('Expected the string representation to be (1, 2, 3) but got ' + vectorString);
    }
  }
  TestCoordinatorService.addTest(toString_ReturnsStringRepresentation);

  const equals_EqualVectors_ReturnsTrue = () => {
    // arrange
    const vector1 = new VectorModel(1, 2, 3);
    const vector2 = new VectorModel(1, 2, 3);

    // act
    const result = vector1.equals(vector2);

    // assert
    if(!result) {
      throw new Error('Expected the vectors to be equal but they were not');
    }
  }
  TestCoordinatorService.addTest(equals_EqualVectors_ReturnsTrue);

  const equals_UnequalVectors_ReturnsFalse = () => {
    // arrange
    const vector1 = new VectorModel(1, 2, 3);
    const vector2 = new VectorModel(4, 5, 6);

    // act
    const result = vector1.equals(vector2);

    // assert
    if(result) {
      throw new Error('Expected the vectors to be unequal but they were equal');
    }
  }
  TestCoordinatorService.addTest(equals_UnequalVectors_ReturnsFalse);

  const equals_NonVectorInput_ThrowsError = () => {
    // arrange
    const vector = new VectorModel(1, 2, 3);

    // act
    const test = () => vector.equals(1);

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when comparing a vector to a non-vector');
    }
  }
  TestCoordinatorService.addTest(equals_NonVectorInput_ThrowsError);

  const magnitude_ReturnsMagnitude = () => {
    // arrange
    const vector = new VectorModel(1, 2, 3);

    // act
    const magnitude = vector.magnitude();

    // assert
    if(magnitude !== Math.sqrt(14)) {
      throw new Error('Expected the magnitude to be sqrt(14) but got ' + magnitude);
    }
  }
  TestCoordinatorService.addTest(magnitude_ReturnsMagnitude);

  const normalize_NormalizesVector = () => {
    // arrange
    const vector = new VectorModel(1, 2, 3);

    // act
    const result = vector.normalize();

    // assert
    if(!result.equals(new VectorModel(1 / Math.sqrt(14), 2 / Math.sqrt(14), 3 / Math.sqrt(14))) || result.magnitude() !== 1) {
      throw new Error('Expected the normalized vector to be (1 / sqrt(14), 2 / sqrt(14), 3 / sqrt(14)) but got ' + result);
    }
  }
  TestCoordinatorService.addTest(normalize_NormalizesVector);

  const add_AddsVectors = () => {
    // arrange
    const vector1 = new VectorModel(1, 2, 3);
    const vector2 = new VectorModel(4, 5, 6);

    // act
    const result = vector1.add(vector2);

    // assert
    if(!result.equals(new VectorModel(5, 7, 9))) {
      throw new Error('Expected the sum to be (5, 7, 9) but got ' + result);
    }
  }
  TestCoordinatorService.addTest(add_AddsVectors);

  const add_NonVectorInput_ThrowsError = () => {
    // arrange
    const vector = new VectorModel(1, 2, 3);

    // act
    const test = () => vector.add(1);

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when adding a vector to a non-vector');
    }
  }
  TestCoordinatorService.addTest(add_NonVectorInput_ThrowsError);

  const subtract_SubtractsVectors = () => {
    // arrange
    const vector1 = new VectorModel(1, 2, 3);
    const vector2 = new VectorModel(4, 5, 6);

    // act
    const result = vector1.subtract(vector2);

    // assert
    if(!result.equals(new VectorModel(-3, -3, -3))) {
      throw new Error('Expected the difference to be (-3, -3, -3) but got ' + result);
    }
  }
  TestCoordinatorService.addTest(subtract_SubtractsVectors);

  const subtract_NonVectorInput_ThrowsError = () => {
    // arrange
    const vector = new VectorModel(1, 2, 3);

    // act
    const test = () => vector.subtract(1);

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when subtracting a vector from a non-vector');
    }
  }
  TestCoordinatorService.addTest(subtract_NonVectorInput_ThrowsError);

  const cross_CalculatesCrossProduct = () => {
    // arrange
    const vector1 = new VectorModel(1, 2, 3);
    const vector2 = new VectorModel(4, 5, 6);

    // act
    const result = vector1.cross(vector2);

    // assert
    if(!result.equals(new VectorModel(-3, 6, -3))) {
      throw new Error('Expected the cross product to be (-3, 6, -3) but got ' + result);
    }
  }
  TestCoordinatorService.addTest(cross_CalculatesCrossProduct);

  const cross_NonVectorInput_ThrowsError = () => {
    // arrange
    const vector = new VectorModel(1, 2, 3);

    // act
    const test = () => vector.cross(1);

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when calculating the cross product of a vector with a non-vector');
    }
  }
  TestCoordinatorService.addTest(cross_NonVectorInput_ThrowsError);

  const dot_CalculatesDotProduct = () => {
    // arrange
    const vector1 = new VectorModel(1, 2, 3);
    const vector2 = new VectorModel(4, 5, 6);

    // act
    const result = vector1.dot(vector2);

    // assert
    if(result !== 32) {
      throw new Error('Expected the dot product to be 32 but got ' + result);
    }
  }
  TestCoordinatorService.addTest(dot_CalculatesDotProduct);

  const dot_NonVectorInput_ThrowsError = () => {
    // arrange
    const vector = new VectorModel(1, 2, 3);

    // act
    const test = () => vector.dot(1);

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when calculating the dot product of a vector with a non-vector');
    }
  }
  TestCoordinatorService.addTest(dot_NonVectorInput_ThrowsError);

  const multiply_MultipliesVectorByScalar = () => {
    // arrange
    const vector = new VectorModel(1, 2, 3);

    // act
    const result = vector.multiply(3);

    // assert
    if(!result.equals(new VectorModel(3, 6, 9))) {
      throw new Error('Expected the product to be (3, 6, 9) but got ' + result);
    }
  }
  TestCoordinatorService.addTest(multiply_MultipliesVectorByScalar);

  const multiply_NonNumberInput_ThrowsError = () => {
    // arrange
    const vector = new VectorModel(1, 2, 3);

    // act
    const test = () => vector.multiply('a');

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when multiplying a vector by a non-number');
    }
  }
  TestCoordinatorService.addTest(multiply_NonNumberInput_ThrowsError);

  const divide_DividesVectorByScalar = () => {
    // arrange
    const vector = new VectorModel(3, 6, 9);

    // act
    const result = vector.divide(3);

    // assert
    if(!result.equals(new VectorModel(1, 2, 3))) {
      throw new Error('Expected the quotient to be (1, 2, 3) but got ' + result);
    }
  }
  TestCoordinatorService.addTest(divide_DividesVectorByScalar);

  const divide_NonNumberInput_ThrowsError = () => {
    // arrange
    const vector = new VectorModel(1, 2, 3);

    // act
    const test = () => vector.divide('a');

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when dividing a vector by a non-number');
    }
  }
  TestCoordinatorService.addTest(divide_NonNumberInput_ThrowsError);

  const divide_ByZero_ThrowsError = () => {
    // arrange
    const vector = new VectorModel(1, 2, 3);

    // act
    const test = () => vector.divide(0);

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when dividing a vector by zero');
    }
  }
  TestCoordinatorService.addTest(divide_ByZero_ThrowsError);
}