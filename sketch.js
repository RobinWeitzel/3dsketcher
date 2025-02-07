const w = 800; // Width of the canvas
const h = 800; // Height of the canvas

let cameraLocked = false;
let drawings = [];
let currentDrawingPoints = [];
let isDrawing = false;

// Creates a camera object and animates it around a box.
let camera;
let div;
let button;

function setup() {
  createCanvas(w, h, WEBGL);
  camera = createCamera();
  camera.ortho(); // camera perspective, other options are perspective and frustum

  // created div to display some variables to make troubleshooting easier
  div = createDiv('');
  div.size(400, 100);

  // created button to lock/unlock camera position
  button = createButton('Lock camera');
  button.mousePressed(() => {
    cameraLocked = !cameraLocked;

    if(cameraLocked) {
      button.html('Unlock camera');
    } else {
      button.html('Lock camera');
    }
  });
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
  
  fill(255, 165, 0, 100); // Orange with alpha=100 for transparency
  noStroke();
  plane(h);
  pop();
}

function draw() {
  background(255);
  drawingPlane();
  xyzAxis();

  // Draw current drawing points
  if (currentDrawingPoints.length > 0) {
    push();
    stroke(0);
    strokeWeight(2);
    noFill();
    beginShape();
    for (let point of currentDrawingPoints) {
      vertex(point.x, point.y, 0);
    }
    endShape();
    pop();
  }

  // Draw all drawings
  for(const drawingPoints of drawings) {
    if (drawingPoints.length > 0) {
      push();
      stroke(0);
      strokeWeight(2);
      noFill();
      beginShape();
      for (let point of drawingPoints) {
        vertex(point.x, point.y, 0);
      }
      endShape();
      pop();
    }
  }

  div.html(`Camera position:<br/> ${round(camera.eyeX)}, ${round(camera.eyeY)}, ${round(camera.eyeZ)}, <br/>${round(camera.centerX)}, ${round(camera.centerY)}, ${round(camera.centerZ)}, <br/>${round(camera.upX)}, ${round(camera.upY)}, ${round(camera.upZ)}`);
}

function mousePressed() {
  if (cameraLocked) {
    isDrawing = true;
    currentDrawingPoints = []; // Start a new drawing
  }
}

function mouseReleased() {
  isDrawing = false;
  drawings.push(currentDrawingPoints);
}

function mouseDragged() {
  let options = {
    disableTouchActions: true,
    freeRotation: false
  };

  if (!cameraLocked) {
    orbitControl(1, 1, 1, options);
  } else if (isDrawing) {
    // Convert mouse coordinates to world coordinates
    let x = mouseX - width/2;
    let y = mouseY - height/2;
    currentDrawingPoints.push({ x, y });
  }
}
