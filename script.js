const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const hint = document.getElementById('hint');
const forceSlider = document.getElementById('forceSlider');
const speedSlider = document.getElementById('speedSlider');
const audioToggle = document.getElementById('audioToggle');
const clearBtn = document.getElementById('clearBtn');
const zoomSlider = document.getElementById('zoomSlider');
const colorToggle = document.getElementById('colorToggle');
const bgToggle = document.getElementById('bgToggle');

let width, height;
let stars = [];
let shockwaves = [];
let mouse = { x: null, y: null, radius: 100 };
let audioEnabled = true;
let zoomLevel = 1;
let useColorStars = true;
let useMilkyWay = false;

let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playWaveSound(frequency = 180) {
    if (!audioEnabled) return;
    try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.6);

        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
        console.log('Audio noch nicht gestartet');
    }
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    createStars();
}

class Star {
    constructor() {
        this.baseX = Math.random() * width;
        this.baseY = Math.random() * height;
        this.x = this.baseX;
        this.y = this.baseY;
        this.vx = 0;
        this.vy = 0;
        this.size = Math.random() * 2 + 0.8;
        this.color = this.getRandomColor();
        this.alpha = Math.random() * 0.7 + 0.3;
        this.springK = 0.03;
        this.friction = 0.88;
    }

    getRandomColor() {
        const colors = ['#ffffff', '#e0f2fe', '#bae6fd', '#fef08a', '#f472b6', '#a78bfa'];
        return useColorStars ? colors[Math.floor(Math.random() * colors.length)] : '#ffffff';
    }

    update() {
        const dx = this.baseX - this.x;
        const dy = this.baseY - this.y;

        this.vx += dx * this.springK;
        this.vy += dy * this.springK;

        this.vx *= this.friction;
        this.vy *= this.friction;

        this.x += this.vx;
        this.y += this.vy;

        if (mouse.x !== null) {
            const mdx = this.x - mouse.x;
            const mdy = this.y - mouse.y;
            const dist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (dist < mouse.radius) {
                const force = (mouse.radius - dist) / mouse.radius;
                const angle = Math.atan2(mdy, mdx);
                this.vx += Math.cos(angle) * force * 1.2;
                this.vy += Math.sin(angle) * force * 1.2;
            }
        }
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.alpha;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.size * 3;
        ctx.fill();
        ctx.restore();
    }
}

class Shockwave {
    constructor(x, y, maxRadius, force, speed) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = maxRadius;
        this.thickness = 35;
        this.force = force;
        this.speed = speed;
        this.alpha = 1;
    }

    update() {
        this.radius += this.speed;
        this.alpha = 1 - (this.radius / this.maxRadius);

        stars.forEach(star => {
            const dx = star.x - this.x;
            const dy = star.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const waveStart = this.radius - this.thickness;
            const waveEnd = this.radius;
            if (dist >= waveStart && dist <= waveEnd) {
                const angle = Math.atan2(dy, dx);
                const waveImpact = (1 - (this.radius / this.maxRadius)) * this.force;
                star.vx += Math.cos(angle) * waveImpact;
                star.vy += Math.sin(angle) * waveImpact;
                star.alpha = 1;
            }
        });
    }

    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0, this.radius), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 223, 216, ${this.alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00dfd8';
        ctx.shadowBlur = 15;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0, this.radius - 15), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 0, 128, ${this.alpha * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }

    isDead() {
        return this.radius >= this.maxRadius || this.alpha <= 0;
    }
}

function createStars() {
    stars = [];
    const count = Math.floor((width * height) / 3000) * zoomLevel;
    for (let i = 0; i < count; i++) {
        stars.push(new Star());
    }
}

function drawBackground() {
    if (useMilkyWay) {
        const gradient = ctx.createLinearGradient(0, height * 0.2, 0, height * 0.8);
        gradient.addColorStop(0, '#04020a');
        gradient.addColorStop(0.5, '#090716');
        gradient.addColorStop(1, '#020108');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < 120; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const radius = Math.random() * 1.2;
            const alpha = Math.random() * 0.2;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
        }
    } else {
        ctx.fillStyle = '#02030a';
        ctx.fillRect(0, 0, width, height);
    }
}

function animate() {
    drawBackground();

    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const wave = shockwaves[i];
        wave.update();
        wave.draw();
        if (wave.isDead()) {
            shockwaves.splice(i, 1);
        }
    }

    stars.forEach(star => {
        star.update();
        star.draw();
    });

    requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);

window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
});

window.addEventListener('click', (e) => {
    if (e.target.closest('.controls')) return;

    if (hint) hint.style.opacity = '0';

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const maxRadius = Math.max(width, height) * 0.6;
    const force = parseFloat(forceSlider.value) * 0.1;
    const speed = parseFloat(speedSlider.value);

    shockwaves.push(new Shockwave(clickX, clickY, maxRadius, force, speed));
    playWaveSound(180 + Math.random() * 60);
});

audioToggle.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    audioToggle.textContent = audioEnabled ? 'Audio: AN' : 'Audio: AUS';
    audioToggle.classList.toggle('active', audioEnabled);
});

clearBtn.addEventListener('click', () => createStars());

zoomSlider.addEventListener('input', () => {
    zoomLevel = parseInt(zoomSlider.value, 10);
    createStars();
});

colorToggle.addEventListener('change', () => {
    useColorStars = colorToggle.checked;
    stars.forEach(star => {
        star.color = star.getRandomColor();
    });
});

bgToggle.addEventListener('change', () => {
    useMilkyWay = bgToggle.checked;
});

resize();
animate();
