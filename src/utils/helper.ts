export const normalize: (vec: [number, number, number]) => [number, number, number] = (vec: [number, number, number]) => {
  let mag = Math.hypot(vec[0], vec[1], vec[2]);
  return [vec[0] / mag, vec[1] / mag, vec[2] / mag];
}

export const cross: (a: [number, number, number], b: [number, number, number]) => [number, number, number] = (a: [number, number, number], b: [number, number, number]) => {
  return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0]
  ];
}