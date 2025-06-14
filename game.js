class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Game parameters
        this.trainVerticalOffset = -100; // Adjust this to position the train on the rails
        this.trainSpeed = 2;
        this.railDistance = 30; // Vertical distance between rails
        this.railAngle = 18; // Angle in degrees for the 2.5D perspective
        
        // Decision points configuration
        this.decisionPoints = [
            { x: 200, split: true },  // First split
            { x: 400, merge: true },  // First merge
            { x: 600, split: true },  // Second split
            { x: 800, merge: true }   // Second merge
        ];
        
        // Load images
        this.trainImage = new Image();
        this.trainImage.src = 'train.png';
        
        // Game state
        this.trainX = 100; // Fixed horizontal position
        this.trainY = this.canvas.height / 2 + this.trainVerticalOffset;
        this.viewportX = 0;
        
        // Start game loop
        this.lastTime = 0;
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }
    
    drawRails() {
        const ctx = this.ctx;
        ctx.save();
        
        // Move to center of canvas for rotation
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.rotate(this.railAngle * Math.PI / 180);
        
        // Draw main rails
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        // Calculate rail positions relative to center
        const railLength = this.canvas.width * 1.5; // Make rails longer to account for rotation
        const trackSeparation = 60; // Distance between upper and lower tracks
        const topTrackY = -trackSeparation / 2;
        const bottomTrackY = trackSeparation / 2;
        
        // Draw main bottom track (two parallel rails)
        ctx.beginPath();
        ctx.moveTo(-railLength / 2, bottomTrackY - this.railDistance / 2);
        ctx.lineTo(railLength / 2, bottomTrackY - this.railDistance / 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(-railLength / 2, bottomTrackY + this.railDistance / 2);
        ctx.lineTo(railLength / 2, bottomTrackY + this.railDistance / 2);
        ctx.stroke();
        
        // Draw decision points and upper tracks
        this.decisionPoints.forEach((point, index) => {
            const x = point.x - this.canvas.width / 2;
            
            if (point.split) {
                // Draw split points (two parallel rails)
                ctx.beginPath();
                ctx.moveTo(x, bottomTrackY - this.railDistance / 2);
                ctx.lineTo(x, topTrackY - this.railDistance / 2);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(x, bottomTrackY + this.railDistance / 2);
                ctx.lineTo(x, topTrackY + this.railDistance / 2);
                ctx.stroke();
                
                // Draw upper track with curve (two parallel rails)
                const nextPoint = this.decisionPoints[index + 1];
                if (nextPoint) {
                    const nextX = nextPoint.x - this.canvas.width / 2;
                    const midX = (x + nextX) / 2;
                    
                    // Draw curved path to next point (first rail)
                    ctx.beginPath();
                    ctx.moveTo(x, topTrackY - this.railDistance / 2);
                    ctx.quadraticCurveTo(
                        midX, topTrackY - 20, // Control point
                        nextX, topTrackY - this.railDistance / 2 // End point
                    );
                    ctx.stroke();
                    
                    // Draw curved path to next point (second rail)
                    ctx.beginPath();
                    ctx.moveTo(x, topTrackY + this.railDistance / 2);
                    ctx.quadraticCurveTo(
                        midX, topTrackY - 20, // Control point
                        nextX, topTrackY + this.railDistance / 2 // End point
                    );
                    ctx.stroke();
                }
            }
            
            if (point.merge) {
                // Draw merge points (two parallel rails)
                ctx.beginPath();
                ctx.moveTo(x, topTrackY - this.railDistance / 2);
                ctx.lineTo(x, bottomTrackY - this.railDistance / 2);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(x, topTrackY + this.railDistance / 2);
                ctx.lineTo(x, bottomTrackY + this.railDistance / 2);
                ctx.stroke();
            }
        });
        
        ctx.restore();
    }
    
    drawTrain() {
        const ctx = this.ctx;
        ctx.save();
        
        // Move to center of canvas for rotation
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.rotate(this.railAngle * Math.PI / 180);
        
        // Calculate train position relative to center
        const trainX = this.trainX - this.canvas.width / 2;
        const trainY = this.trainVerticalOffset;
        
        // Counter-rotate the train to keep it aligned with the rails
        ctx.rotate(-this.railAngle * Math.PI / 180);
        
        // Draw train
        ctx.drawImage(this.trainImage, trainX - this.trainImage.width / 2, trainY - this.trainImage.height / 2);
        
        ctx.restore();
    }
    
    update(deltaTime) {
        // Move viewport
        this.viewportX += this.trainSpeed;
        
        // Reset viewport when it reaches a certain point
        if (this.viewportX > this.canvas.width) {
            this.viewportX = 0;
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw game elements
        this.drawRails();
        this.drawTrain();
    }
    
    animate(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.draw();
        
        requestAnimationFrame(this.animate);
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
}); 