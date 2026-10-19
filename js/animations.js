// ==========================================================================
// Invitation Animation Engine - butterflies + falling flowers
// Shared by the public invitation page (js/app.js) and the standalone
// Animation Settings page (/animationsettings/).
// ==========================================================================

// ==========================================================================
// Elegant Butterfly Animation System
// ==========================================================================
let butterflyCustomColor = '';
let butterflyInstances = [];
let butterflyVisible = true;
let butterflyCanvasEl = null;

function _bfyHexToRgb(hex) {
  let h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  if (isNaN(n)) return { r: 229, g: 185, b: 85 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function _bfyMix(hex, target, amt) {
  const a = _bfyHexToRgb(hex), b = _bfyHexToRgb(target);
  return 'rgb(' + Math.round(a.r + (b.r - a.r) * amt) + ', ' +
    Math.round(a.g + (b.g - a.g) * amt) + ', ' +
    Math.round(a.b + (b.b - a.b) * amt) + ')';
}

// Default Khmer-gold butterfly palette; overridden by a single custom colour.
function butterflyPalette() {
  if (butterflyCustomColor) {
    const c = butterflyCustomColor;
    return [
      { primary: c, secondary: _bfyMix(c, '#ffffff', 0.55), accent: _bfyMix(c, '#000000', 0.35) },
      { primary: _bfyMix(c, '#ffffff', 0.2), secondary: _bfyMix(c, '#ffffff', 0.7), accent: c },
    ];
  }
  return [
    { primary: '#e5b955', secondary: '#fff3b0', accent: '#d4af37' }, // Khmer Gold
    { primary: '#ffd700', secondary: '#fff8dc', accent: '#ffec8b' }, // Imperial Gold
    { primary: '#daa520', secondary: '#f0e68c', accent: '#b8860b' }, // Goldenrod
    { primary: '#b8860b', secondary: '#e5b955', accent: '#daa520' }, // Dark Gold
  ];
}

// Called after config loads to recolour live butterflies ('' → default gold).
function setButterflyColor(hex) {
  const value = hex ? String(hex).trim() : '';
  butterflyCustomColor = /^#?[0-9a-fA-F]{3,8}$/.test(value) ? value : '';
  butterflyInstances.forEach(b => { if (b && typeof b.assignColor === 'function') b.assignColor(); });
}

// Show/hide the butterfly decoration (admin toggle; default = shown).
function setButterflyVisible(show) {
  butterflyVisible = show !== false;
  if (butterflyCanvasEl) butterflyCanvasEl.style.display = butterflyVisible ? '' : 'none';
}

function initButterflyCanvas() {
  const canvas = document.createElement('canvas');
  canvas.id = 'butterfly-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
  document.body.appendChild(canvas);
  butterflyCanvasEl = canvas;

  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const butterflies = [];
  const butterflyCount = Math.min(Math.floor(width / 200), 6);

  // Butterfly SVG paths for different wing positions
  const butterflyShapes = {
    wingsUp: {
      body: { x: 0, y: 0, w: 3, h: 12 },
      leftWing: [{ x: -2, y: -2 }, { x: -18, y: -12 }, { x: -14, y: 0 }, { x: -16, y: 6 }, { x: -2, y: 2 }],
      rightWing: [{ x: 2, y: -2 }, { x: 18, y: -12 }, { x: 14, y: 0 }, { x: 16, y: 6 }, { x: 2, y: 2 }],
      antenna: [{ x: -1.5, y: -6 }, { x: -5, y: -14 }, { x: 1.5, y: -6 }, { x: 5, y: -14 }]
    },
    wingsMid: {
      body: { x: 0, y: 0, w: 3, h: 12 },
      leftWing: [{ x: -2, y: -2 }, { x: -22, y: -4 }, { x: -16, y: 2 }, { x: -18, y: 8 }, { x: -2, y: 2 }],
      rightWing: [{ x: 2, y: -2 }, { x: 22, y: -4 }, { x: 16, y: 2 }, { x: 18, y: 8 }, { x: 2, y: 2 }],
      antenna: [{ x: -1.5, y: -6 }, { x: -5, y: -14 }, { x: 1.5, y: -6 }, { x: 5, y: -14 }]
    },
    wingsDown: {
      body: { x: 0, y: 0, w: 3, h: 12 },
      leftWing: [{ x: -2, y: -2 }, { x: -20, y: 4 }, { x: -12, y: 8 }, { x: -14, y: 12 }, { x: -2, y: 2 }],
      rightWing: [{ x: 2, y: -2 }, { x: 20, y: 4 }, { x: 12, y: 8 }, { x: 14, y: 12 }, { x: 2, y: 2 }],
      antenna: [{ x: -1.5, y: -6 }, { x: -5, y: -14 }, { x: 1.5, y: -6 }, { x: 5, y: -14 }]
    }
  };

  class Butterfly {
    constructor() {
      this.reset();
      this.y = Math.random() * height;
      this.wingPhase = Math.random() * Math.PI * 2;
      this.wingSpeed = 0.15 + Math.random() * 0.1;
      this.assignColor();
      this.size = 0.6 + Math.random() * 0.5;
      this.flapIntensity = 0.8 + Math.random() * 0.4;
    }

    assignColor() {
      const palette = butterflyPalette();
      this.colors = palette[Math.floor(Math.random() * palette.length)];
    }

    reset() {
      this.x = -30;
      this.y = Math.random() * (height * 0.8) + height * 0.1;
      this.targetY = this.y + (Math.random() - 0.5) * 100;
      this.speedX = 0.4 + Math.random() * 0.6;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.amplitude = 20 + Math.random() * 40;
      this.frequency = 0.008 + Math.random() * 0.012;
      this.phase = Math.random() * Math.PI * 2;
      this.rotation = 0;
      this.opacity = 0;
      this.fadeIn = true;
    }

    update() {
      // Horizontal movement
      this.x += this.speedX;

      // Vertical floating with sine wave
      this.phase += this.frequency;
      this.y = this.targetY + Math.sin(this.phase) * this.amplitude;

      // Gentle rotation based on vertical movement
      this.rotation = Math.sin(this.phase) * 0.15;

      // Wing flapping animation
      this.wingPhase += this.wingSpeed * this.flapIntensity;

      // Fade in when entering screen
      if (this.fadeIn) {
        this.opacity = Math.min(1, this.opacity + 0.02);
        if (this.opacity >= 1) this.fadeIn = false;
      }

      // Fade out and reset when leaving screen
      if (this.x > width + 50) {
        this.opacity -= 0.02;
        if (this.opacity <= 0) this.reset();
      }
    }

    getWingShape() {
      const phase = Math.sin(this.wingPhase);
      if (phase > 0.3) return butterflyShapes.wingsUp;
      if (phase < -0.3) return butterflyShapes.wingsDown;
      return butterflyShapes.wingsMid;
    }

    draw(ctx) {
      if (this.opacity <= 0) return;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.scale(this.size, this.size);
      ctx.globalAlpha = this.opacity;

      const shape = this.getWingShape();

      // Draw left wing
      ctx.beginPath();
      ctx.moveTo(shape.leftWing[0].x, shape.leftWing[0].y);
      for (let i = 1; i < shape.leftWing.length; i++) {
        ctx.lineTo(shape.leftWing[i].x, shape.leftWing[i].y);
      }
      ctx.closePath();
      const leftGradient = ctx.createLinearGradient(shape.leftWing[0].x, shape.leftWing[0].y, shape.leftWing[1].x, shape.leftWing[1].y);
      leftGradient.addColorStop(0, this.colors.primary);
      leftGradient.addColorStop(0.5, this.colors.secondary);
      leftGradient.addColorStop(1, this.colors.accent);
      ctx.fillStyle = leftGradient;
      ctx.fill();
      ctx.strokeStyle = this.colors.primary;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Draw right wing
      ctx.beginPath();
      ctx.moveTo(shape.rightWing[0].x, shape.rightWing[0].y);
      for (let i = 1; i < shape.rightWing.length; i++) {
        ctx.lineTo(shape.rightWing[i].x, shape.rightWing[i].y);
      }
      ctx.closePath();
      const rightGradient = ctx.createLinearGradient(shape.rightWing[0].x, shape.rightWing[0].y, shape.rightWing[1].x, shape.rightWing[1].y);
      rightGradient.addColorStop(0, this.colors.primary);
      rightGradient.addColorStop(0.5, this.colors.secondary);
      rightGradient.addColorStop(1, this.colors.accent);
      ctx.fillStyle = rightGradient;
      ctx.fill();
      ctx.strokeStyle = this.colors.primary;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Draw body
      ctx.beginPath();
      ctx.ellipse(shape.body.x, shape.body.y, shape.body.w / 2, shape.body.h / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1a0f08';
      ctx.fill();

      // Draw antennae
      ctx.strokeStyle = '#1a0f08';
      ctx.lineWidth = 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shape.antenna[0].x, shape.antenna[0].y);
      ctx.quadraticCurveTo(shape.antenna[1].x, shape.antenna[1].y, shape.antenna[1].x * 1.2, shape.antenna[1].y * 1.2);
      ctx.moveTo(shape.antenna[2].x, shape.antenna[2].y);
      ctx.quadraticCurveTo(shape.antenna[3].x, shape.antenna[3].y, shape.antenna[3].x * 1.2, shape.antenna[3].y * 1.2);
      ctx.stroke();

      // Add subtle sparkle on wings
      if (Math.random() < 0.05) {
        ctx.beginPath();
        ctx.arc(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10,
          1, 0, Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.random() * 0.5})`;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // Initialize butterflies
  for (let i = 0; i < butterflyCount; i++) {
    const b = new Butterfly();
    b.x = Math.random() * width; // Start at random positions
    b.opacity = 1;
    b.fadeIn = false;
    butterflies.push(b);
  }
  butterflyInstances = butterflies;

  function render() {
    ctx.clearRect(0, 0, width, height);

    if (butterflyVisible) {
      butterflies.forEach(b => {
        b.update();
        b.draw(ctx);
      });
    }

    requestAnimationFrame(render);
  }

  render();
}

// ==========================================================================
// Elegant Falling Flower / Blossom Animation System
// ==========================================================================
let flowerCustomColor = '';
let flowerInstances = [];
let flowerVisible = true;
let flowerCanvasEl = null;
let flowerStyle = 'blossom';

// Default soft wedding blossom palette; overridden by a single custom colour.
function flowerPalette() {
  if (flowerCustomColor) {
    const c = flowerCustomColor;
    return [
      { petal: c, inner: _bfyMix(c, '#ffffff', 0.55), core: _bfyMix(c, '#000000', 0.3) },
      { petal: _bfyMix(c, '#ffffff', 0.35), inner: _bfyMix(c, '#ffffff', 0.75), core: c }
    ];
  }
  return [
    { petal: '#f6c6d0', inner: '#fff0f4', core: '#e5b955' }, // Blush Rose
    { petal: '#f4a3b8', inner: '#ffe0e8', core: '#d4af37' }, // Rose Pink
    { petal: '#ffe1a8', inner: '#fff6de', core: '#e5b955' }, // Champagne Gold
    { petal: '#f9d5e5', inner: '#ffffff', core: '#e0a9c0' }  // Soft Peony
  ];
}

// Called after config loads to recolour live flowers ('' → default palette).
function setFlowerColor(hex) {
  const value = hex ? String(hex).trim() : '';
  flowerCustomColor = /^#?[0-9a-fA-F]{3,8}$/.test(value) ? value : '';
  flowerInstances.forEach(f => { if (f && typeof f.assignColor === 'function') f.assignColor(); });
}

// Show/hide the falling flower decoration (admin toggle; default = shown).
function setFlowerVisible(show) {
  flowerVisible = show !== false;
  if (flowerCanvasEl) flowerCanvasEl.style.display = flowerVisible ? '' : 'none';
}

// Flower shape style: 'blossom' (5 petals, default) | 'petal' (single petal).
function setFlowerStyle(style) {
  flowerStyle = (style === 'petal') ? 'petal' : 'blossom';
}

class Flower {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.assignColor();
    this.reset();
  }

  assignColor() {
    const pal = flowerPalette();
    const pick = pal[Math.floor(Math.random() * pal.length)];
    this.petalColor = pick.petal;
    this.innerColor = pick.inner;
    this.coreColor = pick.core;
  }

  reset() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.x = Math.random() * w;
    this.y = Math.random() * -h * 0.5;
    this.size = 12 + Math.random() * 18;
    this.speedY = 0.6 + Math.random() * 1.2;
    this.speedX = (Math.random() - 0.5) * 0.8;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.02;
    this.swing = Math.random() * Math.PI * 2;
    this.swingSpeed = 0.005 + Math.random() * 0.01;
    this.opacity = 0.6 + Math.random() * 0.35;
  }

  update() {
    if (!flowerVisible) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.y += this.speedY;
    this.x += this.speedX + Math.sin(this.swing) * 0.3;
    this.rotation += this.rotSpeed;
    this.swing += this.swingSpeed;
    if (this.y > h + this.size) this.reset();
    if (this.x < -this.size) this.x = w + this.size;
    if (this.x > w + this.size) this.x = -this.size;
  }

  draw() {
    if (!flowerVisible) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.opacity;

    if (flowerStyle === 'petal') {
      // Single petal shape
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-this.size * 0.45, -this.size * 0.7, this.size * 0.45, -this.size * 0.7, 0, 0);
      ctx.fillStyle = this.petalColor;
      ctx.fill();
      // Inner highlight
      ctx.globalAlpha = this.opacity * 0.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-this.size * 0.2, -this.size * 0.38, this.size * 0.2, -this.size * 0.38, 0, 0);
      ctx.fillStyle = this.innerColor;
      ctx.fill();
    } else {
      // 5-petal blossom
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-this.size * 0.38, -this.size * 0.75, this.size * 0.38, -this.size * 0.75, 0, 0);
        ctx.fillStyle = this.petalColor;
        ctx.fill();
        ctx.restore();
      }
      // Inner glow
      ctx.globalAlpha = this.opacity * 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = this.innerColor;
      ctx.fill();
      // Golden core
      ctx.globalAlpha = this.opacity;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = this.coreColor;
      ctx.fill();
    }

    ctx.restore();
  }
}

function initFlowerCanvas() {
  const canvas = document.createElement('canvas');
  canvas.id = 'flower-canvas';
  canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0;';
  document.body.appendChild(canvas);
  flowerCanvasEl = canvas;

  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Initialize flowers (some already on screen so they appear immediately)
  const flowerCount = Math.min(40, Math.max(15, Math.floor(width / 30)));
  flowerInstances = [];
  for (let i = 0; i < flowerCount; i++) {
    const f = new Flower(canvas, ctx);
    f.y = Math.random() * height;
    flowerInstances.push(f);
  }

  canvas.style.display = flowerVisible ? '' : 'none';

  function render() {
    ctx.clearRect(0, 0, width, height);

    if (flowerVisible) {
      flowerInstances.forEach(f => {
        f.update();
        f.draw();
      });
    }

    requestAnimationFrame(render);
  }

  render();
}

// --------------------------------------------------------------------------
// Public namespace (used by the standalone Animation Settings page for its
// live preview, and available to any other page that needs the animations).
// --------------------------------------------------------------------------
window.InvitationAnimations = {
  init() {
    initButterflyCanvas();
    initFlowerCanvas();
  },
  setButterflyColor,
  setButterflyVisible,
  setFlowerColor,
  setFlowerVisible,
  setFlowerStyle
};
