/* ==========================================================================
   music.js
   The brief asked for "soft Happy-Birthday-style + guitar cinematic" music
   with working play/pause, and warned against blindly keeping a random
   track. Rather than ship a licensed mp3 (which would need a real audio
   file this project doesn't have), this synthesizes a warm, looping
   fingerpicked chord progression entirely with the Web Audio API, plus a
   handful of short sound effects. Zero external assets, works offline.
   ========================================================================== */

window.App = window.App || {};

App.Music = (function () {
  'use strict';

  var ctx = null;
  var master, musicGain, sfxGain, delayNode, feedbackNode, wetGain;
  var playing = false;
  var started = false;
  var schedulerTimer = null;
  var nextNoteTime = 0;
  var stepIndex = 0;
  var toggleBtn = null;

  var TEMPO = 88;
  var STEP = 60 / TEMPO / 2; /* eighth notes */
  var TARGET_VOL = 0.16;

  var NOTE_INDEX = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function noteToFreq(note) {
    var m = /^([A-G]#?)(\d)$/.exec(note);
    if (!m) return 440;
    var semitone = NOTE_INDEX[m[1]] + (parseInt(m[2], 10) - 4) * 12;
    return 440 * Math.pow(2, semitone / 12);
  }

  /* Cmaj7 - Gmaj - Am7 - Fmaj7, a warm fingerpicked progression. Eight
     eighth-note steps per chord. */
  var PATTERN = []
    .concat(['C4', 'E4', 'G4', 'B4', 'G4', 'E4', 'C5', 'G4'])
    .concat(['G3', 'B3', 'D4', 'G4', 'D4', 'B3', 'G4', 'D4'])
    .concat(['A3', 'C4', 'E4', 'G4', 'E4', 'C4', 'A4', 'E4'])
    .concat(['F3', 'A3', 'C4', 'E4', 'C4', 'A3', 'F4', 'C4']);

  function buildGraph() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.0001;
    musicGain.connect(master);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(master);

    delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.value = 0.34;
    feedbackNode = ctx.createGain();
    feedbackNode.gain.value = 0.22;
    wetGain = ctx.createGain();
    wetGain.gain.value = 0.25;

    delayNode.connect(feedbackNode);
    feedbackNode.connect(delayNode);
    delayNode.connect(wetGain);
    wetGain.connect(musicGain);

    return true;
  }

  function pluckNote(freq, time, dur, vol) {
    var osc = ctx.createOscillator();
    var osc2 = ctx.createOscillator();
    var gain = ctx.createGain();
    var filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, time);
    filter.Q.value = 0.4;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(vol, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(musicGain);
    gain.connect(delayNode);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + dur + 0.05);
    osc2.stop(time + dur + 0.05);
  }

  function scheduler() {
    if (!ctx) return;
    while (nextNoteTime < ctx.currentTime + 0.2) {
      var note = PATTERN[stepIndex % PATTERN.length];
      var isDownbeat = (stepIndex % 8) === 0;
      pluckNote(noteToFreq(note), nextNoteTime, 1.1, isDownbeat ? 0.24 : 0.16);
      nextNoteTime += STEP;
      stepIndex++;
    }
  }

  function updateToggleUI() {
    if (!toggleBtn) return;
    toggleBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    toggleBtn.setAttribute('aria-label', playing ? 'Pause background music' : 'Play background music');
  }

  function fadeMusicTo(vol, seconds) {
    if (!ctx) return;
    var now = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(Math.max(musicGain.gain.value, 0.0001), now);
    musicGain.gain.linearRampToValueAtTime(Math.max(vol, 0.0001), now + seconds);
  }

  function start() {
    if (!ctx) { if (!buildGraph()) return; }
    ctx.resume();
    started = true;
    playing = true;
    stepIndex = 0;
    nextNoteTime = ctx.currentTime + 0.15;
    clearInterval(schedulerTimer);
    schedulerTimer = setInterval(scheduler, 45);
    fadeMusicTo(TARGET_VOL, 1.2);
    updateToggleUI();
  }

  function pause() {
    playing = false;
    fadeMusicTo(0.0001, 0.5);
    clearInterval(schedulerTimer);
    updateToggleUI();
  }

  function resume() {
    if (!ctx) { start(); return; }
    ctx.resume();
    playing = true;
    nextNoteTime = ctx.currentTime + 0.1;
    clearInterval(schedulerTimer);
    schedulerTimer = setInterval(scheduler, 45);
    fadeMusicTo(TARGET_VOL, 0.7);
    updateToggleUI();
  }

  function toggle() {
    if (!started) { start(); return; }
    if (playing) pause(); else resume();
  }

  /* ---------------------------------------------------------------------
     Short sound effects — always audible (independent of music pause),
     so interactions still feel responsive even with music muted.
     --------------------------------------------------------------------- */
  function ensureCtx() {
    if (!ctx) buildGraph();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function sfxTone(freq, time, dur, type, vol) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(vol || 0.3, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  function noiseBuffer(duration) {
    var len = Math.max(1, Math.floor(ctx.sampleRate * duration));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function sfxWhoosh() {
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.45);
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(220, t + 0.4);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    src.start(t);
  }

  function sfxPartyPop() {
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.5);
    var filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.exponentialRampToValueAtTime(3200, t + 0.07);
    filter.frequency.exponentialRampToValueAtTime(1000, t + 0.5);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    src.start(t);
  }

  function sfxImpact() {
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.32);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.55, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.45);

    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.2);
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1300, t);
    var ngain = ctx.createGain();
    ngain.gain.setValueAtTime(0.0001, t);
    ngain.gain.linearRampToValueAtTime(0.38, t + 0.008);
    ngain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(filter);
    filter.connect(ngain);
    ngain.connect(sfxGain);
    src.start(t);
  }

  function sfxArp(freqs, spacing, type, vol) {
    var t = ctx.currentTime;
    freqs.forEach(function (f, i) {
      sfxTone(f, t + i * spacing, 0.5, type, vol);
    });
  }

  function playSfx(name) {
    ensureCtx();
    if (!ctx) return;
    switch (name) {
      case 'click':
        sfxTone(600, ctx.currentTime, 0.12, 'sine', 0.18);
        break;
      case 'tick-3':
        sfxTone(noteToFreq('C4'), ctx.currentTime, 0.28, 'triangle', 0.26);
        break;
      case 'tick-2':
        sfxTone(noteToFreq('E4'), ctx.currentTime, 0.28, 'triangle', 0.26);
        break;
      case 'tick-1':
        sfxTone(noteToFreq('G4'), ctx.currentTime, 0.34, 'triangle', 0.28);
        break;
      case 'chime':
        sfxArp([noteToFreq('C5'), noteToFreq('E5'), noteToFreq('G5')], 0.09, 'triangle', 0.22);
        break;
      case 'celebrate':
        sfxArp([noteToFreq('C4'), noteToFreq('E4'), noteToFreq('G4'), noteToFreq('C5'), noteToFreq('E5')], 0.055, 'triangle', 0.24);
        break;
      case 'magic':
        sfxArp([noteToFreq('A4'), noteToFreq('C5'), noteToFreq('E5'), noteToFreq('A5')], 0.07, 'sine', 0.2);
        break;
      case 'whoosh':
        sfxWhoosh();
        break;
      case 'partypop':
        sfxPartyPop();
        break;
      case 'impact':
        sfxImpact();
        break;
      default:
        break;
    }
  }

  function init(btnEl) {
    toggleBtn = btnEl || document.getElementById('music-toggle');
    updateToggleUI();
  }

  return {
    init: init,
    start: start,
    toggle: toggle,
    playSfx: playSfx,
    isPlaying: function () { return playing; }
  };
})();