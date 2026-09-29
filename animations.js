/* ==========================================================================
   animations.js
   "How to animate a thing." Generic, reusable DOM animation helpers used by
   scenes.js. This file does not decide WHEN things happen — that's scenes.js.
   ========================================================================== */

window.App = window.App || {};

App.Animations = (function () {
  'use strict';

  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var idCounter = 0;
  function uid() { idCounter++; return 'grad' + idCounter; }
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  /* ---------------------------------------------------------------------
     Balloons — round or heart-shaped, floated with CSS (balloonFloat).
     --------------------------------------------------------------------- */
  var BALLOON_COLORS = ['#d4af37', '#ff4d6d', '#f6d78b', '#ff8fa3', '#9c7a1e'];

  function createBalloon(opts) {
    opts = opts || {};
    var isHeart = !!opts.heart;
    var color = opts.color || pick(BALLOON_COLORS);
    var size = opts.size || rand(46, 78);
    var wrap = document.createElement('div');
    wrap.className = 'balloon-wrap';
    wrap.style.left = (opts.left != null ? opts.left : rand(4, 92)) + '%';
    wrap.style.animationDuration = (opts.duration || rand(11, 19)) + 's';
    wrap.style.animationDelay = '-' + (opts.delay || rand(0, 10)) + 's';
    wrap.style.width = size + 'px';

    if (isHeart) {
      var gid = uid();
      wrap.innerHTML =
        '<svg class="balloon-shape balloon-heart" viewBox="0 0 32 29" width="' + size + '" height="' + Math.round(size * 0.9) + '">' +
        '<defs><radialGradient id="' + gid + '" cx="35%" cy="30%" r="75%">' +
        '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"></stop>' +
        '<stop offset="40%" stop-color="' + color + '"></stop>' +
        '<stop offset="100%" stop-color="#7a1030"></stop></radialGradient></defs>' +
        '<path d="M16 29 C16 29 0 17 0 8 C0 2 5 0 9 0 C13 0 16 3 16 6 C16 3 19 0 23 0 C27 0 32 2 32 8 C32 17 16 29 16 29 Z" fill="url(#' + gid + ')"></path>' +
        '</svg><span class="balloon-string"></span>';
    } else {
      var h = Math.round(size * 1.2);
      wrap.innerHTML =
        '<div class="balloon-shape balloon-round" style="--balloon-color:' + color + '; width:' + size + 'px; height:' + h + 'px;"></div>' +
        '<span class="balloon-string"></span>';
    }
    return wrap;
  }

  function spawnBalloons(container, count, opts) {
    if (!container || container.dataset.spawned === '1') return;
    container.dataset.spawned = '1';
    opts = opts || {};
    var n = reduceMotion ? Math.min(count, 4) : count;
    for (var i = 0; i < n; i++) {
      var heart = !!opts.hearts && Math.random() < 0.35;
      var b = createBalloon({
        heart: heart,
        left: (i / n) * 94 + rand(-3, 3) + 3,
        duration: rand(11, 20),
        delay: rand(0, 18),
        size: rand(42, opts.maxSize || 76)
      });
      container.appendChild(b);
    }
  }

  /* ---------------------------------------------------------------------
     Birds — simple flapping SVG, flown across the screen on a loop.
     --------------------------------------------------------------------- */
  function createBird(opts) {
    opts = opts || {};
    var color = opts.color || '#ff8a4c';
    var belly = opts.belly || '#fff3df';
    var size = opts.size || rand(30, 52);
    var reverse = !!opts.reverse;
    var el = document.createElement('div');
    el.className = 'bird-unit' + (opts.slow ? ' slow' : '') + (reverse ? ' reverse' : '');
    el.style.top = (opts.top != null ? opts.top : rand(8, 55)) + '%';
    el.style.left = '0';
    el.style.width = size + 'px';
    el.style.animationDuration = (opts.duration || rand(9, 16)) + 's';
    el.style.animationDelay = '-' + (opts.delay || rand(0, 8)) + 's';
    el.innerHTML =
      '<svg viewBox="0 0 60 40" width="' + size + '" height="' + Math.round(size * 0.66) + '" aria-hidden="true">' +
      '<path class="wing" d="M28,20 C16,10 4,14 2,22 C12,22 22,24 28,26 Z" fill="' + color + '"></path>' +
      '<ellipse cx="34" cy="22" rx="18" ry="11" fill="' + color + '"></ellipse>' +
      '<circle cx="48" cy="15" r="9" fill="' + color + '"></circle>' +
      '<ellipse cx="30" cy="25" rx="9" ry="6" fill="' + belly + '"></ellipse>' +
      '<path d="M56,14 L60,16 L56,18 Z" fill="#f6d78b"></path>' +
      '<circle cx="50" cy="13" r="1.6" fill="#1a0509"></circle>' +
      '<path d="M16,22 C10,26 8,32 2,32" stroke="' + color + '" stroke-width="4" fill="none" stroke-linecap="round"></path>' +
      '</svg>';
    return el;
  }

  function spawnBirds(container, count, opts) {
    if (!container || container.dataset.spawned === '1') return;
    container.dataset.spawned = '1';
    opts = opts || {};
    var n = reduceMotion ? Math.min(count, 1) : count;
    for (var i = 0; i < n; i++) {
      var b = createBird({
        color: opts.color,
        belly: opts.belly,
        size: rand(opts.minSize || 30, opts.maxSize || 52),
        top: rand(6, 50),
        duration: rand(9, 17),
        delay: rand(0, 14),
        slow: Math.random() < 0.4,
        reverse: Math.random() < 0.4
      });
      container.appendChild(b);
    }
  }

  /* ---------------------------------------------------------------------
     Staggered line reveal — adds .show to each .reveal-line in a
     container, one after another. Returns a Promise.
     --------------------------------------------------------------------- */
  function revealLines(container, opts) {
    opts = opts || {};
    var gap = opts.gap != null ? opts.gap : 550;
    var lines = container.querySelectorAll('.reveal-line');
    return new Promise(function (resolve) {
      if (!lines.length) { resolve(); return; }
      lines.forEach(function (line, i) {
        setTimeout(function () { line.classList.add('show'); }, i * gap);
      });
      setTimeout(resolve, (lines.length - 1) * gap + 850);
    });
  }

  function hideLines(container) {
    var lines = container.querySelectorAll('.reveal-line');
    lines.forEach(function (l) { l.classList.remove('show'); });
  }

  /* ---------------------------------------------------------------------
     Cake reveal + candle
     --------------------------------------------------------------------- */
  function revealCake(stageEl) {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        stageEl.classList.add('show');
        setTimeout(resolve, 1000);
      });
    });
  }
  function resetCake(stageEl) {
    stageEl.classList.remove('show');
  }

  function relightCandle(flameGroup, captionEl, idleText) {
    flameGroup.classList.remove('blown');
    if (captionEl) {
      captionEl.textContent = idleText;
      captionEl.classList.remove('show');
    }
  }

  function blowCandle(flameGroup, captionEl) {
    if (!flameGroup || flameGroup.classList.contains('blown')) return;
    flameGroup.classList.add('blown');
    if (App.Music) App.Music.playSfx('whoosh');
    if (App.Particles) {
      var rect = flameGroup.getBoundingClientRect();
      App.Particles.burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, { palette: 'goldDust', count: 22 });
    }
    if (captionEl) {
      setTimeout(function () {
        captionEl.textContent = 'Wish made. ✨';
        captionEl.classList.add('show');
      }, 350);
    }
  }

  /* ---------------------------------------------------------------------
     Screen shake / flash / vibration (the big 4th-NO moment)
     --------------------------------------------------------------------- */
  var flashEl = null;
  function ensureFlash() {
    if (flashEl) return flashEl;
    flashEl = document.createElement('div');
    flashEl.className = 'flash-overlay';
    document.body.appendChild(flashEl);
    return flashEl;
  }

  function shakeScreen(opts) {
    opts = opts || {};
    var intensity = opts.intensity || 'medium';
    var cls = 'shake-' + intensity;
    if (!reduceMotion) {
      document.body.classList.remove('shake-light', 'shake-medium', 'shake-strong');
      void document.body.offsetWidth; /* restart animation even if same class was just used */
      document.body.classList.add(cls);
      setTimeout(function () { document.body.classList.remove(cls); }, 700);
    }
    if (opts.flash) {
      var f = ensureFlash();
      f.classList.remove('flashing');
      void f.offsetWidth; /* restart animation */
      f.classList.add('flashing');
    }
    if (opts.vibrate && navigator.vibrate) {
      try { navigator.vibrate(opts.vibrate); } catch (e) { /* unsupported, ignore */ }
    }
  }

  /* ---------------------------------------------------------------------
     Curtain (scene 4)
     --------------------------------------------------------------------- */
  function openCurtain(sceneEl) {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        sceneEl.classList.add('curtains-open');
        setTimeout(resolve, 1300);
      });
    });
  }
  function closeCurtain(sceneEl) {
    sceneEl.classList.remove('curtains-open');
  }

  return {
    spawnBalloons: spawnBalloons,
    spawnBirds: spawnBirds,
    revealLines: revealLines,
    hideLines: hideLines,
    revealCake: revealCake,
    resetCake: resetCake,
    relightCandle: relightCandle,
    blowCandle: blowCandle,
    shakeScreen: shakeScreen,
    openCurtain: openCurtain,
    closeCurtain: closeCurtain
  };
})();