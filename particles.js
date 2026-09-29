/* ==========================================================================
   particles.js
   Two full-screen canvases:
     #bg-canvas — continuous ambient particles (petals, gold dust, sparkle,
                  embers, falling lines). One "preset" active at a time,
                  swapped by scenes.js via App.Particles.setAmbient(name).
     #fx-canvas — one-off bursts (confetti, gift sparkle, drink bubbles).
   No external dependencies — plain Canvas2D.
   ========================================================================== */

window.App = window.App || {};

App.Particles = (function () {
  'use strict';

  var bgCanvas, bgCtx, fxCanvas, fxCtx;
  var W = 0, H = 0, DPR = 1;
  var bgParticles = [];
  var fxParticles = [];
  var ambientType = 'none';
  var reduceMotion = false;
  var running = false;

  var PALETTES = {
    lines: ['#ff8fa3', '#ffd6e0', '#ffffff'],
    petals: ['#ffb3c6', '#ffe1ea', '#9fdca0', '#ffffff'],
    goldDust: ['#f6d78b', '#d4af37', '#fff3df'],
    sparkle: ['#ffffff', '#d7ecf5', '#c9d3dc'],
    embers: ['#ff4d6d', '#9c2f2f', '#ffb37a'],
    confetti: ['#d4af37', '#ff4d6d', '#ffffff', '#ffb3c6', '#f6d78b'],
    bubble: ['#eaffff', '#cdeffb', '#ffffff'],
    snow: ['#ffffff', '#eaf6ff', '#dbeeff']
  };

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    [bgCanvas, fxCanvas].forEach(function (c) {
      if (!c) return;
      c.width = Math.round(W * DPR);
      c.height = Math.round(H * DPR);
      c.style.width = W + 'px';
      c.style.height = H + 'px';
    });
    if (bgCtx) bgCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (fxCtx) fxCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function makeParticle(opts) {
    var base = {
      x: 0, y: 0, vx: 0, vy: 0, gravity: 0, drag: 1,
      size: 6, rotation: 0, vr: 0, color: '#fff', shape: 'rect',
      life: 0, maxLife: 300, alpha: 1, fadeOut: true, twinkle: false,
      sway: 0, swayOff: 0
    };
    for (var k in opts) { base[k] = opts[k]; }
    return base;
  }

  function spawnAmbientTick() {
    if (reduceMotion || !running) return;
    switch (ambientType) {
      case 'lines':
        if (Math.random() < 0.55) {
          bgParticles.push(makeParticle({
            x: rand(0, W), y: -30, vx: rand(-0.5, -1.4), vy: rand(3.2, 6),
            size: rand(20, 46), color: pick(PALETTES.lines), shape: 'line',
            maxLife: 260, rotation: rand(0.5, 0.9)
          }));
        }
        break;
      case 'petals':
        if (Math.random() < 0.3) {
          bgParticles.push(makeParticle({
            x: rand(0, W), y: -16, vx: rand(-0.3, 0.3), vy: rand(0.7, 1.5),
            size: rand(8, 16), color: pick(PALETTES.petals), shape: 'petal',
            rotation: rand(0, Math.PI * 2), vr: rand(-0.02, 0.02),
            maxLife: 900, sway: rand(0.6, 1.6), swayOff: rand(0, 40)
          }));
        }
        break;
      case 'goldDustSoft':
      case 'goldDustHeavy':
        var chance = ambientType === 'goldDustHeavy' ? 0.5 : 0.2;
        if (Math.random() < chance) {
          bgParticles.push(makeParticle({
            x: rand(0, W), y: H + 10, vx: rand(-0.25, 0.25), vy: rand(-0.7, -0.25),
            size: rand(2, 5), color: pick(PALETTES.goldDust), shape: 'dot',
            maxLife: 480, twinkle: true, sway: rand(0.3, 0.8), swayOff: rand(0, 40)
          }));
        }
        break;
      case 'sparkle':
        if (Math.random() < 0.32) {
          bgParticles.push(makeParticle({
            x: rand(0, W), y: rand(0, H), vx: 0, vy: 0,
            size: rand(2, 4), color: pick(PALETTES.sparkle), shape: 'dot',
            maxLife: 90, twinkle: true
          }));
        }
        break;
      case 'winterGold':
        if (Math.random() < 0.4) {
          bgParticles.push(makeParticle({
            x: rand(0, W), y: -14, vx: rand(-0.35, 0.35), vy: rand(0.8, 2.1),
            size: rand(3, 7), color: pick(PALETTES.snow), shape: 'dot',
            maxLife: 500, sway: rand(0.8, 1.8), swayOff: rand(0, 60), fadeOut: false
          }));
        }
        if (Math.random() < 0.06) {
          bgParticles.push(makeParticle({
            x: rand(0, W), y: rand(0, H * 0.6), vx: rand(-0.15, 0.15), vy: rand(-0.3, -0.1),
            size: rand(2, 4), color: pick(PALETTES.goldDust), shape: 'dot',
            maxLife: 260, twinkle: true
          }));
        }
        break;
      case 'embers':
        if (Math.random() < 0.35) {
          bgParticles.push(makeParticle({
            x: rand(0, W), y: H + 10, vx: rand(-0.3, 0.3), vy: rand(-1.5, -0.6),
            size: rand(2, 5), color: pick(PALETTES.embers), shape: 'dot',
            maxLife: 260, twinkle: true
          }));
        }
        break;
      default:
        break;
    }
  }

  function updateList(list) {
    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i];
      p.vy += p.gravity;
      p.vx *= p.drag;
      var swayX = p.sway ? Math.sin((p.life + p.swayOff) * 0.05) * p.sway * 0.4 : 0;
      p.x += p.vx + swayX;
      p.y += p.vy;
      p.rotation += p.vr;
      p.life++;
      if (p.life > p.maxLife || p.y > H + 60 || p.y < -100 || p.x < -100 || p.x > W + 100) {
        list.splice(i, 1);
      }
    }
  }

  function drawHeart(ctx, size) {
    var s = size / 20;
    ctx.beginPath();
    ctx.moveTo(0, 4 * s);
    ctx.bezierCurveTo(-10 * s, -6 * s, -4 * s, -12 * s, 0, -4 * s);
    ctx.bezierCurveTo(4 * s, -12 * s, 10 * s, -6 * s, 0, 4 * s);
    ctx.closePath();
    ctx.fill();
  }

  function drawParticle(ctx, p) {
    var lifeRatio = p.maxLife > 0 ? p.life / p.maxLife : 1;
    var alpha = p.alpha;
    if (p.fadeOut) alpha *= Math.max(0, 1 - lifeRatio);
    if (p.twinkle) alpha *= (Math.sin(p.life * 0.12) * 0.5 + 0.5) * 0.9 + 0.1;
    alpha = Math.max(0, Math.min(1, alpha));
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    switch (p.shape) {
      case 'rect':
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        break;
      case 'dot':
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'line':
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, p.size);
        ctx.stroke();
        break;
      case 'petal':
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size / 2, p.size / 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'heart':
        drawHeart(ctx, p.size);
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -p.size / 2);
        ctx.lineTo(p.size / 2, p.size / 2);
        ctx.lineTo(-p.size / 2, p.size / 2);
        ctx.closePath();
        ctx.fill();
        break;
      default:
        break;
    }
    ctx.restore();
  }

  function loop() {
    if (!running) return;
    bgCtx.clearRect(0, 0, W, H);
    fxCtx.clearRect(0, 0, W, H);
    spawnAmbientTick();
    updateList(bgParticles);
    updateList(fxParticles);
    for (var i = 0; i < bgParticles.length; i++) drawParticle(bgCtx, bgParticles[i]);
    for (var j = 0; j < fxParticles.length; j++) drawParticle(fxCtx, fxParticles[j]);
    requestAnimationFrame(loop);
  }

  function setAmbient(type) {
    ambientType = type;
  }

  function confettiBurst(opts) {
    opts = opts || {};
    var count = reduceMotion ? Math.round((opts.count || 320) * 0.25) : (opts.count || 320);
    var fill = opts.fullScreen !== false;
    var palette = PALETTES[opts.palette] || PALETTES.confetti;
    var shapes = opts.shapes || ['rect', 'rect', 'dot', 'triangle'];
    for (var i = 0; i < count; i++) {
      var startY = fill ? rand(-40, H * 0.7) : rand(-60, -10);
      fxParticles.push(makeParticle({
        x: rand(0, W), y: startY,
        vx: rand(-2.4, 2.4), vy: rand(-2, 2.5),
        gravity: rand(0.05, 0.12), drag: 0.995,
        size: rand(6, 15), rotation: rand(0, Math.PI * 2), vr: rand(-0.2, 0.2),
        color: pick(palette),
        shape: pick(shapes),
        maxLife: rand(160, 260)
      }));
    }
    if (opts.hearts !== false) {
      var heartCount = Math.round(count * 0.06);
      for (var j = 0; j < heartCount; j++) {
        fxParticles.push(makeParticle({
          x: rand(0, W), y: rand(-40, H * 0.6),
          vx: rand(-1, 1), vy: rand(0.5, 1.8), gravity: 0.03, drag: 0.99,
          size: rand(10, 16), rotation: rand(-0.3, 0.3), vr: rand(-0.05, 0.05),
          color: pick(['#ff4d6d', '#ffb3c6']), shape: 'heart', maxLife: rand(180, 260)
        }));
      }
    }
  }

  function burstAt(x, y, opts) {
    opts = opts || {};
    var count = reduceMotion ? 6 : (opts.count || 26);
    var palette = PALETTES[opts.palette] || PALETTES.goldDust;
    for (var i = 0; i < count; i++) {
      fxParticles.push(makeParticle({
        x: x, y: y, vx: rand(-3, 3), vy: rand(-4, 1),
        gravity: 0.1, drag: 0.97, size: rand(3, 8),
        rotation: rand(0, Math.PI * 2), vr: rand(-0.2, 0.2),
        color: pick(palette), shape: pick(['dot', 'rect']), maxLife: rand(50, 90)
      }));
    }
  }

  function bubblesAt(x, y, count) {
    var n = reduceMotion ? 4 : (count || 20);
    for (var i = 0; i < n; i++) {
      fxParticles.push(makeParticle({
        x: x + rand(-14, 14), y: y, vx: rand(-0.4, 0.4), vy: rand(-2.4, -1),
        gravity: -0.01, drag: 0.99, size: rand(3, 8),
        color: pick(PALETTES.bubble), shape: 'dot', maxLife: rand(60, 110), alpha: 0.85
      }));
    }
  }

  function init() {
    bgCanvas = document.getElementById('bg-canvas');
    fxCanvas = document.getElementById('fx-canvas');
    if (!bgCanvas || !fxCanvas) return;
    bgCtx = bgCanvas.getContext('2d');
    fxCtx = fxCanvas.getContext('2d');
    reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    resize();
    window.addEventListener('resize', resize);
    running = true;
    requestAnimationFrame(loop);
  }

  return {
    init: init,
    setAmbient: setAmbient,
    confettiBurst: confettiBurst,
    burstAt: burstAt,
    bubblesAt: bubblesAt
  };
})();