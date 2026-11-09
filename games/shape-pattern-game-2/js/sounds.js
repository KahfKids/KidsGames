/* Shape Patterns: sounds.js
   A toy-train sound set, all foley (no music, no notes, no tunes): steam chuffs, wheel clacks on the rail
   joints, a steam hiss, wooden tocks and clunks for the pieces, sparkle grains and a crowd of claps.
   Built on the kit's building blocks (Kit.sfx.lib); the kit handles the one AudioContext, unlock and mute. */
(function () {
  'use strict';
  var K = window.Kit;
  if (!K || !K.sfx || !K.sfx.define) return;

  // ---------- small helpers built from the kit blocks ----------
  // One steam chuff: a breathy puff of low noise with a soft attack (the "ch" of chuff-chuff).
  function chuff(L, t, v) {
    L.burst(t, { dur: 0.14, freq: 1400, sweepTo: 520, q: 0.9, attack: 0.012, vol: 0.13 * v, brown: true });
    L.burst(t, { dur: 0.09, freq: 3200, sweepTo: 1800, q: 0.7, attack: 0.01, vol: 0.05 * v });
  }
  // Wheels rolling over a rail joint: a quick metal-ish clack-clack (front and back axle).
  function clack(L, t, v, gap) {
    L.burst(t, { dur: 0.016, freq: 2600, q: 5, vol: 0.12 * v });
    L.thump(t, { from: 210, to: 140, dur: 0.035, vol: 0.08 * v });
    L.burst(t + (gap || 0.07), { dur: 0.014, freq: 2300, q: 5, vol: 0.1 * v });
    L.thump(t + (gap || 0.07), { from: 200, to: 130, dur: 0.03, vol: 0.06 * v });
  }
  // Steam letting off: a soft, airy hiss that fades away.
  function hiss(L, t, v) {
    L.burst(t, { dur: 0.7, freq: 5200, sweepTo: 2600, type: 'highpass', q: 0.5, attack: 0.04, vol: 0.09 * v });
    L.burst(t, { dur: 0.45, freq: 1800, sweepTo: 900, q: 0.6, attack: 0.03, vol: 0.04 * v, brown: true });
  }
  // A short airy toot made only of noise (no tone, no tune).
  function toot(L, t, v) {
    L.burst(t, { dur: 0.22, freq: 1150, q: 7, attack: 0.03, vol: 0.09 * v });
    L.burst(t, { dur: 0.2, freq: 2300, q: 5, attack: 0.03, vol: 0.035 * v });
  }
  // Wooden piece settling into a wagon: hollow knock, a low body thud and a little rattle.
  function clunk(L, t, v) {
    L.knock(t, { size: 1.35, vol: 0.9 * v });
    L.thump(t + 0.004, { from: 120, to: 55, dur: 0.12, vol: 0.28 * v });
    L.burst(t + 0.035, { dur: 0.02, freq: 1500, q: 3, vol: 0.07 * v });
  }

  K.sfx.define({
    // Sheet buttons: a light wooden tick with a pinch of sparkle.
    tap: function (L, t) { L.knock(t, { size: 0.55, vol: 0.55 }); L.grains(t + 0.01, { n: 3, spread: 0.05, freq: 7500, vol: 0.05 }); },
    // Each star on the level-complete sheet: a wooden clunk and a shower of sparkle (more grains per star).
    star: function (L, t, o) { var n = (o.n || 0) + 1; clunk(L, t, 0.7); L.grains(t + 0.02, { n: 6 + n * 5, spread: 0.25 + n * 0.05, freq: 7000, vol: 0.09 }); },
    // Soft tick: a dimmed pad, tapping the "?" wagon, letting go of a drag in the air.
    tick: function (L, t) { L.click(t, { freq: 1900, vol: 0.12, dur: 0.012 }); },
    // Picking up a piece: a crisp wooden "tock".
    pick: function (L, t) { L.knock(t, { size: 0.75, vol: 0.85 }); L.click(t, { freq: 3800, vol: 0.08, dur: 0.01 }); },
    // The piece flying to the wagon (o.soft: lifting it for a drag).
    swoosh: function (L, t, o) { L.whoosh(t, { dur: o.soft ? 0.18 : 0.32, from: 600, to: 2600, vol: o.soft ? 0.09 : 0.15 }); },
    // Landing in the right wagon: a satisfying wooden clunk plus sparkle.
    clunk: function (L, t) { clunk(L, t, 1); L.grains(t + 0.03, { n: 12, spread: 0.28, freq: 7200, vol: 0.1 }); },
    // Wrong piece: a gentle wobble rattle and a soft bonk.
    wobble: function (L, t) {
      for (var i = 0; i < 6; i++) L.burst(t + i * 0.055, { dur: 0.02, freq: 1300, q: 2.5, vol: 0.11 * (1 - i * 0.13) });
      L.thump(t + 0.02, { from: 190, to: 95, dur: 0.16, vol: 0.2 });
    },
    // Full train: each wagon gives a clunk and sparkle; later wagons sparkle more (intensity, not pitch).
    wagon: function (L, t, o) { var i = o.i || 0; clunk(L, t, 0.75); L.grains(t + 0.02, { n: 5 + i * 2, spread: 0.2, freq: 7000, vol: 0.08 }); },
    // The train rolling in: chuffs that slow down, clacks over rail joints, then a steam hiss as it stops.
    arrive: function (L, t, o) {
      var dur = o.dur || 1.25, x = 0, gap = 0.11, k = 0;
      while (x < dur - 0.1) { chuff(L, t + x, 1 - x / dur * 0.4); x += gap; gap *= 1.17; k++; }
      clack(L, t + 0.08, 0.9, 0.06); clack(L, t + 0.45, 0.8, 0.08); clack(L, t + 0.9, 0.6, 0.11);
      L.thump(t + dur - 0.05, { from: 140, to: 70, dur: 0.12, vol: 0.12 });
      hiss(L, t + dur - 0.02, 1);
    },
    // The train leaving: a short airy toot, then chuffs that speed up and clacks that come faster.
    depart: function (L, t, o) {
      var dur = o.dur || 1.15, x = 0.12, gap = 0.3;
      toot(L, t, 1);
      while (x < dur + 0.2) { chuff(L, t + x, 0.6 + Math.min(0.4, x / dur * 0.4)); x += gap; gap = Math.max(0.075, gap * 0.8); }
      clack(L, t + 0.35, 0.6, 0.11); clack(L, t + 0.75, 0.8, 0.07); clack(L, t + 1.05, 0.9, 0.05);
    },
    hiss: function (L, t) { hiss(L, t, 1); },
    // Level win: a happy crowd clapping, sparkle and a confetti whoosh (the device voice says "Well done!").
    win: function (L, t) {
      L.claps(t + 0.05, { people: 7, dur: 1.5, vol: 0.13 });
      L.whoosh(t, { dur: 0.45, from: 400, to: 3200, vol: 0.14 });
      L.grains(t + 0.1, { n: 26, spread: 0.9, freq: 7500, vol: 0.09 });
    }
  });
})();
