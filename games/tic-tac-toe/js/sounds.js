/* Tic Tac Toe: its own sounds (no music). Stars and flowers drawn with chalk: pen scratches as a piece is
   traced, soft felt taps, a warm swoosh along the winning line, a shrug for a draw, claps for wins. */
(function () {
  'use strict';
  var R = function (a, b) { return a + Math.random() * (b - a); };
  // a soft felt tap (a piece set down on a cloth-covered tile)
  function felt(L, t, v) {
    v = v == null ? 1 : v;
    L.thump(t, { from: 170, to: 85, dur: 0.06, vol: 0.26 * v });
    L.burst(t, { dur: 0.035, freq: 700, q: 0.8, type: 'lowpass', vol: 0.12 * v });
  }
  // one chalk stroke: a short gritty scratch
  function scratch(L, t, v) {
    L.burst(t, { dur: R(0.03, 0.05), freq: R(3200, 4600), q: 1.8, attack: 0.008, vol: (v || 1) * R(0.04, 0.07) });
  }
  Kit.sfx.define({
    tap: function (L, t) { felt(L, t, 0.7); L.click(t, { freq: 3400, vol: 0.06 }); },
    star: function (L, t, o) { var n = o.n || 0; felt(L, t, 0.5); L.grains(t, { n: 9 + n * 6, spread: 0.3, freq: 6000, vol: 0.08 + n * 0.02 }); },
    whoosh: function (L, t) { L.whoosh(t, { dur: 0.3, from: 400, to: 1600, vol: 0.12 }); },
    // picking up a piece from the dish: a papery lift
    pick: function (L, t) { L.burst(t, { dur: 0.05, freq: 2200, q: 1, vol: 0.07, attack: 0.01 }); },
    // the star or flower being traced in with chalk (about half a second)
    trace: function (L, t) { for (var i = 0; i < 10; i++) scratch(L, t + i * 0.045 + R(0, 0.012), 0.9); },
    // the piece settles: a felt tap and a few chalk-dust grains
    place: function (L, t) { felt(L, t, 0.9); L.grains(t + 0.01, { n: 5, spread: 0.12, freq: 5000, vol: 0.04 }); },
    // a gentle double tap when a square can't be used
    wiggle: function (L, t) { felt(L, t, 0.4); felt(L, t + 0.08, 0.3); },
    // a warm swoosh as the winning line glows across
    winLine: function (L, t) {
      L.whoosh(t, { dur: 0.5, from: 300, to: 1500, vol: 0.13, brown: true });
      L.whoosh(t + 0.05, { dur: 0.45, from: 900, to: 3200, vol: 0.06 });
      L.grains(t + 0.25, { n: 10, spread: 0.3, freq: 6500, vol: 0.06 });
    },
    // a "shrug": a soft rise then fall of air
    roundDraw: function (L, t) {
      L.burst(t, { dur: 0.26, freq: 500, sweepTo: 1300, q: 0.9, attack: 0.1, vol: 0.1 });
      L.burst(t + 0.24, { dur: 0.34, freq: 1300, sweepTo: 420, q: 0.9, attack: 0.08, vol: 0.09 });
    },
    // a fresh board: a sweep of the cloth
    roundStart: function (L, t) { L.burst(t, { dur: 0.35, freq: 1800, q: 0.6, attack: 0.12, vol: 0.06 }); L.whoosh(t + 0.05, { dur: 0.3, from: 400, to: 900, vol: 0.06, brown: true }); },
    roundWin: function (L, t) {
      L.claps(t + 0.15, { people: 5, dur: 1.1, vol: 0.11 });
      L.grains(t + 0.1, { n: 20, spread: 0.7, freq: 6500, vol: 0.08 });
      L.burst(t + 0.1, { dur: 0.5, freq: 5000, type: 'highpass', q: 0.5, attack: 0.15, vol: 0.04 });   // paper confetti rustle
    },
    matchWin: function (L, t) {
      L.claps(t, { people: 9, dur: 1.9, vol: 0.12 });
      L.grains(t, { n: 28, spread: 1.3, freq: 6500, vol: 0.09 });
      L.burst(t, { dur: 0.9, freq: 5000, type: 'highpass', q: 0.5, attack: 0.2, vol: 0.05 });
    },
    roundLose: function (L, t) { L.whoosh(t, { dur: 0.45, from: 1200, to: 350, vol: 0.07, brown: true }); felt(L, t + 0.3, 0.4); }
  });
})();
