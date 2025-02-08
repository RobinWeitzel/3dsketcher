{
  const buildUsingPointAndNormal_PointAndNormal_ReturnsPlaneModel = () => {
    // arrange
    const point = new VectorModel(1, 2, 3);
    const normal = new VectorModel(4, 5, 6);

    // act
    const plane = PlaneModelBuilder.buildUsingPointAndNormal(point, normal);

    // assert
    if(!plane.getOrigin().equals(point) || !plane.getNormal().equals(normal.normalize())) {
      throw new Error('Expected the plane to have the point (1, 2, 3) and normal (4, 5, 6) but got ' + plane);
    }
  };
  TestCoordinatorService.addTest(buildUsingPointAndNormal_PointAndNormal_ReturnsPlaneModel);

  const buildUsingPointAndNormal_PointNotVector_ThrowsError = () => {
    // arrange
    const point = 1;
    const normal = new VectorModel(4, 5, 6);

    // act
    const test = () => PlaneModelBuilder.buildUsingPointAndNormal(point, normal);

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when the point is not a VectorModel');
    }
  };
  TestCoordinatorService.addTest(buildUsingPointAndNormal_PointNotVector_ThrowsError);

  const buildUsingPointAndNormal_NormalNotVector_ThrowsError = () => {
    // arrange
    const point = new VectorModel(1, 2, 3);
    const normal = 1;

    // act
    const test = () => PlaneModelBuilder.buildUsingPointAndNormal(point, normal);

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when the normal is not a VectorModel');
    }
  };
  TestCoordinatorService.addTest(buildUsingPointAndNormal_NormalNotVector_ThrowsError);

  const buildUsingPointAndNormal_NormalZeroVector_ThrowsError = () => {
    // arrange
    const point = new VectorModel(1, 2, 3);
    const normal = new VectorModel(0, 0, 0);

    // act
    const test = () => PlaneModelBuilder.buildUsingPointAndNormal(point, normal);

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when the normal is the zero vector');
    }
  };
  TestCoordinatorService.addTest(buildUsingPointAndNormal_NormalZeroVector_ThrowsError);

  const buildUsingThreeVectors_ThreeNonVectorPoints_ThrowsError = () => {
    // arrange
    const v1 = new VectorModel(1, 2, 3);
    const v2 = new VectorModel(4, 5, 6);
    const v3 = 1;

    // act
    const test = () => PlaneModelBuilder.buildUsingThreeVectors(v1, v2, v3);

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when the third point is not a VectorModel');
    }
  };
  TestCoordinatorService.addTest(buildUsingThreeVectors_ThreeNonVectorPoints_ThrowsError);

  const buildUsingThreeVectors_CollinearPoints_ThrowsError = () => {
    // arrange
    const v1 = new VectorModel(1, 2, 3);
    const v2 = new VectorModel(4, 5, 6);
    const v3 = new VectorModel(7, 8, 9);

    // act
    const test = () => PlaneModelBuilder.buildUsingThreeVectors(v1, v2, v3);

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when the points are collinear');
    }
  };
  TestCoordinatorService.addTest(buildUsingThreeVectors_CollinearPoints_ThrowsError);

  const buildUsingThreeVectors_ThreeNonCollinearPoints_ReturnsPlaneModel = () => {
    // arrange
    const v1 = new VectorModel(1, 2, 3);
    const v2 = new VectorModel(4, 5, 6);
    const v3 = new VectorModel(7, 8, 1);

    // act
    const plane = PlaneModelBuilder.buildUsingThreeVectors(v1, v2, v3);

    // assert
    if(!plane.getOrigin().equals(v1)) {
      throw new Error('Expected the plane to have the point (1, 2, 3) but got ' + plane.getOrigin());
    }
  };
  TestCoordinatorService.addTest(buildUsingThreeVectors_ThreeNonCollinearPoints_ReturnsPlaneModel);

  const buildUsingFourVariables_FourNumbers_ReturnsPlaneModel = () => {
    // arrange
    const a = 1;
    const b = 2;
    const c = 3;
    const d = 4;

    // act
    const plane = PlaneModelBuilder.buildUsingFourVariables(a, b, c, d);

    // assert
    if(!plane.getNormal().equals(new VectorModel(a, b, c))) {
      throw new Error('Expected the plane to have the normal (1, 2, 3) but got ' + plane.getNormal());
    }
  };
  TestCoordinatorService.addTest(buildUsingFourVariables_FourNumbers_ReturnsPlaneModel);

  const buildUsingFourVariables_AZeroBZeroCZero_ThrowsError = () => {
    // arrange
    const a = 0;
    const b = 0;
    const c = 0;
    const d = 4;

    // act
    const test = () => PlaneModelBuilder.buildUsingFourVariables(a, b, c, d);

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when a, b, and c are all 0');
    }
  };
  TestCoordinatorService.addTest(buildUsingFourVariables_AZeroBZeroCZero_ThrowsError);

  const buildUsingFourVariables_ANonNumber_ThrowsError = () => {
    // arrange
    const a = 'a';
    const b = 2;
    const c = 3;
    const d = 4;

    // act
    const test = () => PlaneModelBuilder.buildUsingFourVariables(a, b, c, d);

    // assert
    if(!TestCoordinatorService.throwsError(test)) {
      throw new Error('Expected an error to be thrown when a is not a number');
    }
  };
  TestCoordinatorService.addTest(buildUsingFourVariables_ANonNumber_ThrowsError);
}