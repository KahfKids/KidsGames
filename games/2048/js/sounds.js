/* 2048 Garden: sounds.js
   This game's own sounds (no music): glazed ceramic tiles sliding over a marble tray, clinking together
   when they merge (a bigger tile is a heavier, fuller clink with more glints, never a higher note),
   a tiny tick when a new tile is set down, and garden claps for a goal. Built on Kit.sfx.lib. */
(function () {
  'use strict';
  var rnd = function (a, b) { return a + Math.random() * (b - a); };

  Kit.sfx.define({
    // UI button: a light tap on a glazed tile
    tap: function (L, t) {
      L.burst(t, { dur: 0.022, freq: 3900, q: 3, vol: 0.17 });
      L.thump(t, { from: 460, to: 300, dur: 0.03, vol: 0.07 });
    },
    // Tiles slide over the stone tray: a short soft scrape. o.n = how many tiles moved.
    slide: function (L, t, o) {
      var k = Math.min(1, (o.n || 1) / 8);
      L.burst(t, { dur: 0.1 + 0.03 * k, freq: 1500, sweepTo: 650, q: 0.9, vol: 0.09 + 0.05 * k, attack: 0.02, brown: true });
      L.burst(t + 0.01, { dur: 0.07, freq: 3800, sweepTo: 2600, q: 1.2, vol: 0.025 + 0.02 * k, attack: 0.015 });
    },
    // Two tiles merge: a ceramic clink. o.k = tile size (1 = the "2" tile ... 11 = 2048); o.n = merges this move.
    // Bigger tiles clink harder with a heavier body and more glints.
    merge: function (L, t, o) {
      var k = Math.min(11, o.k || 2) / 11, many = Math.min(3, (o.n || 1) - 1);
      L.burst(t, { dur: 0.03 + 0.02 * k, freq: rnd(3600, 4200), q: 2.6, vol: 0.18 + 0.1 * k });
      L.thump(t, { from: 520 - 220 * k, to: 240 - 110 * k, dur: 0.05 + 0.07 * k, vol: 0.14 + 0.16 * k });
      L.grains(t + 0.012, { n: 2 + Math.round(9 * k) + many * 2, spread: 0.05 + 0.14 * k, freq: 6400, vol: 0.07 + 0.04 * k, q: 4 });
      if (k > 0.5) L.burst(t + 0.02, { dur: 0.16, freq: 2400, sweepTo: 5200, q: 1, vol: 0.05 * k, attack: 0.04 });
    },
    // A new tile is set down: a tiny tick
    spawn: function (L, t) {
      L.burst(t, { dur: 0.014, freq: rnd(5200, 5800), q: 3.5, vol: 0.07 });
      L.thump(t, { from: 620, to: 380, dur: 0.025, vol: 0.04 });
    },
    // A swipe that can't move anything: a soft dull knock against the tray rim
    bump: function (L, t) {
      L.burst(t, { dur: 0.04, freq: 900, q: 1.4, vol: 0.12, brown: true });
      L.thump(t, { from: 170, to: 90, dur: 0.08, vol: 0.18 });
    },
    // Undo: the tiles whoosh back, then settle
    undo: function (L, t) {
      L.burst(t, { dur: 0.26, freq: 2600, sweepTo: 520, q: 0.8, vol: 0.13, attack: 0.08 });
      L.burst(t + 0.2, { dur: 0.02, freq: 3600, q: 3, vol: 0.12 });
      L.thump(t + 0.2, { from: 420, to: 260, dur: 0.04, vol: 0.08 });
    },
    // A new biggest tile: a little shimmer of glints
    shine: function (L, t, o) {
      var k = Math.min(1, (o.k || 4) / 9);
      L.grains(t + 0.04, { n: 6 + Math.round(8 * k), spread: 0.25, freq: 8200, vol: 0.06 + 0.03 * k, q: 6 });
    },
    // No moves left: a gentle, soft deflating puff (never harsh)
    stuck: function (L, t) {
      L.burst(t, { dur: 0.5, freq: 1300, sweepTo: 220, q: 0.7, vol: 0.16, attack: 0.05, brown: true });
      L.thump(t + 0.1, { from: 120, to: 60, dur: 0.22, vol: 0.16 });
    },
    // Goal reached: a breeze through the garden, a crowd claps, the glaze sparkles
    win: function (L, t) {
      L.whoosh(t, { dur: 0.55, from: 450, to: 3000, vol: 0.14 });
      L.claps(t + 0.12, { people: 8, dur: 1.7, vol: 0.13 });
      L.grains(t + 0.1, { n: 30, spread: 1.3, freq: 7200, vol: 0.08, q: 5 });
    },
    // Each star on the level-complete sheet: a tile set into place, then glints (n = 0..2 adds more)
    star: function (L, t, o) {
      var n = o.n || 0;
      L.burst(t, { dur: 0.03, freq: 3300, q: 2.6, vol: 0.2 });
      L.thump(t, { from: 340, to: 190, dur: 0.06, vol: 0.17 });
      L.grains(t + 0.03, { n: 6 + n * 4, spread: 0.25 + n * 0.08, freq: 7600, vol: 0.09, q: 5 });
    },
    // A level begins: tiles are laid on the tray with a soft whoosh
    whoosh: function (L, t) {
      L.whoosh(t, { dur: 0.32, from: 600, to: 2600, vol: 0.12 });
    }
  });
})();
