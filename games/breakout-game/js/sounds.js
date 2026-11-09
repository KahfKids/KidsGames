/* Mosaic Breaker: sounds.js
   This game's own sounds (no music): glazed ceramic tiles cracking and shattering, the star ball landing on a
   woven carpet, stone pillars, lantern flames, desert-night celebration claps. Built on Kit.sfx.lib. */
(function () {
  'use strict';
  var rnd = function (a, b) { return a + Math.random() * (b - a); };

  Kit.sfx.define({
    // UI button: a small glazed-tile tick
    tap: function (L, t) {
      L.burst(t, { dur: 0.025, freq: 3600, q: 3, vol: 0.18 });
      L.thump(t, { from: 420, to: 260, dur: 0.035, vol: 0.08 });
    },
    // Launch: the carpet flaps and the star whooshes off
    whoosh: function (L, t) {
      L.burst(t, { dur: 0.12, freq: 600, sweepTo: 300, q: 0.7, vol: 0.14, brown: true });
      L.whoosh(t + 0.04, { dur: 0.32, from: 700, to: 3200, vol: 0.16 });
    },
    // Ball on a pillar or the ceiling: a soft stone tap
    tick: function (L, t) {
      L.burst(t, { dur: 0.03, freq: rnd(1400, 1700), q: 2.2, vol: 0.16 });
      L.thump(t, { from: 300, to: 180, dur: 0.04, vol: 0.1 });
    },
    // Ball on the woven carpet: a cushioned cloth "thwump". o.pitch = where it hit (-1 left .. 1 right) pans it.
    bounce: function (L, t, o) {
      var pan = Math.max(-0.6, Math.min(0.6, (o.pitch || 0) * 0.6));
      L.burst(t, { dur: 0.09, freq: 900, sweepTo: 250, q: 0.8, vol: 0.22, brown: true, pan: pan });
      L.thump(t, { from: 150, to: 70, dur: 0.11, vol: 0.32 });
      L.burst(t + 0.01, { dur: 0.05, freq: 2600, q: 1, vol: 0.04, pan: pan });
    },
    // Unbreakable carved stone: a heavy clunk
    stone: function (L, t) {
      L.burst(t, { dur: 0.06, freq: 700, q: 1.5, vol: 0.22, brown: true });
      L.thump(t, { from: 120, to: 55, dur: 0.14, vol: 0.38 });
    },
    // A strong or gold tile cracks without breaking: a glaze crack with a few chips
    clink: function (L, t) {
      L.burst(t, { dur: 0.04, freq: 4200, q: 2, vol: 0.2 });
      L.grains(t + 0.01, { n: 4, spread: 0.05, freq: 5200, vol: 0.1, q: 3 });
      L.thump(t, { from: 380, to: 240, dur: 0.04, vol: 0.08 });
    },
    // A tile shatters. o.step = combo count: more shards and a fuller crash as the combo grows (never a pitch step).
    combo: function (L, t, o) {
      var k = Math.min(o.step || 0, 14) / 14;
      L.burst(t, { dur: 0.05 + 0.04 * k, freq: 3200, sweepTo: 1600, q: 1.2, vol: 0.2 + 0.08 * k });
      L.thump(t, { from: 340, to: 160, dur: 0.06, vol: 0.14 + 0.08 * k });
      L.grains(t + 0.015, { n: 5 + Math.round(10 * k), spread: 0.08 + 0.12 * k, freq: 5600, vol: 0.12, q: 2.5 });
      if (k > 0.5) L.grains(t + 0.05, { n: 6, spread: 0.18, freq: 8000, vol: 0.06, q: 5 });
    },
    // A lantern power-up is caught: a warm flame flare-up with crackle
    power: function (L, t) {
      L.whoosh(t, { dur: 0.45, from: 300, to: 1600, vol: 0.2, brown: true });
      L.grains(t + 0.08, { n: 14, spread: 0.4, freq: 2600, vol: 0.12, q: 1.5, dur: 0.012 });
      L.grains(t + 0.25, { n: 10, spread: 0.3, freq: 7500, vol: 0.07, q: 5 });
    },
    // A heart is lost: a soft deflating puff (gentle, never harsh)
    lose: function (L, t) {
      L.burst(t, { dur: 0.55, freq: 1400, sweepTo: 180, q: 0.7, vol: 0.2, attack: 0.04, brown: true });
      L.thump(t + 0.12, { from: 110, to: 55, dur: 0.25, vol: 0.2 });
    },
    // Level cleared: a crowd claps, the last shards sparkle, a breeze sweeps the courtyard
    win: function (L, t) {
      L.whoosh(t, { dur: 0.6, from: 400, to: 2800, vol: 0.14 });
      L.claps(t + 0.1, { people: 7, dur: 1.6, vol: 0.13 });
      L.grains(t + 0.15, { n: 26, spread: 1.2, freq: 7000, vol: 0.08, q: 5 });
    },
    // Each star on the level-complete sheet: a crisp tile set into place, then glints (n = 0..2 adds more)
    star: function (L, t, o) {
      var n = o.n || 0;
      L.burst(t, { dur: 0.03, freq: 3000, q: 2.5, vol: 0.2 });
      L.thump(t, { from: 300, to: 170, dur: 0.06, vol: 0.18 });
      L.grains(t + 0.03, { n: 6 + n * 4, spread: 0.25 + n * 0.08, freq: 7500, vol: 0.09, q: 5 });
    }
  });
})();
