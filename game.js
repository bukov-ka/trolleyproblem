class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // Set canvas size
    this.canvas.width = 800;
    this.canvas.height = 600;

    // Game parameters
    this.trainSpeed = 2;
    this.railDistance = 30; // vertical gap between rails
    this.railAngle = 18; // tilt for 2.5D
    // your original “main” offset:
    this.mainOffset = -35;

    // Precompute rail-Y in rotated coords:
    this.d = this.railDistance / 2; // = 15
    this.railMainY = -this.d; // (-15)
    this.upperY = -45; // branch center
    this.branchTopY = this.upperY - this.d; // -45 -15 = -60
    this.branchBottomY = this.upperY + this.d + this.d;

    // how much to push the sprite relative to the rail line
    this.trainAdjustment = this.mainOffset - this.railMainY; // -35 - (-15) = -20

    // where the branch segment lives in world-X
    this.seg0 = 200; // start of branch
    this.seg1 = 400; // end of branch
    this.switchLength = Math.abs(this.upperY - 0); // 45px of diagonal
    this.jointStart = this.seg0 - this.switchLength; // =155
    this.jointEnd = this.seg1 + this.switchLength; // =445

    // train state
    this.trainX = 100;
    this.viewportX = 0;
    this.branchChosen = false;
    this.directionUp = false; // true = go to top branch

    // Load sprite…
    this.trainImage = new Image();
    this.trainImage.src = "train.png";

    this.lastTime = 0;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    this.hasLoggedReset = false;
    this.hasLoggedSplit = false;
    this.hasLoggedMerge = false;
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
    this.viewportX += this.trainSpeed;
    this.trainX += this.trainSpeed;

    // 1) Log a new loop
    if (!this.hasLoggedReset && this.trainX < this.trainSpeed) {
      console.log("🔄 Starting new loop");
      this.hasLoggedReset = true;
    }

    // 2) When we hit the split diagonal
    if (!this.branchChosen && this.trainX >= this.jointStart) {
      console.log(`✂️  Enter split at X=${this.trainX.toFixed(1)}`);
      this.branchChosen = true;
      this.directionUp = Math.random() < 0.5;
      console.log(`   → directionUp = ${this.directionUp}`);
    }

    // 3) When we hit the merge diagonal
    if (this.branchChosen && !this.hasLoggedMerge && this.trainX >= this.seg1) {
      console.log(`🔗 Enter merge at X=${this.trainX.toFixed(1)}`);
      this.hasLoggedMerge = true;
    }

    // once we hit the start of the diagonal, pick a random branch
    if (!this.branchChosen && this.trainX >= this.jointStart) {
      this.branchChosen = true;
      this.directionUp = Math.random() < 0.5;
    }

    // now pick the correct Y offset for wherever we are:
    let railY;
    if (this.trainX < this.jointStart) {
      // on main
      railY = this.railMainY;
    } else if (this.trainX < this.seg0) {
      // first diagonal (main → branch)
      const t = (this.trainX - this.jointStart) / this.switchLength;
      const target = this.directionUp ? this.branchTopY : this.branchBottomY;
      railY = this.railMainY + (target - this.railMainY) * t;
    } else if (this.trainX < this.seg1) {
      // on branch
      railY = this.directionUp ? this.branchTopY : this.branchBottomY;
    } else if (this.trainX < this.jointEnd) {
      // second diagonal (branch → main)
      const t = (this.trainX - this.seg1) / this.switchLength;
      const start = this.directionUp ? this.branchTopY : this.branchBottomY;
      railY = start + (this.railMainY - start) * t;
    } else {
      // back on main for the rest of the loop
      railY = this.railMainY;
    }

    // center‐the sprite on that rail line:
    this.trainVerticalOffset = railY + this.trainAdjustment;

    // 4) If we’re back on the main rails, check for drift
    if (this.trainX < this.jointStart || this.trainX >= this.jointEnd) {
      const diff = this.trainVerticalOffset - this.mainOffset;
      if (Math.abs(diff) > 0.5) {
        console.warn(
          `🚨 BUMP? Main path at X=${this.trainX.toFixed(1)} → ` +
            `offset=${this.trainVerticalOffset.toFixed(2)} (expected ${
              this.mainOffset
            })`
        );
      }
    }

    // loop/reset
    if (this.viewportX > this.canvas.width) {
      this.viewportX = 0;
      this.trainX = 0;
      this.branchChosen = false;
      this.hasLoggedReset = false;
      this.hasLoggedSplit = false;
      this.hasLoggedMerge = false;
      // put the train back on the main track
      this.trainVerticalOffset = this.mainOffset;
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
