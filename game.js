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
    this.mainOffset = -35;

    // Branch configuration
    this.branchHeight = -100; // how far above main track (negative = up)
    this.branchStartX = 300; // where branch segment starts
    this.branchLength = 350; // length of branch segment
    this.branchEndX = this.branchStartX + this.branchLength; // where branch segment ends

    // Precompute all the Y-positions in rotated coords
    this.d = this.railDistance / 2; // = 15
    this.railMainY = -this.d; // top rail = -15
    this.upperY = this.branchHeight; // branch center
    this.branchTopY = this.upperY - this.d; // branch top rail
    this.branchBottomY = this.upperY + this.d - 30 - this.branchHeight; // branch bottom rail

    // How much to shift the sprite so it sits on top of the line:
    this.trainAdjustment = this.mainOffset - this.railMainY; // = -20

    // Where our branch lives in world X:
    this.seg0 = this.branchStartX; // start of flat branch
    this.seg1 = this.branchEndX; // end of flat branch
    this.switchLength = Math.abs(this.upperY); // diagonals length
    this.jointStart = this.seg0 - this.switchLength; // start of first diagonal
    this.jointEnd = this.seg1 + this.switchLength; // end of second diagonal

    // Train state
    this.trainX = 100;
    this.viewportX = 0;
    this.branchChosen = false;
    this.directionUp = false;
    this.trainVerticalOffset = this.mainOffset; // initialize on main track

    // Load sprite
    this.trainImage = new Image();
    this.trainImage.src = "train.png";

    // Kick off animation
    this.lastTime = 0;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // ——— Helper: raw rail Y in world-space, *before* sprite adjustment ———
  getRawRailY(x) {
    const mainY = this.railMainY;
    const branchY = this.directionUp ? this.branchTopY : this.branchBottomY;

    // 1) Main flat before split
    if (x < this.jointStart) {
      return mainY;
    }
    // 2) Diagonal down/up to branch
    if (x < this.seg0) {
      let t = (x - this.jointStart) / (this.seg0 - this.jointStart);
      t = Math.min(Math.max(t, 0), 1);
      return mainY + (branchY - mainY) * t;
    }
    // 3) Flat on branch
    if (x < this.seg1) {
      return branchY;
    }
    // 4) Diagonal back to main
    if (x < this.jointEnd) {
      let t = (x - this.seg1) / (this.jointEnd - this.seg1);
      t = Math.min(Math.max(t, 0), 1);
      return branchY + (mainY - branchY) * t;
    }
    // 5) Main flat after merge
    return mainY;
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
    const upperY = this.branchHeight; // 45px above main center
    const seg0 = this.branchStartX - this.canvas.width / 2;
    const seg1 = this.branchEndX - this.canvas.width / 2;

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
    this.directionUp=false;

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

    // 4) If we're back on the main rails, check for drift
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
    ctx.resetTransform();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    ctx.rotate((this.railAngle * Math.PI) / 180);
    this.drawRails();
    this.drawTrain();
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

window.addEventListener("load", () => new Game());
