class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // Set canvas size
    this.canvas.width = 800;
    this.canvas.height = 600;

    // Game parameters
    this.trainVerticalOffset = -35; // Vertical offset of the train along the rotated axes
    this.trainSpeed = 2;
    this.railDistance = 30; // Distance between the two rails
    this.railAngle = 18; // Tilt angle for the 2.5D effect

    // Decision points (not used in this snippet, but kept for future logic)
    this.decisionPoints = [
      { x: 200, split: true },
      { x: 400, merge: true },
      { x: 600, split: true },
      { x: 800, merge: true },
    ];

    // Load train sprite
    this.trainImage = new Image();
    this.trainImage.src = "train.png";

    // Train state
    this.trainX = 100; // World-space X position of the train
    this.viewportX = 0; // For scrolling logic

    // Kick off animation
    this.lastTime = 0;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  drawRails() {
    const ctx = this.ctx;
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;

    // half-gap between rails
    const d = this.railDistance / 2;
    // total length (so rails cover offscreen when rotated)
    const L = this.canvas.width * 1.5;

    // --- Main track (two parallel rails) ---
    ctx.beginPath();
    ctx.moveTo(-L / 2, -d);
    ctx.lineTo(L / 2, -d);
    ctx.moveTo(-L / 2, d);
    ctx.lineTo(L / 2, d);
    ctx.stroke();

    // --- Branch segment ---
    const upperY = -45; // 45px above main center
    const seg0 = 200 - this.canvas.width / 2;
    const seg1 = 400 - this.canvas.width / 2;

    ctx.beginPath();
    ctx.moveTo(seg0, upperY - d);
    ctx.lineTo(seg1, upperY - d);
    ctx.moveTo(seg0, upperY + d);
    ctx.lineTo(seg1, upperY + d);
    ctx.stroke();

    // --- Switch diagonals ---
    // run = difference in Y so that dx=dy (45°); tweak if you want a shallower angle
    const switchLength = Math.abs(upperY - 0);
    const jointX = seg0 - switchLength;

    ctx.beginPath();
    // top rail diagonal
    ctx.moveTo(jointX, -d);
    ctx.lineTo(seg0, upperY - d);
    // bottom rail diagonal
    ctx.moveTo(jointX, d);
    ctx.lineTo(seg0, upperY + d);
    ctx.stroke();

    // --- Merge diagonals (branch → main) ---
    const mergeStartX = seg1; // end of branch segment
    const mergeLength = switchLength; // same run as split so 45°
    const mergeJointX = mergeStartX + mergeLength; // point on main where branch rejoins

    ctx.beginPath();
    // 1) branch top → main top
    ctx.moveTo(mergeStartX, upperY - d);
    ctx.lineTo(mergeJointX, -d);

    // 2) branch bottom → main bottom
    ctx.moveTo(mergeStartX, upperY + d);
    ctx.lineTo(mergeJointX, d);

    ctx.stroke();
  }

  drawTrain() {
    const ctx = this.ctx;
    ctx.save();

    // 1) move *along* the rotated axes to the train's world-space point
    ctx.translate(
      this.trainX - this.canvas.width / 2,
      this.trainVerticalOffset
    );
    // 2) un-rotate the sprite so it stays upright
    ctx.rotate((-this.railAngle * Math.PI) / 180);

    // 3) draw centered
    ctx.drawImage(
      this.trainImage,
      -this.trainImage.width / 2,
      -this.trainImage.height / 2
    );

    ctx.restore();
  }

  update(deltaTime) {
    // advance viewport/train
    this.viewportX += this.trainSpeed;
    this.trainX += this.trainSpeed;

    // wrap around
    if (this.viewportX > this.canvas.width) {
      this.viewportX = 0;
      this.trainX = 0;
    }
  }

  draw() {
    const ctx = this.ctx;

    // 1) clear in device-space
    ctx.resetTransform();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 2) set up our 2.5D “world” transform once
    ctx.save();
    ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    ctx.rotate((this.railAngle * Math.PI) / 180);

    // 3) draw both rails and train under that same transform
    this.drawRails();
    this.drawTrain();

    // 4) pop back to identity
    ctx.restore();
  }

  animate(currentTime) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.draw();

    requestAnimationFrame(this.animate);
  }
}

// Initialize when the page loads
window.addEventListener("load", () => {
  new Game();
});
