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
const trailToggle = document.getElementById('trailToggle');
const implodeToggle = document.getElementById('implodeToggle');

let width, height;
let stars = [];
let bgStars = [];
let shockwaves = [];
let mouse = { x: null, y: null, radius: 100 };
let audioEnabled = true;
let zoomLevel = 1;
let useColorStars = true;
let useMilkyWay = false;
let useTrails = true;

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

function playWaveSound(isImplosion = false) {
    if (!audioEnabled) return;
    try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        
        if (isImplosion) {
            osc.frequency.setValueAtTime(40, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.6);
        } else {
            osc.frequency.setValueAtTime(180 + Math.random() * 60, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.6);
        }

        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
        console.log('Audio Context Error', e);
    }
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    createStars();
    createBgStars();
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
        this.mass = this.size;
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

        if (this.x < 0 || this.x > width) this.vx *= -0.5;
        if (this.y < 0 || this.y > height) this.vy *= -0.5;

        if (mouse.x !== null) {
            const mdx = this.x - mouse.x;
            const mdy = this.y - mouse.y;
            const dist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (dist < mouse.radius) {
                const force = (mouse.radius - dist) / mouse.radius;
                const angle = Math.atan2(mdy, mdx);
                this.vx += Math.cos(angle) * force * 1.5;
                this.vy += Math.sin(angle) * force * 1.5;
            }
        }
    }

    draw() {
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        let drawColor = this.color;
        
        if (speed > 8 && useColorStars) {
            drawColor = '#00ffcc';
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = drawColor;
        ctx.globalAlpha = this.alpha;
        ctx.shadowColor = drawColor;
        ctx.shadowBlur = this.size * 3;
        ctx.fill();
        ctx.restore();
    }
}

class Shockwave {
    constructor(x, y, maxRadius, force, speed, isImplode) {
        this.x = x;
        this.y = y;
        this.radius = isImplode ? maxRadius : 0;
        this.maxRadius = maxRadius;
        this.thickness = 45;
        this.force = force;
        this.speed = speed;
        this.alpha = 1;
        this.isImplode = isImplode;
    }

    update() {
        if (this.isImplode) {
            this.radius -= this.speed * 2;
            this.alpha = (this.radius / this.maxRadius);
        } else {
            this.radius += this.speed;
            this.alpha = 1 - (this.radius / this.maxRadius);
        }

        stars.forEach(star => {
            const dx = star.x - this.x;
            const dy = star.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const waveStart = this.radius - this.thickness;
            const waveEnd = this.radius + this.thickness;
            
            if (dist >= waveStart && dist <= waveEnd) {
                const angle = Math.atan2(dy, dx);
                let waveImpact = this.force * (star.mass * 0.4);
                
                if (this.isImplode) {
                    waveImpact *= -1.5;
                } else {
                    waveImpact *= (1 - (this.radius / this.maxRadius));
                }

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
        
        const color = this.isImplode ? '255, 0, 128' : '0, 223, 216';
        ctx.strokeStyle = `rgba(${color}, ${this.alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = `rgb(${color})`;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();
    }

    isDead() {
        return this.isImplode ? this.radius <= 0 : (this.radius >= this.maxRadius || this.alpha <= 0);
    }
}

function createStars() {
    stars = [];
    const count = Math.floor((width * height) / 3000) * zoomLevel;
    for (let i = 0; i < count; i++) {
        stars.push(new Star());
    }
}

function createBgStars() {
    bgStars = [];
    for (let i = 0; i < 120; i++) {
        bgStars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.2,
            alpha: Math.random() * 0.3
        });
    }
}

function drawBackground() {
    const alpha = useTrails ? 0.25 : 1;

    if (useMilkyWay) {
        const gradient = ctx.createLinearGradient(0, height * 0.2, 0, height * 0.8);
        gradient.addColorStop(0, `rgba(4, 2, 10, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(9, 7, 22, ${alpha})`);
        gradient.addColorStop(1, `rgba(2, 1, 8, ${alpha})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        bgStars.forEach(s => {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * alpha})`;
            ctx.fill();
        });
    } else {
        ctx.fillStyle = `rgba(2, 3, 10, ${alpha})`;
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

    stars.forceEach = undefined;
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

function triggerShockwave(x, y, isImplode) {
    if (hint) hint.style.opacity = '0';
    const maxRadius = Math.max(width, height) * 0.6;
    const force = parseFloat(forceSlider.value) * 0.1;
    const speed = parseFloat(speedSlider.value);

    shockwaves.push(new Shockwave(x, y, maxRadius, force, speed, isImplode));
    playWaveSound(isImplode);
}

window.addEventListener('click', (e) => {
    if (e.target.closest('.controls')) return;
    const rect = canvas.getBoundingClientRect();
    triggerShockwave(e.clientX - rect.left, e.clientY - rect.top, implodeToggle.checked);
});

window.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.controls')) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    triggerShockwave(e.clientX - rect.left, e.clientY - rect.top, true);
});

canvas.addEventListener('touchstart', (e) => {
    if (e.target.closest('.controls')) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    triggerShockwave(touch.clientX - rect.left, touch.clientY - rect.top, implodeToggle.checked);
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
}, { passive: true });

canvas.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
}, { passive: true });

canvas.addEventListener('touchend', () => {
    mouse.x = null;
    mouse.y = null;
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
    stars.forEach(star => star.color = star.getRandomColor());
});

bgToggle.addEventListener('change', () => {
    useMilkyWay = bgToggle.checked;
});

trailToggle.addEventListener('change', () => {
    useTrails = trailToggle.checked;
});

resize();
animate();
