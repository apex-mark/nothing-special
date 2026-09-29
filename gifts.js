/* ==========================================================================
   gifts.js
   Three gift boxes sharing one message panel. Any order, reopening shows
   the same content without re-counting, and the "Next" button only shows
   once all three have been opened at least once.
   ========================================================================== */

window.App = window.App || {};

App.Gifts = (function () {
  'use strict';

  var CONTENT = {
    left: {
      title: 'To My Best Friend',
      photo: false,
      body:
        '<p>There was a time you were the person I told everything to \u2014 the late-night conversations, the inside jokes no one else would\u2019ve understood, the small moments that mattered more than they probably should have. I still think about a lot of it, and honestly, I miss it.</p>' +
        '<p>I know we\u2019re not those same friends anymore, and I\u2019m not writing this to pretend otherwise, or to ask for anything back. Things changed, and I\u2019ve come to accept that. But I don\u2019t want what we had to just disappear like it never mattered \u2014 because it did. You did.</p>' +
        '<p>Whatever we are to each other now, I still respect you, and I\u2019m genuinely grateful I got to have you as a friend for the time that I did. Happy Birthday, Elma.</p>'
    },
    center: {
      title: 'Happy Birthday, Elma \uD83C\uDF82',
      photo: true,
      body:
        '<p>Wishing you happiness that lasts well beyond today, good health, real peace of mind, and every success you\u2019re working toward.</p>' +
        '<p>May the year ahead be as beautiful as you deserve.</p>'
    },
    right: {
      title: 'I\u2019m Sorry',
      photo: false,
      body:
        '<p>I need to say this clearly: I was wrong. The things I said to you that day \u2014 about who you are, about your character \u2014 were cruel, unfair, and untrue. I said them in anger, but anger doesn\u2019t excuse it, and I\u2019m not offering it as one.</p>' +
        '<p>You didn\u2019t deserve to hear any of that, not from me or from anyone. I\u2019ve thought about it since, and I\u2019m genuinely ashamed of how I spoke to you.</p>' +
        '<p>I\u2019m sorry \u2014 fully, and without expecting anything in return. If you\u2019re ever able to forgive me, I\u2019d be grateful for that. And if you\u2019re not, I understand that too.</p>'
    }
  };

  var opened = {};
  var openedCount = 0;
  var boxes = [];
  var panelEl, photoWrapEl, titleEl, bodyEl, closeBtn, nextBtn;

  function openGift(key) {
    var data = CONTENT[key];
    if (!data) return;
    var box = null;
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].getAttribute('data-gift') === key) { box = boxes[i]; break; }
    }
    if (!box) return;

    if (!box.classList.contains('open')) {
      box.classList.add('shaking');
      if (App.Music) App.Music.playSfx('click');
      setTimeout(function () {
        box.classList.remove('shaking');
        box.classList.add('open');
        if (App.Music) App.Music.playSfx('chime');
        if (App.Particles) {
          var rect = box.getBoundingClientRect();
          App.Particles.burstAt(rect.left + rect.width / 2, rect.top + rect.height * 0.25, { palette: 'goldDust', count: 20 });
        }
      }, 520);
      setTimeout(function () {
        showPanel(key, data);
        if (!opened[key]) {
          opened[key] = true;
          openedCount++;
          checkAllOpened();
        }
      }, 1050);
    } else {
      showPanel(key, data);
    }
  }

  function showPanel(key, data) {
    if (!panelEl) return;
    titleEl.textContent = data.title;
    bodyEl.innerHTML = data.body;
    photoWrapEl.style.display = data.photo ? 'block' : 'none';
    panelEl.classList.add('show');
    panelEl.setAttribute('aria-hidden', 'false');
  }

  function closePanel() {
    if (!panelEl) return;
    panelEl.classList.remove('show');
    panelEl.setAttribute('aria-hidden', 'true');
  }

  function checkAllOpened() {
    if (openedCount >= 3 && nextBtn) {
      nextBtn.classList.add('show');
    }
  }

  function allOpened() {
    return openedCount >= 3;
  }

  function reset() {
    opened = {};
    openedCount = 0;
    boxes.forEach(function (b) { b.classList.remove('open', 'shaking'); });
    if (nextBtn) nextBtn.classList.remove('show');
    closePanel();
  }

  function init() {
    boxes = Array.prototype.slice.call(document.querySelectorAll('.gift-box'));
    panelEl = document.getElementById('message-panel');
    photoWrapEl = document.getElementById('message-panel-photo');
    titleEl = document.getElementById('message-panel-title');
    bodyEl = document.getElementById('message-panel-body');
    closeBtn = document.getElementById('message-close-btn');
    nextBtn = document.getElementById('gifts-next-btn');

    boxes.forEach(function (box) {
      var key = box.getAttribute('data-gift');
      box.addEventListener('click', function () { openGift(key); });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGift(key); }
      });
    });
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    if (panelEl) {
      panelEl.addEventListener('click', function (e) {
        if (e.target === panelEl) closePanel();
      });
    }
  }

  return {
    init: init,
    openGift: openGift,
    closePanel: closePanel,
    reset: reset,
    allOpened: allOpened
  };
})();