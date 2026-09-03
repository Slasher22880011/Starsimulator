var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

var forceSlider = document.getElementById('forceSlider');
var speedSlider = document.getElementById('speedSlider');
var audioToggle = document.getElementById('audioToggle');
var clearBtn = document.getElementById('clearBtn');
var zoomSlider = document.getElementById('zoomSlider');
var colorToggle = document.getElementById('colorToggle');
var bgToggle = document.getElementById('bgToggle');
var trailToggle = document.getElementById('trailToggle');
var implodeToggle = document.getElementById('implodeToggle');
var hint = document.getElementById('hint');

var width = window.innerWidth;
var height = window.innerHeight;

var stars = [];
var bgStars = [];
var shockwaves = [];

var mouseX = null;
var mouseY = null;
var mouseRadius = 100;

var audioEnabled = true;
var zoomLevel = 1;
var useColorStars = true;
var useMilkyWay = false;
var useTrails = true;

var audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playWaveSound(isImplosion) {
    if (!audioEnabled) return;
    try {
        initAudio();
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();

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
        console.log('Audio Error:', e);
    }
}

var starColors = ['#ffffff', '#e0f2fe', '#bae6fd', '#fef08a', '#f472b6', '#a78bfa'];

function getRandomStarColor() {
    if (!useColorStars) return '#ffffff';
    var randomIndex = Math.floor(Math.random() * starColors.length);
    return starColors[randomIndex];
}

function Star() {
    this.baseX = Math.random() * width;
    this.baseY = Math.random() * height;
    this.x = this.baseX;
    this.y = this.baseY;
    this.vx = 0;
    this.vy = 0;
    this.size = Math.random() * 2 + 0.8;
    this.mass = this.size;
    this.color = getRandomStarColor();
    this.alpha = Math.random() * 0.7 + 0.3;
    this.springK = 0.03;
    this.friction = 0.88;
}

Star.prototype.update = function() {
    var dx = this.baseX - this.x;
    var dy = this.baseY - this.y;

    this.vx += dx * this.springK;
    this.vy += dy * this.springK;

    this.vx *= this.friction;
    this.vy *= this.friction;

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0 || this.x > width) this.vx *= -0.5;
    if (this.y < 0 || this.y > height) this.vy *= -0.5;

    if (mouseX !== null && mouseY !== null) {
        var mdx = this.x - mouseX;
        var mdy = this.y - mouseY;
        var dist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (dist < mouseRadius) {
            var force = (mouseRadius - dist) / mouseRadius;
            var angle = Math.atan2(mdy, mdx);
            this.vx += Math.cos(angle) * force * 1.5;
            this.vy += Math.sin(angle) * force * 1.5;
        }
    }
};

Star.prototype.draw = function() {
    var speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    var drawColor = this.color;

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
};

function Shockwave(x, y, maxRadius, force, speed, isImplode) {
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

Shockwave.prototype.update = function() {
    if (this.isImplode) {
        this.radius -= this.speed * 2;
        this.alpha = this.radius / this.maxRadius;
    } else {
        this.radius += this.speed;
        this.alpha = 1 - (this.radius / this.maxRadius);
    }

    var waveStart = this.radius - this.thickness;
    var waveEnd = this.radius + this.thickness;

    for (var i = 0; i < stars.length; i++) {
        var star = stars[i];
        var dx = star.x - this.x;
        var dy = star.y - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= waveStart && dist <= waveEnd) {
            var angle = Math.atan2(dy, dx);
            var waveImpact = this.force * (star.mass * 0.4);

            if (this.isImplode) {
                waveImpact *= -1.5;
            } else {
                waveImpact *= (1 - (this.radius / this.maxRadius));
            }

            star.vx += Math.cos(angle) * waveImpact;
            star.vy += Math.sin(angle) * waveImpact;
            star.alpha = 1;
        }
    }
};

Shockwave.prototype.draw = function() {
    if (this.alpha <= 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0, this.radius), 0, Math.PI * 2);

    var color = this.isImplode ? '255, 0, 128' : '0, 223, 216';
    ctx.strokeStyle = 'rgba(' + color + ', ' + (this.alpha * 0.6) + ')';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgb(' + color + ')';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.restore();
};

