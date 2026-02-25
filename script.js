/* 
  FridayMerge - Interactive "Merge the Chaos" Game
*/

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * scale);
    canvas.height = Math.floor(height * scale);
    ctx.scale(scale, scale);
}

window.addEventListener('resize', resize);
resize();

// Ethereal color palette: Neon Blue, Deep Purple, Magenta, Cyan
const colors = ['#00D2FF', '#3A7BD5', '#d946ef', '#06b6d4'];

// --- Game State ---
let score = 0;
let gameOver = false;
let gameStarted = false;
let particles = [];
let player = null;

// Interactivity parameters
let mouse = { x: width / 2, y: height / 2 };

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// Touch support 
window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }
}, { passive: true });

// Listen for clicks to start or restart the game
window.addEventListener('click', () => {
    if (!gameStarted || gameOver) {
        initGame();
    }
});

// --- Classes ---

class Particle {
    constructor(x, y, r, c) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.r = r || Math.random() * 8 + 4; // Varying sizes for enemies/food
        this.color = c || colors[Math.floor(Math.random() * colors.length)];
        this.mass = Math.PI * this.r * this.r;
        this.isPlayer = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around boundaries
        if (this.x < -this.r) this.x = width + this.r;
        if (this.x > width + this.r) this.x = -this.r;
        if (this.y < -this.r) this.y = height + this.r;
        if (this.y > height + this.r) this.y = -this.r;

        // Friction
        if (!this.isPlayer) {
            this.vx *= 0.995;
            this.vy *= 0.995;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.r * 2;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (this.isPlayer) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
}

class Player extends Particle {
    constructor(x, y) {
        super(x, y, 15, '#ffffff'); // Player starts fixed size and white
        this.isPlayer = true;
        this.speed = 0.05;
    }

    update() {
        // Smoothly follow the mouse
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;

        this.vx += dx * this.speed;
        this.vy += dy * this.speed;

        // Apply heavy friction to player for smooth control
        this.vx *= 0.85;
        this.vy *= 0.85;

        super.update();
    }
}

// --- Game Logic ---

function initGame() {
    particles = [];
    score = 0;
    gameOver = false;
    gameStarted = true;

    // Create the player at the mouse cursor
    player = new Player(mouse.x || width / 2, mouse.y || height / 2);

    // Spawn initial enemies
    for (let i = 0; i < 60; i++) {
        spawnParticle();
    }
}

function spawnParticle() {
    // Spawn safely away from the player
    let px = Math.random() * width;
    let py = Math.random() * height;

    // Ensure they don't spawn instantly killing the player
    if (player) {
        let dist = Math.hypot(px - player.x, py - player.y);
        if (dist < 100) {
            px = -100; // Push off screen, will wrap around safely
        }
    }

    // Create particles that range from very small to slightly threatening
    let r = Math.random() * 20 + 2;
    particles.push(new Particle(px, py, r));
}

function drawUI() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Draw Score
    if (gameStarted && !gameOver) {
        ctx.font = '24px "Outfit", sans-serif';
        ctx.fillText(`Mass: ${Math.floor(player.mass)}`, 30, 30);
    }

    // Draw Start/Game Over Screens inside canvas
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (!gameStarted) {
        ctx.font = '36px "Outfit", sans-serif';
        ctx.fillText('Move mouse to guide your particle.', width / 2, height / 2 - 40);
        ctx.font = '24px "Outfit", sans-serif';
        ctx.fillStyle = 'rgba(0, 210, 255, 0.8)';
        ctx.fillText('Click anywhere to begin Merge.', width / 2, height / 2 + 20);
    } else if (gameOver) {
        ctx.font = '48px "Outfit", sans-serif';
        ctx.fillStyle = '#ff4c29';
        ctx.fillText('MERGE FAILED.', width / 2, height / 2 - 40);
        ctx.font = '24px "Outfit", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(`Final Mass Achieved: ${Math.floor(score)}`, width / 2, height / 2 + 10);
        ctx.fillStyle = 'rgba(0, 210, 255, 0.8)';
        ctx.fillText('Click anywhere to try again.', width / 2, height / 2 + 60);
    }
}

function animate() {
    // Fill background with a trailing opacity
    ctx.fillStyle = 'rgba(5, 5, 8, 0.4)';
    ctx.fillRect(0, 0, width, height);

    if (gameStarted && !gameOver) {
        player.update();
        player.draw();

        // Check collisions between Player and Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            let dist = Math.hypot(player.x - p.x, player.y - p.y);

            // Mutual gravity between player and particles
            if (dist < 200) {
                let force = 0.5 / Math.max(dist, 1);
                // Player pulls smaller particles, large particles resist
                if (player.mass > p.mass) {
                    p.vx -= (p.x - player.x) * force * 0.05;
                    p.vy -= (p.y - player.y) * force * 0.05;
                }
            }

            // Collision!
            if (dist < player.r + p.r) {
                if (player.r >= p.r) {
                    // Player absorbs particle
                    player.mass += p.mass;
                    player.r = Math.sqrt(player.mass / Math.PI); // Grow
                    player.color = p.color; // Absorb color momentarily

                    // Visual pop
                    ctx.beginPath();
                    ctx.arc(player.x, player.y, player.r + 15, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
                    ctx.lineWidth = 4;
                    ctx.stroke();

                    score = player.mass;
                    particles.splice(i, 1);

                    // Spawn a new particle to keep game going
                    spawnParticle();
                } else {
                    // Particle absorbs Player -> Game Over
                    gameOver = true;
                    // Visual explosion
                    for (let burst = 0; burst < 20; burst++) {
                        particles.push(new Particle(player.x, player.y, Math.random() * 5 + 2, '#ff4c29'));
                    }
                }
            }
        }

        // Particle vs Particle behavior
        for (let i = 0; i < particles.length; i++) {
            let p1 = particles[i];

            // Randomly roam
            p1.vx += (Math.random() - 0.5) * 0.1;
            p1.vy += (Math.random() - 0.5) * 0.1;

            p1.update();
            p1.draw();

            for (let j = i + 1; j < particles.length; j++) {
                let p2 = particles[j];
                let dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

                // NPC Particles can also merge with each other!
                if (dist < p1.r + p2.r) {
                    let big = p1.r >= p2.r ? p1 : p2;
                    let small = p1.r >= p2.r ? p2 : p1;

                    big.mass += small.mass;
                    big.r = Math.sqrt(big.mass / Math.PI);

                    // Conservation momentum
                    big.vx = (big.vx * big.mass + small.vx * small.mass) / big.mass;
                    big.vy = (big.vy * big.mass + small.vy * small.mass) / big.mass;

                    // Remove small particle
                    particles.splice(particles.indexOf(small), 1);
                    j--;

                    // If NPC particles get too massive, they burst to prevent an unbeatable super-blob
                    if (big.r > 60) {
                        particles.splice(particles.indexOf(big), 1);
                        for (let b = 0; b < 5; b++) spawnParticle();
                    }
                }
            }
        }
    } else {
        // Idle Animation for Start/End screens
        particles.forEach(p => {
            p.vx += (Math.random() - 0.5) * 0.05;
            p.vy += (Math.random() - 0.5) * 0.05;
            p.update();
            p.draw();
        });

        // Spawn ambient particles if empty
        if (particles.length < 50) spawnParticle();
    }

    drawUI();
    requestAnimationFrame(animate);
}

// Start idle visualizer
for (let i = 0; i < 50; i++) spawnParticle();
animate();
