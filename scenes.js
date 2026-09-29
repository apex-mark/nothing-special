/* ==========================================================================
   scenes.js
   "When and why" — owns the story flow, timing, and all button wiring.
   Delegates actual animation work to App.Animations / App.Particles /
   App.Music / App.Gifts.
   ========================================================================== */

window.App = window.App || {};

App.Scenes = (function () {
  'use strict';

  var noCount = 0;
  var noSequenceDone = false;

  var NO_REACTIONS = [
    'Are you sure? \uD83D\uDC40',
    'Really, really sure?? \uD83D\uDE33',
    'Last chance... \uD83D\uDE24'
  ];

  function el(id) { return document.getElementById(id); }
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  /* ---------------------------------------------------------------------
     Scene switching
     --------------------------------------------------------------------- */
  function goTo(name) {
    var all = document.querySelectorAll('.scene');
    all.forEach(function (s) { s.classList.remove('active'); });

    document.body.classList.add('scene-transitioning');
    setTimeout(function () { document.body.classList.remove('scene-transitioning'); }, 600);

    var target = el('scene-' + name);
    if (target) target.classList.add('active');
    onEnter(name);
  }

  function onEnter(name) {
    switch (name) {
      case 'opening':
        App.Particles.setAmbient('goldDustSoft');
        break;
      case '1':
        App.Particles.setAmbient('lines');
        playScene1();
        break;
      case '2':
        App.Particles.setAmbient('petals');
        playScene2();
        break;
      case 'yesno':
        App.Particles.setAmbient('goldDustSoft');
        App.Animations.spawnBalloons(el('balloon-layer-yesno'), 8, { hearts: true, maxSize: 60 });
        updateNoButtonState();
        resetNoReaction();
        break;
      case 'gifts':
        App.Particles.setAmbient('winterGold');
        App.Animations.spawnBalloons(el('balloon-layer-gifts'), 14, { hearts: true, maxSize: 80 });
        break;
      case '6':
        App.Particles.setAmbient('embers');
        playScene6();
        break;
      case '4':
        App.Particles.setAmbient('sparkle');
        playScene4();
        break;
      case '5':
        App.Particles.setAmbient('goldDustHeavy');
        playScene5();
        break;
      case 'final':
        App.Particles.setAmbient('goldDustHeavy');
        playFinal();
        break;
      default:
        break;
    }
  }

  /* ---------------------------------------------------------------------
     Scene 1 — 3 . 2 . 1 birthday reveal
     --------------------------------------------------------------------- */
  function popNumber(numEl, text) {
    return new Promise(function (resolve) {
      numEl.classList.remove('pop');
      numEl.textContent = text;
      void numEl.offsetWidth;
      numEl.classList.add('pop');
      if (App.Music) App.Music.playSfx('tick-' + text);
      setTimeout(resolve, 820);
    });
  }

  async function playScene1() {
    var countdownWrap = el('countdown-wrap');
    var countdownNum = el('countdown-number');
    var hero = el('hero-reveal');
    var cake = el('cake-stage');
    var continueBtn = el('scene1-continue-btn');
    var candleCaption = el('candle-caption');
    var flame = el('candle-flame');

    countdownWrap.style.display = 'flex';
    hero.classList.remove('show');
    App.Animations.resetCake(cake);
    continueBtn.classList.remove('show');
    App.Animations.relightCandle(flame, candleCaption, 'Make a wish, Elma \uD83D\uDD6F\uFE0F');

    await popNumber(countdownNum, '3');
    await popNumber(countdownNum, '2');
    await popNumber(countdownNum, '1');
    countdownWrap.style.display = 'none';

    hero.classList.add('show');
    if (App.Music) App.Music.playSfx('celebrate');
    if (App.Particles) App.Particles.confettiBurst({ count: 130, fullScreen: false });

    await wait(500);
    await App.Animations.revealCake(cake);
    continueBtn.classList.add('show');
  }

  /* ---------------------------------------------------------------------
     Scene 2 — spring / fun
     --------------------------------------------------------------------- */
  function playScene2() {
    var sceneEl = el('scene-2');
    var container = sceneEl.querySelector('.scene2-inner');
    var continueBtn = el('scene2-continue-btn');
    App.Animations.spawnBirds(el('birds-layer-2'), 4, { color: '#ff8a4c', belly: '#fff3df', minSize: 30, maxSize: 50 });
    App.Animations.hideLines(container);
    continueBtn.classList.remove('show');
    App.Animations.revealLines(container, { gap: 650 }).then(function () {
      continueBtn.classList.add('show');
    });
  }

  /* ---------------------------------------------------------------------
     Scene 3a — YES / NO
     --------------------------------------------------------------------- */
  function resetNoReaction() {
    var r = el('no-reaction-text');
    r.textContent = '';
    r.classList.remove('show');
  }

  function updateNoButtonState() {
    var noBtn = el('no-btn');
    var nudge = el('yesno-nudge');
    if (noSequenceDone) {
      noBtn.classList.add('spent');
      nudge.classList.add('show');
    } else {
      noBtn.classList.remove('spent');
      nudge.classList.remove('show');
    }
  }

  function handleYes() {
    if (App.Music) { App.Music.playSfx('celebrate'); App.Music.playSfx('partypop'); }
    if (App.Particles) App.Particles.confettiBurst({ count: 380, fullScreen: true });
    setTimeout(function () { goTo('gifts'); }, 900);
  }

  function handleNo() {
    if (noSequenceDone) return;
    noCount++;
    var reactionEl = el('no-reaction-text');

    if (noCount < 4) {
      var intensity = noCount === 1 ? 'light' : 'medium';
      App.Animations.shakeScreen({ intensity: intensity, vibrate: noCount === 1 ? [35] : [40, 30, 40] });
      if (App.Music) App.Music.playSfx('click');
      reactionEl.textContent = NO_REACTIONS[noCount - 1];
      reactionEl.classList.remove('show');
      void reactionEl.offsetWidth;
      reactionEl.classList.add('show');
    } else {
      App.Animations.shakeScreen({ intensity: 'strong', flash: true, vibrate: [90, 60, 90, 60, 220] });
      if (App.Particles) {
        App.Particles.confettiBurst({ count: 260, fullScreen: true, palette: 'embers', shapes: ['rect', 'triangle', 'dot'], hearts: false });
        App.Particles.burstAt(window.innerWidth / 2, window.innerHeight / 2, { palette: 'embers', count: 40 });
      }
      if (App.Music) { App.Music.playSfx('impact'); App.Music.playSfx('whoosh'); }
      setTimeout(function () { goTo('6'); }, 750);
    }
  }

  function handleGoBack() {
    noSequenceDone = true;
    goTo('yesno');
  }

  /* ---------------------------------------------------------------------
     Scene 6 — the NO reaction (optional, dependent branch)
     --------------------------------------------------------------------- */
  function playScene6() {
    var sceneEl = el('scene-6');
    var container = sceneEl.querySelector('.scene-inner');
    var goBackBtn = el('goback-btn');
    goBackBtn.classList.remove('show');
    App.Animations.hideLines(container);
    App.Animations.revealLines(container, { gap: 450 }).then(function () {
      goBackBtn.classList.add('show');
    });
  }

  /* ---------------------------------------------------------------------
     Scene 4 — next excitement (curtain reveal)
     --------------------------------------------------------------------- */
  async function playScene4() {
    var sceneEl = el('scene-4');
    var container = sceneEl.querySelector('.scene-inner');
    var continueBtn = el('scene4-continue-btn');
    sceneEl.classList.remove('curtains-open');
    App.Animations.hideLines(container);
    continueBtn.classList.remove('show');
    App.Animations.spawnBirds(el('birds-layer-4'), 1, { color: '#e8edf1', belly: '#ffffff', minSize: 42, maxSize: 56 });

    await wait(350);
    if (App.Music) App.Music.playSfx('whoosh');
    await App.Animations.openCurtain(sceneEl);
    await App.Animations.revealLines(container, { gap: 500 });
    continueBtn.classList.add('show');
  }

  /* ---------------------------------------------------------------------
     Scene 5 — one last special thing (curtain reveal -> final gift)
     --------------------------------------------------------------------- */
  async function playScene5() {
    var sceneEl = el('scene-5');
    var continueBtn = el('scene5-continue-btn');
    var caption = el('scene5-caption');

    sceneEl.classList.remove('curtains-open');
    continueBtn.classList.remove('show');
    caption.classList.remove('show');

    await wait(500);
    if (App.Music) App.Music.playSfx('whoosh');
    await App.Animations.openCurtain(sceneEl);

    if (App.Music) App.Music.playSfx('magic');
    if (App.Particles) {
      var frame = sceneEl.querySelector('.final-gift-frame');
      if (frame) {
        var rect = frame.getBoundingClientRect();
        App.Particles.burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, { palette: 'goldDust', count: 30 });
      }
    }

    await wait(400);
    caption.classList.add('show');
    setTimeout(function () { continueBtn.classList.add('show'); }, 700);
  }

  /* ---------------------------------------------------------------------
     Final ending
     --------------------------------------------------------------------- */
  function playFinal() {
    var card = el('scene-final').querySelector('.final-card');
    var lines = card.querySelectorAll('.final-line');
    var replayBtn = el('replay-btn');

    replayBtn.classList.remove('show');
    card.classList.remove('show');
    lines.forEach(function (line, i) {
      line.style.transitionDelay = (i * 0.2) + 's';
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { card.classList.add('show'); });
    });

    var revealSpan = lines.length * 200 + 900;
    setTimeout(function () { replayBtn.classList.add('show'); }, Math.max(revealSpan, 5500));
  }

  /* ---------------------------------------------------------------------
     Replay
     --------------------------------------------------------------------- */
  function resetAll() {
    noCount = 0;
    noSequenceDone = false;
    App.Gifts.reset();
    updateNoButtonState();
    resetNoReaction();
    goTo('1');
  }

  /* ---------------------------------------------------------------------
     Wiring + init
     --------------------------------------------------------------------- */
  function init() {
    App.Particles.init();
    App.Gifts.init();
    App.Music.init(el('music-toggle'));

    el('begin-btn').addEventListener('click', function () {
      if (App.Music) App.Music.start();
      goTo('1');
    });

    el('candle-flame').addEventListener('click', function () {
      App.Animations.blowCandle(el('candle-flame'), el('candle-caption'));
    });
    el('candle-flame').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        App.Animations.blowCandle(el('candle-flame'), el('candle-caption'));
      }
    });

    el('scene1-continue-btn').addEventListener('click', function () { goTo('2'); });
    el('scene2-continue-btn').addEventListener('click', function () { goTo('yesno'); });

    el('yes-btn').addEventListener('click', handleYes);
    el('no-btn').addEventListener('click', handleNo);
    el('goback-btn').addEventListener('click', handleGoBack);

    el('gifts-next-btn').addEventListener('click', function () { goTo('4'); });
    el('scene4-continue-btn').addEventListener('click', function () { goTo('5'); });

    el('scene5-continue-btn').addEventListener('click', function () { goTo('final'); });

    el('replay-btn').addEventListener('click', resetAll);

    el('music-toggle').addEventListener('click', function () {
      if (App.Music) App.Music.toggle();
    });

    goTo('opening');
  }

  return { init: init, goTo: goTo };
})();