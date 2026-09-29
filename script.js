/* ==========================================================================
   script.js
   Bootstraps everything once the DOM is ready, and adds one small
   cross-cutting touch: a ripple on every .btn press, so the whole site
   feels responsive to touch/click even before any scene-specific
   animation kicks in.
   ========================================================================== */

window.App = window.App || {};

(function () {
  'use strict';

  function addRipple(e) {
    var btn = e.currentTarget;
    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 1.4;
    var x = (e.clientX != null ? e.clientX : rect.left + rect.width / 2) - rect.left - size / 2;
    var y = (e.clientY != null ? e.clientY : rect.top + rect.height / 2) - rect.top - size / 2;

    var ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    btn.appendChild(ripple);
    setTimeout(function () {
      if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 700);
  }

  function wireRipples() {
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('click', addRipple);
    });
  }

  function bootstrap() {
    wireRipples();
    App.Scenes.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();