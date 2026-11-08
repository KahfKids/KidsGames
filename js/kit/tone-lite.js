/* Kahf KidsGames: tone-lite.js
   A tiny local stand-in for the parts of Tone.js our games use (Synth, MembraneSynth, NoiseSynth,
   toDestination, triggerAttackRelease, Tone.start, Tone.now). Plain WebAudio, no CDN, works offline.
   - The AudioContext is created lazily and resumed on the first touch/click (iOS and Chrome need a gesture).
   - Audio is suspended while the app/tab is hidden and resumed when it comes back.
   Load with: <script src="/KidsGames/js/kit/tone-lite.js"></script> (before the game script). */
(function () {
  'use strict';
  if (window.Tone && !window.Tone.__lite) return; // the real Tone.js is already on the page

  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, noiseBuf = null;

  function getCtx() {
    if (!AC) return null;
    if (!ctx) {
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.6;
        master.connect(ctx.destination);
      } catch (e) { ctx = null; }
    }
    return ctx;
  }
  function resume() {
    var c = getCtx();
    if (c && c.state === 'suspended' && !document.hidden) { try { return c.resume(); } catch (e) {} }
    return Promise.resolve();
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(function (t) {
    addEventListener(t, resume, { capture: true, passive: true });
  });
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    try { document.hidden ? ctx.suspend() : ctx.resume(); } catch (e) {}
  });

  // ---- notes and times ----
  var SEMI = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  function freq(note) {
    if (typeof note === 'number') return note;
    var m = /^([a-gA-G])(#|b)?(-?\d+)$/.exec(String(note).trim());
    if (!m) { var n = parseFloat(note); return isFinite(n) ? n : 440; }
    var s = SEMI[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    var midi = (parseInt(m[3], 10) + 1) * 12 + s;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  function secs(t) {
    if (typeof t === 'number') return t;
    var s = String(t).trim(), m;
    if ((m = /^(\d+)n(\.)?$/.exec(s))) return (2 / parseInt(m[1], 10)) * (m[2] ? 1.5 : 1); // 120 bpm: 4n = 0.5s
    if ((m = /^(\d+)t$/.exec(s))) return (2 / parseInt(m[1], 10)) * (2 / 3);
    if ((m = /^(\d*\.?\d+)s?$/.exec(s))) return parseFloat(m[1]);
    return 0.25;
  }
  function whenRunning(self, fn, args) {
    var c = getCtx(); if (!c) return false;
    if (c.state === 'running') return true;
    if (!document.hidden) resume().then(function () { if (c.state === 'running') fn.apply(self, args); });
    return false;
  }
  function dbToGain(db) { return Math.pow(10, (db || 0) / 20); }
  function env(o) {
    o = o || {};
    return { a: o.attack != null ? o.attack : 0.005, d: o.decay != null ? o.decay : 0.1,
             s: o.sustain != null ? o.sustain : 0.3, r: o.release != null ? o.release : 0.3 };
  }
  // Shape a gain node with an ADSR envelope starting at t, released after dur.
  function applyEnv(g, e, peak, t, dur) {
    var p = g.gain, sus = Math.max(0.0001, peak * e.s), off = t + Math.max(dur, e.a);
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + e.a);
    p.setTargetAtTime(sus, t + e.a, Math.max(0.001, e.d / 3));
    p.setTargetAtTime(0.0001, off, Math.max(0.001, e.r / 3));
    return off + e.r + 0.05; // when everything is silent
  }

  function Voice(opts) {
    opts = opts || {};
    this.e = env(opts.envelope);
    this.vol = dbToGain(opts.volume) * 0.35; // keep headroom when several sounds overlap
  }
  Voice.prototype.toDestination = function () { return this; };
  Voice.prototype.connect = function () { return this; };
  Voice.prototype.dispose = function () {};

  function Synth(opts) {
    Voice.call(this, opts);
    this.type = (opts && opts.oscillator && opts.oscillator.type) || 'triangle';
  }
  Synth.prototype = Object.create(Voice.prototype);
  Synth.prototype.triggerAttackRelease = function (note, dur, time) {
    if (!whenRunning(this, Synth.prototype.triggerAttackRelease, [note, dur])) return this;
    var c = ctx;
    var t = time != null ? Math.max(time, c.currentTime) : c.currentTime;
    var o = c.createOscillator(), g = c.createGain();
    o.type = /^(sine|square|sawtooth|triangle)$/.test(this.type) ? this.type : 'triangle';
    o.frequency.setValueAtTime(freq(note), t);
    o.connect(g); g.connect(master);
    var end = applyEnv(g, this.e, this.vol, t, secs(dur));
    o.start(t); o.stop(end);
    return this;
  };

  // A drum-like tone: the pitch starts `octaves` above the note and falls to it over `pitchDecay`.
  function MembraneSynth(opts) {
    Synth.call(this, opts);
    this.type = 'sine';
    this.pd = (opts && opts.pitchDecay != null) ? opts.pitchDecay : 0.05;
    this.oct = (opts && opts.octaves != null) ? opts.octaves : 4;
  }
  MembraneSynth.prototype = Object.create(Synth.prototype);
  MembraneSynth.prototype.triggerAttackRelease = function (note, dur, time) {
    if (!whenRunning(this, MembraneSynth.prototype.triggerAttackRelease, [note, dur])) return this;
    var c = ctx;
    var t = time != null ? Math.max(time, c.currentTime) : c.currentTime;
    var f = freq(note), o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * Math.pow(2, this.oct), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f), t + Math.max(0.005, this.pd));
    o.connect(g); g.connect(master);
    var end = applyEnv(g, this.e, this.vol * 1.4, t, secs(dur));
    o.start(t); o.stop(end);
    return this;
  };

  function NoiseSynth(opts) { Voice.call(this, opts); }
  NoiseSynth.prototype = Object.create(Voice.prototype);
  NoiseSynth.prototype.triggerAttackRelease = function (dur, time) {
    if (!whenRunning(this, NoiseSynth.prototype.triggerAttackRelease, [dur])) return this;
    var c = ctx;
    var t = time != null ? Math.max(time, c.currentTime) : c.currentTime;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var src = c.createBufferSource(), g = c.createGain();
    src.buffer = noiseBuf; src.connect(g); g.connect(master);
    var end = applyEnv(g, this.e, this.vol, t, secs(dur));
    src.start(t); src.stop(end);
    return this;
  };

  window.Tone = {
    __lite: true,
    start: resume,
    now: function () { var c = getCtx(); return c ? c.currentTime : 0; },
    getContext: getCtx,
    Synth: Synth,
    MembraneSynth: MembraneSynth,
    NoiseSynth: NoiseSynth,
    Frequency: function (n) { return { toFrequency: function () { return freq(n); } }; }
  };
})();
