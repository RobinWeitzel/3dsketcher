{
  const intersects_NotIntersectingLines_ReturnsNull = () => {
    // arrange
    const line1 = new LineModel(2,6,-9,3,4,-4);
    const line2 = new LineModel(-1,-2,3,2,-6,1);

    // act
    const point = line1.intersects(line2);

    // assert
    if(point !== null) {
      throw new Error('Expected the lines to not intersect but got ' + point);
    }
  };
  TestCoordinatorService.addTest(intersects_NotIntersectingLines_ReturnsNull);

  const intersects_IntersectingLines_ReturnsPoint = () => {
    // arrange
    const line1 = new LineModel(5, 2, -1, 1, -2, -3);
    const line2 = new LineModel(2, 0, 4, 1, 2, -1);

    // act
    const point = line1.intersects(line2);

    // assert
    if(!point.equals(new VectorModel(4, 4, 2))) {
      throw new Error('Expected the point of intersection to be (4, 4, 2) but got ' + point);
    }
  };
  TestCoordinatorService.addTest(intersects_IntersectingLines_ReturnsPoint);

  const intersects_ParallelLines_ReturnsNull = () => {
    // arrange
    const line1 = new LineModel(1, 2, 3, 1, 2, 3);
    const line2 = new LineModel(4, 5, 6, 1, 2, 3);

    // act
    const point = line1.intersects(line2);

    // assert
    if(point !== null) {
      throw new Error('Expected the lines to be parallel but got ' + point);
    }
  };
  TestCoordinatorService.addTest(intersects_ParallelLines_ReturnsNull);

  const intersects_IntersectingPlane_ReturnsPoint = () => {
    // arrange
    const line = new LineModel(2, 1, 0, -1, 1, 3);
    const plane = PlaneModelBuilder.buildUsingFourVariables(3, -2, 1, 10)

    // act
    const point = line.intersects(plane);

    // assert
    if(!point.equals(new VectorModel(5, -2, -9))) {
      throw new Error('Expected the point of intersection to be (5, -2, -9) but got ' + point);
    }
  };
  TestCoordinatorService.addTest(intersects_IntersectingPlane_ReturnsPoint);

  const intersects_ParallelPlane_ReturnsNull = () => {
    // arrange
    const line = new LineModel(2, 3, 5, 1, -2, -1);
    const plane = PlaneModelBuilder.buildUsingFourVariables(2, 3, -4, 7)

    // act
    const point = line.intersects(plane);

    // assert
    if(point !== null) {
      throw new Error('Expected the line to be parallel to the plane but got ' + point);
    }
  };
  TestCoordinatorService.addTest(intersects_ParallelPlane_ReturnsNull);
}