/* Checkers: its own sounds (no music). Heavy glazed-ceramic pieces on a wooden board: clacks, slides, hops,
   a ceramic capture knock with grains, a sparkle-and-thump crowning, claps for wins. */
(function () {
  'use strict';
  var R = function (a, b) { return a + Math.random() * (b - a); };
  // a glazed ceramic disc landing on wood: a bright tick, a short ceramic body and a woody thump
  function clack(L, t, v, size) {
    v = v == null ? 1 : v; size = size || 1;
    L.click(t, { freq: R(3000, 3600) / size, vol: 0.2 * v, dur: 0.012 });
    L.burst(t, { dur: 0.045, freq: R(1500, 1800) / size, q: 7, vol: 0.12 * v });
    L.thump(t, { from: 230 / size, to: 105 / size, dur: 0.07, vol: 0.3 * v });
  }
  Kit.sfx.define({
    tap: function (L, t) { L.knock(t, { size: 0.6, vol: 0.6 }); L.grains(t + 0.01, { n: 3, spread: 0.05, freq: 7000, vol: 0.05 }); },
    star: function (L, t, o) { var n = o.n || 0; clack(L, t, 0.6); L.grains(t, { n: 10 + n * 6, spread: 0.3, freq: 6500, vol: 0.09 + n * 0.02 }); },
    whoosh: function (L, t) { L.whoosh(t, { dur: 0.3, from: 500, to: 2000, vol: 0.12 }); },
    // lifting a piece: a light ceramic tick
    pick: function (L, t) { L.click(t, { freq: 4200, vol: 0.12, dur: 0.01 }); L.burst(t + 0.012, { dur: 0.03, freq: 2200, q: 6, vol: 0.06 }); },
    // sliding across the board: a soft scrape
    slide: function (L, t, o) { var d = o.short ? 0.1 : 0.24; L.burst(t, { dur: d, freq: 1100, sweepTo: 1500, q: 0.9, attack: d * 0.3, vol: 0.07 }); L.burst(t, { dur: d, freq: 350, q: 0.7, attack: d * 0.3, vol: 0.05, brown: true }); },
    // jumping: a lift click and an airy hop
    hop: function (L, t) { L.click(t, { freq: 3800, vol: 0.1 }); L.whoosh(t + 0.02, { dur: 0.22, from: 700, to: 2100, vol: 0.09 }); },
    land: function (L, t, o) { clack(L, t, o.hop ? 1.1 : 0.9, o.side ? 1.08 : 1); },
    // a captured piece: ceramic knock, a little pop and a spill of grains (not a bell)
    capture: function (L, t) {
      L.thump(t, { from: 320, to: 140, dur: 0.07, vol: 0.28 }); L.burst(t, { dur: 0.06, freq: 2300, q: 5, vol: 0.14 });
      L.glide(t + 0.03, { from: 320, to: 900, dur: 0.05, vol: 0.12 });
      L.grains(t + 0.05, { n: 14, spread: 0.22, freq: 4800, q: 3, vol: 0.09 });
    },
    // crowning: a swirl of sparkle grains and a satisfying thump
    crown: function (L, t) {
      L.whoosh(t, { dur: 0.42, from: 700, to: 4200, vol: 0.09 });
      L.grains(t, { n: 22, spread: 0.4, freq: 7500, vol: 0.09 }); L.grains(t + 0.15, { n: 12, spread: 0.3, freq: 5200, vol: 0.07 });
      L.thump(t + 0.38, { from: 150, to: 55, dur: 0.14, vol: 0.4 }); clack(L, t + 0.38, 0.6);
    },
    // a gentle rattle when a piece can't move
    wiggle: function (L, t) { for (var i = 0; i < 4; i++) L.click(t + i * 0.04, { freq: i % 2 ? 2300 : 2800, vol: 0.07, dur: 0.012 }); },
    // the pieces being set out: a scatter of soft clacks
    roundStart: function (L, t) { for (var i = 0; i < 9; i++) clack(L, t + 0.1 + i * 0.07 + R(0, 0.03), 0.35); },
    roundWin: function (L, t) {
      L.claps(t, { people: 6, dur: 1.2, vol: 0.11 });
      L.grains(t, { n: 22, spread: 0.8, freq: 7000, vol: 0.08 }); L.whoosh(t, { dur: 0.45, from: 600, to: 3000, vol: 0.08 });
    },
    matchWin: function (L, t) {
      L.claps(t, { people: 10, dur: 2, vol: 0.12 });
      L.grains(t, { n: 30, spread: 1.4, freq: 7000, vol: 0.09 }); L.grains(t + 0.3, { n: 16, spread: 1, freq: 5000, vol: 0.07 });
      L.whoosh(t, { dur: 0.6, from: 500, to: 3500, vol: 0.09 });
    },
    roundLose: function (L, t) { clack(L, t, 0.4, 1.3); L.whoosh(t + 0.05, { dur: 0.5, from: 1400, to: 400, vol: 0.06, brown: true }); },
    roundDraw: function (L, t) { clack(L, t, 0.5); clack(L, t + 0.12, 0.4); L.whoosh(t + 0.15, { dur: 0.4, from: 900, to: 500, vol: 0.06 }); }
  });
})();
