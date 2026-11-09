/* Colouring Book: sounds.js
   Art-studio foley, no music: wet paint splats, bristle swishes, a rubbery eraser, paint-pot tocks and sloshes,
   paper flicks and page whooshes, claps and a spoken "Masha Allah!". Built on Kit.sfx.define (js/kit/audio.js).
   The brush swish is a continuous sound (one loop at a time, faded in and out), exposed as CBSound.brush. */
(function () {
  'use strict';
  var K = window.Kit, rnd = K.sfx.lib.rnd;

  // A few small bubbles popping as wet paint settles. o.n bubbles over o.spread seconds.
  function bubbles(L, t, n, spread, vol) {
    for (var i = 0; i < n; i++) {
      var tt = t + Math.random() * spread, f = rnd(380, 720);
      L.glide(tt, { from: f, to: f * rnd(1.8, 2.6), dur: rnd(0.035, 0.06), vol: (vol || 0.07) * rnd(0.5, 1) });
    }
  }
  // Paper: a short crisp rustle.
  function rustle(L, t, dur, vol) {
    L.burst(t, { dur: dur, freq: 3800, q: 0.7, type: 'bandpass', attack: dur * 0.3, vol: vol });
    L.grains(t, { n: 6, spread: dur * 0.8, freq: 5200, q: 2, vol: vol * 0.6 });
  }

  var DEFS = {
    // Buttons: a soft cardboard tick.
    tap: function (L, t) {
      L.burst(t, { dur: 0.022, freq: 2400, q: 2, vol: 0.2 });
      L.thump(t, { from: 320, to: 180, dur: 0.04, vol: 0.08 });
    },
    // A tool is picked up from the table: a light wooden clack.
    tool: function (L, t) { L.knock(t, { size: 0.8, vol: 0.7 }); L.burst(t + 0.012, { dur: 0.03, freq: 5000, q: 1, vol: 0.04 }); },
    // Brush size: the brush tip dabs the paper (bigger size = fuller dab).
    size: function (L, t, o) {
      var s = 1 + (o.size || 0) * 0.4;
      L.burst(t, { dur: 0.07 * s, freq: 1400 / s, sweepTo: 500 / s, q: 0.9, vol: 0.16, brown: true, rate: 1.5 });
      L.burst(t, { dur: 0.04, freq: 4200, q: 0.8, vol: 0.05 });
    },
    // Picking a paint pot: a ceramic tock and a little slosh of paint inside.
    pot: function (L, t) {
      L.burst(t, { dur: 0.02, freq: 2600, q: 5, vol: 0.18 });
      L.thump(t, { from: 520, to: 300, dur: 0.06, vol: 0.16 });
      L.burst(t + 0.03, { dur: 0.22, freq: 700, sweepTo: 1300, q: 2.2, attack: 0.07, vol: 0.09, brown: true, rate: 2 });
      bubbles(L, t + 0.07, 2, 0.12, 0.05);
    },
    // Fill: a juicy wet splat that spreads (o.big 0..1 = how big the shape is).
    splat: function (L, t, o) {
      var b = Math.max(0, Math.min(1, o.big || 0.3));
      L.thump(t, { from: 210, to: 70, dur: 0.11, vol: 0.26 });
      L.burst(t, { dur: 0.16 + b * 0.12, freq: 2600, sweepTo: 420, q: 0.8, vol: 0.2 });
      L.burst(t + 0.01, { dur: 0.24 + b * 0.3, freq: 900, sweepTo: 2400, q: 1.6, attack: 0.05, vol: 0.07 + b * 0.04, brown: true, rate: 2.2 });
      bubbles(L, t + 0.06, 3 + Math.round(b * 4), 0.18 + b * 0.25, 0.07);
    },
    // Tapping a shape that already has that colour: a dull little pat on wet paint.
    same: function (L, t) { L.burst(t, { dur: 0.05, freq: 900, sweepTo: 500, q: 1, vol: 0.1, brown: true, rate: 1.6 }); },
    // Eraser tap: a rubbery squeak-rub that wipes the shape clean.
    erase: function (L, t) {
      L.glide(t, { from: 520, to: 760, dur: 0.07, vol: 0.05, type: 'triangle' });
      L.burst(t, { dur: 0.16, freq: 1300, sweepTo: 2000, q: 3, attack: 0.03, vol: 0.13 });
      L.burst(t + 0.09, { dur: 0.12, freq: 1900, sweepTo: 1200, q: 3, attack: 0.03, vol: 0.1 });
    },
    // Undo and redo: a quick paper flick (redo flicks the other way).
    undo: function (L, t) { L.burst(t, { dur: 0.12, freq: 5200, sweepTo: 1600, q: 0.8, attack: 0.01, vol: 0.13 }); L.click(t + 0.1, { freq: 2200, vol: 0.08 }); },
    redo: function (L, t) { L.burst(t, { dur: 0.12, freq: 1600, sweepTo: 5200, q: 0.8, attack: 0.03, vol: 0.13 }); L.click(t + 0.1, { freq: 2600, vol: 0.08 }); },
    // Clear: the whole page swept away.
    clear: function (L, t) { L.whoosh(t, { dur: 0.45, from: 400, to: 3600, vol: 0.2 }); rustle(L, t + 0.08, 0.3, 0.08); },
    // Turning to another page.
    page: function (L, t) { L.whoosh(t, { dur: 0.3, from: 2600, to: 700, vol: 0.14 }); rustle(L, t, 0.18, 0.06); L.thump(t + 0.26, { from: 140, to: 80, dur: 0.06, vol: 0.06 }); },
    whoosh: function (L, t) { L.whoosh(t, { dur: 0.28, from: 600, to: 2400, vol: 0.14 }); },
    // Zooming back out: a soft breath of air.
    zoom: function (L, t) { L.whoosh(t, { dur: 0.25, from: 1800, to: 500, vol: 0.1, brown: true }); },
    // Saving: the picture slides into a folder and lands with a soft pat.
    save: function (L, t) {
      L.burst(t, { dur: 0.42, freq: 3200, sweepTo: 900, q: 0.7, attack: 0.12, vol: 0.16 });
      rustle(L, t + 0.05, 0.25, 0.05);
      L.thump(t + 0.4, { from: 180, to: 90, dur: 0.08, vol: 0.14 });
      L.burst(t + 0.4, { dur: 0.05, freq: 1500, q: 1, vol: 0.06 });
      L.grains(t + 0.44, { n: 8, spread: 0.25, freq: 8000, vol: 0.06 });
    },
    // Nothing to save yet: a gentle paper pat.
    nope: function (L, t) { L.burst(t, { dur: 0.06, freq: 700, q: 1, vol: 0.12, brown: true }); },
    // Removing a saved picture: paper crumpled up.
    crumple: function (L, t) { L.grains(t, { n: 22, spread: 0.3, freq: 2600, q: 1.5, vol: 0.12, dur: 0.02 }); L.burst(t, { dur: 0.3, freq: 1800, q: 0.6, attack: 0.05, vol: 0.06 }); },
    // Stars: a twinkle of glitter (o.n makes it fuller).
    star: function (L, t, o) {
      var n = o.n || 0;
      L.grains(t, { n: 10 + n * 4, spread: 0.25 + n * 0.05, freq: 7600, q: 5, vol: 0.09 });
      L.burst(t, { dur: 0.12, freq: 6000, sweepTo: 9000, q: 1.2, vol: 0.05 });
    },
    // Page finished: a glitter sweep across the page and a small crowd clapping.
    win: function (L, t) {
      L.burst(t, { dur: 0.8, freq: 2400, sweepTo: 9000, q: 0.9, attack: 0.3, vol: 0.1 });
      for (var i = 0; i < 26; i++) L.burst(t + i * 0.03 + Math.random() * 0.02, { dur: 0.014, freq: 4000 + i * 180 + rnd(-300, 300), q: 5, vol: 0.07 * rnd(0.5, 1), pan: -0.7 + i * 0.055 });
      L.claps(t + 0.35, { people: 7, dur: 1.5, vol: 0.13 });
    }
  };
  K.sfx.define(DEFS);

  // ---------- continuous brush / eraser sound ----------
  // One looping noise voice; its loudness follows the finger speed and fades out when the finger lifts.
  var voice = null;
  function canPlay() { var L = K.sfx.lib, c = L.ctx; return c && c.state === 'running' && !K.sfx.muted; }
  function startVoice(kind) {
    stopVoice(true);
    if (!canPlay()) return;
    var L = K.sfx.lib, c = L.ctx;
    try {
      var len = c.sampleRate, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0), last = 0;
      for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = kind === 'rub' ? (last + 0.08 * w) / 1.08 : w; d[i] = kind === 'rub' ? last * 3 : w; }
      var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = buf; s.loop = true;
      f.type = 'bandpass';
      f.frequency.value = kind === 'rub' ? 900 : 2800; f.Q.value = kind === 'rub' ? 2.5 : 0.6;
      g.gain.value = 0.0001;
      s.connect(f); f.connect(g); g.connect(L.out);
      s.start();
      voice = { s: s, f: f, g: g, kind: kind, c: c };
    } catch (e) { voice = null; }
  }
  function stopVoice(now) {
    if (!voice) return;
    var v = voice; voice = null;
    try {
      var t = v.c.currentTime;
      v.g.gain.cancelScheduledValues(t);
      v.g.gain.setTargetAtTime(0.0001, t, now ? 0.01 : 0.05);
      v.s.stop(t + (now ? 0.06 : 0.3));
    } catch (e) {}
  }
  window.CBSound = {
    defs: DEFS,
    // kind: 'brush' (bristle swish) or 'rub' (eraser)
    brushStart: function (kind) { startVoice(kind); },
    // speed: page units moved since the last point; size: brush size index 0..2
    brushMove: function (speed, size) {
      if (!voice) return;
      var t = voice.c.currentTime, k = Math.min(1, speed / 40), base = voice.kind === 'rub' ? 0.12 : 0.07 + (size || 0) * 0.02;
      voice.g.gain.setTargetAtTime(0.0001 + base * k, t, 0.03);
      voice.f.frequency.setTargetAtTime((voice.kind === 'rub' ? 700 : 2000) + k * (voice.kind === 'rub' ? 700 : 2600), t, 0.05);
    },
    brushStop: function () { stopVoice(false); },
    // Spoken praise with the device voice (only when sound is on).
    // Praise is spoken in Arabic with an Arabic voice (Kit.say); silent if the device has none.
    praise: function () { K.say.praise('mashaallah'); }
  };
  document.addEventListener('visibilitychange', function () { if (document.hidden) { stopVoice(true); try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} } });
})();
