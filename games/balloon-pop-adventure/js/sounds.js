/* Balloon Pop: sounds.js
   This game's own sound effects, built from the kit's non-musical blocks (Kit.sfx.lib): rubber squeaks,
   pops, confetti crackle, paper cards, rain clouds, claps, and a little nature for each world.
   No music: no notes, scales, chimes or jingles. Combos raise intensity (bigger pop, more crackle), never pitch. */
(function () {
  'use strict';
  var K = window.Kit;
  var SIZE = [0.78, 1, 1.32];

  // A rubbery balloon pop. o.size 0 small, 1 normal, 2 big; o.level 0..1 = combo intensity.
  function pop(L, t, o) {
    var s = SIZE[o.size == null ? 1 : o.size], k = Math.max(0, Math.min(1, o.level || 0)), j = L.rnd(0.9, 1.1);
    L.glide(t, { from: 950 * j / s, to: 1500 * j / s, dur: 0.032, vol: 0.045, type: 'triangle' });       // rubber squeak
    var tp = t + 0.028;
    L.burst(tp, { dur: 0.05 * s, freq: 2400 * j / s, q: 0.7, sweepTo: 650 / s, vol: 0.34 + 0.1 * k });    // the snap
    L.burst(tp, { dur: 0.014, freq: 4500, q: 0.5, type: 'highpass', vol: 0.16 + 0.06 * k });               // crack
    L.thump(tp, { from: 230 * j / s, to: 70 / s, dur: 0.085 * s, vol: 0.28 + 0.12 * k });                 // rubbery body
    L.grains(tp + 0.035, { n: Math.round(4 + 16 * k), spread: 0.2 + 0.25 * k, freq: 5200, vol: 0.05 + 0.05 * k }); // confetti crackle
    if (k > 0.5) L.burst(tp + 0.02, { dur: 0.25, freq: 6500, q: 0.6, attack: 0.03, vol: 0.03 * k });      // fizz of a big combo
  }

  K.sfx.define({
    pop: pop,
    // Combo extra (Kit.sfx.note): more confetti crackle as the streak grows.
    combo: function (L, t, o) { var k = Math.min(1, (o.step || 0) / 12); L.grains(t + 0.04, { n: Math.round(3 + 10 * k), spread: 0.3, freq: 6000, vol: 0.04 + 0.04 * k }); },

    // Kit sheet buttons: a soft rubbery bop.
    tap: function (L, t) { L.thump(t, { from: 320, to: 170, dur: 0.05, vol: 0.14 }); L.click(t, { freq: 2200, vol: 0.1, dur: 0.012 }); },
    // Each star on the level-complete sheet: a small pop and sparkle, a little bigger for each star.
    star: function (L, t, o) { var n = o.n || 0; pop(L, t, { size: n === 2 ? 2 : n, level: 0.3 + n * 0.3 }); L.grains(t + 0.06, { n: 8 + n * 6, spread: 0.35, freq: 7200, vol: 0.05 }); },

    // A tap on empty sky: a soft whump of air.
    puff: function (L, t) {
      L.thump(t, { from: 150, to: 70, dur: 0.08, vol: 0.12 });
      L.burst(t, { dur: 0.09, freq: 420, type: 'lowpass', q: 0.5, vol: 0.09, brown: true });
    },
    // A tapped rain cloud: a rumbly bump and a patter of drops.
    storm: function (L, t) {
      L.burst(t, { dur: 0.75, freq: 320, sweepTo: 110, type: 'lowpass', q: 0.7, attack: 0.025, vol: 0.4, brown: true });
      L.thump(t, { from: 95, to: 40, dur: 0.28, vol: 0.3 });
      for (var i = 0; i < 4; i++) L.drop(t + 0.12 + i * L.rnd(0.06, 0.12), { size: L.rnd(0.6, 0.9), vol: 0.07 });
    },
    // A heart lost: a gentle soft thud.
    heart: function (L, t) { L.thump(t + 0.05, { from: 190, to: 90, dur: 0.12, vol: 0.14 }); },
    // A needed balloon floats away: a breezy rising whoosh.
    bye: function (L, t) { L.whoosh(t, { dur: 0.4, from: 700, to: 2600, vol: 0.08 }); },
    // Out of hearts: a balloon slowly letting its air out (gentle, short).
    lose: function (L, t) {
      L.glide(t, { from: 520, to: 170, dur: 0.7, vol: 0.06, type: 'triangle', attack: 0.04 });
      L.burst(t, { dur: 0.7, freq: 1300, sweepTo: 380, q: 1.2, attack: 0.06, vol: 0.07 });
    },
    // Rainbow balloon: a ripple of tiny pops sweeping across the screen with a shimmer.
    rainbow: function (L, t) {
      L.whoosh(t, { dur: 0.55, from: 500, to: 3200, vol: 0.12 });
      for (var i = 0; i < 10; i++) L.burst(t + 0.03 + i * 0.045, { dur: 0.03, freq: L.rnd(2600, 4200), q: 1, vol: 0.11, pan: -0.9 + i * 0.2 });
      L.grains(t + 0.1, { n: 22, spread: 0.6, freq: 7500, vol: 0.06 });
    },
    // Good-deed card: a paper flip and swoosh as it flies to the middle.
    cardFlip: function (L, t) {
      L.burst(t, { dur: 0.035, freq: 3200, q: 0.8, vol: 0.13 });
      L.burst(t + 0.065, { dur: 0.04, freq: 2600, q: 0.8, vol: 0.11 });
      L.whoosh(t + 0.02, { dur: 0.32, from: 600, to: 2800, vol: 0.1 });
    },
    // ...then a warm, gentle sparkle while the picture is shown.
    sparkle: function (L, t) {
      L.grains(t, { n: 18, spread: 0.7, freq: 6800, vol: 0.045 });
      L.burst(t, { dur: 0.6, freq: 5200, q: 0.5, attack: 0.2, vol: 0.025 });
    },
    // ...and a soft swish as the card tucks into its goal chip.
    cardIn: function (L, t) {
      L.whoosh(t, { dur: 0.2, from: 2200, to: 800, vol: 0.08 });
      L.burst(t + 0.18, { dur: 0.03, freq: 2400, q: 1, vol: 0.12 });
      L.grains(t + 0.2, { n: 6, spread: 0.15, freq: 7000, vol: 0.05 });
    },
    // Level win: a confetti whoosh, a handful of pops, crackle and a crowd of claps. (game.js also speaks Arabic praise via Kit.say)
    win: function (L, t) {
      L.whoosh(t, { dur: 0.5, from: 400, to: 3000, vol: 0.12 });
      for (var i = 0; i < 4; i++) pop(L, t + 0.08 + i * L.rnd(0.12, 0.2), { size: (i % 3), level: 0.6 });
      L.grains(t + 0.2, { n: 40, spread: 1.3, freq: 5200, vol: 0.06 });
      L.claps(t + 0.15, { people: 7, dur: 1.6, vol: 0.12 });
    },

    // ---- world ambience (quiet, occasional) ----
    bird: function (L, t) { // a garden bird: two or three quick chirps
      var n = 2 + (Math.random() < 0.5 ? 1 : 0), f = L.rnd(2600, 3400), p = L.rnd(-0.7, 0.7);
      for (var i = 0; i < n; i++) L.glide(t + i * L.rnd(0.08, 0.11), { from: f, to: f * 1.45, dur: 0.055, vol: 0.03, type: 'sine', dest: pan(L, p) });
    },
    gull: function (L, t) { // a far-off gull call
      var p = pan(L, L.rnd(-0.8, 0.8));
      L.glide(t, { from: 1500, to: 1050, dur: 0.22, vol: 0.022, type: 'triangle', glideFrac: 1, dest: p });
      L.glide(t + 0.28, { from: 1400, to: 950, dur: 0.18, vol: 0.016, type: 'triangle', glideFrac: 1, dest: p });
    },
    wave: function (L, t) { // a wave rolling onto the sand
      L.burst(t, { dur: 2.2, freq: 450, sweepTo: 1100, type: 'lowpass', q: 0.4, attack: 0.9, vol: 0.09, brown: true });
      L.burst(t + 0.9, { dur: 1.1, freq: 3200, q: 0.4, type: 'highpass', attack: 0.2, vol: 0.022 });
    },
    cricket: function (L, t) { // a cricket chirping in the warm night
      var p = pan(L, L.rnd(-0.8, 0.8)), f = L.rnd(4300, 4900);
      for (var g = 0; g < 3; g++) for (var i = 0; i < 4; i++) L.burst(t + g * 0.28 + i * 0.024, { dur: 0.012, freq: f, q: 14, vol: 0.05, dest: p });
    }
  });

  function pan(L, v) { // a stereo position for an ambience call (falls back to the main output)
    var c = L.ctx;
    if (!c || !c.createStereoPanner) return L.out;
    var p = c.createStereoPanner(); p.pan.value = v; p.connect(L.out);
    return p;
  }
})();
