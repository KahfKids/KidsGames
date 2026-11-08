/* Kahf KidsGames kit: audio.js
   Small synthesized sound effects (no audio files, works offline). Unlocks on the first touch (iOS and
   Chrome need a gesture), pauses while the app is hidden, and remembers mute across all games.
   Kit.sfx.play('bounce' | 'tick' | 'break' | 'clink' | 'power' | 'lose' | 'win' | 'star' | 'pop' | 'tap', opts)
   Kit.sfx.note(step) plays a marimba note on a pentatonic scale (use a rising step for combos). */
(function () {
  'use strict';
  var Kit = window.Kit = window.Kit || {};
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, out = null, noise = null;
  var MUTE_KEY = 'kahf-sound-muted';
  var muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}

  function get() {
    if (!AC) return null;
    if (!ctx) {
      try {
        ctx = new AC();
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14; comp.ratio.value = 6;
        out = ctx.createGain(); out.gain.value = 0.55;
        out.connect(comp); comp.connect(ctx.destination);
      } catch (e) { ctx = null; }
    }
    return ctx;
  }
  function unlock() {
    var c = get();
    if (c && c.state === 'suspended' && !document.hidden) { try { c.resume(); } catch (e) {} }
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(function (t) { addEventListener(t, unlock, { capture: true, passive: true }); });
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    try { document.hidden ? ctx.suspend() : ctx.resume(); } catch (e) {}
  });

  function ready() { var c = get(); return c && c.state === 'running' && !muted ? c : null; }

  // One enveloped oscillator. f0 -> f1 pitch glide over `glide` seconds.
  function tone(c, t, o) {
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.glide || o.dur));
    var v = (o.vol || 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(o.dest || out);
    osc.start(t); osc.stop(t + o.dur + 0.02);
  }
  function hiss(c, t, o) {
    if (!noise) {
      noise = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
      var d = noise.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noise; f.type = o.filter || 'bandpass'; f.frequency.value = o.freq || 2000; f.Q.value = o.q || 1;
    g.gain.setValueAtTime(o.vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(t); s.stop(t + o.dur + 0.02);
  }

  // Major pentatonic from C5: every step sounds pleasant, so rising combos always feel good.
  var PENTA = [0, 2, 4, 7, 9];
  function pentaFreq(step) {
    var oct = Math.floor(step / 5), n = PENTA[((step % 5) + 5) % 5] + 12 * oct;
    return 523.25 * Math.pow(2, n / 12);
  }
  function marimba(c, t, f, vol) {
    tone(c, t, { f: f, dur: 0.45, vol: vol || 0.28, type: 'sine' });
    tone(c, t, { f: f * 4, dur: 0.08, vol: (vol || 0.28) * 0.35, type: 'sine' });
    tone(c, t, { f: f * 2, dur: 0.2, vol: (vol || 0.28) * 0.25, type: 'triangle' });
  }

  var SFX = {
    tap: function (c, t) { tone(c, t, { f: 660, f1: 880, dur: 0.07, vol: 0.18, type: 'triangle' }); },
    pop: function (c, t, o) { var f = 500 + (o.pitch || 0) * 60; tone(c, t, { f: f, f1: f * 2.2, dur: 0.09, vol: 0.3, type: 'sine' }); hiss(c, t, { dur: 0.06, freq: 3000, vol: 0.12 }); },
    bounce: function (c, t, o) { var f = 300 + (o.pitch || 0) * 80; tone(c, t, { f: f, f1: f * 1.5, dur: 0.12, vol: 0.32, type: 'sine', glide: 0.05 }); },
    tick: function (c, t) { tone(c, t, { f: 1400, dur: 0.035, vol: 0.08, type: 'triangle' }); },
    break: function (c, t, o) { marimba(c, t, pentaFreq(o.step || 0), 0.26); hiss(c, t, { dur: 0.09, freq: 4200, q: 0.8, vol: 0.07 }); },
    clink: function (c, t) { tone(c, t, { f: 1760, dur: 0.18, vol: 0.12, type: 'triangle' }); tone(c, t, { f: 2637, dur: 0.12, vol: 0.06, type: 'sine' }); },
    stone: function (c, t) { tone(c, t, { f: 180, f1: 120, dur: 0.1, vol: 0.2, type: 'triangle' }); },
    power: function (c, t) { [0, 2, 4, 7].forEach(function (s, i) { marimba(c, t + i * 0.07, pentaFreq(s + 5), 0.2); }); },
    lose: function (c, t) { tone(c, t, { f: 440, f1: 160, dur: 0.6, vol: 0.25, type: 'triangle' }); },
    win: function (c, t) { [0, 2, 4, 5, 7, 10].forEach(function (s, i) { marimba(c, t + i * 0.1, pentaFreq(s), 0.24); }); },
    star: function (c, t, o) { marimba(c, t, pentaFreq(5 + (o.n || 0) * 2), 0.3); tone(c, t + 0.02, { f: pentaFreq(10 + (o.n || 0) * 2), dur: 0.5, vol: 0.08, type: 'sine' }); },
    whoosh: function (c, t) { hiss(c, t, { dur: 0.25, freq: 900, q: 0.6, vol: 0.12, filter: 'lowpass' }); }
  };

  Kit.sfx = {
    play: function (name, o) { var c = ready(); if (!c || !SFX[name]) return; try { SFX[name](c, c.currentTime, o || {}); } catch (e) {} },
    note: function (step) { this.play('break', { step: step }); },
    get muted() { return muted; },
    setMuted: function (m) { muted = !!m; try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {} },
    toggle: function () { this.setMuted(!muted); if (!muted) { unlock(); this.play('tap'); } return muted; }
  };
})();
