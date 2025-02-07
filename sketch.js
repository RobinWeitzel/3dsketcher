const w = 800; // Width of the canvas
const h = 800; // Height of the canvas
let i = 0;


// Creates a camera object and animates it around a box.
let camera;
let div;
function setup() {
  createCanvas(w, h, WEBGL);
  camera = createCamera();
  // optionally, call camera() on the instance with the same arguments as the global function
  //camera.camera([x], [y], [z], [centerX], [centerY], [centerZ], [upX], [upY], [upZ]);

  div = createDiv('');
  div.size(400, 400);
}

// draws the background lines that make up the drawing board
function board() {
  const width_between_lines = 50;
  const num_lines = 20;
  const field_size = width_between_lines * num_lines / 2;

  stroke(0);
  strokeWeight(0.2);
  for (let i = -num_lines/2; i <= num_lines/2; i++) {
    line(i * width_between_lines, -field_size, i * width_between_lines, field_size);
    line(-field_size, i * width_between_lines, field_size, i * width_between_lines);
  }
}

function xyzAxis() {
  stroke(200);
  line(0, 0, 0, w, 0, 0);
  line(0, 0, 0, 0, -w, 0);
  line(0, 0, 0, 0, 0, w);
}

/*
The drawing plane needs to be rotated to match the camera angle
*/
function drawingPlane() {
  push();
  
  fill(0);
  stroke(0);
  plane(100);
  pop();
}

function draw() {
  background(255);
  drawingPlane();

  xyzAxis();

  div.html(`Camera position:<br/> ${round(camera.eyeX)}, ${round(camera.eyeY)}, ${round(camera.eyeZ)}, <br/>${round(camera.centerX)}, ${round(camera.centerY)}, ${round(camera.centerZ)}, <br/>${round(camera.upX)}, ${round(camera.upY)}, ${round(camera.upZ)}, <br/>i: ${i}`);
}

function mouseDragged(){
  let options = {
    disableTouchActions: true,
    freeRotation: false
  };

  // the first three arguments enable or disable the rotation in that axis
  // 0 disables, 1 enables
  orbitControl(1, 1, 1, options);
}
