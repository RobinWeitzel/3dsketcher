/**
 * Calculates the angles between two lines sharing a common point
 * @param {number} x1 - x coordinate of first point
 * @param {number} y1 - y coordinate of first point
 * @param {number} z1 - z coordinate of first point
 * @param {number} x2 - x coordinate of common point
 * @param {number} y2 - y coordinate of common point
 * @param {number} z2 - z coordinate of common point
 * @param {number} x3 - x coordinate of third point
 * @param {number} y3 - y coordinate of third point
 * @param {number} z3 - z coordinate of third point
 * @returns {{x: number, y: number, z: number}} Angles in radians for each axis
 */
function calculateAngles(x1, y1, z1, x2, y2, z2, x3, y3, z3) {
  // Calculate vectors from common point
  const vector1 = {
      x: x1 - x2,
      y: y1 - y2,
      z: z1 - z2
  };
  
  const vector2 = {
      x: x3 - x2,
      y: y3 - y2,
      z: z3 - z2
  };

  // Normalize vectors
  const length1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y + vector1.z * vector1.z);
  const length2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y + vector2.z * vector2.z);

  vector1.x /= length1;
  vector1.y /= length1;
  vector1.z /= length1;

  vector2.x /= length2;
  vector2.y /= length2;
  vector2.z /= length2;

  // Calculate projection angles
  const angleX = Math.acos(
      (vector1.y * vector2.y + vector1.z * vector2.z) /
      Math.sqrt((vector1.y * vector1.y + vector1.z * vector1.z) * 
                (vector2.y * vector2.y + vector2.z * vector2.z))
  );

  const angleY = Math.acos(
      (vector1.x * vector2.x + vector1.z * vector2.z) /
      Math.sqrt((vector1.x * vector1.x + vector1.z * vector1.z) * 
                (vector2.x * vector2.x + vector2.z * vector2.z))
  );

  const angleZ = Math.acos(
      (vector1.x * vector2.x + vector1.y * vector2.y) /
      Math.sqrt((vector1.x * vector1.x + vector1.y * vector1.y) * 
                (vector2.x * vector2.x + vector2.y * vector2.y))
  );

  // Determine the sign of the angles using cross product
  const crossProduct = {
      x: vector1.y * vector2.z - vector1.z * vector2.y,
      y: vector1.z * vector2.x - vector1.x * vector2.z,
      z: vector1.x * vector2.y - vector1.y * vector2.x
  };

  const signX = crossProduct.x < 0 ? -1 : 1;
  const signY = crossProduct.y < 0 ? -1 : 1;
  const signZ = crossProduct.z < 0 ? -1 : 1;

  return {
      x: angleX * signX || 0,
      y: angleY * signY || 0,
      z: angleZ * signZ || 0
  };
}