Shockwave.prototype.isDead = function() {
    if (this.isImplode) {
        return this.radius <= 0;
    } else {
        return this.radius >= this.maxRadius || this.alpha <= 0;
    }
};

function createStars() {
    stars = [];
    var count = Math.floor((width * height) / 3000) * zoomLevel;
    for (var i = 0; i < count; i++) {
        stars.push(new Star());
    }
}

function createBgStars() {
    bgStars = [];
    for (var i = 0; i < 120; i++) {
        bgStars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.2,
            alpha: Math.random() * 0.3
        });
    }
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    createStars();
    createBgStars();
}

function drawBackground() {
    var alpha = useTrails ? 0.25 : 1;

    if (useMilkyWay) {
        var gradient = ctx.createLinearGradient(0, height * 0.2, 0, height * 0.8);
        gradient.addColorStop(0, 'rgba(4, 2, 10, ' + alpha + ')');
        gradient.addColorStop(0.5, 'rgba(9, 7, 22, ' + alpha + ')');
        gradient.addColorStop(1, 'rgba(2, 1, 8, ' + alpha + ')');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        for (var i = 0; i < bgStars.length; i++) {
            var s = bgStars[i];
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, ' + (s.alpha * alpha) + ')';
            ctx.fill();
        }
    } else {
        ctx.fillStyle = 'rgba(2, 3, 10, ' + alpha + ')';
        ctx.fillRect(0, 0, width, height);
    }
}

function animate() {
    drawBackground();

    for (var i = shockwaves.length - 1; i >= 0; i--) {
        var wave = shockwaves[i];
        wave.update();
        wave.draw();
        if (wave.isDead()) {
            shockwaves.splice(i, 1);
        }
    }

    for (var j = 0; j < stars.length; j++) {
        stars[j].update();
        stars[j].draw();
    }

    requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);

window.addEventListener('mousemove', function(e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

window.addEventListener('mouseleave', function() {
    mouseX = null;
    mouseY = null;
});

function triggerShockwave(x, y, isImplode) {
    if (hint) hint.style.opacity = '0';
    var maxRadius = Math.max(width, height) * 0.6;
    var force = parseFloat(forceSlider.value) * 0.1;
    var speed = parseFloat(speedSlider.value);

    shockwaves.push(new Shockwave(x, y, maxRadius, force, speed, isImplode));
    playWaveSound(isImplode);
}

window.addEventListener('click', function(e) {
    if (e.target.closest('.controls')) return;
    var rect = canvas.getBoundingClientRect();
    triggerShockwave(e.clientX - rect.left, e.clientY - rect.top, implodeToggle.checked);
});

window.addEventListener('contextmenu', function(e) {
    if (e.target.closest('.controls')) return;
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    triggerShockwave(e.clientX - rect.left, e.clientY - rect.top, true);
});

canvas.addEventListener('touchstart', function(e) {
    if (e.target.closest('.controls')) return;
    var touch = e.touches[0];
    var rect = canvas.getBoundingClientRect();
    triggerShockwave(touch.clientX - rect.left, touch.clientY - rect.top, implodeToggle.checked);
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
}, { passive: true });

canvas.addEventListener('touchmove', function(e) {
    var touch = e.touches[0];
    var rect = canvas.getBoundingClientRect();
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
}, { passive: true });

canvas.addEventListener('touchend', function() {
    mouseX = null;
    mouseY = null;
});

audioToggle.addEventListener('click', function() {
    audioEnabled = !audioEnabled;
    audioToggle.textContent = audioEnabled ? 'Audio: AN' : 'Audio: AUS';
    if (audioEnabled) {
        audioToggle.classList.add('active');
    } else {
        audioToggle.classList.remove('active');
    }
});

clearBtn.addEventListener('click', function() {
    createStars();
});

zoomSlider.addEventListener('input', function() {
    zoomLevel = parseInt(zoomSlider.value, 10);
    createStars();
});

colorToggle.addEventListener('change', function() {
    useColorStars = colorToggle.checked;
    for (var i = 0; i < stars.length; i++) {
        stars[i].color = getRandomStarColor();
    }
});

bgToggle.addEventListener('change', function() {
    useMilkyWay = bgToggle.checked;
});

trailToggle.addEventListener('change', function() {
    useTrails = trailToggle.checked;
});

resize();
animate(); 