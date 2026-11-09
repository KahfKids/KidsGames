/* Hextris (Kahf Kids edition): sounds.js
   This game's own sounds (no music): a carved stone wheel turning, glazed ceramic tiles set onto stone,
   tiles crunching into glittering dust, a fountain breeze, courtyard claps. Built on Kit.sfx.lib. */
(function () {
  'use strict';
  var rnd = function (a, b) { return a + Math.random() * (b - a); };

  Kit.sfx.define({
    // UI button: a small ceramic tick
    tap: function (L, t) {
      L.burst(t, { dur: 0.022, freq: 3400, q: 3, vol: 0.17 });
      L.thump(t, { from: 520, to: 300, dur: 0.035, vol: 0.08 });
    },
    // The stone medallion turns one notch: a dry ratchet click with a short stone-on-stone swish.
    // o.dir (-1 left, 1 right) pans it toward the side that was tapped.
    rotate: function (L, t, o) {
      var pan = (o.dir || 0) * 0.35;
      L.burst(t, { dur: 0.016, freq: rnd(2300, 2600), q: 3.5, vol: 0.2, pan: pan });
      L.burst(t + 0.004, { dur: 0.09, freq: 900, sweepTo: 420, q: 0.9, vol: 0.09, brown: true, pan: pan });
      L.thump(t, { from: 240, to: 150, dur: 0.04, vol: 0.1 });
    },
    // A glazed tile lands and seats itself: a hollow ceramic knock with a little grit.
    land: function (L, t, o) {
      var pan = Math.max(-0.5, Math.min(0.5, o.pan || 0));
      L.burst(t, { dur: 0.03, freq: rnd(1500, 1800), q: 2.4, vol: 0.2, pan: pan });
      L.thump(t, { from: 210, to: 110, dur: 0.08, vol: 0.26 });
      L.burst(t + 0.012, { dur: 0.05, freq: 3800, q: 1.4, vol: 0.035, pan: pan });
    },
    // A group clears: tiles crunch into glittering dust. o.step = combo (1, 2, 3...), o.n = tiles in the group.
    // Bigger groups and combos crunch longer and sparkle more; the pitch never steps up.
    combo: function (L, t, o) {
      var k = Math.min(1, ((o.step || 1) - 1) / 5 + ((o.n || 3) - 3) / 8);
      L.burst(t, { dur: 0.07 + 0.05 * k, freq: 1900, sweepTo: 900, q: 0.9, vol: 0.22 + 0.06 * k });
      L.grains(t + 0.005, { n: 7 + Math.round(8 * k), spread: 0.07 + 0.08 * k, freq: 1700, q: 1.3, vol: 0.16, dur: 0.02 });
      L.thump(t, { from: 300, to: 130, dur: 0.08, vol: 0.16 + 0.06 * k });
      L.grains(t + 0.06, { n: 8 + Math.round(16 * k), spread: 0.25 + 0.3 * k, freq: 7200, q: 5, vol: 0.08 + 0.03 * k });
      if (k > 0.4) L.whoosh(t + 0.02, { dur: 0.35, from: 900, to: 3600, vol: 0.06 + 0.06 * k });
    },
    // A stack is nearly full: two soft low wooden knocks, like someone tapping the fountain rim.
    warn: function (L, t) {
      L.knock(t, { size: 1.9, vol: 0.55 });
      L.knock(t + 0.17, { size: 1.9, vol: 0.4 });
    },
    // A heart is used to save the game: a fountain breeze sweeps the outer tiles away.
    save: function (L, t) {
      L.whoosh(t, { dur: 0.7, from: 300, to: 2200, vol: 0.2, brown: true });
      L.grains(t + 0.1, { n: 22, spread: 0.45, freq: 2100, q: 1.4, vol: 0.12, dur: 0.018 });
      L.thump(t + 0.05, { from: 130, to: 60, dur: 0.22, vol: 0.2 });
    },
    // A level begins: a light courtyard breeze
    start: function (L, t) {
      L.whoosh(t, { dur: 0.55, from: 400, to: 1800, vol: 0.12 });
      L.grains(t + 0.25, { n: 8, spread: 0.3, freq: 7000, q: 5, vol: 0.05 });
    },
    // Out of hearts: a soft deflating sigh of wind (gentle, never harsh)
    lose: function (L, t) {
      L.burst(t, { dur: 0.6, freq: 1300, sweepTo: 170, q: 0.7, vol: 0.2, attack: 0.05, brown: true });
      L.thump(t + 0.12, { from: 110, to: 55, dur: 0.28, vol: 0.2 });
    },
    // Level cleared: the courtyard claps, glaze dust glitters, a breeze lifts
    win: function (L, t) {
      L.whoosh(t, { dur: 0.6, from: 400, to: 2800, vol: 0.14 });
      L.claps(t + 0.08, { people: 7, dur: 1.6, vol: 0.13 });
      L.grains(t + 0.15, { n: 28, spread: 1.2, freq: 7000, vol: 0.08, q: 5 });
    },
    // Each star on the level-complete sheet: a tile set into place, then glints (n = 0..2 adds more glints)
    star: function (L, t, o) {
      var n = o.n || 0;
      L.burst(t, { dur: 0.03, freq: 2900, q: 2.5, vol: 0.2 });
      L.thump(t, { from: 300, to: 170, dur: 0.06, vol: 0.18 });
      L.grains(t + 0.03, { n: 6 + n * 4, spread: 0.25 + n * 0.08, freq: 7500, vol: 0.09, q: 5 });
    }
  });
})();
