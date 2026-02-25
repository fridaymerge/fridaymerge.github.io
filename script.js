/* 
  FridayMerge - Interactive Particle Merge Simulation
*/

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    // Set display size (css pixels)
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    // Set actual size in memory (scaled to account for extra pixel density)
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * scale);
    canvas.height = Math.floor(height * scale);
    // Normalize coordinate system to use css pixels
    ctx.scale(scale, scale);
}

window.addEventListener('resize', resize);
resize();

const particles = [];
// Ethereal color palette: Neon Blue, Deep Purple, Magenta, Cyan
const colors = ['#00D2FF', '#3A7BD5', '#d946ef', '#06b6d4'];

class Particle {
    constructor(x, y, r, c) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.r = r || Math.random() * 4 + 2;
        this.color = c || colors[Math.floor(Math.random() * colors.length)];
        this.mass = Math.PI * this.r * this.r;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around boundaries for a seamless infinite feeling
        if (this.x < -this.r) this.x = width + this.r;
        if (this.x > width + this.r) this.x = -this.r;
        if (this.y < -this.r) this.y = height + this.r;
        if (this.y > height + this.r) this.y = -this.r;

        // Subtle ambient friction
        this.vx *= 0.995;
        this.vy *= 0.995;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;

        // Create glowing effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.r * 2.5; // Glow scales with size

        ctx.fill();
        ctx.shadowBlur = 0; // Reset for other drawings
    }
}

// Initialize primary particles
for (let i = 0; i < 120; i++) {
    particles.push(new Particle(Math.random() * width, Math.random() * height));
}

// Interactivity parameters
let mouse = { x: null, y: null };
let isMouseDown = false;

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    // Spawn tiny stardust particles on mouse move if pressing down
    if (isMouseDown && Math.random() > 0.3) {
        particles.push(new Particle(mouse.x, mouse.y, Math.random() * 2 + 1));
    }
});

// Avoid particle build-up at 0,0 when mouse leaves
window.addEventListener('mouseout', () => {
    mouse.x = null;
    mouse.y = null;
    isMouseDown = false;
});

window.addEventListener('mousedown', () => { isMouseDown = true; });
window.addEventListener('mouseup', () => { isMouseDown = false; });

// Touch support for mobile devices
window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        if (Math.random() > 0.3) {
            particles.push(new Particle(mouse.x, mouse.y, Math.random() * 2 + 1));
        }
    }
}, { passive: true });

function animate() {
    // Fill background with a trailing opacity to create motion trails
    ctx.fillStyle = 'rgba(5, 5, 8, 0.4)';
    ctx.fillRect(0, 0, width, height);

    // Gravity and Merging logic
    for (let i = 0; i < particles.length; i++) {
        let p1 = particles[i];

        // Compare with every other particle
        for (let j = i + 1; j < particles.length; j++) {
            let p2 = particles[j];
            let dx = p2.x - p1.x;
            let dy = p2.y - p1.y;
            let distSq = dx * dx + dy * dy;
            let dist = Math.sqrt(distSq);

            // 1. Natural mutual attraction if close enough
            if (dist < 150) {
                let force = 0.5 / Math.max(dist, 1); // Prevent division by zero
                p1.vx += dx * force * 0.005;
                p1.vy += dy * force * 0.005;
                p2.vx -= dx * force * 0.005;
                p2.vy -= dy * force * 0.005;
            }

            // 2. Collision & Merge condition ("FridayMerge")
            // Merge if they touch
            if (dist < p1.r + p2.r) {
                let big = p1.r >= p2.r ? p1 : p2;
                let small = p1.r >= p2.r ? p2 : p1;

                // Calculate new combined area
                let newMass = big.mass + small.mass;
                let newRadius = Math.sqrt(newMass / Math.PI);

                // Cap the radius so we don't end up with one massive screen-filling blob too quickly
                if (newRadius > 80) {
                    // If it gets too big, let it burst or simply stop growing
                    newRadius = 80;
                    newMass = Math.PI * newRadius * newRadius;
                }

                // Conservation of momentum for the new merged particle
                big.vx = (big.vx * big.mass + small.vx * small.mass) / newMass;
                big.vy = (big.vy * big.mass + small.vy * small.mass) / newMass;

                big.r = newRadius;
                big.mass = newMass;

                // Create a small burst visual effect on merge
                ctx.beginPath();
                ctx.arc(big.x, big.y, big.r + 10, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
                ctx.lineWidth = 2;
                ctx.stroke();

                // Remove the smaller particle
                particles.splice(particles.indexOf(small), 1);
                j--; // Adjust index since array shifted
            }
        }
    }

    // Performance and balance management
    if (particles.length > 300) {
        // Drop oldest particles if too many
        particles.splice(0, particles.length - 300);
    } else if (particles.length < 50 && Math.random() < 0.05) {
        // Gradually respawn particles if scene gets too empty (ambient respawn)
        particles.push(new Particle(Math.random() * width, Math.random() * height));
    }

    // Interaction with mouse pointer
    if (mouse.x !== null && mouse.y !== null) {
        particles.forEach(p => {
            let dx = p.x - mouse.x;
            let dy = p.y - mouse.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            // Mouse repels particles gently to avoid them just clumping on the cursor instantly
            if (dist < 100) {
                p.vx += dx * 0.002;
                p.vy += dy * 0.002;
            } else if (dist < 250) {
                // Mouse attracts particles from a distance
                p.vx -= dx * 0.0005;
                p.vy -= dy * 0.0005;
            }
        });
    }

    // Draw all particles
    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}

// Start visualizer
animate();
