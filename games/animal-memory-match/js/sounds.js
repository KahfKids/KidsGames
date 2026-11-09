/* Memory Match: sounds.js
   This game's own sounds, a "paper cards and animals" set. No music: no notes, scales, chimes or tunes.
   Only foley (card flips and slaps, paper rustles, sparkle grains, claps) and short natural animal cues
   (a bee's buzz, wing flutters, hoof clops, a splash, a cricket rasp, a soft moo). A bigger moment gets MORE
   grains and claps, never a higher note. Built on Kit.sfx.define (js/kit/audio.js). */
(function () {
  'use strict';
  var K = window.Kit;
  if (!K || !K.sfx || !K.sfx.define) return;

  // A voiced animal call: one oscillator through a vowel-like band filter, with an optional wobble (vibrato
  // or wing-beat tremolo). o: type, f0, f1, dur, vol, band, q, lp, wob (Hz), wobDepth (Hz), trem (Hz)
  function call(L, t, o) {
    var c = L.ctx, osc = c.createOscillator(), bp = c.createBiquadFilter(), lp = c.createBiquadFilter(), g = c.createGain(), dur = o.dur;
    osc.type = o.type || 'sawtooth';
    osc.frequency.setValueAtTime(o.f0, t); osc.frequency.linearRampToValueAtTime(o.f1 || o.f0, t + dur);
    bp.type = 'bandpass'; bp.frequency.value = o.band || 800; bp.Q.value = o.q || 1.5;
    lp.type = 'lowpass'; lp.frequency.value = o.lp || 2400;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol, t + (o.attack || 0.04));
    g.gain.setValueAtTime(o.vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var nodes = [];
    if (o.wob) { var w = c.createOscillator(), wg = c.createGain(); w.frequency.value = o.wob; wg.gain.value = o.wobDepth || 10; w.connect(wg); wg.connect(osc.frequency); w.start(t); w.stop(t + dur + 0.05); }
    var out = g;
    if (o.trem) {
      var tg = c.createGain(), tr = c.createOscillator(), td = c.createGain();
      tg.gain.value = 0.55; tr.frequency.value = o.trem; td.gain.value = 0.45; tr.connect(td); td.connect(tg.gain);
      g.connect(tg); out = tg; tr.start(t); tr.stop(t + dur + 0.05);
    }
    osc.connect(bp); bp.connect(lp); lp.connect(g); out.connect(L.out);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function rustle(L, t, n, vol) { // paper rustle: soft mid-frequency grains
    for (var i = 0; i < n; i++) L.burst(t + Math.random() * 0.16, { dur: L.rnd(0.02, 0.05), freq: L.rnd(1400, 3200), q: 0.9, vol: (vol || 0.06) * L.rnd(0.5, 1), pan: L.rnd(-0.5, 0.5) });
  }
  function clops(L, t, times, size, vol) {
    times.forEach(function (d) { L.knock(t + d + L.rnd(0, 0.012), { size: size * L.rnd(0.95, 1.05), vol: vol }); L.burst(t + d + 0.005, { dur: 0.05, freq: 900, q: 0.7, vol: 0.04, brown: true }); });
  }

  var CUES = {
    buzz: function (L, t) { call(L, t, { type: 'sawtooth', f0: 210, f1: 236, dur: 0.75, vol: 0.07, band: 900, q: 1.2, lp: 2600, wob: 5, wobDepth: 14, trem: 28, attack: 0.08 }); },
    flutter: function (L, t) { for (var i = 0; i < 11; i++) L.burst(t + i * 0.034 + L.rnd(0, 0.006), { dur: 0.026, freq: L.rnd(1100, 1700), q: 0.8, vol: 0.11 * (1 - i / 14), pan: L.rnd(-0.3, 0.3) }); },
    splash: function (L, t) {
      L.burst(t, { dur: 0.55, freq: 700, sweepTo: 2600, q: 0.6, attack: 0.03, vol: 0.13, brown: true });
      L.burst(t + 0.05, { dur: 0.35, freq: 3000, q: 0.7, vol: 0.06 });
      for (var i = 0; i < 4; i++) L.drop(t + 0.18 + Math.random() * 0.35, { size: L.rnd(0.7, 1.3), vol: 0.12 });
    },
    bubble: function (L, t) { for (var i = 0; i < 4; i++) L.drop(t + i * 0.09 + Math.random() * 0.04, { size: L.rnd(0.6, 1.1), vol: 0.14 }); },
    plop: function (L, t) {
      [0, 0.2].forEach(function (d) { for (var i = 0; i < 5; i++) L.burst(t + d + i * 0.021, { dur: 0.017, freq: 620, q: 4, vol: 0.13 }); });
      L.drop(t + 0.42, { size: 1.4, vol: 0.14 });
    },
    clop: function (L, t) { clops(L, t, [0, 0.16, 0.34, 0.5], 0.75, 0.75); },
    gallop: function (L, t) { clops(L, t, [0, 0.08, 0.17, 0.42, 0.5, 0.59], 0.7, 0.7); },
    stomp: function (L, t) {
      [0, 0.32].forEach(function (d) { L.thump(t + d, { from: 95, to: 38, dur: 0.28, vol: 0.32 }); L.burst(t + d, { dur: 0.22, freq: 260, type: 'lowpass', q: 0.7, vol: 0.12, brown: true }); });
      L.whoosh(t + 0.55, { dur: 0.35, from: 300, to: 900, vol: 0.06, brown: true });
    },
    scurry: function (L, t) { L.grains(t, { n: 18, spread: 0.45, freq: 5200, q: 3, vol: 0.07, dur: 0.006 }); },
    silk: function (L, t) { L.glide(t, { from: 1700, to: 3600, dur: 0.14, vol: 0.045 }); L.grains(t + 0.14, { n: 6, spread: 0.2, freq: 6500, vol: 0.05 }); },
    moo: function (L, t) { call(L, t, { type: 'sawtooth', f0: 135, f1: 112, dur: 0.75, vol: 0.13, band: 520, q: 1.6, lp: 900, attack: 0.12 }); },
    caw: function (L, t) { [0, 0.26].forEach(function (d) { call(L, t + d, { type: 'sawtooth', f0: 560, f1: 470, dur: 0.17, vol: 0.06, band: 1300, q: 2.5, lp: 3000, attack: 0.01 }); L.burst(t + d, { dur: 0.15, freq: 1300, q: 2, vol: 0.05 }); }); },
    wool: function (L, t) {
      L.burst(t, { dur: 0.3, freq: 1200, type: 'lowpass', q: 0.7, attack: 0.06, vol: 0.08, brown: true });
      call(L, t + 0.12, { type: 'sawtooth', f0: 330, f1: 300, dur: 0.48, vol: 0.06, band: 950, q: 2, lp: 2200, wob: 8, wobDepth: 18, attack: 0.05 });
    },
    wind: function (L, t) { L.burst(t, { dur: 0.95, freq: 420, sweepTo: 820, q: 7, attack: 0.3, vol: 0.12 }); L.burst(t + 0.1, { dur: 0.8, freq: 300, type: 'lowpass', q: 0.7, attack: 0.3, vol: 0.05, brown: true }); },
    chirp: function (L, t) { for (var g = 0; g < 3; g++) for (var i = 0; i < 6; i++) L.burst(t + g * 0.16 + i * 0.013, { dur: 0.008, freq: 6200, q: 5, vol: 0.08 }); }
  };

  var SFX = {
    // Buttons and sheets: a crisp paper tick on a soft card-stock thud.
    tap: function (L, t) { L.burst(t, { dur: 0.02, freq: 3000, q: 2, vol: 0.12 }); L.thump(t, { from: 220, to: 130, dur: 0.045, vol: 0.09 }); },
    // A finger lands on a card (the anticipation squash).
    press: function (L, t) { L.burst(t, { dur: 0.016, freq: 2000, q: 1.6, vol: 0.07 }); L.thump(t, { from: 180, to: 110, dur: 0.04, vol: 0.07 }); },
    // A card turns over: an airy paper swish that ends in a flick.
    flip: function (L, t) { L.burst(t, { dur: 0.12, freq: 1100, sweepTo: 4200, q: 0.9, attack: 0.04, vol: 0.13 }); L.click(t + 0.1, { freq: 3800, vol: 0.06, dur: 0.012 }); },
    // ... and lands face up: a soft paper slap on the table.
    slap: function (L, t) { L.thump(t, { from: 170, to: 85, dur: 0.07, vol: 0.2 }); L.burst(t, { dur: 0.035, freq: 1500, q: 1.1, vol: 0.12 }); },
    // Not a pair: a gentle deflating puff and a rubbery bump (kind, never harsh).
    puff: function (L, t) { L.burst(t, { dur: 0.36, freq: 950, sweepTo: 320, q: 0.7, attack: 0.07, vol: 0.09 }); L.thump(t + 0.04, { from: 150, to: 90, dur: 0.1, vol: 0.1 }); },
    // Two cards turn back face down.
    flipback: function (L, t) { [0, 0.05].forEach(function (d) { L.burst(t + d, { dur: 0.1, freq: 3800, sweepTo: 1200, q: 0.9, attack: 0.02, vol: 0.07 }); }); L.thump(t + 0.16, { from: 160, to: 90, dur: 0.05, vol: 0.08 }); },
    // A pair! Paper rustle, a round pop and sparkle grains (o.n = pairs found so far: more sparkle, same pitch).
    match: function (L, t, o) {
      var n = Math.min(8, o.n || 1);
      rustle(L, t, 6, 0.06);
      L.glide(t + 0.02, { from: 300, to: 820, dur: 0.06, vol: 0.15 });
      L.grains(t + 0.06, { n: 10 + n * 2, spread: 0.4, freq: 7500, vol: 0.075 + n * 0.004 });
    },
    // Cards are dealt: a quick card-shuffle flutter.
    deal: function (L, t) { for (var i = 0; i < 10; i++) L.burst(t + i * 0.03 + L.rnd(0, 0.01), { dur: 0.014, freq: L.rnd(2600, 4200), q: 1.8, vol: 0.06 * (1 - i / 14), pan: L.rnd(-0.4, 0.4) }); L.whoosh(t, { dur: 0.3, from: 500, to: 1600, vol: 0.05 }); },
    // All cards peek at once: a ripple of soft swishes.
    peek: function (L, t) { for (var i = 0; i < 6; i++) L.burst(t + i * 0.045, { dur: 0.09, freq: 1300, sweepTo: 3800, q: 0.9, attack: 0.03, vol: 0.06 }); },
    whoosh: function (L, t) { L.whoosh(t, { dur: 0.3, from: 500, to: 1800, vol: 0.08 }); },
    // Album pages
    page: function (L, t) { L.burst(t, { dur: 0.22, freq: 900, sweepTo: 3000, q: 0.8, attack: 0.06, vol: 0.09 }); rustle(L, t + 0.05, 4, 0.04); },
    // Each star on the level-complete sheet (o.n = 0..2): a paper tick and fuller sparkle.
    star: function (L, t, o) { var k = (o.n || 0) + 1; L.click(t, { freq: 3200, vol: 0.1, dur: 0.014 }); L.grains(t, { n: 6 + k * 4, spread: 0.16 + k * 0.05, freq: 7600, vol: 0.08 + k * 0.01 }); },
    // Level complete: a confetti whoosh, paper rustle, a crowd of claps and two waves of sparkle.
    win: function (L, t) {
      L.whoosh(t, { dur: 0.4, from: 600, to: 3500, vol: 0.12 });
      rustle(L, t + 0.1, 12, 0.06);
      L.claps(t + 0.15, { people: 8, dur: 1.5, vol: 0.12 });
      L.grains(t + 0.05, { n: 26, spread: 0.6, freq: 7500, vol: 0.08 });
      L.grains(t + 0.75, { n: 18, spread: 0.6, freq: 6500, vol: 0.06 });
    }
  };
  for (var k in CUES) SFX['cue_' + k] = CUES[k];
  K.sfx.define(SFX);
  window.MM_CUES = Object.keys(CUES);
  if (/[?&]debug\b/.test(location.search)) window.MM_SFX = SFX; // test hook: lets a test call every sound directly
})();
