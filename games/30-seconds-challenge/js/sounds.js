/* Sharp Eyes: sounds.js
   The game's own sound effects, a "detective with a magnifying glass" feel. No music: no notes, scales, chimes
   or tunes, only foley (card presses, paper flutters, swooshes, pops, sparkle grains, a rubber bonk, clock
   clicks and claps). Streaks get MORE sparkle, never a higher note. Built on Kit.sfx.define (js/kit/audio.js). */
(function () {
  'use strict';
  var K = window.Kit;
  if (!K || !K.sfx || !K.sfx.define) return;

  K.sfx.define({
    // Buttons and sheets: a soft card press (papery click on a little cushioned thud).
    tap: function (L, t) {
      L.burst(t, { dur: 0.022, freq: 2600, q: 1.6, vol: 0.14 });
      L.thump(t, { from: 210, to: 120, dur: 0.05, vol: 0.12 });
    },
    // Finger down on a picture tile: the same card press, a touch softer and lower.
    press: function (L, t) {
      L.burst(t, { dur: 0.02, freq: 2000, q: 1.4, vol: 0.1 });
      L.thump(t, { from: 180, to: 105, dur: 0.05, vol: 0.1 });
    },
    // Found it! A magnifying-glass swoosh, then a round pop and a spray of sparkle grains.
    // o.n = how many found this level: more sparkle as the streak grows (never higher in pitch).
    found: function (L, t, o) {
      var n = Math.min(7, o.n || 1);
      L.whoosh(t, { dur: 0.2, from: 700, to: 3200, vol: 0.14 });
      L.glide(t + 0.13, { from: 320, to: 900, dur: 0.07, vol: 0.24 });           // the pop of a cork-like "plop"
      L.burst(t + 0.13, { dur: 0.05, freq: 1600, sweepTo: 500, q: 1, vol: 0.12 });
      L.grains(t + 0.16, { n: 8 + n * 3, spread: 0.32, freq: 7000, vol: 0.09 + n * 0.006 });
    },
    // The gold star leaves the picture: a light airy whoosh along its arc.
    fly: function (L, t) { L.whoosh(t, { dur: 0.55, from: 900, to: 2800, vol: 0.09 }); },
    // The star settles into its HUD slot: a soft landing tick with a little glitter.
    land: function (L, t) {
      L.click(t, { freq: 3400, vol: 0.12, dur: 0.014 });
      L.thump(t, { from: 240, to: 150, dur: 0.04, vol: 0.08 });
      L.grains(t + 0.01, { n: 5, spread: 0.12, freq: 8000, vol: 0.06 });
    },
    // Each star on the level-complete sheet (o.n = 0..2): sparkle that gets fuller, plus a soft tick.
    star: function (L, t, o) {
      var k = (o.n || 0) + 1;
      L.click(t, { freq: 3000, vol: 0.1, dur: 0.016 });
      L.grains(t, { n: 6 + k * 4, spread: 0.18 + k * 0.05, freq: 7500, vol: 0.08 + k * 0.01 });
      L.whoosh(t, { dur: 0.18, from: 1500, to: 4000, vol: 0.05 });
    },
    // A new grid ripples in: a quick card-shuffle flutter (many tiny paper flicks) over a soft breath.
    shuffle: function (L, t) {
      var flicks = 9;
      for (var i = 0; i < flicks; i++) L.burst(t + i * 0.022 + L.rnd(0, 0.008), { dur: 0.014, freq: L.rnd(2600, 4200), q: 1.8, vol: 0.07 * (1 - i / (flicks * 1.4)), pan: L.rnd(-0.4, 0.4) });
      L.whoosh(t, { dur: 0.28, from: 500, to: 1600, vol: 0.05 });
    },
    whoosh: function (L, t) { L.whoosh(t, { dur: 0.28, from: 500, to: 1600, vol: 0.08 }); },
    // Wrong picture: a gentle wobbly rubber "bonk" (soft low thud, a tiny squish, nothing harsh).
    bonk: function (L, t) {
      L.thump(t, { from: 190, to: 85, dur: 0.14, vol: 0.28 });
      L.thump(t + 0.07, { from: 150, to: 80, dur: 0.1, vol: 0.12 });              // the wobble bounce
      L.burst(t, { dur: 0.06, freq: 600, type: 'lowpass', q: 0.7, vol: 0.08 });
    },
    // The timer ring's last seconds: a clock's tick (o-less: alternates tick / tock clicks).
    tick: (function () {
      var flip = false;
      return function (L, t) { flip = !flip; L.click(t, { freq: flip ? 4200 : 3400, vol: 0.07, dur: 0.01 }); L.click(t + 0.004, { freq: 1500, vol: 0.04, dur: 0.012 }); };
    })(),
    // Time ran out: a gentle swoosh as the magnifier slides over to show where the odd one is.
    reveal: function (L, t) {
      L.whoosh(t, { dur: 0.5, from: 1800, to: 500, vol: 0.12 });
      L.grains(t + 0.25, { n: 6, spread: 0.25, freq: 6000, vol: 0.05 });
    },
    // Out of hearts: a soft deflating breath and a cushioned thud (kind, not sad).
    fail: function (L, t) {
      L.burst(t, { dur: 0.6, freq: 1200, sweepTo: 250, q: 0.8, attack: 0.15, vol: 0.1 });
      L.thump(t + 0.35, { from: 140, to: 70, dur: 0.16, vol: 0.18 });
    },
    // Level complete: a confetti whoosh, a crowd of claps and two waves of sparkle.
    win: function (L, t) {
      L.whoosh(t, { dur: 0.35, from: 600, to: 3500, vol: 0.12 });
      L.claps(t + 0.1, { people: 7, dur: 1.4, vol: 0.12 });
      L.grains(t + 0.05, { n: 24, spread: 0.6, freq: 7500, vol: 0.08 });
      L.grains(t + 0.7, { n: 18, spread: 0.6, freq: 6500, vol: 0.06 });
    }
  });
})();
