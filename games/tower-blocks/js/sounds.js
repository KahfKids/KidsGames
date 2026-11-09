/* Tower Blocks: sounds.js
   This game's own sounds (no music): heavy carved stone settling, glazed tiles clinking, the overhang being
   sliced off with a swoosh, rubble crumbling far below, a sparkle when a block lands perfectly flush, and a
   courtyard crowd clapping when the tower is done. Built on Kit.sfx.lib. */
(function () {
  'use strict';
  Kit.sfx.define({
    // UI button: a small glazed-tile tick
    tap: function (L, t) {
      L.burst(t, { dur: 0.022, freq: 3800, q: 3, vol: 0.16 });
      L.thump(t, { from: 380, to: 240, dur: 0.035, vol: 0.08 });
    },
    // A carved stone layer lands: a deep thunk with a little grit
    stone: function (L, t, o) {
      var s = o.size || 1;
      L.thump(t, { from: 150, to: 52, dur: 0.17, vol: 0.42 * s });
      L.burst(t, { dur: 0.08, freq: 650, q: 1.1, vol: 0.22 * s, brown: true });
      L.grains(t + 0.01, { n: 5, spread: 0.06, freq: 2300, vol: 0.06, q: 1.5, dur: 0.012 });
    },
    // A glazed tile slab lands: a ceramic clink over a softer thump
    tile: function (L, t, o) {
      var s = o.size || 1;
      L.thump(t, { from: 210, to: 90, dur: 0.11, vol: 0.32 * s });
      L.burst(t, { dur: 0.035, freq: 4300, q: 3.2, vol: 0.17 * s });
      L.burst(t + 0.012, { dur: 0.05, freq: 6200, q: 6, vol: 0.06 });
      L.grains(t + 0.02, { n: 3, spread: 0.05, freq: 7000, vol: 0.05, q: 4 });
    },
    // The overhang is sliced off: a quick swish and a scrape as it tips away
    slice: function (L, t) {
      L.burst(t, { dur: 0.14, freq: 2600, sweepTo: 6500, q: 1.4, vol: 0.12 });
      L.whoosh(t + 0.03, { dur: 0.32, from: 1600, to: 380, vol: 0.13 });
      L.burst(t + 0.02, { dur: 0.09, freq: 900, q: 0.8, vol: 0.07, brown: true });
    },
    // A piece lands far below and crumbles. o.dist 0 (close) .. 1 (far away: quieter and duller)
    crumble: function (L, t, o) {
      var d = Math.max(0, Math.min(1, o.dist || 0)), v = 1 - d * 0.75;
      L.burst(t, { dur: 0.45, freq: 520 - d * 300, type: 'lowpass', q: 0.7, vol: 0.28 * v, brown: true });
      L.thump(t, { from: 110, to: 45, dur: 0.22, vol: 0.3 * v });
      L.grains(t + 0.02, { n: Math.round(12 - d * 6), spread: 0.35, freq: 1900 - d * 900, vol: 0.1 * v, q: 1, dur: 0.02 });
    },
    // A perfect, flush drop: a crisp stone-on-stone click, then sparkle. o.step = streak (more sparkle, never a pitch step)
    perfect: function (L, t, o) {
      var k = Math.min(o.step || 1, 8) / 8;
      L.burst(t, { dur: 0.025, freq: 3200, q: 4, vol: 0.22 });
      L.thump(t, { from: 260, to: 130, dur: 0.06, vol: 0.2 });
      L.burst(t + 0.03, { dur: 0.32, freq: 7800, q: 7, vol: 0.06 + 0.04 * k, attack: 0.02 });
      L.grains(t + 0.03, { n: 10 + Math.round(14 * k), spread: 0.3 + 0.25 * k, freq: 7600, vol: 0.1, q: 5 });
      if (k > 0.3) L.grains(t + 0.12, { n: 6 + Math.round(8 * k), spread: 0.3, freq: 9500, vol: 0.06, q: 6 });
    },
    // The block grows back a little: an airy rising whoosh with glints
    grow: function (L, t) {
      L.whoosh(t, { dur: 0.38, from: 500, to: 3200, vol: 0.13 });
      L.grains(t + 0.15, { n: 8, spread: 0.2, freq: 8000, vol: 0.07, q: 5 });
    },
    // A missed block: a soft deflating puff (gentle, never harsh)
    miss: function (L, t) {
      L.burst(t, { dur: 0.5, freq: 1300, sweepTo: 200, q: 0.7, vol: 0.18, attack: 0.04, brown: true });
      L.thump(t + 0.1, { from: 120, to: 60, dur: 0.22, vol: 0.16 });
    },
    // A new block slides in: a faint breath of air
    spawn: function (L, t) {
      L.whoosh(t, { dur: 0.26, from: 350, to: 1100, vol: 0.045, brown: true });
    },
    // The tower reaches its goal: a crowd claps, sparkles rain, a breeze sweeps the courtyard
    win: function (L, t) {
      L.whoosh(t, { dur: 0.6, from: 400, to: 2800, vol: 0.14 });
      L.claps(t + 0.08, { people: 8, dur: 1.8, vol: 0.13 });
      L.grains(t + 0.12, { n: 30, spread: 1.3, freq: 7200, vol: 0.08, q: 5 });
    },
    // Free Build milestone or new best: a smaller round of claps
    cheer: function (L, t) {
      L.claps(t, { people: 5, dur: 1.0, vol: 0.11 });
      L.grains(t + 0.05, { n: 14, spread: 0.6, freq: 7600, vol: 0.07, q: 5 });
    },
    // Each star on the level-complete sheet: a tile set into place, then glints (n = 0..2 adds more)
    star: function (L, t, o) {
      var n = o.n || 0;
      L.burst(t, { dur: 0.03, freq: 3000, q: 2.5, vol: 0.2 });
      L.thump(t, { from: 280, to: 160, dur: 0.06, vol: 0.18 });
      L.grains(t + 0.03, { n: 6 + n * 4, spread: 0.25 + n * 0.08, freq: 7500, vol: 0.09, q: 5 });
    },
    // Not used by this game directly; replaces the kit's fallback so nothing generic plays.
    whoosh: function (L, t) { L.whoosh(t, { dur: 0.3, from: 500, to: 2200, vol: 0.12 }); }
  });
})();
