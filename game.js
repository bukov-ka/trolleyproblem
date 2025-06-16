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
    this.verticalOffset = 25; // Vertical offset for human positioning

    // Human configuration
    this.humansMain = 5; // number of humans on main track
    this.humansAlternate = 5; // number of humans on alternate track
    this.humanSpacing = 30; // pixels between humans
    this.humanImages = [];
    this.hitImages = [];
    this.nextHitIndex = 0; // Track which hit sprite to use next
    this.hitHumans = new Map(); // Map of human keys to their hit sprite index

    // Load human sprites
    for (let i = 1; i <= 5; i++) {
      const hitImg = new Image();
      hitImg.src = `hit${i}.png`;
      this.hitImages.push(hitImg);
    }
    const humanImg = new Image();
    humanImg.src = "human.png";
    this.humanImages.push(humanImg);

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
    const d = this.d;

    // 1) Main flat before split
    if (x < this.jointStart) {
      return mainY;
    }
    // 2) Bezier curve to branch
    if (x < this.seg0) {
      const t = (x - this.jointStart) / (this.seg0 - this.jointStart);
      const controlPointOffset = this.switchLength * 0.5;
      
      const p0 = { x: this.jointStart, y: mainY };
      const p1 = { x: this.jointStart + controlPointOffset, y: mainY };
      const p2 = { x: this.seg0 - controlPointOffset, y: branchY };
      const p3 = { x: this.seg0, y: branchY };
      
      const point = this.bezierPoint(p0, p1, p2, p3, t);
      return point.y;
    }
    // 3) Flat on branch
    if (x < this.seg1) {
      return branchY;
    }
    // 4) Bezier curve back to main
    if (x < this.jointEnd) {
      const t = (x - this.seg1) / (this.jointEnd - this.seg1);
      const controlPointOffset = this.switchLength * 0.5;
      
      const p0 = { x: this.seg1, y: branchY };
      const p1 = { x: this.seg1 + controlPointOffset, y: branchY };
      const p2 = { x: this.jointEnd - controlPointOffset, y: mainY };
      const p3 = { x: this.jointEnd, y: mainY };
      
      const point = this.bezierPoint(p0, p1, p2, p3, t);
      return point.y;
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
    const upperY = this.branchHeight;
    const seg0 = this.branchStartX - this.canvas.width / 2;
    const seg1 = this.branchEndX - this.canvas.width / 2;

    ctx.beginPath();
    ctx.moveTo(seg0, upperY - d);
    ctx.lineTo(seg1, upperY - d);
    ctx.moveTo(seg0, upperY + d);
    ctx.lineTo(seg1, upperY + d);
    ctx.stroke();

    // --- Switch diagonals using Bezier curves ---
    const switchLength = Math.abs(upperY - 0);
    const jointX = seg0 - switchLength;
    const controlPointOffset = switchLength * 0.5; // Control point distance for curve

    // Top rail curve (main to branch)
    ctx.beginPath();
    ctx.moveTo(jointX, -d);
    ctx.bezierCurveTo(
      jointX + controlPointOffset, -d,
      seg0 - controlPointOffset, upperY - d,
      seg0, upperY - d
    );
    ctx.stroke();

    // Bottom rail curve (main to branch)
    ctx.beginPath();
    ctx.moveTo(jointX, d);
    ctx.bezierCurveTo(
      jointX + controlPointOffset, d,
      seg0 - controlPointOffset, upperY + d,
      seg0, upperY + d
    );
    ctx.stroke();

    // --- Merge curves (branch → main) ---
    const mergeStartX = seg1;
    const mergeJointX = mergeStartX + switchLength;

    // Top rail curve (branch to main)
    ctx.beginPath();
    ctx.moveTo(mergeStartX, upperY - d);
    ctx.bezierCurveTo(
      mergeStartX + controlPointOffset, upperY - d,
      mergeJointX - controlPointOffset, -d,
      mergeJointX, -d
    );
    ctx.stroke();

    // Bottom rail curve (branch to main)
    ctx.beginPath();
    ctx.moveTo(mergeStartX, upperY + d);
    ctx.bezierCurveTo(
      mergeStartX + controlPointOffset, upperY + d,
      mergeJointX - controlPointOffset, d,
      mergeJointX, d
    );
    ctx.stroke();
  }

  drawHumans() {
    const ctx = this.ctx;
    ctx.save();

    // Calculate center of branch segment
    const branchCenterX = this.seg0 + (this.seg1 - this.seg0) / 2;
    
    // Draw humans on main track - centered around branch segment
    const mainStartX = branchCenterX - (this.humansMain * this.humanSpacing) / 2;
    for (let i = 0; i < this.humansMain; i++) {
      const x = mainStartX + i * this.humanSpacing;
      const y = this.railMainY + this.trainAdjustment + this.verticalOffset;
      this.drawHuman(x, y, false);
    }

    // Draw humans on branch track - centered around branch segment
    const branchStartX = branchCenterX - (this.humansAlternate * this.humanSpacing) / 2;
    for (let i = 0; i < this.humansAlternate; i++) {
      const x = branchStartX + i * this.humanSpacing;
      const y = this.branchTopY + this.trainAdjustment + this.verticalOffset;
      this.drawHuman(x, y, true);
    }

    ctx.restore();
  }

  drawHuman(x, y, isOnBranch) {
    const ctx = this.ctx;
    const humanKey = `${x},${y},${isOnBranch}`;
    const hitIndex = this.hitHumans.get(humanKey);
    
    ctx.save();
    ctx.translate(x - this.canvas.width / 2, y);
    ctx.rotate((-this.railAngle * Math.PI) / 180);
    
    const img = hitIndex !== undefined ? this.hitImages[hitIndex] : this.humanImages[0];
    // Scale down the human sprites to 50% of their original size
    const scale = 0.5;
    ctx.drawImage(
      img, 
      -img.width * scale / 2, 
      -img.height * scale / 2,
      img.width * scale,
      img.height * scale
    );
    
    ctx.restore();
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

  checkCollisions() {
    const trainWidth = this.trainImage.width;
    const trainHeight = this.trainImage.height;
    const humanWidth = this.humanImages[0].width * 0.5; // Account for scaling
    const humanHeight = this.humanImages[0].height * 0.5; // Account for scaling

    // Define hit zone at the right border of the train
    const hitZoneWidth = 10; // Width of the hit zone (smaller since it's at the edge)
    const hitZoneHeight = 20; // Height of the hit zone
    const hitZoneOffsetX = trainWidth / 4 - 15 - hitZoneWidth / 2; // Position hit zone at right edge of train
    const hitZoneOffsetY = 10; // Position hit zone at bottom of train

    // Calculate center of branch segment
    const branchCenterX = this.seg0 + (this.seg1 - this.seg0) / 2;

    // Check main track humans
    const mainStartX = branchCenterX - (this.humansMain * this.humanSpacing) / 2;
    for (let i = 0; i < this.humansMain; i++) {
      const x = mainStartX + i * this.humanSpacing;
      const y = this.railMainY + this.trainAdjustment + this.verticalOffset;
      const humanKey = `${x},${y},false`;
      
      // Only check collision if we're on the main track
      if (!this.hitHumans.has(humanKey) && 
          !this.directionUp && // Only check if we're on main track
          Math.abs(this.trainX + hitZoneOffsetX - x) < (hitZoneWidth + humanWidth) / 2 &&
          Math.abs(this.trainVerticalOffset + hitZoneOffsetY - y) < (hitZoneHeight + humanHeight) / 2) {
        this.hitHumans.set(humanKey, this.nextHitIndex);
        this.nextHitIndex = (this.nextHitIndex + 1) % this.hitImages.length;
      }
    }

    // Check branch humans
    const branchStartX = branchCenterX - (this.humansAlternate * this.humanSpacing) / 2;
    for (let i = 0; i < this.humansAlternate; i++) {
      const x = branchStartX + i * this.humanSpacing;
      const y = this.branchTopY + this.trainAdjustment + this.verticalOffset;
      const humanKey = `${x},${y},true`;
      
      // Only check collision if we're on the branch track
      if (!this.hitHumans.has(humanKey) && 
          this.directionUp && // Only check if we're on branch track
          Math.abs(this.trainX + hitZoneOffsetX - x) < (hitZoneWidth + humanWidth) / 2 &&
          Math.abs(this.trainVerticalOffset + hitZoneOffsetY - y) < (hitZoneHeight + humanHeight) / 2) {
        this.hitHumans.set(humanKey, this.nextHitIndex);
        this.nextHitIndex = (this.nextHitIndex + 1) % this.hitImages.length;
      }
    }
  }

  update(deltaTime) {
    this.viewportX += this.trainSpeed;
    this.trainX += this.trainSpeed;

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

    // Check for collisions with humans
    this.checkCollisions();

    // loop/reset
    if (this.viewportX > this.canvas.width) {
      this.viewportX = 0;
      this.trainX = 0;
      this.branchChosen = false;
      this.trainVerticalOffset = this.mainOffset;
      this.hitHumans.clear(); // Reset hit humans on loop
      this.nextHitIndex = 0; // Reset hit sprite index on loop
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
    this.drawHumans();
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

  // Helper function to calculate Bezier curve point
  bezierPoint(p0, p1, p2, p3, t) {
    const cx = 3 * (p1.x - p0.x);
    const bx = 3 * (p2.x - p1.x) - cx;
    const ax = p3.x - p0.x - cx - bx;
    
    const cy = 3 * (p1.y - p0.y);
    const by = 3 * (p2.y - p1.y) - cy;
    const ay = p3.y - p0.y - cy - by;
    
    const x = ax * Math.pow(t, 3) + bx * Math.pow(t, 2) + cx * t + p0.x;
    const y = ay * Math.pow(t, 3) + by * Math.pow(t, 2) + cy * t + p0.y;
    
    return { x, y };
  }
}

window.addEventListener("load", () => new Game());
